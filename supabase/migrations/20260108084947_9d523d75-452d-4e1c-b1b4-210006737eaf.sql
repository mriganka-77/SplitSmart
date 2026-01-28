-- Fix infinite recursion in group_members RLS caused by self-referential SELECT policy
-- The policy "Users can view groups they are members of" queries group_members inside its own policy,
-- which triggers Postgres error 42P17.

DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.group_members;

-- Ensure a safe, non-recursive SELECT policy exists (keep it minimal: users can read only their own membership rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'group_members'
      AND policyname = 'Users can view own memberships'
  ) THEN
    CREATE POLICY "Users can view own memberships"
    ON public.group_members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;
