import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RecurringExpense {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  amount: number;
  paid_by: string;
  split_type: 'equal' | 'custom' | 'percentage';
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  next_occurrence: string;
  last_generated_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  group?: { id: string; name: string } | null;
  payer?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
}

export interface RecurringExpenseSplit {
  id: string;
  recurring_expense_id: string;
  user_id: string;
  amount: number;
}

// Fetch recurring expenses for a group
export const useRecurringExpenses = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['recurring-expenses', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch payer profiles
      const payerIds = [...new Set((data || []).map(e => e.paid_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', payerIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        split_type: expense.split_type as 'equal' | 'custom' | 'percentage',
        frequency: expense.frequency as 'daily' | 'weekly' | 'monthly',
        payer: profilesMap.get(expense.paid_by) || null,
      })) as RecurringExpense[];
    },
    enabled: !!groupId,
  });
};

// Fetch all recurring expenses for the user
export const useAllRecurringExpenses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-recurring-expenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('is_active', true)
        .order('next_occurrence', { ascending: true });

      if (error) throw error;

      // Fetch group and payer info
      const groupIds = [...new Set((data || []).map(e => e.group_id))];
      const payerIds = [...new Set((data || []).map(e => e.paid_by))];

      const [{ data: groups }, { data: profiles }] = await Promise.all([
        supabase.from('groups').select('id, name').in('id', groupIds),
        supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', payerIds),
      ]);

      const groupsMap = new Map((groups || []).map(g => [g.id, g]));
      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        split_type: expense.split_type as 'equal' | 'custom' | 'percentage',
        frequency: expense.frequency as 'daily' | 'weekly' | 'monthly',
        group: groupsMap.get(expense.group_id) || null,
        payer: profilesMap.get(expense.paid_by) || null,
      })) as RecurringExpense[];
    },
    enabled: !!user?.id,
  });
};

// Create recurring expense
export const useCreateRecurringExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      title,
      description,
      amount,
      paidBy,
      splitType,
      frequency,
      startDate,
      splits,
    }: {
      groupId: string;
      title: string;
      description?: string;
      amount: number;
      paidBy: string;
      splitType: 'equal' | 'custom' | 'percentage';
      frequency: 'daily' | 'weekly' | 'monthly';
      startDate: string;
      splits: { userId: string; amount: number }[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create the recurring expense
      const { data: recurringExpense, error: expenseError } = await supabase
        .from('recurring_expenses')
        .insert({
          group_id: groupId,
          title,
          description,
          amount,
          paid_by: paidBy,
          split_type: splitType,
          frequency,
          start_date: startDate,
          next_occurrence: startDate,
          created_by: user.id,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create splits
      const { error: splitsError } = await supabase
        .from('recurring_expense_splits')
        .insert(
          splits.map((split) => ({
            recurring_expense_id: recurringExpense.id,
            user_id: split.userId,
            amount: split.amount,
          }))
        );

      if (splitsError) throw splitsError;

      return recurringExpense;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-recurring-expenses'] });
      toast.success('Recurring expense created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Update recurring expense
export const useUpdateRecurringExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      amount,
      frequency,
      isActive,
    }: {
      id: string;
      title?: string;
      description?: string;
      amount?: number;
      frequency?: 'daily' | 'weekly' | 'monthly';
      isActive?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) updateData.amount = amount;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', data.group_id] });
      queryClient.invalidateQueries({ queryKey: ['all-recurring-expenses'] });
      toast.success('Recurring expense updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Delete recurring expense
export const useDeleteRecurringExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: expense, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('group_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { groupId: expense.group_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', result.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-recurring-expenses'] });
      toast.success('Recurring expense deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Skip next occurrence
export const useSkipOccurrence = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      recurringExpenseId,
      skipDate,
    }: {
      recurringExpenseId: string;
      skipDate: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Add to skipped occurrences
      const { error: skipError } = await supabase
        .from('skipped_occurrences')
        .insert({
          recurring_expense_id: recurringExpenseId,
          skipped_date: skipDate,
        });

      if (skipError) throw skipError;

      // Get the recurring expense to update next_occurrence
      const { data: expense, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('id', recurringExpenseId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate next occurrence based on frequency
      const currentDate = new Date(expense.next_occurrence);
      let nextDate: Date;
      
      switch (expense.frequency) {
        case 'daily':
          nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
          break;
        case 'weekly':
          nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
          break;
        case 'monthly':
          nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
          break;
        default:
          nextDate = currentDate;
      }

      // Update next occurrence
      const { error: updateError } = await supabase
        .from('recurring_expenses')
        .update({ next_occurrence: nextDate.toISOString().split('T')[0] })
        .eq('id', recurringExpenseId);

      if (updateError) throw updateError;

      return { groupId: expense.group_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', result.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-recurring-expenses'] });
      toast.success('Occurrence skipped!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Generate expense from recurring template
export const useGenerateRecurringExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurringExpenseId: string) => {
      const { data, error } = await supabase
        .rpc('generate_recurring_expense', { _recurring_expense_id: recurringExpenseId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['all-recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balances'] });
      toast.success('Expense generated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
