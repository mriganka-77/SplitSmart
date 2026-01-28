-- Add foreign keys to profiles table for proper joins
-- First, add foreign keys from expenses.paid_by to profiles
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_paid_by_profiles_fkey 
FOREIGN KEY (paid_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign keys from group_members.user_id to profiles
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign keys from expense_splits.user_id to profiles
ALTER TABLE public.expense_splits
ADD CONSTRAINT expense_splits_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign keys from balances to profiles
ALTER TABLE public.balances
ADD CONSTRAINT balances_from_user_profiles_fkey 
FOREIGN KEY (from_user) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.balances
ADD CONSTRAINT balances_to_user_profiles_fkey 
FOREIGN KEY (to_user) REFERENCES public.profiles(id) ON DELETE CASCADE;