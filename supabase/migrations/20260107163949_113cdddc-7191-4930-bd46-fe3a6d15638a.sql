-- Create a function to get all members of a group (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_group_members(_group_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  profile_id uuid,
  full_name text,
  email text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.role,
    gm.joined_at,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.avatar_url
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = _group_id
    AND EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = _group_id AND user_id = auth.uid()
    )
$$;