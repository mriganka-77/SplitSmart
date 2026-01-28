import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Calendar, Filter, Search, CreditCard, Wallet, Banknote, MoreHorizontal, CheckCircle, Clock, XCircle, IndianRupee } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePaymentRecords, PaymentRecord } from '@/hooks/usePaymentRecords';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { formatDistanceToNow, format } from 'date-fns';

const PaymentMethodIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'upi':
      return <CreditCard className="w-4 h-4 text-primary" />;
    case 'cash':
      return <Banknote className="w-4 h-4 text-success" />;
    case 'bank':
      return <Wallet className="w-4 h-4 text-blue-500" />;
    default:
      return <MoreHorizontal className="w-4 h-4 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Completed' },
    pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Pending' },
    failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export default function PaymentHistory() {
  const { user } = useAuth();
  const { data: records, isLoading } = usePaymentRecords(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRecords = records?.filter(record => {
    const matchesSearch = 
      record.from_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.to_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.from_contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.to_contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === 'all' || record.payment_method === methodFilter;
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  }) || [];

  const getPartyInfo = (record: PaymentRecord) => {
    const isOutgoing = record.from_user_id === user?.id;
    
    if (isOutgoing) {
      // I paid someone
      if (record.to_profile) {
        return { name: record.to_profile.full_name || record.to_profile.email, type: 'user' };
      }
      if (record.to_contact) {
        return { name: record.to_contact.name, type: 'contact' };
      }
    } else {
      // Someone paid me
      if (record.from_profile) {
        return { name: record.from_profile.full_name || record.from_profile.email, type: 'user' };
      }
      if (record.from_contact) {
        return { name: record.from_contact.name, type: 'contact' };
      }
    }
    return { name: 'Unknown', type: 'unknown' };
  };

  // Calculate totals
  const totals = filteredRecords.reduce((acc, record) => {
    if (record.status !== 'completed') return acc;
    const isOutgoing = record.from_user_id === user?.id;
    if (isOutgoing) {
      acc.paid += record.amount;
    } else {
      acc.received += record.amount;
    }
    return acc;
  }, { paid: 0, received: 0 });

  return (
    <AppLayout>
      <PageHeader 
        title="Payment History" 
        subtitle="Track all your transactions"
      />

      <div className="px-4 space-y-6">
        {/* Summary Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          <GlassCard className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totals.paid)}
            </p>
          </GlassCard>
          <GlassCard className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ArrowDownLeft className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Received</span>
            </div>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(totals.received)}
            </p>
          </GlassCard>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-secondary/50 border-border/50"
            />
          </div>
          <div className="flex gap-3">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border/50 flex-1">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border/50 flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Payment Records */}
        <div className="space-y-3 pb-24">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredRecords.length > 0 ? (
            <AnimatePresence>
              {filteredRecords.map((record, index) => {
                const isOutgoing = record.from_user_id === user?.id;
                const partyInfo = getPartyInfo(record);
                
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOutgoing ? 'bg-destructive/10' : 'bg-success/10'}`}>
                          {isOutgoing ? (
                            <ArrowUpRight className="w-5 h-5 text-destructive" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5 text-success" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{partyInfo.name}</p>
                            {partyInfo.type === 'contact' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">External</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <PaymentMethodIcon method={record.payment_method} />
                            <span className="capitalize">{record.payment_method}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(record.payment_date), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className={`font-bold text-lg ${isOutgoing ? 'text-destructive' : 'text-success'}`}>
                            {isOutgoing ? '-' : '+'}{formatCurrency(record.amount)}
                          </p>
                          <StatusBadge status={record.status} />
                        </div>
                      </div>
                      {record.notes && (
                        <p className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                          {record.notes}
                        </p>
                      )}
                      {record.group && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <span>Group:</span>
                          <span className="font-medium text-foreground">{record.group.name}</span>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <IndianRupee className="w-8 h-8 text-primary/50" />
              </div>
              <p className="font-medium text-muted-foreground">No payments yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Your payment history will appear here
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
