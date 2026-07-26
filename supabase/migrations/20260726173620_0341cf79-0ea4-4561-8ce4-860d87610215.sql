
-- analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  platform TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time ON public.analytics_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analytics select" ON public.analytics_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own analytics insert" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ai usage (one row per user per day)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  request_count INTEGER NOT NULL DEFAULT 0,
  last_feature TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai usage select" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user settings JSON on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- helper: increment ai usage atomically (server-only)
CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user_id UUID, _feature TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, usage_date, request_count, last_feature, updated_at)
  VALUES (_user_id, (now() AT TIME ZONE 'utc')::date, 1, _feature, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.ai_usage.request_count + 1,
    last_feature = _feature,
    updated_at = now()
  RETURNING request_count INTO new_count;
  RETURN new_count;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) TO service_role;
