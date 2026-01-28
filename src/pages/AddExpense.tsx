import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, Users, Check, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups, useGroupMembers } from '@/hooks/useGroups';
import { useCreateExpenseOffline } from '@/hooks/useCreateExpenseOffline';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

export default function AddExpense() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const createExpense = useCreateExpenseOffline();
  const { isOnline } = useOfflineStatus();

  const preselectedGroupId = searchParams.get('groupId');
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>(preselectedGroupId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string>(user?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const { data: members, isLoading: membersLoading } = useGroupMembers(selectedGroupId || undefined);

  const parsedAmount = parseFloat(amount) || 0;

  const splits = useMemo(() => {
    if (!members || members.length === 0) return [];
    
    if (splitType === 'equal') {
      const sharePerPerson = parsedAmount / members.length;
      return members.map(m => ({
        userId: m.user_id,
        amount: Math.round(sharePerPerson * 100) / 100,
      }));
    } else {
      // For custom splits, use the entered values
      return members.map(m => ({
        userId: m.user_id,
        amount: parseFloat(customSplits[m.user_id] || '0') || 0,
      }));
    }
  }, [members, splitType, parsedAmount, customSplits]);

  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const isBalanced = splitType === 'equal' || Math.abs(totalSplit - parsedAmount) < 0.01;
  const hasCustomSplits = splitType === 'custom' && splits.some(s => s.amount > 0);

  const handleSubmit = async () => {
    if (!selectedGroupId) {
      toast.error('Please select a group');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!paidBy) {
      toast.error('Please select who paid');
      return;
    }
    if (splitType === 'custom') {
      if (!hasCustomSplits) {
        toast.error('Please enter at least one split amount');
        return;
      }
      if (!isBalanced) {
        toast.error(`Split amounts (${formatCurrency(totalSplit)}) must equal the total (${formatCurrency(parsedAmount)})`);
        return;
      }
    }

    await createExpense.mutateAsync({
      groupId: selectedGroupId,
      title,
      description: description || undefined,
      amount: parsedAmount,
      paidBy,
      splitType,
      splits,
    });

    navigate(-1);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Add Expense" 
        subtitle="Split an expense with your group"
        showBack
      />

      <div className="px-4 space-y-6 pb-8">
        {/* Group Selection */}
        <div className="space-y-2">
          <Label>Select Group</Label>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="h-12 bg-card border-border/50 rounded-xl">
              <SelectValue placeholder="Choose a group" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-border/50">
              {groupsLoading ? (
                <div className="p-4 flex justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : groups?.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expense Details */}
        <GlassCard className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Dinner at restaurant"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 bg-secondary/50 border-border/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-12 h-14 text-2xl font-display bg-secondary/50 border-border/50 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border/50 rounded-xl resize-none"
              rows={2}
            />
          </div>
        </GlassCard>

        {/* Paid By */}
        {selectedGroupId && (
          <div className="space-y-3">
            <Label>Paid By</Label>
            {membersLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {members?.map((member) => (
                  <motion.button
                    key={member.user_id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPaidBy(member.user_id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl min-w-[80px] transition-all",
                      paidBy === member.user_id
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-secondary/50 border-2 border-transparent"
                    )}
                  >
                    <UserAvatar
                      src={member.profile?.avatar_url}
                      name={member.profile?.full_name}
                      size="md"
                    />
                    <span className="text-xs font-medium truncate max-w-[70px]">
                      {member.user_id === user?.id ? 'You' : (member.profile?.full_name?.split(' ')[0] || 'Member')}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Split Type */}
        {selectedGroupId && parsedAmount > 0 && (
          <div className="space-y-3">
            <Label>Split Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSplitType('equal')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  splitType === 'equal'
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/50"
                )}
              >
                <p className="font-semibold">Equal Split</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(parsedAmount / (members?.length || 1))} each
                </p>
              </button>
              <button
                onClick={() => setSplitType('custom')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  splitType === 'custom'
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/50"
                )}
              >
                <p className="font-semibold">Custom Split</p>
                <p className="text-sm text-muted-foreground">Set amounts manually</p>
              </button>
            </div>
          </div>
        )}

        {/* Custom Split Amounts */}
        {splitType === 'custom' && selectedGroupId && members && (
          <GlassCard className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Custom Amounts</Label>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium px-2 py-1 rounded-lg",
                  isBalanced 
                    ? "text-emerald-500 bg-emerald-500/10" 
                    : "text-destructive bg-destructive/10"
                )}>
                  {formatCurrency(totalSplit)} / {formatCurrency(parsedAmount)}
                </span>
                {isBalanced && hasCustomSplits && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter how much each person should pay. Total must equal {formatCurrency(parsedAmount)}.
            </p>
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3">
                <UserAvatar
                  src={member.profile?.avatar_url}
                  name={member.profile?.full_name}
                  size="sm"
                />
                <span className="flex-1 text-sm truncate">
                  {member.user_id === user?.id ? 'You' : (member.profile?.full_name || member.profile?.email)}
                </span>
                <div className="relative w-28">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={customSplits[member.user_id] || ''}
                    onChange={(e) => setCustomSplits({
                      ...customSplits,
                      [member.user_id]: e.target.value
                    })}
                    className={cn(
                      "pl-8 h-10 bg-secondary/50 border-border/50 rounded-lg",
                      parseFloat(customSplits[member.user_id] || '0') > 0 && "border-primary/50"
                    )}
                  />
                </div>
              </div>
            ))}
            {!isBalanced && totalSplit > 0 && (
              <p className="text-xs text-destructive">
                {totalSplit > parsedAmount 
                  ? `Over by ${formatCurrency(totalSplit - parsedAmount)}`
                  : `Remaining: ${formatCurrency(parsedAmount - totalSplit)}`
                }
              </p>
            )}
          </GlassCard>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={createExpense.isPending || !selectedGroupId || !title || parsedAmount <= 0}
          className="w-full h-14 gradient-primary shadow-glow text-lg font-semibold"
        >
          {createExpense.isPending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              {!isOnline && <WifiOff className="w-4 h-4 mr-2" />}
              <Check className="w-5 h-5 mr-2" />
              {isOnline ? 'Add Expense' : 'Save Offline'}
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
