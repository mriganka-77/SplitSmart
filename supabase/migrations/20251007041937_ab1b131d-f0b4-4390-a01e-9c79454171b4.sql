-- 1) Helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = _group_id AND gm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id AND g.created_by = _user_id
  );
$$;

-- 2) Replace recursive policies with function-based ones
-- Groups
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
CREATE POLICY "Users can view groups they are members of or created"
ON public.groups
FOR SELECT
USING (public.is_member(id, auth.uid()) OR created_by = auth.uid());

-- Group members
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of groups they belong to or created"
ON public.group_members
FOR SELECT
USING (
  public.is_member(group_id, auth.uid())
  OR public.is_group_creator(group_id, auth.uid())
  OR user_id = auth.uid()
);

-- Expenses
DROP POLICY IF EXISTS "Users can view expenses in their groups" ON public.expenses;
CREATE POLICY "Users can view expenses in their groups"
ON public.expenses
FOR SELECT
USING (public.is_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can create expenses" ON public.expenses;
CREATE POLICY "Group members can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (public.is_member(group_id, auth.uid()));

-- Expense splits
DROP POLICY IF EXISTS "Users can view splits in their groups" ON public.expense_splits;
CREATE POLICY "Users can view splits in their groups"
ON public.expense_splits
FOR SELECT
USING (
  public.is_member(
    (SELECT e.group_id FROM public.expenses e WHERE e.id = expense_splits.expense_id),
    auth.uid()
  )
);

-- 3) Ensure profiles are created for existing users (backfill)
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Also ensure a default 'user' role exists for each user
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'user'
WHERE ur.user_id IS NULL;

-- 4) Add trigger to auto-create profile & role on new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
