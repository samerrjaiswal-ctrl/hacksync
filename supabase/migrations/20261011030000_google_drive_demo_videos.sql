-- Migration: 20261011030000_google_drive_demo_videos.sql
-- Description: Schema and RLS policies for Google Drive Demo Video Library

-- 1. Table for storing connected Google Drive OAuth credentials per team
-- Only accessible via service_role in backend Edge Functions (tokens are never exposed to clients)
CREATE TABLE IF NOT EXISTS public.team_google_drive_tokens (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_email text,
  refresh_token text NOT NULL,
  access_token text,
  expires_at timestamptz,
  root_folder_id text,
  folder_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.team_google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Deny all client-side direct access (even SELECT). Only service_role can access tokens.
CREATE POLICY "No direct client access to google drive tokens" 
ON public.team_google_drive_tokens 
FOR ALL 
USING (false);

-- 2. Table for storing demo video metadata
CREATE TABLE IF NOT EXISTS public.team_demo_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  google_file_id text NOT NULL,
  web_view_link text NOT NULL,
  size_bytes bigint DEFAULT 0 CHECK (size_bytes >= 0),
  mime_type text DEFAULT 'video/mp4',
  sharing_access text NOT NULL DEFAULT 'restricted' CHECK (sharing_access IN ('restricted', 'anyone_with_link')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.team_demo_videos ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_demo_videos_team_id ON public.team_demo_videos(team_id);
CREATE INDEX IF NOT EXISTS idx_team_demo_videos_uploader_id ON public.team_demo_videos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_team_demo_videos_created_at ON public.team_demo_videos(created_at DESC);

-- RLS Policies for team_demo_videos
-- Team members can view demo videos in their team
CREATE POLICY "Members can view team demo videos" 
ON public.team_demo_videos 
FOR SELECT 
USING (public.is_team_member(team_id));

-- Team members can insert demo videos for their team
CREATE POLICY "Members can insert team demo videos" 
ON public.team_demo_videos 
FOR INSERT 
WITH CHECK (public.is_team_member(team_id) AND uploader_id = auth.uid());

-- Uploader or Team Leader can update demo video metadata
CREATE POLICY "Uploader or Owner can update demo video" 
ON public.team_demo_videos 
FOR UPDATE 
USING (
  uploader_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
)
WITH CHECK (
  uploader_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- Uploader or Team Leader can delete demo videos
CREATE POLICY "Uploader or Owner can delete demo video" 
ON public.team_demo_videos 
FOR DELETE 
USING (
  uploader_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- 3. Secure RPC to safely check team Google Drive connection status without leaking tokens
CREATE OR REPLACE FUNCTION public.get_team_google_drive_status(p_team_id uuid)
RETURNS TABLE (
  is_connected boolean,
  google_email text,
  is_leader boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_member boolean;
  v_is_leader boolean;
  v_email text;
BEGIN
  -- Validate authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate team membership
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = p_team_id AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;

  -- Check if caller is team owner/leader
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = auth.uid()
  ) INTO v_is_leader;

  -- Get connected email if exists
  SELECT t.google_email INTO v_email
  FROM public.team_google_drive_tokens t
  WHERE t.team_id = p_team_id;

  RETURN QUERY SELECT 
    (v_email IS NOT NULL),
    v_email,
    v_is_leader;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_google_drive_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_google_drive_status(uuid) TO service_role;
