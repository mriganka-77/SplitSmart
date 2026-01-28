import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBalances } from '@/hooks/useExpenses';
import { useGroups } from '@/hooks/useGroups';
import { useSettleBalance } from '@/hooks/useSettlements';
import { useAllGroupsSettlement, type SuggestedPayment } from '@/hooks/useGroupSettlement';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UPIPaymentSheet } from '@/components/payments/UPIPaymentSheet';
import { SettlementPlan } from '@/components/settlements/SettlementPlan';
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

export default function Balances() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const preselectedGroupId = searchParams.get('groupId');
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>(preselectedGroupId || 'all');
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  
  const { data: groups } = useGroups();
  const { data: userBalances, isLoading: userBalancesLoading } = useUserBalances();
  const { data: settlementData, isLoading: settlementLoading } = useAllGroupsSettlement();
  const settleBalance = useSettleBalance();

  const netBalance = userBalances?.netBalance || 0;

  // Get filtered settlement plan based on selected group
  const getFilteredSettlementPlan = () => {
    if (!settlementData) return null;
    
    if (selectedGroupId === 'all') {
      // Combine all plans into one
      const allPayments = settlementData.allPayments;
      const totalOriginal = settlementData.plans.reduce((sum, p) => sum + p.originalTransactionCount, 0);
      const totalOptimized = settlementData.plans.reduce((sum, p) => sum + p.optimizedTransactionCount, 0);
      
      return {
        groupId: 'all',
        groupName: 'All Groups',
        suggestedPayments: allPayments,
        originalTransactionCount: totalOriginal,
        optimizedTransactionCount: totalOptimized,
        savings: {
          saved: totalOriginal - totalOptimized,
          percentage: totalOriginal > 0 ? Math.round(((totalOriginal - totalOptimized) / totalOriginal) * 100) : 0,
        },
      };
    }
    
    return settlementData.plans.find(p => p.groupId === selectedGroupId) || null;
  };

  const handlePayNow = (balance: any) => {
    setPaymentTarget({
      id: balance.to_user,
      name: balance.to_profile?.full_name || 'User',
      email: balance.to_profile?.email || '',
      avatarUrl: balance.to_profile?.avatar_url,
      amount: balance.amount,
      groupId: balance.group_id,
      groupName: balance.group?.name || 'Group',
    });
  };

  const handleSmartPayNow = (payment: SuggestedPayment) => {
    setPaymentTarget({
      id: payment.to.id,
      name: payment.to.full_name || 'User',
      email: payment.to.email,
      avatarUrl: payment.to.avatar_url,
      amount: payment.amount,
      groupId: payment.groupId,
      groupName: payment.groupName,
    });
  };

  const handleSmartSettleReceived = (payment: SuggestedPayment) => {
    setPaymentTarget({
      id: payment.from.id,
      name: payment.from.full_name || 'User',
      email: payment.from.email,
      avatarUrl: payment.from.avatar_url,
      amount: payment.amount,
      groupId: payment.groupId,
      groupName: payment.groupName,
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

  const handleSettleReceived = (balance: any) => {
    setPaymentTarget({
      id: balance.from_user,
      name: balance.from_profile?.full_name || 'User',
      email: balance.from_profile?.email || '',
      avatarUrl: balance.from_profile?.avatar_url,
      amount: balance.amount,
      groupId: balance.group_id,
      groupName: balance.group?.name || 'Group',
      isSettlement: true,
    });
  };

  const handleRemind = (balance: any) => {
    const name = balance.from_profile?.full_name || 'User';
    alert(`Reminder sent to ${name}!`);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Balances" 
        subtitle="Settle expenses with UPI"
      />

      <div className="px-4 space-y-6 pb-8">
        {/* Net Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className={`text-center py-6 ${
            netBalance >= 0 ? 'border-success/30' : 'border-destructive/30'
          } border-2`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              netBalance >= 0 ? 'bg-success/20' : 'bg-destructive/20'
            }`}>
              {netBalance >= 0 ? (
                <TrendingUp className="w-8 h-8 text-success" />
              ) : (
                <TrendingDown className="w-8 h-8 text-destructive" />
              )}
            </div>
            <p className="text-muted-foreground mb-2">Your Net Balance</p>
            <p className={`text-4xl font-display font-bold ${
              netBalance >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(netBalance, { showSign: true })}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {netBalance >= 0 
                ? 'Others owe you money' 
                : 'You owe others money'}
            </p>
          </GlassCard>
        </motion.div>

        {/* Filter by Group */}
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="h-12 bg-card border-border/50 rounded-xl">
            <SelectValue placeholder="Filter by group" />
          </SelectTrigger>
          <SelectContent className="glass-strong border-border/50">
            <SelectItem value="all">All Groups</SelectItem>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tabs for Smart Settle vs Raw Balances */}
        <Tabs defaultValue="smart" className="w-full">
          <TabsList className="w-full h-12 bg-secondary/30 p-1.5 rounded-2xl border border-border/30">
            <TabsTrigger 
              value="smart" 
              className="flex-1 h-full rounded-xl font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-emerald-400 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
            >
              <Zap className="w-4 h-4 mr-1" />
              Smart Settle
            </TabsTrigger>
            <TabsTrigger 
              value="raw" 
              className="flex-1 h-full rounded-xl font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-emerald-400 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
            >
              <Wallet className="w-4 h-4 mr-1" />
              All Balances
            </TabsTrigger>
          </TabsList>

          {/* Smart Settle Tab */}
          <TabsContent value="smart" className="mt-5">
            <SettlementPlan
              plan={getFilteredSettlementPlan()}
              isLoading={settlementLoading}
              currentUserId={user?.id || ''}
              onPayNow={handleSmartPayNow}
              onSettleReceived={handleSmartSettleReceived}
              showGroupName={selectedGroupId === 'all'}
            />
          </TabsContent>

          {/* Raw Balances Tab */}
          <TabsContent value="raw" className="mt-5 space-y-6">
            {userBalancesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* You Owe */}
                <div>
                  <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-destructive" />
                    You Owe
                  </h2>
                  
                  {userBalances?.owes && userBalances.owes.filter(b => selectedGroupId === 'all' || b.group_id === selectedGroupId).length > 0 ? (
                    <div className="space-y-3">
                      {userBalances.owes
                        .filter(b => selectedGroupId === 'all' || b.group_id === selectedGroupId)
                        .map((balance, index) => (
                          <motion.div
                            key={balance.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <GlassCard className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <UserAvatar
                                  src={balance.to_profile?.avatar_url}
                                  name={balance.to_profile?.full_name}
                                  size="md"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {balance.to_profile?.full_name || balance.to_profile?.email}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {balance.group?.name}
                                  </p>
                                </div>
                                <p className="font-semibold text-lg text-destructive">
                                  {formatCurrency(balance.amount)}
                                </p>
                              </div>
                              <Button
                                onClick={() => handlePayNow(balance)}
                                className="w-full h-11 gradient-primary shadow-glow-sm"
                              >
                                <Wallet className="w-4 h-4 mr-2" />
                                Pay Now
                              </Button>
                            </GlassCard>
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <GlassCard className="text-center py-6">
                      <p className="text-muted-foreground">You don't owe anyone 🎉</p>
                    </GlassCard>
                  )}
                </div>

                {/* You're Owed */}
                <div>
                  <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-success" />
                    You're Owed
                  </h2>
                  
                  {userBalances?.owed && userBalances.owed.filter(b => selectedGroupId === 'all' || b.group_id === selectedGroupId).length > 0 ? (
                    <div className="space-y-3">
                      {userBalances.owed
                        .filter(b => selectedGroupId === 'all' || b.group_id === selectedGroupId)
                        .map((balance, index) => (
                          <motion.div
                            key={balance.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <GlassCard className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <UserAvatar
                                  src={balance.from_profile?.avatar_url}
                                  name={balance.from_profile?.full_name}
                                  size="md"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {balance.from_profile?.full_name || balance.from_profile?.email}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {balance.group?.name}
                                  </p>
                                </div>
                                <p className="font-semibold text-lg text-success">
                                  +{formatCurrency(balance.amount)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleSettleReceived(balance)}
                                  className="flex-1 h-11 gradient-primary shadow-glow-sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Settle
                                </Button>
                                <Button
                                  onClick={() => handleRemind(balance)}
                                  variant="outline"
                                  className="flex-1 h-11"
                                >
                                  Remind
                                </Button>
                              </div>
                            </GlassCard>
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <GlassCard className="text-center py-6">
                      <p className="text-muted-foreground">No one owes you</p>
                    </GlassCard>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* UPI Payment Sheet */}
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
