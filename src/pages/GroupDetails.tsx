import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, IndianRupee, UserPlus, ArrowRight, RefreshCw, Zap, TrendingUp, Clock, Sparkles, Trash2, AlertTriangle, Edit, Activity, Wallet, CalendarClock } from 'lucide-react';
import { useGroup, useGroupMembers, useAddGroupMember, useDeleteGroup, useRemoveGroupMember } from '@/hooks/useGroups';
import { useExpenses, useUpdateExpense, useDeleteExpense, Expense } from '@/hooks/useExpenses';
import { useRecalculateBalances } from '@/hooks/useRecalculateBalances';
import { useRealtimeExpenses } from '@/hooks/useRealtimeExpenses';
import { useActivityLogs, useRealtimeActivityLogs, logActivity } from '@/hooks/useActivityLogs';
import { useGroupSettlement, type SuggestedPayment } from '@/hooks/useGroupSettlement';
import { useSettleBalance } from '@/hooks/useSettlements';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditExpenseDialog } from '@/components/expenses/EditExpenseDialog';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { SettlementPlan } from '@/components/settlements/SettlementPlan';
import { UPIPaymentSheet } from '@/components/payments/UPIPaymentSheet';
import { RecurringExpenseList } from '@/components/recurring/RecurringExpenseList';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface PaymentTarget {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  amount: number;
  groupId: string;
  groupName: string;
  isSettlement?: boolean;
}

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(id);
  const { data: activities, isLoading: activitiesLoading } = useActivityLogs(id, 20);
  const { data: settlementPlan, isLoading: settlementLoading } = useGroupSettlement(id);
  const addMember = useAddGroupMember();
  const recalculateBalances = useRecalculateBalances();
  const deleteGroup = useDeleteGroup();
  const removeMember = useRemoveGroupMember();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const settleBalance = useSettleBalance();
  
  // Enable realtime updates
  useRealtimeExpenses(id);
  useRealtimeActivityLogs(id);
  
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<{ id: string; title: string } | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !id) return;
    
    await addMember.mutateAsync({
      groupId: id,
      email: memberEmail,
    });
    
    // Log activity
    if (user?.id) {
      await logActivity(id, user.id, 'member_added', { member_email: memberEmail });
    }
    
    setShowAddMemberDialog(false);
    setMemberEmail('');
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    await deleteGroup.mutateAsync(id);
    navigate('/groups');
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !id) return;
    await removeMember.mutateAsync({ groupId: id, memberId: memberToRemove.id });
    
    // Log activity
    if (user?.id) {
      await logActivity(id, user.id, 'member_removed', { member_name: memberToRemove.name });
    }
    
    setMemberToRemove(null);
  };

  const handleEditExpense = async (data: { id: string; title: string; description: string; amount: number }) => {
    const result = await updateExpense.mutateAsync(data);
    
    // Log activity
    if (user?.id && id) {
      await logActivity(id, user.id, 'expense_updated', { 
        title: data.title, 
        amount: data.amount,
        expense_id: data.id 
      });
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete || !id) return;
    
    const result = await deleteExpense.mutateAsync(expenseToDelete.id);
    
    // Log activity
    if (user?.id) {
      await logActivity(id, user.id, 'expense_deleted', { 
        title: expenseToDelete.title,
        expense_id: expenseToDelete.id 
      });
    }
    
    setExpenseToDelete(null);
  };

  // Settlement payment handlers
  const handleSmartPayNow = (payment: SuggestedPayment) => {
    if (!group) return;
    setPaymentTarget({
      id: payment.to.id,
      name: payment.to.full_name || 'User',
      email: payment.to.email,
      avatarUrl: payment.to.avatar_url,
      amount: payment.amount,
      groupId: payment.groupId,
      groupName: group.name,
    });
  };

  const handleSmartSettleReceived = (payment: SuggestedPayment) => {
    if (!group) return;
    setPaymentTarget({
      id: payment.from.id,
      name: payment.from.full_name || 'User',
      email: payment.from.email,
      avatarUrl: payment.from.avatar_url,
      amount: payment.amount,
      groupId: payment.groupId,
      groupName: group.name,
      isSettlement: true,
    });
  };

  const handlePaymentComplete = async () => {
    if (!paymentTarget || !user?.id) return;
    
    const fromUserId = paymentTarget.isSettlement ? paymentTarget.id : user.id;
    const toUserId = paymentTarget.isSettlement ? user.id : paymentTarget.id;
    
    await settleBalance.mutateAsync({
      groupId: paymentTarget.groupId,
      fromUserId,
      toUserId,
      amount: paymentTarget.amount,
    });
    
    setPaymentTarget(null);
  };

  const isAdmin = members?.some(m => m.user_id === user?.id && m.role === 'admin');
  const isCreator = group?.created_by === user?.id;

  // Calculate per-person share
  const perPersonShare = members && members.length > 0 
    ? (group?.total_expense || 0) / members.length 
    : 0;

  if (groupLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!group) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <p className="text-muted-foreground mb-4">Group not found</p>
          <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title={group.name} 
        subtitle={group.description || undefined}
        showBack
      />

      <div className="px-4 space-y-6">
        {/* Hero Stats Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl tech-card p-6"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            {/* Main amount display */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Total Spent</span>
              </div>
              <motion.p 
                className="stat-value text-4xl md:text-5xl text-primary"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
              >
                {formatCurrency(group.total_expense)}
              </motion.p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="tech-border">
                <div className="tech-border-inner text-center py-3">
                  <Users className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
                  <p className="stat-value text-2xl text-foreground">{members?.length || 0}</p>
                  <p className="data-label">Members</p>
                </div>
              </div>
              <div className="tech-border">
                <div className="tech-border-inner text-center py-3">
                  <TrendingUp className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                  <p className="stat-value text-2xl text-foreground">{expenses?.length || 0}</p>
                  <p className="data-label">Expenses</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Per Person Share - Only show when there are expenses */}
        {members && members.length > 0 && group.total_expense > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl neon-border bg-card/50 backdrop-blur-xl p-5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="data-label">Per Person Share</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Split among {members.length} members
                  </p>
                </div>
              </div>
              <p className="stat-value text-2xl text-primary">
                {formatCurrency(perPersonShare)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="w-full h-12 bg-secondary/30 p-1.5 rounded-2xl border border-border/30">
            <TabsTrigger 
              value="expenses" 
              className="flex-1 h-full rounded-xl font-medium text-xs transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
            >
              <IndianRupee className="w-3 h-3 mr-1" />
              Expenses
            </TabsTrigger>
            <TabsTrigger 
              value="recurring" 
              className="flex-1 h-full rounded-xl font-medium text-xs transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
            >
              <CalendarClock className="w-3 h-3 mr-1" />
              Recurring
            </TabsTrigger>
            <TabsTrigger 
              value="settle" 
              className="flex-1 h-full rounded-xl font-medium text-xs transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
            >
              <Zap className="w-3 h-3 mr-1" />
              Settle
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="flex-1 h-full rounded-xl font-medium text-xs transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
            >
              <Users className="w-3 h-3 mr-1" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-5 space-y-4">
            <Button
              onClick={() => navigate(`/add-expense?groupId=${id}`)}
              className="w-full h-14 rounded-2xl gradient-primary shadow-glow-sm text-primary-foreground font-semibold text-base"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Expense
            </Button>

            {expensesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : expenses && expenses.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {expenses.map((expense, index) => {
                    const isOwner = expense.paid_by === user?.id;
                    return (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="tech-card tech-hover p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <UserAvatar
                              src={expense.payer?.avatar_url}
                              name={expense.payer?.full_name}
                              size="md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                              <IndianRupee className="w-2.5 h-2.5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-foreground">{expense.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground truncate">
                                {expense.payer?.full_name || expense.payer?.email}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs">
                                  {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-lg font-bold text-primary">
                              {formatCurrency(expense.amount)}
                            </p>
                            {isOwner && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => setExpenseToEdit(expense)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setExpenseToDelete({ id: expense.id, title: expense.title })}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="tech-card text-center py-12"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <IndianRupee className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-muted-foreground font-medium">No expenses yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Add your first expense to get started</p>
              </motion.div>
            )}
          </TabsContent>

          {/* Settlement Plan Tab */}
          <TabsContent value="settle" className="mt-5">
            <SettlementPlan
              plan={settlementPlan}
              isLoading={settlementLoading}
              currentUserId={user?.id || ''}
              onPayNow={handleSmartPayNow}
              onSettleReceived={handleSmartSettleReceived}
            />
          </TabsContent>

          {/* Recurring Expenses Tab */}
          <TabsContent value="recurring" className="mt-5">
            <RecurringExpenseList groupId={id || ''} members={members || []} />
          </TabsContent>

          <TabsContent value="members" className="mt-5 space-y-4">
            <Button
              onClick={() => setShowAddMemberDialog(true)}
              variant="outline"
              className="w-full h-14 rounded-2xl border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 font-medium"
            >
              <UserPlus className="w-5 h-5 mr-2 text-primary" />
              Add Member
            </Button>

            {membersLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {members.map((member, index) => {
                    const canRemove = isAdmin && member.user_id !== user?.id;
                    const isSelf = member.user_id === user?.id;
                    
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="tech-card tech-hover p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <UserAvatar
                              src={member.profile?.avatar_url}
                              name={member.profile?.full_name}
                              size="md"
                            />
                            {member.role === 'admin' && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                <Sparkles className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate text-foreground">
                                {member.profile?.full_name || 'Unknown'}
                              </p>
                              {isSelf && (
                                <span className="text-xs text-muted-foreground">(You)</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.profile?.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.role === 'admin' && (
                              <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                            {canRemove && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setMemberToRemove({ 
                                  id: member.id, 
                                  name: member.profile?.full_name || member.profile?.email || 'this member' 
                                })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <Button
            onClick={() => navigate(`/balances?groupId=${id}`)}
            className="w-full h-14 rounded-2xl bg-secondary/50 hover:bg-secondary/70 border border-border/30 text-foreground font-medium"
          >
            View Group Balances
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {isAdmin && (
            <Button
              onClick={() => id && recalculateBalances.mutate(id)}
              variant="outline"
              disabled={recalculateBalances.isPending}
              className="w-full h-12 rounded-xl border-border/30 hover:border-primary/30 hover:bg-primary/5"
            >
              {recalculateBalances.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate Balances
                </>
              )}
            </Button>
          )}

          {isCreator && (
            <Button
              onClick={() => setShowDeleteGroupDialog(true)}
              variant="outline"
              className="w-full h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Group
            </Button>
          )}
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="glass-strong border-border/30 max-w-md mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              Add Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="memberEmail" className="text-sm font-medium">Member Email</Label>
              <Input
                id="memberEmail"
                type="email"
                placeholder="friend@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="h-14 bg-secondary/30 border-border/30 rounded-xl focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                The user must have a SplitSmart account
              </p>
            </div>
            <Button
              onClick={handleAddMember}
              disabled={!memberEmail.trim() || addMember.isPending}
              className="w-full h-14 rounded-xl gradient-primary shadow-glow-sm text-primary-foreground font-semibold"
            >
              {addMember.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add Member
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent className="glass-strong border-border/30 rounded-3xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Delete Group?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will permanently delete <strong>{group.name}</strong> and all its expenses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? <LoadingSpinner size="sm" /> : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent className="glass-strong border-border/30 rounded-3xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Remove Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? <LoadingSpinner size="sm" /> : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        isOpen={!!expenseToEdit}
        onClose={() => setExpenseToEdit(null)}
        expense={expenseToEdit}
        onSave={handleEditExpense}
        isPending={updateExpense.isPending}
      />

      {/* Delete Expense Confirmation */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent className="glass-strong border-border/30 rounded-3xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete <strong>{expenseToDelete?.title}</strong>? This will affect group balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? <LoadingSpinner size="sm" /> : 'Delete Expense'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* UPI Payment Sheet for Settlements */}
      {paymentTarget && (
        <UPIPaymentSheet
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          payeeInfo={{
            id: paymentTarget.id,
            name: paymentTarget.name,
            email: paymentTarget.email,
            avatarUrl: paymentTarget.avatarUrl,
          }}
          amount={paymentTarget.amount}
          groupName={paymentTarget.groupName}
          onPaymentComplete={handlePaymentComplete}
          isSettlement={paymentTarget.isSettlement}
        />
      )}
    </AppLayout>
  );
}