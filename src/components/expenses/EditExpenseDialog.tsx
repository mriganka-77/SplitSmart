import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IndianRupee, Save } from 'lucide-react';

interface EditExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    title: string;
    description: string | null;
    amount: number;
  } | null;
  onSave: (data: { id: string; title: string; description: string; amount: number }) => Promise<void>;
  isPending: boolean;
}

export function EditExpenseDialog({ isOpen, onClose, expense, onSave, isPending }: EditExpenseDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setDescription(expense.description || '');
      setAmount(expense.amount.toString());
    }
  }, [expense]);

  const handleSave = async () => {
    if (!expense || !title.trim() || !amount) return;
    
    await onSave({
      id: expense.id,
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="tech-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Edit Expense</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update the expense details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Expense title"
              className="h-12 bg-secondary/30 border-border/30 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 pl-10 bg-secondary/30 border-border/30 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note..."
              className="bg-secondary/30 border-border/30 rounded-xl resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !title.trim() || !amount}
              className="flex-1 h-12 rounded-xl gradient-primary"
            >
              {isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
