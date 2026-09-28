CREATE TABLE public.ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  feature text NOT NULL CHECK (feature IN ('morning_brief','goal_to_quests','reflection_prompt','starter_quests')),
  provider text NOT NULL DEFAULT 'deepseek' CHECK (provider = 'deepseek'),
  model text NOT NULL DEFAULT 'deepseek-flash' CHECK (model = 'deepseek-flash'),
  started_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz NOT NULL DEFAULT now() + interval '90 seconds',
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','succeeded','failed')),
  error_code text CHECK (error_code IN ('AI_AUTH_REQUIRED','AI_INVALID_INPUT','AI_UNAVAILABLE','AI_QUOTA','AI_BUSY','AI_PROVIDER_AUTH','AI_BALANCE','AI_PROVIDER_REQUEST','AI_TIMEOUT','AI_NETWORK','AI_INVALID_RESPONSE')),
  input_tokens integer CHECK (input_tokens BETWEEN 0 AND 10000000),
  output_tokens integer CHECK (output_tokens BETWEEN 0 AND 10000000)
);
CREATE INDEX ai_requests_active ON public.ai_requests (lease_expires_at, user_id) WHERE status = 'reserved';
CREATE INDEX ai_requests_usage_date ON public.ai_requests (usage_date);
CREATE INDEX ai_requests_user_time ON public.ai_requests (user_id, started_at DESC);
REVOKE ALL ON public.ai_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_requests TO service_role;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.reserve_ai_request(
  _user_id uuid, _feature text, _free_limit integer, _trial_limit integer, _premium_limit integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  day date := (now() AT TIME ZONE 'utc')::date;
  daily_limit integer;
  used integer;
  request_id uuid;
BEGIN
  IF _feature NOT IN ('morning_brief','goal_to_quests','reflection_prompt','starter_quests')
     OR _feature IS NULL OR _user_id IS NULL
     OR _free_limit IS NULL OR _trial_limit IS NULL OR _premium_limit IS NULL
     OR _free_limit NOT BETWEEN 1 AND 10000 OR _trial_limit NOT BETWEEN 1 AND 10000
     OR _premium_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Invalid AI reservation configuration';
  END IF;
  PERFORM pg_advisory_xact_lock(714027, 1);
  SELECT * INTO STRICT p FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  daily_limit := _free_limit;
  IF p.entitlement = 'premium' AND p.subscription_status = 'trial' AND p.trial_end > now() THEN
    daily_limit := _trial_limit;
  ELSIF p.entitlement = 'premium' AND p.subscription_status = 'premium'
    AND (p.premium_expiration IS NULL OR p.premium_expiration > now()) THEN
    daily_limit := _premium_limit;
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
REVOKE ALL ON FUNCTION public.reserve_ai_request(uuid,text,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request(uuid,text,integer,integer,integer) TO service_role;

CREATE FUNCTION public.finish_ai_request(_request_id uuid,_error_code text,_input_tokens integer,_output_tokens integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ai_requests SET completed_at = now(),lease_expires_at = now(),
    status = CASE WHEN _error_code IS NULL THEN 'succeeded' ELSE 'failed' END,
    error_code = _error_code,input_tokens = _input_tokens,output_tokens = _output_tokens
    WHERE id = _request_id AND status = 'reserved';
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_ai_request(uuid,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_ai_request(uuid,text,integer,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid,text) FROM PUBLIC,anon,authenticated,service_role;