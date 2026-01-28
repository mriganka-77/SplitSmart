-- Add unique constraint for upsert to work
ALTER TABLE public.balances 
  ADD CONSTRAINT balances_unique_group_users UNIQUE (group_id, from_user, to_user);

-- Create security definer function to update balances
CREATE OR REPLACE FUNCTION public.update_balance(
  _group_id uuid,
  _from_user uuid,
  _to_user uuid,
  _amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = _group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  -- Upsert the balance
  INSERT INTO public.balances (group_id, from_user, to_user, amount)
  VALUES (_group_id, _from_user, _to_user, _amount)
  ON CONFLICT (group_id, from_user, to_user) 
  DO UPDATE SET 
    amount = public.balances.amount + EXCLUDED.amount,
    updated_at = now();
END;
$$;