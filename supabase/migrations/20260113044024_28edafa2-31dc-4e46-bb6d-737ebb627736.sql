-- Create a security definer function to check if user is a group admin
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id
      AND created_by = auth.uid()
  )
$$;

-- Add UPDATE policy for group_members so admins can promote/demote roles
CREATE POLICY "Admins can update member roles"
ON public.group_members
FOR UPDATE
USING (public.is_group_admin(group_id))
WITH CHECK (public.is_group_admin(group_id));