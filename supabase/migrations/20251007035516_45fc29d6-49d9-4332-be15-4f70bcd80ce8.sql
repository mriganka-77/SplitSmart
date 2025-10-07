-- Fix infinite recursion in group_members RLS policy
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

-- Create a corrected policy that doesn't cause recursion
CREATE POLICY "Users can view members of their groups" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.groups 
    WHERE groups.id = group_members.group_id 
    AND groups.created_by = auth.uid()
  )
  OR user_id = auth.uid()
);