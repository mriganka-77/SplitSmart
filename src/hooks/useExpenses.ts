import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  amount: number;
  paid_by: string;
  split_type: 'equal' | 'custom' | 'percentage';
  created_at: string;
  payer?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
}

export interface Balance {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  updated_at: string;
}

export const useExpenses = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          payer:profiles!expenses_paid_by_profiles_fkey(id, full_name, email, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        split_type: expense.split_type as 'equal' | 'custom' | 'percentage',
        payer: expense.payer,
      })) as Expense[];
    },
    enabled: !!groupId,
  });
};

export const useAllExpenses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-expenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          payer:profiles!expenses_paid_by_profiles_fkey(id, full_name, email, avatar_url),
          group:groups(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      return (data || []).map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        split_type: expense.split_type as 'equal' | 'custom' | 'percentage',
        payer: expense.payer,
        group: expense.group,
      })) as (Expense & { group: { id: string; name: string } | null })[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateExpense = () => {
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
      splits,
    }: {
      groupId: string;
      title: string;
      description?: string;
      amount: number;
      paidBy: string;
      splitType: 'equal' | 'custom' | 'percentage';
      splits: { userId: string; amount: number }[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

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

      // Update balances using security definer function
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balances'] });
      toast.success('Expense added!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export interface BalanceWithProfiles extends Balance {
  from_profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  to_profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
}

export const useBalances = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('balances')
        .select(`
          *
        `)
        .eq('group_id', groupId)
        .neq('amount', 0);

      if (error) throw error;
      
      return (data || []).map((balance) => ({
        ...balance,
        amount: Number(balance.amount),
      })) as BalanceWithProfiles[];
    },
    enabled: !!groupId,
  });
};

export interface UserBalanceWithDetails {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  updated_at: string;
  to_profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  from_profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  group?: { id: string; name: string } | null;
}

export const useUserBalances = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-balances', user?.id],
    queryFn: async () => {
      if (!user?.id) return { owes: [], owed: [], netBalance: 0 };

      // Get what user owes
      const { data: owesData, error: owesError } = await supabase
        .from('balances')
        .select(`*`)
        .eq('from_user', user.id)
        .gt('amount', 0);

      if (owesError) throw owesError;

      // Get what user is owed
      const { data: owedData, error: owedError } = await supabase
        .from('balances')
        .select(`*`)
        .eq('to_user', user.id)
        .gt('amount', 0);

      if (owedError) throw owedError;

      // Collect all user IDs and group IDs we need to fetch
      const allBalances = [...(owesData || []), ...(owedData || [])];
      const userIds = new Set<string>();
      const groupIds = new Set<string>();
      
      allBalances.forEach(b => {
        userIds.add(b.from_user);
        userIds.add(b.to_user);
        groupIds.add(b.group_id);
      });

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', Array.from(userIds));

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', Array.from(groupIds));

      const groupsMap = new Map(
        (groupsData || []).map(g => [g.id, g])
      );

      // Enrich balances with profile and group data
      const owes: UserBalanceWithDetails[] = (owesData || []).map((b) => ({
        ...b,
        amount: Number(b.amount),
        to_profile: profilesMap.get(b.to_user) || null,
        group: groupsMap.get(b.group_id) || null,
      }));

      const owed: UserBalanceWithDetails[] = (owedData || []).map((b) => ({
        ...b,
        amount: Number(b.amount),
        from_profile: profilesMap.get(b.from_user) || null,
        group: groupsMap.get(b.group_id) || null,
      }));

      const totalOwes = owes.reduce((sum, b) => sum + b.amount, 0);
      const totalOwed = owed.reduce((sum, b) => sum + b.amount, 0);

      return {
        owes,
        owed,
        netBalance: totalOwed - totalOwes,
      };
    },
    enabled: !!user?.id,
  });
};

// Edit expense mutation
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      amount,
    }: {
      id: string;
      title: string;
      description?: string;
      amount: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // First get the expense to check ownership
      const { data: existingExpense, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (existingExpense.paid_by !== user.id) {
        throw new Error('Only the payer can edit this expense');
      }

      const { data, error } = await supabase
        .from('expenses')
        .update({ title, description, amount })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { expense: data, groupId: existingExpense.group_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', result.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['group', result.groupId] });
      toast.success('Expense updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Delete expense mutation
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // First get the expense to check ownership and get group_id
      const { data: existingExpense, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      if (fetchError) throw fetchError;
      if (existingExpense.paid_by !== user.id) {
        throw new Error('Only the payer can delete this expense');
      }

      // Delete the expense (splits will cascade)
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      
      return { 
        groupId: existingExpense.group_id, 
        title: existingExpense.title,
        amount: existingExpense.amount 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', result.groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['group', result.groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balances'] });
      toast.success('Expense deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
