BEGIN;
-- Additive optimistic concurrency. No existing rows are removed or rewritten.
CREATE TABLE public.account_sync_revisions (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 revision bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.account_sync_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_sync_revisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.account_sync_revisions TO authenticated;
GRANT ALL ON public.account_sync_revisions TO service_role;
CREATE POLICY own_sync_revision ON public.account_sync_revisions FOR SELECT TO authenticated USING(auth.uid()=user_id);
INSERT INTO public.account_sync_revisions(user_id) SELECT user_id FROM public.profiles;
CREATE FUNCTION public.bump_account_sync_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid;
BEGIN
 uid:=CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 -- Account removal cascades must not recreate a revision for a deleted auth user.
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=uid) THEN
 INSERT INTO account_sync_revisions(user_id,revision) VALUES(uid,1)
 ON CONFLICT(user_id) DO UPDATE SET revision=account_sync_revisions.revision+1;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bump_account_sync_revision() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_profile_insert AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.bump_account_sync_revision();
CREATE TRIGGER sync_profile_update AFTER UPDATE OF display_name,character_title,level,total_xp,category_xp,character_state,settings ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.bump_account_sync_revision();
CREATE TRIGGER sync_quest_change AFTER INSERT OR UPDATE OR DELETE ON public.quests FOR EACH ROW EXECUTE FUNCTION public.bump_account_sync_revision();
CREATE TRIGGER sync_event_change AFTER INSERT OR UPDATE OR DELETE ON public.legacy_events FOR EACH ROW EXECUTE FUNCTION public.bump_account_sync_revision();
CREATE TRIGGER sync_achievement_change AFTER INSERT OR UPDATE OR DELETE ON public.user_achievements FOR EACH ROW EXECUTE FUNCTION public.bump_account_sync_revision();

-- One MVCC snapshot: paginated independent reads could otherwise pair old rows with a new revision.
CREATE FUNCTION public.read_account_save() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT jsonb_build_object(
 'revision',coalesce((SELECT revision FROM account_sync_revisions WHERE user_id=auth.uid()),0),
 'profile',(SELECT jsonb_build_object('display_name',display_name,'character_title',character_title,'level',level,'total_xp',total_xp,'category_xp',category_xp,'character_state',character_state,'settings',settings) FROM profiles WHERE user_id=auth.uid()),
 'quests',coalesce((SELECT jsonb_agg(q ORDER BY q.id) FROM quests q WHERE user_id=auth.uid()),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(e ORDER BY e.id) FROM legacy_events e WHERE user_id=auth.uid()),'[]'::jsonb),
 'achievements',coalesce((SELECT jsonb_agg(a ORDER BY a.id) FROM user_achievements a WHERE user_id=auth.uid()),'[]'::jsonb))
 WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.read_account_save() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_account_save() TO authenticated;

CREATE FUNCTION public.write_account_save(p_revision bigint,p_save jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); current_revision bigint; q jsonb; e jsonb; a text; p jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF octet_length(p_save::text)>16000000 OR jsonb_typeof(p_save)<>'object' THEN RAISE EXCEPTION 'Save too large or invalid'; END IF;
 PERFORM 1 FROM profiles WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
 SELECT revision INTO current_revision FROM account_sync_revisions WHERE user_id=uid FOR UPDATE;
 IF current_revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'SYNC_CONFLICT' USING ERRCODE='40001'; END IF;
 p:=p_save->'profile';
 -- Explicit allowlist. Unknown/billing fields are rejected, never passed to SQL updates.
 IF p IS NULL OR jsonb_typeof(p)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN ('display_name','character_title','level','total_xp','category_xp','character_state','settings')) THEN RAISE EXCEPTION 'Invalid editable profile fields' USING ERRCODE='42501'; END IF;
 UPDATE profiles SET display_name=p->>'display_name',character_title=p->>'character_title',level=(p->>'level')::integer,total_xp=(p->>'total_xp')::integer,category_xp=p->'category_xp',character_state=p->'character_state',settings=p->'settings' WHERE user_id=uid;
 -- Delete and upsert are part of the same transaction; errors retain the entire previous save.
 DELETE FROM quests WHERE user_id=uid AND id IN (SELECT value::uuid FROM jsonb_array_elements_text(p_save->'deletedQuests'));
 DELETE FROM legacy_events WHERE user_id=uid AND id IN (SELECT value::uuid FROM jsonb_array_elements_text(p_save->'deletedEvents'));
 FOR q IN SELECT value FROM jsonb_array_elements(p_save->'quests') LOOP
 IF EXISTS(SELECT 1 FROM quests WHERE id=(q->>'id')::uuid AND user_id<>uid) THEN RAISE EXCEPTION 'Record is not owned' USING ERRCODE='42501'; END IF;
 INSERT INTO quests(id,user_id,title,description,type,category,priority,difficulty,xp_reward,estimated_duration,scheduled_for,start_time,status)
 VALUES((q->>'id')::uuid,uid,q->>'title',q->>'description',q->>'type',q->>'category',q->>'priority',q->>'difficulty',(q->>'xp_reward')::integer,(q->>'estimated_duration')::integer,(q->>'scheduled_for')::date,(q->>'start_time')::time,q->>'status')
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,type=excluded.type,category=excluded.category,priority=excluded.priority,difficulty=excluded.difficulty,xp_reward=excluded.xp_reward,estimated_duration=excluded.estimated_duration,scheduled_for=excluded.scheduled_for,start_time=excluded.start_time,status=excluded.status WHERE quests.user_id=uid;
 END LOOP;
 FOR e IN SELECT value FROM jsonb_array_elements(p_save->'events') LOOP
 IF EXISTS(SELECT 1 FROM legacy_events WHERE id=(e->>'id')::uuid AND user_id<>uid) THEN RAISE EXCEPTION 'Record is not owned' USING ERRCODE='42501'; END IF;
 IF e->>'quest_id' IS NOT NULL AND EXISTS(SELECT 1 FROM quests WHERE id=(e->>'quest_id')::uuid AND user_id<>uid) THEN RAISE EXCEPTION 'Quest is not owned' USING ERRCODE='42501'; END IF;
 INSERT INTO legacy_events(id,user_id,kind,occurred_at,quest_id,category,xp_earned,metadata,content)
 VALUES((e->>'id')::uuid,uid,e->>'kind',(e->>'occurred_at')::timestamptz,(e->>'quest_id')::uuid,e->>'category',(e->>'xp_earned')::integer,coalesce(e->'metadata','{}'),e->>'content')
 ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,occurred_at=excluded.occurred_at,quest_id=excluded.quest_id,category=excluded.category,xp_earned=excluded.xp_earned,metadata=excluded.metadata,content=excluded.content WHERE legacy_events.user_id=uid;
 END LOOP;
 FOR a IN SELECT value FROM jsonb_array_elements_text(p_save->'achievements') LOOP
 INSERT INTO user_achievements(user_id,achievement_id) VALUES(uid,a) ON CONFLICT(user_id,achievement_id) DO NOTHING;
 END LOOP;
 RETURN (SELECT revision FROM account_sync_revisions WHERE user_id=uid);
END $$;
REVOKE ALL ON FUNCTION public.write_account_save(bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.write_account_save(bigint,jsonb) TO authenticated;
COMMIT;
