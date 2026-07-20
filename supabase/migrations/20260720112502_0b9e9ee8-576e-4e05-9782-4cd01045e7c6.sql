
-- 1. Extend profiles with subscription state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS entitlement text NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS premium_expiration timestamptz,
  ADD COLUMN IF NOT EXISTS revenuecat_customer_id text,
  ADD COLUMN IF NOT EXISTS last_verification timestamptz,
  ADD COLUMN IF NOT EXISTS current_plan text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('trial','free','premium','expired'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_entitlement_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_entitlement_check
  CHECK (entitlement IN ('free','premium'));

-- 2. Installations table for trial-abuse prevention
CREATE TABLE IF NOT EXISTS public.installations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  trial_consumed boolean NOT NULL DEFAULT false,
  trial_consumed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trial_consumed_at timestamptz,
  user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]
);
GRANT SELECT ON public.installations TO authenticated;
GRANT ALL ON public.installations TO service_role;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read installations that reference them"
  ON public.installations FOR SELECT
  USING (auth.uid() = ANY (user_ids) OR auth.uid() = trial_consumed_by);

-- 3. Subscription events (audit log — written by server only)
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  source text NOT NULL DEFAULT 'server',
  product_id text,
  entitlement text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own subscription events"
  ON public.subscription_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS subscription_events_user_idx
  ON public.subscription_events(user_id, occurred_at DESC);

-- 4. Helper: has_active_premium
CREATE OR REPLACE FUNCTION public.has_active_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND entitlement = 'premium'
      AND (
        subscription_status = 'premium'
        OR (subscription_status = 'trial' AND trial_end > now())
      )
  );
$$;

-- 5. Update handle_new_user trigger to grant a 7-day trial on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, display_name,
    subscription_status, entitlement,
    trial_start, trial_end, current_plan
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'trial', 'premium',
    now(), now() + interval '7 days', 'trial'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill: give existing users without subscription state a 7-day trial from now
UPDATE public.profiles
SET subscription_status = 'trial',
    entitlement = 'premium',
    trial_start = COALESCE(trial_start, now()),
    trial_end = COALESCE(trial_end, now() + interval '7 days'),
    current_plan = COALESCE(current_plan, 'trial')
WHERE subscription_status IS NULL OR subscription_status = '';
