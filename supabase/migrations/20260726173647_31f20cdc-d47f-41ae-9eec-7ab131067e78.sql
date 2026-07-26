REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) TO service_role;