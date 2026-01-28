-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create group_members junction table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Group members policies
CREATE POLICY "Users can view groups they are members of" ON public.group_members 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Users can join groups" ON public.group_members 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage members" ON public.group_members 
  FOR DELETE TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  ));

-- Groups policies (based on membership)
CREATE POLICY "Users can view groups they are members of" ON public.groups 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()));
CREATE POLICY "Users can create groups" ON public.groups 
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update groups" ON public.groups 
  FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete groups" ON public.groups 
  FOR DELETE TO authenticated 
  USING (created_by = auth.uid());

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view expenses in their groups" ON public.expenses 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()));
CREATE POLICY "Users can create expenses in their groups" ON public.expenses 
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()));
CREATE POLICY "Expense creator can update" ON public.expenses 
  FOR UPDATE TO authenticated 
  USING (paid_by = auth.uid());
CREATE POLICY "Expense creator can delete" ON public.expenses 
  FOR DELETE TO authenticated 
  USING (paid_by = auth.uid());

-- Create expense_splits table for tracking individual shares
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  UNIQUE(expense_id, user_id)
);

-- Enable RLS on expense_splits
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Expense splits policies
CREATE POLICY "Users can view their expense splits" ON public.expense_splits 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.expenses e 
    JOIN public.group_members gm ON gm.group_id = e.group_id 
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Users can create expense splits" ON public.expense_splits 
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expenses e 
    JOIN public.group_members gm ON gm.group_id = e.group_id 
    WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
  ));

-- Create balances table for tracking who owes whom
CREATE TABLE public.balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, from_user, to_user)
);

-- Enable RLS on balances
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Balances policies
CREATE POLICY "Users can view balances in their groups" ON public.balances 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = balances.group_id AND user_id = auth.uid()));
CREATE POLICY "System can manage balances" ON public.balances 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = balances.group_id AND user_id = auth.uid()));

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  );
  RETURN new;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update group total expense
CREATE OR REPLACE FUNCTION public.update_group_total_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups SET total_expense = total_expense + NEW.amount WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups SET total_expense = total_expense - OLD.amount WHERE id = OLD.group_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.groups SET total_expense = total_expense - OLD.amount + NEW.amount WHERE id = NEW.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for expense changes
CREATE TRIGGER on_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_group_total_expense();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;