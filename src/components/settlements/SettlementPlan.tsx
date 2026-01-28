import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Zap, PartyPopper } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PaymentFlowCard } from './PaymentFlowCard';
import type { GroupSettlementPlan, SuggestedPayment } from '@/hooks/useGroupSettlement';

interface SettlementPlanProps {
  plan: GroupSettlementPlan | null;
  isLoading: boolean;
  currentUserId: string;
  onPayNow: (payment: SuggestedPayment) => void;
  onSettleReceived: (payment: SuggestedPayment) => void;
  showGroupName?: boolean;
}

export function SettlementPlan({
  plan,
  isLoading,
  currentUserId,
  onPayNow,
  onSettleReceived,
  showGroupName = false,
}: SettlementPlanProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!plan || plan.suggestedPayments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <GlassCard className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-success/20 flex items-center justify-center mb-4">
            <PartyPopper className="w-8 h-8 text-success" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">All Settled! 🎉</p>
          <p className="text-muted-foreground">No pending balances in this group</p>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Savings Banner */}
      {plan.savings.saved > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Smart Settlement Active
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Reduced from {plan.originalTransactionCount} to{' '}
                  <span className="text-primary font-semibold">
                    {plan.optimizedTransactionCount} payment{plan.optimizedTransactionCount !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-success">-{plan.savings.saved}</p>
                <p className="text-xs text-muted-foreground">transactions</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{plan.optimizedTransactionCount}</p>
            <p className="text-xs text-muted-foreground">Payments Needed</p>
          </GlassCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4 text-center">
            <Sparkles className="w-5 h-5 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold text-success">{plan.savings.percentage}%</p>
            <p className="text-xs text-muted-foreground">Efficiency Gain</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Payment Flow Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Suggested Payments
        </h3>
        {plan.suggestedPayments.map((payment, index) => (
          <PaymentFlowCard
            key={payment.id}
            payment={payment}
            index={index}
            currentUserId={currentUserId}
            onPayNow={onPayNow}
            onSettleReceived={onSettleReceived}
            showGroupName={showGroupName}
          />
        ))}
      </div>
    </div>
  );
}
