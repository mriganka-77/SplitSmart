import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { RecurringExpense, useUpdateRecurringExpense } from '@/hooks/useRecurringExpenses';

interface EditRecurringExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: RecurringExpense;
}

export function EditRecurringExpenseDialog({
  open,
  onOpenChange,
  expense,
}: EditRecurringExpenseDialogProps) {
  const updateExpense = useUpdateRecurringExpense();

  const [title, setTitle] = useState(expense.title);
  const [description, setDescription] = useState(expense.description || '');
  const [amount, setAmount] = useState(expense.amount.toString());
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(expense.frequency);

  useEffect(() => {
    setTitle(expense.title);
    setDescription(expense.description || '');
    setAmount(expense.amount.toString());
    setFrequency(expense.frequency);
  }, [expense]);

  const handleSave = async () => {
    const numericAmount = parseFloat(amount);
    if (!title || !numericAmount || numericAmount <= 0) {
      return;
    }

    await updateExpense.mutateAsync({
      id: expense.id,
      title,
      description: description || undefined,
      amount: numericAmount,
      frequency,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monthly Rent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount (₹)</Label>
            <Input
              id="edit-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
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
              onClick={handleSave}
              disabled={updateExpense.isPending || !title || !amount}
              className="flex-1"
            >
              {updateExpense.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
