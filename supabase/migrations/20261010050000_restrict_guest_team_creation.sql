-- Migration: restrict_guest_team_creation
-- Description: Prevent guest members (identified by is_guest metadata) from creating new teams.

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

  -- Block guest users from creating teams
  IF (coalesce((auth.jwt() -> 'user_metadata' ->> 'is_guest'), 'false'))::boolean = true THEN
    RAISE EXCEPTION 'Guest members are not allowed to create teams';
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
