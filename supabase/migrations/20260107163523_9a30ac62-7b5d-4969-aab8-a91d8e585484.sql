-- Drop the remaining problematic policy and recreate
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

-- Recreate with proper check
CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());