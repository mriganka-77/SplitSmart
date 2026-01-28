-- Create a function to find a user by email for adding to groups
-- This uses SECURITY DEFINER to bypass RLS, but only returns the user id
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.profiles WHERE email = _email LIMIT 1
$$;