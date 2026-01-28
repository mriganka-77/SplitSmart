import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ExternalContact {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  upi_id: string | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalBalance {
  id: string;
  user_id: string;
  contact_id: string;
  amount: number;
  updated_at: string;
  contact?: ExternalContact;
}

export const useExternalContacts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['external-contacts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('external_contacts')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');

      if (error) throw error;
      return data as ExternalContact[];
    },
    enabled: !!user?.id,
  });
};

export const useExternalBalances = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['external-balances', user?.id],
    queryFn: async () => {
      if (!user?.id) return { contacts: [], totalOwed: 0, totalOwing: 0 };

      // Fetch balances
      const { data: balances, error: balancesError } = await supabase
        .from('external_balances')
        .select('*')
        .eq('user_id', user.id);

      if (balancesError) throw balancesError;

      if (!balances || balances.length === 0) {
        return { contacts: [], totalOwed: 0, totalOwing: 0 };
      }

      // Fetch contacts for these balances
      const contactIds = balances.map(b => b.contact_id);
      const { data: contacts, error: contactsError } = await supabase
        .from('external_contacts')
        .select('*')
        .in('id', contactIds);

      if (contactsError) throw contactsError;

      const contactMap = new Map((contacts || []).map(c => [c.id, c]));

      const enrichedBalances: ExternalBalance[] = balances.map(b => ({
        ...b,
        amount: Number(b.amount),
        contact: contactMap.get(b.contact_id) || undefined,
      }));

      const totalOwed = enrichedBalances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);
      const totalOwing = enrichedBalances.filter(b => b.amount < 0).reduce((sum, b) => sum + Math.abs(b.amount), 0);

      return { contacts: enrichedBalances, totalOwed, totalOwing };
    },
    enabled: !!user?.id,
  });
};

export const useCreateExternalContact = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contact: Omit<ExternalContact, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('external_contacts')
        .insert({
          ...contact,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-contacts'] });
      toast.success('Contact added!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateExternalContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExternalContact> & { id: string }) => {
      const { data, error } = await supabase
        .from('external_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-contacts'] });
      toast.success('Contact updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteExternalContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['external-balances'] });
      toast.success('Contact deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateExternalBalance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, amount, operation }: { contactId: string; amount: number; operation: 'add' | 'subtract' | 'settle' }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current balance
      const { data: existing } = await supabase
        .from('external_balances')
        .select('*')
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .single();

      let newAmount = 0;
      if (operation === 'settle') {
        newAmount = 0;
      } else if (existing) {
        newAmount = operation === 'add' 
          ? Number(existing.amount) + amount 
          : Number(existing.amount) - amount;
      } else {
        newAmount = operation === 'add' ? amount : -amount;
      }

      if (existing) {
        if (newAmount === 0) {
          // Delete if settled
          const { error } = await supabase
            .from('external_balances')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('external_balances')
            .update({ amount: newAmount })
            .eq('id', existing.id);
          if (error) throw error;
        }
      } else if (newAmount !== 0) {
        const { error } = await supabase
          .from('external_balances')
          .insert({
            user_id: user.id,
            contact_id: contactId,
            amount: newAmount,
          });
        if (error) throw error;
      }

      return { newAmount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-balances'] });
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
