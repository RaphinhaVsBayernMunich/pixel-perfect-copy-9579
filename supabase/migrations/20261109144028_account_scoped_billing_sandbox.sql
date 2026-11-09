-- No accounts are enrolled by this migration. Enrollment requires owner authorization.
CREATE SCHEMA IF NOT EXISTS questos_private;
REVOKE ALL ON SCHEMA questos_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA questos_private TO service_role;
CREATE TABLE questos_private.billing_sandbox_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 500)
);
ALTER TABLE questos_private.billing_sandbox_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON questos_private.billing_sandbox_accounts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON questos_private.billing_sandbox_accounts TO service_role;
CREATE FUNCTION public.account_billing_environment(_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM questos_private.billing_sandbox_accounts
 WHERE user_id=_user_id AND expires_at>now()) THEN 'sandbox'
 ELSE (SELECT environment FROM public.billing_configuration WHERE id) END
$$;
REVOKE ALL ON FUNCTION public.account_billing_environment(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.account_billing_environment(uuid) TO service_role;
CREATE FUNCTION questos_private.guard_sandbox_enrollment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(714028,1);
 IF NEW.expires_at<=now() OR NEW.expires_at>now()+interval '30 days' THEN
  RAISE EXCEPTION 'Sandbox enrollment requires a bounded future expiry'; END IF;
 IF EXISTS(SELECT 1 FROM public.billing_accounts WHERE user_id=NEW.user_id AND environment='live')
 OR EXISTS(SELECT 1 FROM public.billing_subscriptions WHERE user_id=NEW.user_id AND environment='live') THEN
  RAISE EXCEPTION 'Use a dedicated account without live billing history'; END IF;
 RETURN NEW;
END$$;
REVOKE ALL ON FUNCTION questos_private.guard_sandbox_enrollment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_sandbox_enrollment BEFORE INSERT OR UPDATE ON questos_private.billing_sandbox_accounts
FOR EACH ROW EXECUTE FUNCTION questos_private.guard_sandbox_enrollment();
CREATE FUNCTION questos_private.guard_billing_environment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(714028,1);
 IF NEW.environment<>public.account_billing_environment(NEW.user_id) THEN
  RAISE EXCEPTION 'Billing environment does not match account'; END IF;
 -- Enrolled accounts never acquire real billing history, even after enrollment expiry.
 IF NEW.environment='live' AND EXISTS(SELECT 1 FROM questos_private.billing_sandbox_accounts WHERE user_id=NEW.user_id) THEN
  RAISE EXCEPTION 'Test identities cannot acquire live billing'; END IF;
 RETURN NEW;
END$$;
REVOKE ALL ON FUNCTION questos_private.guard_billing_environment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_account_environment BEFORE INSERT OR UPDATE ON public.billing_accounts
FOR EACH ROW EXECUTE FUNCTION questos_private.guard_billing_environment();
CREATE TRIGGER guard_subscription_environment BEFORE INSERT OR UPDATE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION questos_private.guard_billing_environment();
-- Monthly canonical billing; retain finite annual receipts and all existing security protections.
CREATE OR REPLACE FUNCTION public.subscription_snapshot(_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles%ROWTYPE; s public.billing_subscriptions%ROWTYPE; env text; until_at timestamptz; tier text:='free'; state text:='free';
BEGIN
 SELECT * INTO STRICT p FROM profiles WHERE user_id=_user_id;
 env := public.account_billing_environment(_user_id);
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


