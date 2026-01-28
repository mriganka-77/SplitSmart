import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRecurringExpense } from '@/hooks/useRecurringExpenses';

interface Member {
  id: string;
  user_id: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface RecurringExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: Member[];
}

export function RecurringExpenseForm({
  open,
  onOpenChange,
  groupId,
  members,
}: RecurringExpenseFormProps) {
  const { user } = useAuth();
  const createRecurringExpense = useCreateRecurringExpense();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(user?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const splits = useMemo(() => {
    const numericAmount = parseFloat(amount) || 0;
    if (splitType === 'equal') {
      const perPerson = numericAmount / members.length;
      return members.map((m) => ({
        userId: m.user_id,
        amount: Math.round(perPerson * 100) / 100,
      }));
    } else {
      return members.map((m) => ({
        userId: m.user_id,
        amount: parseFloat(customSplits[m.user_id] || '0') || 0,
      }));
    }
  }, [amount, members, splitType, customSplits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount);
    if (!title || !numericAmount || numericAmount <= 0) {
      return;
    }

    await createRecurringExpense.mutateAsync({
      groupId,
      title,
      description: description || undefined,
      amount: numericAmount,
      paidBy,
      splitType,
      frequency,
      startDate: format(startDate, 'yyyy-MM-dd'),
      splits,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setAmount('');
    setPaidBy(user?.id || '');
    setSplitType('equal');
    setFrequency('monthly');
    setStartDate(new Date());
    setCustomSplits({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monthly Rent"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Paid By</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || member.profile?.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Split Type</Label>
            <Select value={splitType} onValueChange={(v) => setSplitType(v as typeof splitType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Split Equally</SelectItem>
                <SelectItem value="custom">Custom Split</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {splitType === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Amounts</Label>
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">
                    {member.profile?.full_name || member.profile?.email}
                  </span>
                  <Input
                    type="number"
                    className="w-24"
                    value={customSplits[member.user_id] || ''}
                    onChange={(e) =>
                      setCustomSplits((prev) => ({
                        ...prev,
                        [member.user_id]: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRecurringExpense.isPending || !title || !amount}
              className="flex-1"
            >
              {createRecurringExpense.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
