import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, CalendarClock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RecurringExpenseCard } from './RecurringExpenseCard';
import { RecurringExpenseForm } from './RecurringExpenseForm';
import { EditRecurringExpenseDialog } from './EditRecurringExpenseDialog';
import {
  RecurringExpense,
  useRecurringExpenses,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
  useSkipOccurrence,
  useGenerateRecurringExpense,
} from '@/hooks/useRecurringExpenses';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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

interface RecurringExpenseListProps {
  groupId: string;
  members: Member[];
}

export function RecurringExpenseList({ groupId, members }: RecurringExpenseListProps) {
  const { data: expenses, isLoading } = useRecurringExpenses(groupId);
  const updateExpense = useUpdateRecurringExpense();
  const deleteExpense = useDeleteRecurringExpense();
  const skipOccurrence = useSkipOccurrence();
  const generateExpense = useGenerateRecurringExpense();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleToggleActive = async (expense: RecurringExpense) => {
    await updateExpense.mutateAsync({
      id: expense.id,
      isActive: !expense.is_active,
    });
  };

  const handleSkipNext = async (expense: RecurringExpense) => {
    await skipOccurrence.mutateAsync({
      recurringExpenseId: expense.id,
      skipDate: expense.next_occurrence,
    });
  };

  const handleGenerateNow = async (expense: RecurringExpense) => {
    await generateExpense.mutateAsync(expense.id);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteExpense.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Recurring Expenses
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {!expenses || expenses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No recurring expenses yet</p>
          <p className="text-sm mt-1">Create one to automate regular payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <RecurringExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => setDeleteConfirm(expense.id)}
              onToggleActive={() => handleToggleActive(expense)}
              onSkipNext={() => handleSkipNext(expense)}
              onGenerateNow={() => handleGenerateNow(expense)}
            />
          ))}
        </div>
      )}

      <RecurringExpenseForm
        open={showForm}
        onOpenChange={setShowForm}
        groupId={groupId}
        members={members}
      />

      {editingExpense && (
        <EditRecurringExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          expense={editingExpense}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring expense. Future expenses will no longer be
              generated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
