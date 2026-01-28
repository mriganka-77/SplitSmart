import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface ActivityLog {
  id: string;
  group_id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  group?: {
    id: string;
    name: string;
  } | null;
}

export const useActivityLogs = (groupId?: string, limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-logs', groupId, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles!activity_logs_user_id_fkey(id, full_name, email, avatar_url),
          group:groups!activity_logs_group_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as ActivityLog[];
    },
    enabled: !!user?.id,
  });
};

export const useRealtimeActivityLogs = (groupId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('activity-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          ...(groupId ? { filter: `group_id=eq.${groupId}` } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, groupId]);
};

export const logActivity = async (
  groupId: string,
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
) => {
  const { error } = await supabase.from('activity_logs').insert([{
    group_id: groupId,
    user_id: userId,
    action,
    metadata: metadata as unknown as Record<string, never>,
  }]);

  if (error) {
    console.error('Failed to log activity:', error);
  }
};
