-- Drop ALL policies on group_members to start fresh
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can view co-members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;

-- Simple non-recursive policies for group_members
-- Users can only see their own membership directly
CREATE POLICY "Users can view own membership" 
ON public.group_members 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- Users can insert their own membership
CREATE POLICY "Users can create own membership" 
ON public.group_members 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Users can delete their own membership (leave group)
CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE TO authenticated 
USING (user_id = auth.uid());