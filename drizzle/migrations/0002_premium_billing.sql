-- Additive migration. Apply once via Drizzle OR Supabase, never both histories.
BEGIN;
CREATE TABLE public.billing_configuration (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), environment text NOT NULL CHECK(environment IN ('live','sandbox'))
);
INSERT INTO public.billing_configuration VALUES(true,'live');
CREATE TABLE public.billing_accounts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN ('stripe','revenuecat')),
 environment text NOT NULL CHECK(environment IN ('live','sandbox')),
 customer_id text NOT NULL,
 PRIMARY KEY(user_id,provider,environment), UNIQUE(provider,environment,customer_id)
);
CREATE TABLE public.billing_subscriptions (
 provider text NOT NULL CHECK(provider IN ('stripe','revenuecat','legacy')),
 environment text NOT NULL CHECK(environment IN ('live','sandbox')),
 subscription_id text NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 customer_id text NOT NULL, product_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('active','grace','expired','revoked')),
 paid_until timestamptz NOT NULL, failure_since timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 event_at timestamptz NOT NULL, event_rank integer NOT NULL DEFAULT 0,
 PRIMARY KEY(provider,environment,subscription_id)
);
CREATE INDEX billing_subscription_user ON public.billing_subscriptions(user_id,environment);
CREATE TABLE public.billing_events (
 provider text NOT NULL,environment text NOT NULL,event_id text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(provider,environment,event_id)
);
-- Preserve known finite paid periods. Ambiguous old null-expiry rows are retained in profiles
-- but require provider reconciliation; this annual-only product must not grant indefinite access.
INSERT INTO public.billing_subscriptions(provider,environment,subscription_id,user_id,customer_id,product_id,status,paid_until,event_at)
SELECT 'legacy','live',user_id::text,user_id,COALESCE(stripe_customer_id,revenuecat_customer_id,user_id::text),
 'premium_annual','active',premium_expiration,now() FROM public.profiles
 WHERE subscription_status='premium' AND entitlement='premium' AND premium_expiration IS NOT NULL;

ALTER TABLE public.billing_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_configuration,public.billing_accounts,public.billing_subscriptions,public.billing_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.billing_configuration,public.billing_accounts,public.billing_subscriptions,public.billing_events TO service_role;

CREATE FUNCTION public.subscription_snapshot(_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles%ROWTYPE; s public.billing_subscriptions%ROWTYPE; env text; until_at timestamptz; tier text:='free'; state text:='free';
BEGIN
 SELECT * INTO STRICT p FROM profiles WHERE user_id=_user_id;
 SELECT environment INTO STRICT env FROM billing_configuration WHERE id;
 SELECT b.* INTO s FROM billing_subscriptions b WHERE b.user_id=_user_id AND b.environment=env
 AND ((b.status='active' AND b.paid_until>now()) OR (b.status='grace' AND b.failure_since IS NOT NULL AND b.failure_since+interval '3 days'>now()))
 ORDER BY CASE WHEN b.status='grace' THEN b.failure_since+interval '3 days' ELSE b.paid_until END DESC LIMIT 1;
 IF FOUND THEN
  tier:='premium';state:=CASE WHEN s.status='grace' THEN 'grace' ELSE 'premium' END;
  until_at:=CASE WHEN s.status='grace' THEN s.failure_since+interval '3 days' ELSE s.paid_until END;
 ELSIF p.subscription_status='trial' AND p.entitlement='premium' AND p.trial_end>now() THEN
  tier:='trial';state:='trial';
 ELSIF p.trial_end IS NOT NULL OR EXISTS(SELECT 1 FROM billing_subscriptions WHERE user_id=_user_id AND environment=env) THEN state:='expired'; END IF;
 RETURN jsonb_build_object('tier',tier,'subscription_status',state,'entitlement',CASE WHEN tier='free' THEN 'free' ELSE 'premium' END,
 'current_plan',CASE WHEN tier='premium' THEN 'premium_annual' WHEN tier='trial' THEN 'trial' ELSE NULL END,
 'trial_start',p.trial_start,'trial_end',p.trial_end,'premium_expiration',until_at,
 'paid_until',s.paid_until,'grace_end',CASE WHEN state='grace' THEN until_at ELSE NULL END,
 'cancel_at_period_end',COALESCE(s.cancel_at_period_end,false),'billing_provider',COALESCE(s.provider,(SELECT provider FROM billing_subscriptions WHERE user_id=_user_id AND environment=env ORDER BY event_at DESC LIMIT 1)),
 'environment',env,'last_verification',s.event_at,'revenuecat_customer_id',NULL);
END;$$;
REVOKE ALL ON FUNCTION public.subscription_snapshot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.subscription_snapshot(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.has_active_premium(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT (public.subscription_snapshot(_user_id)->>'tier') IN ('trial','premium') $$;

REVOKE ALL ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO service_role;

-- The provider adapter verifies product, environment and customer ownership before calling.
-- Idempotency and subscription ordering are committed in the same transaction as entitlement.
CREATE FUNCTION public.apply_billing_event(_event jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous public.billing_subscriptions%ROWTYPE; uid uuid:=(_event->>'userId')::uuid; p text:=_event->>'provider'; env text:=_event->>'environment'; sid text:=_event->>'subscriptionId'; event_time timestamptz:=(_event->>'eventAt')::timestamptz; rank integer; failure timestamptz;
BEGIN
 IF p IS NULL OR env IS NULL OR sid IS NULL OR event_time IS NULL OR _event->>'eventId' IS NULL OR _event->>'productId' IS NULL OR _event->>'status' IS NULL OR _event->>'paidUntil' IS NULL OR p NOT IN ('stripe','revenuecat') OR env NOT IN ('sandbox','live') OR (_event->>'productId') NOT IN ('premium_annual','questos_premium_annual','questos_premium_annual:annual') OR length(_event->>'eventId') NOT BETWEEN 1 AND 250 OR length(sid) NOT BETWEEN 1 AND 250 OR event_time>now()+interval '5 minutes' THEN RAISE EXCEPTION 'Invalid billing event'; END IF;
 PERFORM pg_advisory_xact_lock(714028,1);
 PERFORM 1 FROM profiles WHERE user_id=uid FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Unknown billing owner'; END IF;
 IF NOT EXISTS(SELECT 1 FROM billing_accounts WHERE user_id=uid AND provider=p AND environment=env AND customer_id=_event->>'customerId') THEN RAISE EXCEPTION 'Unverified billing ownership'; END IF;
 INSERT INTO billing_events(provider,environment,event_id) VALUES(p,env,_event->>'eventId') ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO previous FROM billing_subscriptions WHERE provider=p AND environment=env AND subscription_id=sid FOR UPDATE;
 rank:=CASE _event->>'status' WHEN 'revoked' THEN 4 WHEN 'expired' THEN 3 WHEN 'grace' THEN 2 ELSE 1 END;
 IF FOUND THEN
  IF previous.user_id<>uid AND NOT (p='revenuecat' AND previous.status='revoked') THEN RAISE EXCEPTION 'Billing ownership conflict'; END IF;
  IF previous.status='revoked' AND previous.user_id=uid AND _event->>'status'<>'revoked' AND (_event->>'paidUntil')::timestamptz<=previous.paid_until THEN RETURN false; END IF;
  IF previous.user_id=uid AND (previous.event_at,previous.event_rank)>(event_time,rank) AND NOT (_event->>'status'='revoked' AND (_event->>'paidUntil')::timestamptz>=previous.paid_until) THEN RETURN false; END IF;
  event_time:=GREATEST(event_time,previous.event_at);
 END IF;
 failure:=(_event->>'failureSince')::timestamptz;
 IF _event->>'status'='grace' THEN
  IF previous.status='grace' THEN failure:=LEAST(previous.failure_since,failure); END IF;
  IF failure IS NULL OR failure>now()+interval '5 minutes' OR (_event->>'paidUntil')::timestamptz>failure+interval '5 minutes' THEN RAISE EXCEPTION 'Invalid paid grace period'; END IF;
 END IF;
 INSERT INTO billing_subscriptions(provider,environment,subscription_id,user_id,customer_id,product_id,status,paid_until,failure_since,cancel_at_period_end,event_at,event_rank)
 VALUES(p,env,sid,uid,_event->>'customerId',_event->>'productId',_event->>'status',(_event->>'paidUntil')::timestamptz,failure,COALESCE((_event->>'cancelAtPeriodEnd')::boolean,false),event_time,rank)
 ON CONFLICT(provider,environment,subscription_id) DO UPDATE SET user_id=EXCLUDED.user_id,customer_id=EXCLUDED.customer_id,status=EXCLUDED.status,paid_until=EXCLUDED.paid_until,failure_since=EXCLUDED.failure_since,cancel_at_period_end=EXCLUDED.cancel_at_period_end,event_at=EXCLUDED.event_at,event_rank=EXCLUDED.event_rank;
 -- Reconciliation replaces only the corresponding legacy source, never another provider.
 UPDATE billing_subscriptions SET status='expired' WHERE provider='legacy' AND user_id=uid AND environment=env AND customer_id=_event->>'customerId';
 INSERT INTO subscription_events(user_id,kind,source,product_id,entitlement,metadata) VALUES(uid,_event->>'status',p,'premium_annual',CASE WHEN _event->>'status' IN ('active','grace') THEN 'premium' ELSE 'free' END,jsonb_build_object('event_id',_event->>'eventId','environment',env,'subscription_id',sid));
 RETURN true;
END;$$;
REVOKE ALL ON FUNCTION public.apply_billing_event(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_event(jsonb) TO service_role;

CREATE FUNCTION public.enforce_quest_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.quests%ROWTYPE; n integer; projects integer; adds_active boolean; adds_project boolean;
BEGIN
 IF current_setting('role',true) IN ('authenticated','anon') AND auth.uid() IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'Quest owner cannot change'; END IF;
 PERFORM 1 FROM profiles WHERE user_id=NEW.user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing profile'; END IF;
 -- INSERT .. ON CONFLICT runs INSERT triggers too; count only actual additions.
 SELECT * INTO existing FROM quests WHERE id=NEW.id AND user_id=NEW.user_id;
 adds_active:=NEW.status='active' AND (existing.id IS NULL OR existing.status<>'active');
 adds_project:=NEW.status='active' AND NEW.type='main' AND (existing.id IS NULL OR existing.status<>'active' OR existing.type<>'main');
 IF NOT (adds_active OR adds_project) OR has_active_premium(NEW.user_id) THEN RETURN NEW; END IF;
 SELECT count(*) FILTER(WHERE status='active'),count(*) FILTER(WHERE status='active' AND type='main') INTO n,projects FROM quests WHERE user_id=NEW.user_id AND id<>NEW.id;
 IF adds_active AND n>=25 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='FREE_QUEST_LIMIT: Complete or archive a quest before adding another (25 active).'; END IF;
 IF adds_project AND projects>=3 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='FREE_PROJECT_LIMIT: Complete or archive a main quest before adding another (3 projects).'; END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER quest_creation_limits BEFORE INSERT OR UPDATE ON public.quests FOR EACH ROW EXECUTE FUNCTION public.enforce_quest_limits();
REVOKE ALL ON FUNCTION public.enforce_quest_limits() FROM PUBLIC,anon,authenticated;

CREATE TABLE public.premium_documents (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('memory','preferences','health','calendar','experiment')),
 value jsonb NOT NULL CHECK(octet_length(value::text)<=131072),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,kind)
);
ALTER TABLE public.premium_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.premium_documents FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.premium_documents TO service_role;
CREATE TABLE public.assistant_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 actions jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),applied_at timestamptz
);
ALTER TABLE public.assistant_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_proposals FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.assistant_proposals TO service_role;
ALTER TABLE public.ai_requests DROP CONSTRAINT ai_requests_feature_check;
ALTER TABLE public.ai_requests ADD CONSTRAINT ai_requests_feature_check CHECK(feature IN ('morning_brief','goal_to_quests','reflection_prompt','starter_quests','future_me','goal_simulator','executive_assistant'));
CREATE OR REPLACE FUNCTION public.reserve_ai_request(
  _user_id uuid, _feature text, _free_limit integer, _trial_limit integer, _premium_limit integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  tier text;
  day date := (now() AT TIME ZONE 'utc')::date;
  daily_limit integer;
  used integer;
  request_id uuid;
BEGIN
  IF _feature NOT IN ('morning_brief','goal_to_quests','reflection_prompt','starter_quests','future_me','goal_simulator','executive_assistant')
     OR _feature IS NULL OR _user_id IS NULL
     OR _free_limit IS NULL OR _trial_limit IS NULL OR _premium_limit IS NULL
     OR _free_limit NOT BETWEEN 1 AND 10000 OR _trial_limit NOT BETWEEN 1 AND 10000
     OR _premium_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Invalid AI reservation configuration';
  END IF;
  PERFORM pg_advisory_xact_lock(714027, 1);
  SELECT * INTO STRICT p FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  tier := public.subscription_snapshot(_user_id)->>'tier';
  daily_limit := CASE tier WHEN 'premium' THEN 500 WHEN 'trial' THEN 40 ELSE 10 END;
  IF _feature IN ('future_me','goal_simulator','executive_assistant') AND tier='free' THEN
    RAISE EXCEPTION 'Premium required';
  END IF;
  INSERT INTO public.ai_usage (user_id,usage_date,request_count) VALUES (_user_id,day,0)
    ON CONFLICT (user_id,usage_date) DO NOTHING;
  SELECT request_count INTO STRICT used FROM public.ai_usage WHERE user_id = _user_id AND usage_date = day FOR UPDATE;
  IF used >= daily_limit THEN RETURN jsonb_build_object('allowed',false,'reason','quota','used',used,'limit',daily_limit); END IF;
  IF (SELECT count(*) FROM public.ai_requests WHERE status = 'reserved' AND lease_expires_at > now() AND user_id = _user_id) >= 2
    OR (SELECT count(*) FROM public.ai_requests WHERE status = 'reserved' AND lease_expires_at > now()) >= 16
    OR (SELECT count(*) FROM public.ai_requests WHERE usage_date = day) >= 10000 THEN
    RETURN jsonb_build_object('allowed',false,'reason','busy','used',used,'limit',daily_limit);
  END IF;
  UPDATE public.ai_usage SET request_count = request_count + 1,last_feature = _feature,updated_at = now()
    WHERE user_id = _user_id AND usage_date = day RETURNING request_count INTO used;
  INSERT INTO public.ai_requests (user_id,feature,usage_date) VALUES (_user_id,_feature,day) RETURNING id INTO request_id;
  RETURN jsonb_build_object('allowed',true,'requestId',request_id,'used',used,'limit',daily_limit);
END;
$$;

CREATE FUNCTION public.apply_billing_batch(_events jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e jsonb;
BEGIN
 IF jsonb_typeof(_events)<>'array' OR jsonb_array_length(_events)>100 THEN RAISE EXCEPTION 'Invalid event batch'; END IF;
 PERFORM pg_advisory_xact_lock(714028,1);
 FOR e IN SELECT value FROM jsonb_array_elements(_events) LOOP PERFORM apply_billing_event(e); END LOOP;
END;$$;
REVOKE ALL ON FUNCTION public.apply_billing_batch(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_batch(jsonb) TO service_role;
CREATE FUNCTION public.confirm_assistant_plan(_user_id uuid,_proposal_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE proposal public.assistant_proposals%ROWTYPE; action jsonb; q public.quests%ROWTYPE;
BEGIN
 PERFORM 1 FROM profiles WHERE user_id=_user_id FOR UPDATE;
 IF NOT has_active_premium(_user_id) THEN RAISE EXCEPTION 'Premium required'; END IF;
 SELECT * INTO STRICT proposal FROM assistant_proposals WHERE id=_proposal_id AND user_id=_user_id FOR UPDATE;
 IF proposal.applied_at IS NOT NULL THEN RETURN; END IF;
 IF proposal.created_at<now()-interval '30 minutes' THEN RAISE EXCEPTION 'Proposal expired'; END IF;
 FOR action IN SELECT value FROM jsonb_array_elements(proposal.actions) LOOP
  SELECT * INTO STRICT q FROM quests WHERE id=(action->>'id')::uuid AND user_id=_user_id FOR UPDATE;
  IF q.updated_at<>(action->>'version')::timestamptz OR q.status<>'active' THEN RAISE EXCEPTION 'Proposal stale'; END IF;
  UPDATE quests SET title=COALESCE(action->>'title',title),estimated_duration=COALESCE((action->>'minutes')::integer,estimated_duration),scheduled_for=(action->>'date')::date,start_time=action->>'startTime' WHERE id=q.id;
 END LOOP;
 UPDATE assistant_proposals SET applied_at=now() WHERE id=_proposal_id;
END;$$;
REVOKE ALL ON FUNCTION public.confirm_assistant_plan(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_assistant_plan(uuid,uuid) TO service_role;

CREATE TABLE public.billing_request_limits(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,window_start timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0,PRIMARY KEY(user_id,window_start));
ALTER TABLE public.billing_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_request_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.billing_request_limits TO service_role;
CREATE FUNCTION public.take_billing_request(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE used integer;
BEGIN
 INSERT INTO billing_request_limits VALUES(_user_id,date_trunc('minute',now()),1) ON CONFLICT(user_id,window_start) DO UPDATE SET attempts=billing_request_limits.attempts+1 RETURNING attempts INTO used;
 IF used>12 THEN RAISE EXCEPTION 'Billing refresh limit reached. Retry in a minute.'; END IF;
END;$$;
REVOKE ALL ON FUNCTION public.take_billing_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.take_billing_request(uuid) TO service_role;
CREATE TABLE public.billing_checkout_keys(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,environment text NOT NULL CHECK(environment IN ('live','sandbox')),request_key uuid NOT NULL DEFAULT gen_random_uuid(),expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour',PRIMARY KEY(user_id,environment));
ALTER TABLE public.billing_checkout_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_checkout_keys FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.billing_checkout_keys TO service_role;
CREATE FUNCTION public.billing_checkout_key(_user_id uuid,_environment text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k public.billing_checkout_keys%ROWTYPE;
BEGIN
 INSERT INTO billing_checkout_keys(user_id,environment) VALUES(_user_id,_environment) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT k FROM billing_checkout_keys WHERE user_id=_user_id AND environment=_environment FOR UPDATE;
 IF k.expires_at<=now()+interval '31 minutes' THEN UPDATE billing_checkout_keys SET request_key=gen_random_uuid(),expires_at=now()+interval '1 hour' WHERE user_id=_user_id AND environment=_environment RETURNING * INTO k; END IF;
 RETURN jsonb_build_object('key',k.request_key,'expiresAt',extract(epoch FROM k.expires_at)::bigint);
END;$$;
REVOKE ALL ON FUNCTION public.billing_checkout_key(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_checkout_key(uuid,text) TO service_role;

COMMIT;
