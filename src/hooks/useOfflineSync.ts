import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  updateQueueItemRetry,
  OfflineAction,
} from '@/lib/indexedDB';
import { useOfflineStatus } from './useOfflineStatus';

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const { isOnline, wasOffline, resetWasOffline } = useOfflineStatus();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check pending count on mount and when online status changes
  useEffect(() => {
    const checkPending = async () => {
      const queue = await getOfflineQueue();
      setPendingCount(queue.length);
    };
    checkPending();
  }, [isOnline]);

  const processAction = useCallback(async (action: OfflineAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'CREATE_EXPENSE': {
          const { groupId, title, description, amount, paidBy, splitType, splits } = action.payload as {
            groupId: string;
            title: string;
            description?: string;
            amount: number;
            paidBy: string;
            splitType: 'equal' | 'custom' | 'percentage';
            splits: { userId: string; amount: number }[];
          };

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

          return true;
        }

        case 'DELETE_EXPENSE': {
          const { expenseId } = action.payload as { expenseId: string };
          const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);

          if (error) throw error;
          return true;
        }

        case 'UPDATE_EXPENSE': {
          const { id, title, description, amount } = action.payload as {
            id: string;
            title: string;
            description?: string;
            amount: number;
          };

          const { error } = await supabase
            .from('expenses')
            .update({ title, description, amount })
            .eq('id', id);

          if (error) throw error;
          return true;
        }

        case 'RECORD_PAYMENT': {
          const paymentData = action.payload as {
            amount: number;
            from_user_id?: string;
            to_user_id?: string;
            from_contact_id?: string;
            to_contact_id?: string;
            group_id?: string;
            payment_method?: string;
            notes?: string;
            status?: string;
          };
          const { error } = await supabase
            .from('payment_records')
            .insert([paymentData]);

          if (error) throw error;
          return true;
        }

        default:
          console.warn('Unknown action type:', action.type);
          return false;
      }
    } catch (error) {
      console.error('Failed to process offline action:', error);
      return false;
    }
  }, []);

  const syncOfflineActions = useCallback(async () => {
    if (!user || !isOnline || isSyncing) return;

    setIsSyncing(true);
    const queue = await getOfflineQueue();

    if (queue.length === 0) {
      setIsSyncing(false);
      return;
    }

    toast.info(`Syncing ${queue.length} offline action(s)...`);

    let successCount = 0;
    let failCount = 0;

    for (const action of queue) {
      if (action.retryCount >= MAX_RETRIES) {
        console.warn('Max retries reached for action:', action.id);
        await removeFromOfflineQueue(action.id);
        failCount++;
        continue;
      }

      const success = await processAction(action);

      if (success) {
        await removeFromOfflineQueue(action.id);
        successCount++;
      } else {
        await updateQueueItemRetry(action.id);
        failCount++;
      }
    }

    // Refresh data after sync
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['balances'] });
    queryClient.invalidateQueries({ queryKey: ['user-balances'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });

    if (successCount > 0) {
      toast.success(`Synced ${successCount} action(s) successfully!`);
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} action(s)`);
    }

    const remaining = await getOfflineQueue();
    setPendingCount(remaining.length);
    setIsSyncing(false);
    resetWasOffline();
  }, [user, isOnline, isSyncing, processAction, queryClient, resetWasOffline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && !isSyncing) {
      // Small delay to ensure connection is stable
      const timeout = setTimeout(() => {
        syncOfflineActions();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [isOnline, wasOffline, isSyncing, syncOfflineActions]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncOfflineActions,
  };
}
