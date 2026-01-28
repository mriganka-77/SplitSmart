import { motion } from 'framer-motion';
import { ArrowRight, Wallet, CheckCircle } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency } from '@/lib/currency';
import type { SuggestedPayment } from '@/hooks/useGroupSettlement';

interface PaymentFlowCardProps {
  payment: SuggestedPayment;
  index: number;
  currentUserId: string;
  onPayNow: (payment: SuggestedPayment) => void;
  onSettleReceived: (payment: SuggestedPayment) => void;
  showGroupName?: boolean;
}

export function PaymentFlowCard({
  payment,
  index,
  currentUserId,
  onPayNow,
  onSettleReceived,
  showGroupName = false,
}: PaymentFlowCardProps) {
  const isYouPaying = payment.from.id === currentUserId;
  const isYouReceiving = payment.to.id === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <GlassCard className="p-4">
        {/* Group name badge */}
        {showGroupName && (
          <div className="mb-3">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
              {payment.groupName}
            </span>
          </div>
        )}

        {/* Payment flow visualization */}
        <div className="flex items-center justify-between gap-3">
          {/* From user */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="relative">
              <UserAvatar
                src={payment.from.avatar_url}
                name={payment.from.full_name}
                size="md"
              />
              {isYouPaying && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">You</span>
                </div>
              )}
            </div>
            <p className="text-sm font-medium mt-2 truncate w-full text-center">
              {isYouPaying ? 'You' : payment.from.full_name || payment.from.email}
            </p>
          </div>

          {/* Arrow with amount */}
          <div className="flex flex-col items-center px-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
            >
              <span className="font-mono font-bold text-primary text-sm">
                {formatCurrency(payment.amount)}
              </span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </motion.div>
          </div>

          {/* To user */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="relative">
              <UserAvatar
                src={payment.to.avatar_url}
                name={payment.to.full_name}
                size="md"
              />
              {isYouReceiving && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">You</span>
                </div>
              )}
            </div>
            <p className="text-sm font-medium mt-2 truncate w-full text-center">
              {isYouReceiving ? 'You' : payment.to.full_name || payment.to.email}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4">
          {isYouPaying ? (
            <Button
              onClick={() => onPayNow(payment)}
              className="w-full h-11 gradient-primary shadow-glow-sm"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          ) : isYouReceiving ? (
            <Button
              onClick={() => onSettleReceived(payment)}
              className="w-full h-11 gradient-primary shadow-glow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Received
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Transaction between other members
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
