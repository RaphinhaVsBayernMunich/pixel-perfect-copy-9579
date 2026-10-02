-- Run only against the owner-controlled destination; all data changes roll back.
BEGIN;
DO $$DECLARE bad integer; BEGIN
  SELECT count(*) INTO bad FROM pg_tables t JOIN pg_class c
    ON c.oid=format('%I.%I',t.schemaname,t.tablename)::regclass
    WHERE t.schemaname='public' AND (NOT c.relrowsecurity
      OR has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE'));
  IF bad<>0 THEN RAISE EXCEPTION 'RLS or anonymous grant failure'; END IF;
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>18
    THEN RAISE EXCEPTION 'Missing application tables'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname NOT IN ('read_account_save','write_account_save')
      AND (has_function_privilege('anon',p.oid,'EXECUTE')
        OR has_function_privilege('authenticated',p.oid,'EXECUTE')))
    THEN RAISE EXCEPTION 'Privileged RPC exposure'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN
      ('reserve_ai_request','finish_ai_request','has_active_premium','apply_billing_event','subscription_snapshot')
      AND NOT has_function_privilege('service_role',p.oid,'EXECUTE'))
    THEN RAISE EXCEPTION 'Missing service role permission'; END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='D'
    AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace))
    THEN RAISE EXCEPTION 'Restore left triggers disabled'; END IF;
END$$;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.profiles LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$DECLARE field text; affected integer; snapshot jsonb; BEGIN
  UPDATE public.profiles SET display_name=display_name,total_xp=total_xp+1,
    settings=settings WHERE user_id=auth.uid();
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Normal profile edits failed'; END IF;
  FOREACH field IN ARRAY ARRAY['subscription_status','entitlement','trial_start','trial_end',
    'premium_expiration','stripe_customer_id','revenuecat_customer_id','current_plan','last_verification'] LOOP
    BEGIN
      EXECUTE format('UPDATE public.profiles SET %I=NULL WHERE user_id=auth.uid()',field);
      RAISE EXCEPTION 'Billing field writable: %',field;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  BEGIN PERFORM public.has_active_premium(auth.uid());
    RAISE EXCEPTION 'Premium RPC exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.reserve_ai_request(auth.uid(),'morning_brief',10,40,500);
    RAISE EXCEPTION 'Quota RPC exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  snapshot:=public.read_account_save();
  IF snapshot->'profile' IS NULL OR snapshot->'profile'='null'::jsonb
    THEN RAISE EXCEPTION 'Owned account snapshot missing'; END IF;
  BEGIN
    PERFORM public.write_account_save((snapshot->>'revision')::bigint,
      jsonb_build_object('profile',jsonb_build_object('entitlement','premium')));
    RAISE EXCEPTION 'Sync changed billing'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$BEGIN
  IF EXISTS(SELECT 1 FROM public.profiles) OR EXISTS(SELECT 1 FROM public.user_achievements)
    THEN RAISE EXCEPTION 'Cross-account read'; END IF;
END$$;
RESET ROLE;
ROLLBACK;
SELECT 'destination_security_passed' status;
