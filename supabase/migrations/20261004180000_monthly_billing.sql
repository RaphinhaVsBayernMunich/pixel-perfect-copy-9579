-- Monthly canonical billing; retain finite annual receipts and all existing security protections.
CREATE OR REPLACE FUNCTION public.subscription_snapshot(_user_id uuid) RETURNS jsonb
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
 'current_plan',CASE WHEN tier='premium' THEN CASE WHEN s.product_id IN ('premium_monthly','questos_premium_monthly','questos_premium_monthly:monthly') THEN 'premium_monthly' ELSE 'premium_annual' END WHEN tier='trial' THEN 'trial' ELSE NULL END,
 'trial_start',p.trial_start,'trial_end',p.trial_end,'premium_expiration',until_at,
 'paid_until',s.paid_until,'grace_end',CASE WHEN state='grace' THEN until_at ELSE NULL END,
 'cancel_at_period_end',COALESCE(s.cancel_at_period_end,false),'billing_provider',COALESCE(s.provider,(SELECT provider FROM billing_subscriptions WHERE user_id=_user_id AND environment=env ORDER BY event_at DESC LIMIT 1)),
 'environment',env,'last_verification',s.event_at,'revenuecat_customer_id',NULL);
END;$$;
REVOKE ALL ON FUNCTION public.subscription_snapshot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.subscription_snapshot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_billing_event(_event jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous public.billing_subscriptions%ROWTYPE; uid uuid:=(_event->>'userId')::uuid; p text:=_event->>'provider'; env text:=_event->>'environment'; sid text:=_event->>'subscriptionId'; event_time timestamptz:=(_event->>'eventAt')::timestamptz; rank integer; failure timestamptz;
BEGIN
 IF p IS NULL OR env IS NULL OR sid IS NULL OR event_time IS NULL OR _event->>'eventId' IS NULL OR _event->>'productId' IS NULL OR _event->>'status' IS NULL OR _event->>'paidUntil' IS NULL OR p NOT IN ('stripe','revenuecat') OR env NOT IN ('sandbox','live') OR (_event->>'productId') NOT IN ('premium_monthly','questos_premium_monthly','questos_premium_monthly:monthly','premium_annual','questos_premium_annual','questos_premium_annual:annual') OR length(_event->>'eventId') NOT BETWEEN 1 AND 250 OR length(sid) NOT BETWEEN 1 AND 250 OR event_time>now()+interval '5 minutes' THEN RAISE EXCEPTION 'Invalid billing event'; END IF;
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
 ON CONFLICT(provider,environment,subscription_id) DO UPDATE SET user_id=EXCLUDED.user_id,customer_id=EXCLUDED.customer_id,product_id=EXCLUDED.product_id,status=EXCLUDED.status,paid_until=EXCLUDED.paid_until,failure_since=EXCLUDED.failure_since,cancel_at_period_end=EXCLUDED.cancel_at_period_end,event_at=EXCLUDED.event_at,event_rank=EXCLUDED.event_rank;
 -- Reconciliation replaces only the corresponding legacy source, never another provider.
 UPDATE billing_subscriptions SET status='expired' WHERE provider='legacy' AND user_id=uid AND environment=env AND customer_id=_event->>'customerId';
 INSERT INTO subscription_events(user_id,kind,source,product_id,entitlement,metadata) VALUES(uid,_event->>'status',p,_event->>'productId',CASE WHEN _event->>'status' IN ('active','grace') THEN 'premium' ELSE 'free' END,jsonb_build_object('event_id',_event->>'eventId','environment',env,'subscription_id',sid));
 RETURN true;
END;$$;
REVOKE ALL ON FUNCTION public.apply_billing_event(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_event(jsonb) TO service_role;
