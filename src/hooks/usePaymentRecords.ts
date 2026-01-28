import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PaymentRecord {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  from_contact_id: string | null;
  to_contact_id: string | null;
  group_id: string | null;
  amount: number;
  payment_method: 'upi' | 'cash' | 'bank' | 'other';
  status: 'pending' | 'completed' | 'failed';
  reference_id: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
  // Enriched fields
  from_profile?: { full_name: string | null; email: string } | null;
  to_profile?: { full_name: string | null; email: string } | null;
  from_contact?: { name: string; phone: string | null } | null;
  to_contact?: { name: string; phone: string | null } | null;
  group?: { name: string } | null;
}

export const usePaymentRecords = (limit = 50) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-records', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Collect IDs to fetch
      const userIds = new Set<string>();
      const contactIds = new Set<string>();
      const groupIds = new Set<string>();

      data.forEach(record => {
        if (record.from_user_id) userIds.add(record.from_user_id);
        if (record.to_user_id) userIds.add(record.to_user_id);
        if (record.from_contact_id) contactIds.add(record.from_contact_id);
        if (record.to_contact_id) contactIds.add(record.to_contact_id);
        if (record.group_id) groupIds.add(record.group_id);
      });

      // Fetch related data in parallel
      const [profilesRes, contactsRes, groupsRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from('profiles').select('id, full_name, email').in('id', Array.from(userIds))
          : { data: [] },
        contactIds.size > 0
          ? supabase.from('external_contacts').select('id, name, phone').in('id', Array.from(contactIds))
          : { data: [] },
        groupIds.size > 0
          ? supabase.from('groups').select('id, name').in('id', Array.from(groupIds))
          : { data: [] },
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const contactsMap = new Map((contactsRes.data || []).map(c => [c.id, c]));
      const groupsMap = new Map((groupsRes.data || []).map(g => [g.id, g]));

      return data.map(record => ({
        ...record,
        amount: Number(record.amount),
        from_profile: record.from_user_id ? profilesMap.get(record.from_user_id) || null : null,
        to_profile: record.to_user_id ? profilesMap.get(record.to_user_id) || null : null,
        from_contact: record.from_contact_id ? contactsMap.get(record.from_contact_id) || null : null,
        to_contact: record.to_contact_id ? contactsMap.get(record.to_contact_id) || null : null,
        group: record.group_id ? groupsMap.get(record.group_id) || null : null,
      })) as PaymentRecord[];
    },
    enabled: !!user?.id,
  });
};

export const useCreatePaymentRecord = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (record: Omit<PaymentRecord, 'id' | 'created_at' | 'from_profile' | 'to_profile' | 'from_contact' | 'to_contact' | 'group'>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payment_records')
        .insert({
          ...record,
          from_user_id: record.from_user_id || user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
      toast.success('Payment recorded!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
