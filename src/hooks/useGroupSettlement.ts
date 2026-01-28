import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getOptimizedTransfers, calculateSavings, type OptimizedTransfer } from '@/lib/debtSimplification';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface SuggestedPayment {
  id: string;
  from: UserProfile;
  to: UserProfile;
  amount: number;
  groupId: string;
  groupName: string;
}

export interface GroupSettlementPlan {
  groupId: string;
  groupName: string;
  suggestedPayments: SuggestedPayment[];
  originalTransactionCount: number;
  optimizedTransactionCount: number;
  savings: { saved: number; percentage: number };
}

export const useGroupSettlement = (groupId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-settlement', groupId],
    queryFn: async (): Promise<GroupSettlementPlan | null> => {
      if (!groupId || !user?.id) return null;

      // Fetch group info
      const { data: groupData } = await supabase.rpc('get_group_by_id', { _group_id: groupId });
      const group = groupData?.[0];
      if (!group) return null;

      // Fetch all balances for this group
      const { data: balances, error: balancesError } = await supabase
        .from('balances')
        .select('*')
        .eq('group_id', groupId)
        .gt('amount', 0);

      if (balancesError) throw balancesError;
      if (!balances || balances.length === 0) {
        return {
          groupId,
          groupName: group.name,
          suggestedPayments: [],
          originalTransactionCount: 0,
          optimizedTransactionCount: 0,
          savings: { saved: 0, percentage: 0 },
        };
      }

      // Get unique user IDs
      const userIds = new Set<string>();
      balances.forEach(b => {
        userIds.add(b.from_user);
        userIds.add(b.to_user);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', Array.from(userIds));

      const profilesMap = new Map<string, UserProfile>(
        (profiles || []).map(p => [p.id, p])
      );

      // Get optimized transfers
      const rawBalances = balances.map(b => ({
        from_user: b.from_user,
        to_user: b.to_user,
        amount: Number(b.amount),
      }));

      const optimizedTransfers: OptimizedTransfer[] = getOptimizedTransfers(rawBalances);

      // Convert to SuggestedPayments with profile info
      const suggestedPayments: SuggestedPayment[] = optimizedTransfers.map((transfer, index) => ({
        id: `${groupId}-${index}`,
        from: profilesMap.get(transfer.from) || {
          id: transfer.from,
          full_name: 'Unknown User',
          email: '',
          avatar_url: null,
        },
        to: profilesMap.get(transfer.to) || {
          id: transfer.to,
          full_name: 'Unknown User',
          email: '',
          avatar_url: null,
        },
        amount: transfer.amount,
        groupId,
        groupName: group.name,
      }));

      const savings = calculateSavings(balances.length, optimizedTransfers.length);

      return {
        groupId,
        groupName: group.name,
        suggestedPayments,
        originalTransactionCount: balances.length,
        optimizedTransactionCount: optimizedTransfers.length,
        savings,
      };
    },
    enabled: !!groupId && !!user?.id,
  });
};

// Hook for all user's groups combined
export const useAllGroupsSettlement = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-groups-settlement', user?.id],
    queryFn: async (): Promise<{
      plans: GroupSettlementPlan[];
      totalSaved: number;
      allPayments: SuggestedPayment[];
    }> => {
      if (!user?.id) return { plans: [], totalSaved: 0, allPayments: [] };

      // Get user's groups
      const { data: groups } = await supabase.rpc('get_user_groups');
      if (!groups || groups.length === 0) {
        return { plans: [], totalSaved: 0, allPayments: [] };
      }

      const groupIds = groups.map(g => g.id);

      // Get all balances for user's groups
      const { data: allBalances, error } = await supabase
        .from('balances')
        .select('*')
        .in('group_id', groupIds)
        .gt('amount', 0);

      if (error) throw error;

      // Get unique user IDs
      const userIds = new Set<string>();
      (allBalances || []).forEach(b => {
        userIds.add(b.from_user);
        userIds.add(b.to_user);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', Array.from(userIds));

      const profilesMap = new Map<string, UserProfile>(
        (profiles || []).map(p => [p.id, p])
      );

      const groupsMap = new Map(groups.map(g => [g.id, g.name]));

      // Process each group
      const plans: GroupSettlementPlan[] = [];
      const allPayments: SuggestedPayment[] = [];
      let totalSaved = 0;

      for (const groupId of groupIds) {
        const groupBalances = (allBalances || []).filter(b => b.group_id === groupId);
        if (groupBalances.length === 0) continue;

        const rawBalances = groupBalances.map(b => ({
          from_user: b.from_user,
          to_user: b.to_user,
          amount: Number(b.amount),
        }));

        const optimizedTransfers = getOptimizedTransfers(rawBalances);
        const savings = calculateSavings(groupBalances.length, optimizedTransfers.length);
        totalSaved += savings.saved;

        const groupName = groupsMap.get(groupId) || 'Unknown Group';

        const suggestedPayments: SuggestedPayment[] = optimizedTransfers.map((transfer, index) => ({
          id: `${groupId}-${index}`,
          from: profilesMap.get(transfer.from) || {
            id: transfer.from,
            full_name: 'Unknown User',
            email: '',
            avatar_url: null,
          },
          to: profilesMap.get(transfer.to) || {
            id: transfer.to,
            full_name: 'Unknown User',
            email: '',
            avatar_url: null,
          },
          amount: transfer.amount,
          groupId,
          groupName,
        }));

        plans.push({
          groupId,
          groupName,
          suggestedPayments,
          originalTransactionCount: groupBalances.length,
          optimizedTransactionCount: optimizedTransfers.length,
          savings,
        });

        allPayments.push(...suggestedPayments);
      }

      return { plans, totalSaved, allPayments };
    },
    enabled: !!user?.id,
  });
};
