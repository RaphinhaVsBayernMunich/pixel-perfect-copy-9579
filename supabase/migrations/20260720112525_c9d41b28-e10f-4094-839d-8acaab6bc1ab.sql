
REVOKE EXECUTE ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO service_role;
