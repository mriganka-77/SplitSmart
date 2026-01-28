-- Create recurring_expenses table
CREATE TABLE public.recurring_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  paid_by UUID NOT NULL,
  split_type TEXT NOT NULL DEFAULT 'equal',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_occurrence DATE NOT NULL,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view recurring expenses in their groups"
ON public.recurring_expenses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members
  WHERE group_members.group_id = recurring_expenses.group_id
  AND group_members.user_id = auth.uid()
));

CREATE POLICY "Users can create recurring expenses in their groups"
ON public.recurring_expenses
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM group_members
  WHERE group_members.group_id = recurring_expenses.group_id
  AND group_members.user_id = auth.uid()
));

CREATE POLICY "Creators can update their recurring expenses"
ON public.recurring_expenses
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their recurring expenses"
ON public.recurring_expenses
FOR DELETE
USING (created_by = auth.uid());

-- Create recurring_expense_splits table for custom splits
CREATE TABLE public.recurring_expense_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.recurring_expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS policies for splits
CREATE POLICY "Users can view recurring expense splits in their groups"
ON public.recurring_expense_splits
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM recurring_expenses re
  JOIN group_members gm ON gm.group_id = re.group_id
  WHERE re.id = recurring_expense_splits.recurring_expense_id
  AND gm.user_id = auth.uid()
));

CREATE POLICY "Users can create recurring expense splits"
ON public.recurring_expense_splits
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM recurring_expenses re
  JOIN group_members gm ON gm.group_id = re.group_id
  WHERE re.id = recurring_expense_splits.recurring_expense_id
  AND gm.user_id = auth.uid()
));

-- Skipped occurrences table
CREATE TABLE public.skipped_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  skipped_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recurring_expense_id, skipped_date)
);

-- Enable RLS
ALTER TABLE public.skipped_occurrences ENABLE ROW LEVEL SECURITY;

-- RLS policies for skipped occurrences
CREATE POLICY "Users can view skipped occurrences in their groups"
ON public.skipped_occurrences
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM recurring_expenses re
  JOIN group_members gm ON gm.group_id = re.group_id
  WHERE re.id = skipped_occurrences.recurring_expense_id
  AND gm.user_id = auth.uid()
));

CREATE POLICY "Creators can manage skipped occurrences"
ON public.skipped_occurrences
FOR ALL
USING (EXISTS (
  SELECT 1 FROM recurring_expenses re
  WHERE re.id = skipped_occurrences.recurring_expense_id
  AND re.created_by = auth.uid()
));

-- Function to generate expense from recurring template
CREATE OR REPLACE FUNCTION public.generate_recurring_expense(
  _recurring_expense_id UUID
) RETURNS UUID AS $$
DECLARE
  _expense_id UUID;
  _rec RECORD;
  _split RECORD;
BEGIN
  -- Get recurring expense details
  SELECT * INTO _rec FROM recurring_expenses WHERE id = _recurring_expense_id;
  
  IF _rec IS NULL THEN
    RAISE EXCEPTION 'Recurring expense not found';
  END IF;
  
  -- Create the expense
  INSERT INTO expenses (group_id, title, description, amount, paid_by, split_type)
  VALUES (_rec.group_id, _rec.title, _rec.description, _rec.amount, _rec.paid_by, _rec.split_type)
  RETURNING id INTO _expense_id;
  
  -- Copy splits
  FOR _split IN SELECT * FROM recurring_expense_splits WHERE recurring_expense_id = _recurring_expense_id
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, amount)
    VALUES (_expense_id, _split.user_id, _split.amount);
    
    -- Update balances
    IF _split.user_id != _rec.paid_by THEN
      PERFORM update_balance(_rec.group_id, _split.user_id, _rec.paid_by, _split.amount);
    END IF;
  END LOOP;
  
  -- Update next occurrence
  UPDATE recurring_expenses
  SET 
    next_occurrence = CASE 
      WHEN frequency = 'daily' THEN next_occurrence + INTERVAL '1 day'
      WHEN frequency = 'weekly' THEN next_occurrence + INTERVAL '1 week'
      WHEN frequency = 'monthly' THEN next_occurrence + INTERVAL '1 month'
    END,
    last_generated_at = now(),
    updated_at = now()
  WHERE id = _recurring_expense_id;
  
  RETURN _expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update timestamp trigger
CREATE TRIGGER update_recurring_expenses_updated_at
BEFORE UPDATE ON public.recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();