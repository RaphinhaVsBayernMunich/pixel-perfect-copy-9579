-- Supabase platform defaults can grant table writes even when historical migrations
-- only explicitly grant SELECT. Keep existing RLS and remove those extra privileges.
BEGIN;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON public.ai_usage, public.installations, public.subscription_events,
  public.analytics_events FROM authenticated;
GRANT SELECT ON public.ai_usage, public.installations, public.subscription_events,
  public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO authenticated;

-- New app objects must receive explicit grants in their migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
COMMIT;
