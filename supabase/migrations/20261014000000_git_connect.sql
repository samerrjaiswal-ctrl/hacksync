-- Migration: 20261014000000_git_connect.sql
-- Description: Schema and RLS policies for Git Connect repository linking and contributor management.
-- NOTE: PROPOSED MIGRATION - DO NOT EXECUTE REMOTELY WITHOUT EXPLICIT APPROVAL.

-- 1. Table: team_git_repositories
-- Stores the linked GitHub repository for each HackSync team.
-- One active repository per team.
CREATE TABLE IF NOT EXISTS public.team_git_repositories (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repo_url text NOT NULL CHECK (char_length(trim(repo_url)) > 0),
  owner text NOT NULL CHECK (char_length(trim(owner)) > 0),
  repo_name text NOT NULL CHECK (char_length(trim(repo_name)) > 0),
  default_branch text NOT NULL DEFAULT 'main',
  is_private boolean NOT NULL DEFAULT false,
  connected_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.team_git_repositories ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's connected repository
CREATE POLICY "Team members can view team git repo"
ON public.team_git_repositories
FOR SELECT
USING (public.is_team_member(team_id));

-- Only the team leader can link a repository for their team
CREATE POLICY "Team leader can insert team git repo"
ON public.team_git_repositories
FOR INSERT
WITH CHECK (public.is_team_leader(team_id) AND leader_id = auth.uid());

-- Only the team leader can update the team git repository
CREATE POLICY "Team leader can update team git repo"
ON public.team_git_repositories
FOR UPDATE
USING (public.is_team_leader(team_id));

-- Only the team leader can disconnect/delete the team git repository
CREATE POLICY "Team leader can delete team git repo"
ON public.team_git_repositories
FOR DELETE
USING (public.is_team_leader(team_id));


-- 2. Table: team_member_git_profiles
-- Stores linked GitHub usernames and collaborator invitation statuses per member.
CREATE TABLE IF NOT EXISTS public.team_member_git_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_username text NOT NULL CHECK (char_length(trim(github_username)) > 0),
  github_avatar_url text,
  invitation_status text NOT NULL DEFAULT 'not_connected' 
    CHECK (invitation_status IN (
      'not_connected', 
      'pending_invitation', 
      'invitation_sent', 
      'already_collaborator', 
      'permission_denied', 
      'invalid_username', 
      'failed'
    )),
  last_status_check timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.team_member_git_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_team_member_git_profiles_team ON public.team_member_git_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_git_profiles_user ON public.team_member_git_profiles(user_id);

-- Team members can view all member GitHub profiles within their team
CREATE POLICY "Team members can view member git profiles"
ON public.team_member_git_profiles
FOR SELECT
USING (public.is_team_member(team_id));

-- Members can insert their own GitHub username (cannot set for other members)
CREATE POLICY "Members can link own git profile"
ON public.team_member_git_profiles
FOR INSERT
WITH CHECK (public.is_team_member(team_id) AND user_id = auth.uid());

-- Members can update their own username; Leaders can update invitation status
CREATE POLICY "Members or leader can update git profile"
ON public.team_member_git_profiles
FOR UPDATE
USING (user_id = auth.uid() OR public.is_team_leader(team_id));

-- Members can remove their own profile; Leaders can remove member profiles
CREATE POLICY "Members or leader can delete git profile"
ON public.team_member_git_profiles
FOR DELETE
USING (user_id = auth.uid() OR public.is_team_leader(team_id));


-- 3. Table: team_git_tokens
-- Secure storage for GitHub OAuth installation tokens (leader repo management)
-- Strictly accessible only via backend Edge Functions with service_role.
-- Never exposed to client queries or RLS SELECT.
CREATE TABLE IF NOT EXISTS public.team_git_tokens (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_user_id text,
  access_token text NOT NULL,
  token_type text DEFAULT 'bearer',
  scope text DEFAULT 'repo',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.team_git_tokens ENABLE ROW LEVEL SECURITY;

-- Deny all client-side direct access (even SELECT). Only backend service_role can access.
CREATE POLICY "No direct client access to team git tokens"
ON public.team_git_tokens
FOR ALL
USING (false);
