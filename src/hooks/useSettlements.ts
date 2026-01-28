import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SettlementPayload {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export const useSettleBalance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ groupId, fromUserId, toUserId, amount }: SettlementPayload) => {
      if (!user?.id) throw new Error('Not authenticated');
      console.debug('[settle] attempt', { groupId, fromUserId, toUserId, amount });

      // Try to find balance in the expected direction first
      let { data: existingBalance } = await supabase
        .from('balances')
        .select('*')
        .eq('group_id', groupId)
        .eq('from_user', fromUserId)
        .eq('to_user', toUserId)
        .maybeSingle();

      // If not found, try the reverse direction (balance might be stored the other way)
      if (!existingBalance) {
        const { data: reverseBalance } = await supabase
          .from('balances')
          .select('*')
          .eq('group_id', groupId)
          .eq('from_user', toUserId)
          .eq('to_user', fromUserId)
          .maybeSingle();
        
        existingBalance = reverseBalance;
      }

      if (!existingBalance) {
        throw new Error('Balance not found. It may have already been settled.');
      }

      const newAmount = Number(existingBalance.amount) - amount;

      if (newAmount <= 0.01) {
        // Delete the balance if fully settled
        const { error } = await supabase
          .from('balances')
          .delete()
          .eq('id', existingBalance.id);
        
        if (error) throw new Error('Failed to settle balance');
      } else {
        // Update the remaining balance
        const { error } = await supabase
          .from('balances')
          .update({ amount: newAmount })
          .eq('id', existingBalance.id);
        
        if (error) throw new Error('Failed to update balance');
      }

      return { settled: amount, remaining: Math.max(0, newAmount) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balances'] });
      toast.success('Balance settled successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
