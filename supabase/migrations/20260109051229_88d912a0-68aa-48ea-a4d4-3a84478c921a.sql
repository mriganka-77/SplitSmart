-- Recalculate splits + balances for a group (for equal split expenses)
-- This is used when members are added after expenses, so balances can be rebuilt.

CREATE OR REPLACE FUNCTION public.recalculate_group_balances(
  _group_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_member_count int;
  v_share numeric;
  v_remainder numeric;
  r_exp record;
  r_member record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only group admins can recalculate group balances
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = _group_id
      AND gm.user_id = v_user_id
      AND gm.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Reset balances for the group
  DELETE FROM public.balances b
  WHERE b.group_id = _group_id;

  -- Rebuild balances from expenses/splits
  FOR r_exp IN
    SELECT e.id, e.amount::numeric AS amount, e.paid_by, e.split_type
    FROM public.expenses e
    WHERE e.group_id = _group_id
    ORDER BY e.created_at ASC
  LOOP
    -- For equal split expenses, recompute splits across CURRENT members.
    IF r_exp.split_type = 'equal' THEN
      SELECT COUNT(*)
      FROM public.group_members
      WHERE group_id = _group_id
      INTO v_member_count;

      IF v_member_count <= 0 THEN
        CONTINUE;
      END IF;

      -- 2-decimal share; remainder goes to payer so totals match exactly.
      v_share := trunc((r_exp.amount / v_member_count)::numeric, 2);
      v_remainder := r_exp.amount - (v_share * v_member_count);

      DELETE FROM public.expense_splits es
      WHERE es.expense_id = r_exp.id;

      FOR r_member IN
        SELECT gm.user_id
        FROM public.group_members gm
        WHERE gm.group_id = _group_id
        ORDER BY gm.joined_at ASC
      LOOP
        INSERT INTO public.expense_splits (expense_id, user_id, amount)
        VALUES (
          r_exp.id,
          r_member.user_id,
          CASE
            WHEN r_member.user_id = r_exp.paid_by THEN v_share + v_remainder
            ELSE v_share
          END
        );
      END LOOP;
    END IF;

    -- Apply balances for the expense based on expense_splits
    FOR r_member IN
      SELECT es.user_id, es.amount::numeric AS amount
      FROM public.expense_splits es
      WHERE es.expense_id = r_exp.id
    LOOP
      IF r_member.user_id = r_exp.paid_by THEN
        CONTINUE;
      END IF;

      PERFORM public.update_balance(
        _group_id,
        r_member.user_id,
        r_exp.paid_by,
        r_member.amount
      );
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_group_balances(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_group_balances(uuid) TO authenticated;
