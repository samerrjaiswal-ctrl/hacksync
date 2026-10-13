-- Migration: 0001_initial_schema.sql
-- Description: Initial HackSync schema with strict RLS and concurrent-safe limits.

-- Ensure pgcrypto is available in the extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Revoke default execute privileges from public for functions to enforce explicit grants
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 1. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) > 0),
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  join_code text UNIQUE NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 3. Team Members
CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 4. Shared Files
CREATE TABLE public.shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_filename text NOT NULL CHECK (char_length(trim(original_filename)) > 0),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  mime_type text,
  storage_ref text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

-- 5. Indexes
CREATE INDEX idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_shared_files_team_id ON public.shared_files(team_id);
CREATE INDEX idx_shared_files_uploader_id ON public.shared_files(uploader_id);

-- 6. Helper Function for RLS (Avoids infinite recursion and blocks data leakage)
CREATE OR REPLACE FUNCTION public.is_team_member(t_id uuid) 
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = t_id AND user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO service_role;

-- 7. RLS Policies

-- Profiles
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can read teammate profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.user_id = profiles.id AND public.is_team_member(tm.team_id)
  )
);

-- Teams
CREATE POLICY "Members can view teams" ON public.teams FOR SELECT USING (
  public.is_team_member(id)
);
CREATE POLICY "Owner can update team" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete team" ON public.teams FOR DELETE USING (owner_id = auth.uid());

-- Team Members
CREATE POLICY "Users can view memberships of teams they belong to" ON public.team_members FOR SELECT USING (
  public.is_team_member(team_id)
);
CREATE POLICY "Users can leave teams if not owner" ON public.team_members FOR DELETE USING (
  user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
CREATE POLICY "Team owners can delete other members" ON public.team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()) AND user_id != auth.uid()
);
CREATE POLICY "Team owners can update members but not demote self" ON public.team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()) 
  AND ( (user_id != auth.uid() AND role = 'member') OR (user_id = auth.uid() AND role = 'owner') )
);

-- Shared Files
CREATE POLICY "Members can view team files" ON public.shared_files FOR SELECT USING (
  public.is_team_member(team_id)
);
CREATE POLICY "Members can upload files" ON public.shared_files FOR INSERT WITH CHECK (
  public.is_team_member(team_id) AND uploader_id = auth.uid()
);
CREATE POLICY "Uploader or Owner can update file metadata" ON public.shared_files FOR UPDATE USING (
  uploader_id = auth.uid() OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
) WITH CHECK (
  uploader_id = auth.uid() OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);
CREATE POLICY "Uploader or Owner can delete file" ON public.shared_files FOR DELETE USING (
  uploader_id = auth.uid() OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- 8. Team Creation RPC
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

  new_join_code := substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8);

  INSERT INTO public.teams (name, join_code, owner_id)
  VALUES (trim(team_name), new_join_code, auth.uid())
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, auth.uid(), 'owner');

  RETURN new_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team(text) TO service_role;

-- 9. Team Member Limit Enforcement Trigger
CREATE OR REPLACE FUNCTION public.check_team_member_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  member_count int;
BEGIN
  -- Lock the team row to serialize concurrent inserts securely
  PERFORM 1 FROM public.teams WHERE id = NEW.team_id FOR UPDATE;

  SELECT count(*) INTO member_count FROM public.team_members WHERE team_id = NEW.team_id;

  IF member_count >= 6 THEN
    RAISE EXCEPTION 'Team has reached the maximum of 6 members';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_team_limit
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.check_team_member_limit();

-- 10. Join Team RPC
CREATE OR REPLACE FUNCTION public.join_team_by_code(code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO target_team_id FROM public.teams WHERE join_code = code;

  IF target_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;

  -- Safe return if already a member
  IF public.is_team_member(target_team_id) THEN
    RETURN target_team_id;
  END IF;

  -- Limit is enforced securely by check_team_member_limit trigger
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (target_team_id, auth.uid(), 'member');

  RETURN target_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text) TO service_role;

-- 11. Immutable Metadata Triggers
CREATE OR REPLACE FUNCTION public.enforce_immutable_team_members()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    RAISE EXCEPTION 'Cannot change team_id of a team member';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id of a team member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_team_members_pk_update
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_immutable_team_members();

CREATE OR REPLACE FUNCTION public.enforce_immutable_shared_files()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    RAISE EXCEPTION 'Cannot change team_id of a shared file';
  END IF;
  IF NEW.uploader_id IS DISTINCT FROM OLD.uploader_id THEN
    RAISE EXCEPTION 'Cannot change uploader_id of a shared file';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_shared_files_metadata_update
BEFORE UPDATE ON public.shared_files
FOR EACH ROW
EXECUTE FUNCTION public.enforce_immutable_shared_files();
