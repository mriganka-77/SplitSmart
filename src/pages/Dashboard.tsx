import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Users, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useGroups } from '@/hooks/useGroups';
import { useAllExpenses } from '@/hooks/useExpenses';
import { useUserBalances } from '@/hooks/useExpenses';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: expenses, isLoading: expensesLoading } = useAllExpenses();
  const { data: balances, isLoading: balancesLoading } = useUserBalances();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalExpenses = groups?.reduce((sum, g) => sum + g.total_expense, 0) || 0;
  const netBalance = balances?.netBalance || 0;

  return (
    <AppLayout>
      <div className="p-4 pt-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-2xl font-display font-bold">
              {profile?.full_name || 'Friend'}
            </h1>
          </div>
          <UserAvatar 
            src={profile?.avatar_url} 
            name={profile?.full_name}
            size="lg"
          />
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total Expenses</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold">
              {formatCurrency(totalExpenses)}
            </p>
          </GlassCard>
          
          <GlassCard className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Net Balance</span>
              {netBalance >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
            </div>
            <p className={`text-2xl font-display font-bold ${
              netBalance >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(netBalance, { showSign: true })}
            </p>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/add-expense')}
            className="h-14 gradient-primary shadow-glow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Expense
          </Button>
          <Button
            onClick={() => navigate('/groups')}
            variant="outline"
            className="h-14"
          >
            <Users className="w-5 h-5 mr-2" />
            My Groups
          </Button>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold">Recent Activity</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/groups')}
              className="text-primary"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {expensesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.slice(0, 5).map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard 
                    hover
                    onClick={() => expense.group && navigate(`/group/${expense.group.id}`)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.group?.name} • {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
              <Button 
                onClick={() => navigate('/add-expense')} 
                className="mt-4"
                variant="outline"
              >
                Add your first expense
              </Button>
            </GlassCard>
          )}
        </div>

        {/* Groups Preview */}
        {groups && groups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">Your Groups</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/groups')}
                className="text-primary"
              >
                See All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {groups.slice(0, 4).map((group) => (
                <GlassCard
                  key={group.id}
                  hover
                  onClick={() => navigate(`/group/${group.id}`)}
                  className="min-w-[160px] flex-shrink-0"
                >
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <p className="font-medium truncate">{group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.member_count} members
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
