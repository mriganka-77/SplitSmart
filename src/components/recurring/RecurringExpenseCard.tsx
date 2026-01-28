import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  CalendarClock,
  MoreVertical,
  Pause,
  Play,
  SkipForward,
  Trash2,
  Edit,
  Zap,
} from 'lucide-react';
import { RecurringExpense } from '@/hooks/useRecurringExpenses';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';

interface RecurringExpenseCardProps {
  expense: RecurringExpense;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
  onSkipNext?: () => void;
  onGenerateNow?: () => void;
  showGroup?: boolean;
}

const frequencyLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const frequencyColors = {
  daily: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  weekly: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  monthly: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export function RecurringExpenseCard({
  expense,
  onEdit,
  onDelete,
  onToggleActive,
  onSkipNext,
  onGenerateNow,
  showGroup = false,
}: RecurringExpenseCardProps) {
  const { user } = useAuth();
  const isCreator = user?.id === expense.created_by;
  const nextOccurrence = new Date(expense.next_occurrence);
  const isToday = format(nextOccurrence, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card className={`overflow-hidden ${!expense.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{expense.title}</h4>
                <Badge variant="secondary" className={frequencyColors[expense.frequency]}>
                  {frequencyLabels[expense.frequency]}
                </Badge>
                {!expense.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Paused
                  </Badge>
                )}
              </div>
              {showGroup && expense.group && (
                <p className="text-xs text-muted-foreground mt-0.5">{expense.group.name}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>Next:</span>
                <span className={isToday ? 'text-primary font-medium' : ''}>
                  {isToday ? 'Today' : format(nextOccurrence, 'MMM d, yyyy')}
                </span>
              </div>
              {expense.payer && (
                <div className="flex items-center gap-1.5 mt-2">
                  <UserAvatar
                    name={expense.payer.full_name || expense.payer.email}
                    src={expense.payer.avatar_url}
                    size="sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    {expense.payer.full_name || expense.payer.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg whitespace-nowrap">
              {formatCurrency(expense.amount)}
            </span>
            {isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {expense.is_active && onGenerateNow && (
                    <DropdownMenuItem onClick={onGenerateNow}>
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Now
                    </DropdownMenuItem>
                  )}
                  {expense.is_active && onSkipNext && (
                    <DropdownMenuItem onClick={onSkipNext}>
                      <SkipForward className="mr-2 h-4 w-4" />
                      Skip Next
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onToggleActive && (
                    <DropdownMenuItem onClick={onToggleActive}>
                      {expense.is_active ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}