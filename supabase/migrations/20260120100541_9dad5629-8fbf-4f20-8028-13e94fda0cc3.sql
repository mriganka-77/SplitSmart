-- First create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create external_contacts table for people not using the app
CREATE TABLE public.external_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  upi_id TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_records table to track all payments (UPI, cash, etc.)
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID,
  to_user_id UUID,
  from_contact_id UUID,
  to_contact_id UUID,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  reference_id TEXT,
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create external balances table for tracking money with external contacts
CREATE TABLE public.external_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.external_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_contacts
CREATE POLICY "Users can view their own contacts" 
  ON public.external_contacts FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own contacts" 
  ON public.external_contacts FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own contacts" 
  ON public.external_contacts FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own contacts" 
  ON public.external_contacts FOR DELETE 
  USING (auth.uid() = owner_id);

-- RLS Policies for payment_records
CREATE POLICY "Users can view their payment records" 
  ON public.payment_records FOR SELECT 
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create payment records" 
  ON public.payment_records FOR INSERT 
  WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policies for external_balances
CREATE POLICY "Users can view their external balances" 
  ON public.external_balances FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their external balances" 
  ON public.external_balances FOR ALL 
  USING (auth.uid() = user_id);

-- Add foreign key for contact_id after table creation
ALTER TABLE public.external_balances 
  ADD CONSTRAINT external_balances_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES public.external_contacts(id) ON DELETE CASCADE;

-- Triggers for updated_at
CREATE TRIGGER update_external_contacts_updated_at
  BEFORE UPDATE ON public.external_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_balances_updated_at
  BEFORE UPDATE ON public.external_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();