import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  total_expense: number;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export const useGroups = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Use security definer function to avoid RLS recursion
      const { data, error } = await supabase.rpc('get_user_groups');

      if (error) throw error;

      return (data || []).map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        total_expense: Number(group.total_expense) || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        member_count: Number(group.member_count) || 0,
      })) as Group[];
    },
    enabled: !!user?.id,
  });
};

export const useGroup = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (!groupId) return null;

      // Use security definer function
      const { data, error } = await supabase.rpc('get_group_by_id', { _group_id: groupId });

      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const group = data[0];
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        total_expense: Number(group.total_expense) || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
      } as Group;
    },
    enabled: !!groupId,
  });
};

export const useGroupMembers = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      // Use security definer function to get all members
      const { data, error } = await supabase.rpc('get_group_members', { _group_id: groupId });

      if (error) throw error;
      
      return (data || []).map((member: any) => ({
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role as 'admin' | 'member',
        joined_at: member.joined_at,
        profile: {
          id: member.profile_id,
          full_name: member.full_name,
          email: member.email,
          avatar_url: member.avatar_url,
        },
      })) as GroupMember[];
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, email }: { groupId: string; email: string }) => {
      // Find user by email using security definer function (bypasses RLS)
      const { data: userId, error: profileError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (profileError) throw profileError;
      if (!userId) throw new Error('User not found');

      // Add member via security definer function (admin/creator only)
      const { error } = await supabase.rpc('add_group_member', {
        _group_id: groupId,
        _user_id: userId,
        _role: 'member',
      });

      if (error) {
        // Surface friendly messages for common cases
        if (error.message?.toLowerCase().includes('already a member')) {
          throw new Error('User is already a member');
        }
        if (error.message?.toLowerCase().includes('not allowed')) {
          throw new Error('Only group admins can add members');
        }
        throw error;
      }

      return { id: userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
      toast.success('Member added!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
      toast.success('Member removed!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
