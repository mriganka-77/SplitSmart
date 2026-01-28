-- Drop ALL existing policies on groups and group_members
DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view own membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can create own membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- Create simple, non-recursive policies for groups
-- Anyone authenticated can create a group
CREATE POLICY "Authenticated users can create groups" 
ON public.groups 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

-- Users can view groups they created (simple check, no joins)
CREATE POLICY "Creators can view own groups" 
ON public.groups 
FOR SELECT TO authenticated 
USING (created_by = auth.uid());

-- Creators can update their groups
CREATE POLICY "Creators can update own groups" 
ON public.groups 
FOR UPDATE TO authenticated 
USING (created_by = auth.uid());

-- Creators can delete their groups
CREATE POLICY "Creators can delete own groups" 
ON public.groups 
FOR DELETE TO authenticated 
USING (created_by = auth.uid());

-- Simple policies for group_members (no self-reference)
CREATE POLICY "Users can view own memberships" 
ON public.group_members 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memberships" 
ON public.group_members 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own memberships" 
ON public.group_members 
FOR DELETE TO authenticated 
USING (user_id = auth.uid());

-- Create a function to get user's groups with member counts
CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  created_by uuid,
  total_expense numeric,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.created_by,
    g.total_expense,
    g.created_at,
    g.updated_at,
    (SELECT COUNT(*) FROM public.group_members WHERE group_id = g.id) as member_count
  FROM public.groups g
  INNER JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  ORDER BY g.created_at DESC
$$;

-- Create a function to get a single group by ID
CREATE OR REPLACE FUNCTION public.get_group_by_id(_group_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  created_by uuid,
  total_expense numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.created_by,
    g.total_expense,
    g.created_at,
    g.updated_at
  FROM public.groups g
  WHERE g.id = _group_id
    AND EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = _group_id AND user_id = auth.uid()
    )
$$;