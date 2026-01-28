-- Allow group admins/creators to add other users without weakening group_members RLS.
-- Client will call this function instead of inserting directly into public.group_members.

CREATE OR REPLACE FUNCTION public.add_group_member(
  _group_id uuid,
  _user_id uuid,
  _role text DEFAULT 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Only group creator or an existing admin can add members
  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = _group_id
      AND (
        g.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.group_members gm
          WHERE gm.group_id = _group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = _group_id
      AND gm.user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (_group_id, _user_id, _role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_group_member(uuid, uuid, text) TO authenticated;
