-- Migration: v2_cloud_storage_and_slots
-- Description:
--   * Real member slots (member_no) with uniqueness per team (owner = slot 1)
--   * Private Storage bucket `team-files` so files stay downloadable when the uploader is offline
--   * Storage RLS scoped to team membership via path prefix `<team_id>/...`
--   * Public preview RPC so the join form can show team name + free slots
--   * Realtime publication for live roster / file updates

-- 1. Member slots ------------------------------------------------------------
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS member_no smallint;

-- Backfill: owner = 1, others parsed from legacy "(Member N)" names, else next free slot
UPDATE public.team_members SET member_no = 1 WHERE role = 'owner' AND member_no IS NULL;

UPDATE public.team_members tm
SET member_no = (regexp_match(p.display_name, '\(Member (\d)\)'))[1]::smallint
FROM public.profiles p
WHERE p.id = tm.user_id AND tm.member_no IS NULL
  AND p.display_name ~ '\(Member [2-6]\)';

DO $$
DECLARE r record; free_slot smallint;
BEGIN
  FOR r IN SELECT team_id, user_id FROM public.team_members WHERE member_no IS NULL LOOP
    SELECT s INTO free_slot FROM generate_series(2,6) s
    WHERE s NOT IN (SELECT member_no FROM public.team_members WHERE team_id = r.team_id AND member_no IS NOT NULL)
    ORDER BY s LIMIT 1;
    UPDATE public.team_members SET member_no = free_slot WHERE team_id = r.team_id AND user_id = r.user_id;
  END LOOP;
END $$;

-- Strip legacy suffix from names
UPDATE public.profiles SET display_name = trim(regexp_replace(display_name, '\s*\(Member \d\)\s*$', ''))
WHERE display_name ~ '\(Member \d\)\s*$';

ALTER TABLE public.team_members ALTER COLUMN member_no SET NOT NULL;
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_member_no_range;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_member_no_range CHECK (member_no BETWEEN 1 AND 6);
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_slot_unique;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_slot_unique UNIQUE (team_id, member_no);

-- create_team: owner takes slot 1
CREATE OR REPLACE FUNCTION public.create_team(team_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_team_id uuid;
  new_join_code text;
BEGIN
  IF char_length(trim(team_name)) = 0 THEN
    RAISE EXCEPTION 'Team name cannot be empty';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_guest'), 'false'))::boolean = true THEN
    RAISE EXCEPTION 'Guest members are not allowed to create teams';
  END IF;

  LOOP
    new_join_code := substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE join_code = new_join_code);
  END LOOP;

  INSERT INTO public.teams (name, join_code, owner_id)
  VALUES (trim(team_name), new_join_code, auth.uid())
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role, member_no)
  VALUES (new_team_id, auth.uid(), 'owner', 1);

  RETURN new_team_id;
END;
$$;

-- Legacy join RPC is no longer used by the app (guests join via edge function). Keep it safe:
-- assign the first free slot so it never violates NOT NULL.
CREATE OR REPLACE FUNCTION public.join_team_by_code(code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_team_id uuid;
  free_slot smallint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO target_team_id FROM public.teams WHERE join_code = lower(trim(code));
  IF target_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;
  IF public.is_team_member(target_team_id) THEN
    RETURN target_team_id;
  END IF;
  SELECT s INTO free_slot FROM generate_series(2,6) s
  WHERE s NOT IN (SELECT member_no FROM public.team_members WHERE team_id = target_team_id)
  ORDER BY s LIMIT 1;
  IF free_slot IS NULL THEN
    RAISE EXCEPTION 'Team has reached the maximum of 6 members';
  END IF;
  INSERT INTO public.team_members (team_id, user_id, role, member_no)
  VALUES (target_team_id, auth.uid(), 'member', free_slot);
  RETURN target_team_id;
END;
$$;

-- 2. Public join preview -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_team_preview(code text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'name', t.name,
    'taken_slots', coalesce((SELECT json_agg(tm.member_no ORDER BY tm.member_no) FROM public.team_members tm WHERE tm.team_id = t.id), '[]'::json),
    'member_count', (SELECT count(*) FROM public.team_members tm WHERE tm.team_id = t.id)
  )
  FROM public.teams t
  WHERE t.join_code = lower(trim(code));
$$;
GRANT EXECUTE ON FUNCTION public.get_team_preview(text) TO anon, authenticated, service_role;

-- 3. Storage bucket + RLS ----------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('team-files', 'team-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

CREATE OR REPLACE FUNCTION public.storage_team_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN split_part(object_name, '/', 1)::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.storage_team_id(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "team files read" ON storage.objects;
DROP POLICY IF EXISTS "team files upload" ON storage.objects;
DROP POLICY IF EXISTS "team files delete" ON storage.objects;

CREATE POLICY "team files read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'team-files' AND public.is_team_member(public.storage_team_id(name))
);
CREATE POLICY "team files upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'team-files' AND public.is_team_member(public.storage_team_id(name))
);
CREATE POLICY "team files delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'team-files' AND (
    owner_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = public.storage_team_id(name) AND t.owner_id = auth.uid())
  )
);

-- 4. Realtime ----------------------------------------------------------------
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.shared_files REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='team_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='shared_files') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_files;
  END IF;
END $$;
