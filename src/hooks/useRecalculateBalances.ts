import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRecalculateBalances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.rpc('recalculate_group_balances', {
        _group_id: groupId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balances'] });
      queryClient.invalidateQueries({ queryKey: ['expense-splits'] });
      toast.success('Balances recalculated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to recalculate balances');
    },
  });
};
