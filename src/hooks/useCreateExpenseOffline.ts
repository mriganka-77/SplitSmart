import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addToOfflineQueue } from '@/lib/indexedDB';
import { useOfflineStatus } from './useOfflineStatus';

interface CreateExpenseOfflineParams {
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  paidBy: string;
  splitType: 'equal' | 'custom' | 'percentage';
  splits: { userId: string; amount: number }[];
}

export const useCreateExpenseOffline = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOfflineStatus();

  return useMutation({
    mutationFn: async (params: CreateExpenseOfflineParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // If offline, queue the action
      if (!isOnline) {
        const offlineId = await addToOfflineQueue({
          type: 'CREATE_EXPENSE',
          payload: params as unknown as Record<string, unknown>,
        });

        // Return a fake expense for optimistic UI
        return {
          id: offlineId,
          ...params,
          created_at: new Date().toISOString(),
          _offline: true,
        };
      }

      // Online: proceed with normal creation
      const { groupId, title, description, amount, paidBy, splitType, splits } = params;

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          title,
          description,
          amount,
          paid_by: paidBy,
          split_type: splitType,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense splits
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(
          splits.map((split) => ({
            expense_id: expense.id,
            user_id: split.userId,
            amount: split.amount,
          }))
        );

      if (splitsError) throw splitsError;

      // Update balances
      for (const split of splits) {
        if (split.userId === paidBy) continue;

        const { error: balanceError } = await supabase.rpc('update_balance', {
          _group_id: groupId,
          _from_user: split.userId,
          _to_user: paidBy,
          _amount: split.amount,
        });

        if (balanceError) throw balanceError;
      }

      return expense;
    },
    onSuccess: (result, variables) => {
      if ((result as { _offline?: boolean })._offline) {
        toast.success('Expense saved offline. Will sync when online.');
      } else {
        toast.success('Expense added!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balances'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
