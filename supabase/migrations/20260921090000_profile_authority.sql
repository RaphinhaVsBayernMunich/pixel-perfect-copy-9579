-- Billing fields are server-owned. RLS alone only restricts rows, not columns.
BEGIN;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (
  display_name, avatar_url, character_title, timezone, day_start_hour,
  level, total_xp, category_xp, character_state, settings
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users edit own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- The SECURITY DEFINER signup trigger remains the only signup creation path.
-- Repair missing profiles without inventing paid access or restarting trials.
INSERT INTO public.profiles (user_id, display_name, subscription_status, entitlement)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)), 'free', 'free'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_active_premium(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND entitlement = 'premium'
    AND ((subscription_status = 'trial' AND trial_end > now())
      OR (subscription_status = 'premium' AND
        (premium_expiration IS NULL OR premium_expiration > now())))
  );
$$;
REVOKE ALL ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO service_role;

-- Registers an existing signup trial; never grants paid status or restarts a trial.
-- Both profile and installation changes are transactional and service-role-only.
CREATE FUNCTION public.register_signup_trial(_user_id uuid, _fingerprint text, _platform text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  i public.installations%ROWTYPE;
  first_registration boolean;
BEGIN
  SELECT * INTO STRICT p FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF p.subscription_status <> 'trial' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_eligible', 'status', p.subscription_status);
  END IF;
  -- Older profiles added by the original migration may have no trial timestamps.
  -- Their window is anchored to creation, never to an arbitrary client request.
  IF p.trial_end IS NULL THEN
    UPDATE public.profiles SET trial_start = COALESCE(trial_start, created_at),
      trial_end = COALESCE(trial_start, created_at) + interval '7 days'
      WHERE user_id = _user_id RETURNING * INTO p;
  END IF;
  IF p.trial_end <= now() THEN
    UPDATE public.profiles SET subscription_status = 'expired', entitlement = 'free'
      WHERE user_id = _user_id;
    RETURN jsonb_build_object('granted', false, 'reason', 'trial_expired', 'status', 'expired');
  END IF;

  INSERT INTO public.installations (fingerprint, platform) VALUES (_fingerprint, _platform)
    ON CONFLICT (fingerprint) DO NOTHING;
  SELECT * INTO STRICT i FROM public.installations WHERE fingerprint = _fingerprint FOR UPDATE;
  IF i.trial_consumed AND i.trial_consumed_by IS DISTINCT FROM _user_id THEN
    UPDATE public.profiles SET subscription_status = 'expired', entitlement = 'free',
      last_verification = now() WHERE user_id = _user_id;
    INSERT INTO public.subscription_events (user_id, kind, source)
      VALUES (_user_id, 'trial_denied', 'server');
    RETURN jsonb_build_object('granted', false, 'reason', 'installation_already_consumed_trial', 'status', 'expired');
  END IF;
  first_registration := NOT i.trial_consumed;
  UPDATE public.installations SET trial_consumed = true, trial_consumed_by = _user_id,
    trial_consumed_at = COALESCE(trial_consumed_at, now()), last_seen_at = now(),
    user_ids = CASE WHEN _user_id = ANY(user_ids) THEN user_ids ELSE array_append(user_ids, _user_id) END
    WHERE id = i.id;
  IF first_registration THEN
    INSERT INTO public.subscription_events (user_id, kind, source)
      VALUES (_user_id, 'trial_registered', 'server');
  END IF;
  RETURN jsonb_build_object('granted', true, 'reason', 'existing_trial', 'status', 'trial', 'trialEnd', p.trial_end);
END;
$$;
REVOKE ALL ON FUNCTION public.register_signup_trial(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_signup_trial(uuid, text, text) TO service_role;
COMMIT;
