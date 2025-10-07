-- Drop the existing foreign key constraint on groups.created_by
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_created_by_fkey;

-- Add new foreign key constraint referencing profiles table
ALTER TABLE public.groups 
ADD CONSTRAINT groups_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Also update expenses.paid_by to reference profiles
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_paid_by_fkey;

ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_paid_by_fkey 
FOREIGN KEY (paid_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Update settlements foreign keys to reference profiles
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_from_user_id_fkey;
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_to_user_id_fkey;

ALTER TABLE public.settlements 
ADD CONSTRAINT settlements_from_user_id_fkey 
FOREIGN KEY (from_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.settlements 
ADD CONSTRAINT settlements_to_user_id_fkey 
FOREIGN KEY (to_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Update group_members.user_id to reference profiles
ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

ALTER TABLE public.group_members 
ADD CONSTRAINT group_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Update expense_splits.user_id to reference profiles
ALTER TABLE public.expense_splits DROP CONSTRAINT IF EXISTS expense_splits_user_id_fkey;

ALTER TABLE public.expense_splits 
ADD CONSTRAINT expense_splits_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;