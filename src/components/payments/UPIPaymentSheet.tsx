import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Copy, CheckCircle, ExternalLink, QrCode } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { toast } from 'sonner';

interface UPIPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  payeeInfo: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    upiId?: string | null;
  };
  amount: number;
  groupName?: string;
  onPaymentComplete?: () => void;
  isSettlement?: boolean; // When true, shows "Settle" mode instead of "Pay" mode
}

// Popular UPI apps for deep linking
const UPI_APPS = [
  { name: 'Google Pay', package: 'com.google.android.apps.nbu.paisa.user', icon: '💳', color: 'bg-blue-500' },
  { name: 'PhonePe', package: 'com.phonepe.app', icon: '💜', color: 'bg-purple-600' },
  { name: 'Paytm', package: 'net.one97.paytm', icon: '🔵', color: 'bg-sky-500' },
  { name: 'BHIM', package: 'in.org.npci.upiapp', icon: '🇮🇳', color: 'bg-orange-500' },
];

export function UPIPaymentSheet({ 
  isOpen, 
  onClose, 
  payeeInfo, 
  amount, 
  groupName,
  onPaymentComplete,
  isSettlement = false
}: UPIPaymentSheetProps) {
  const [payeeUpiId, setPayeeUpiId] = useState(payeeInfo.upiId || '');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Generate UPI deep link URL
  const generateUPILink = (appPackage?: string) => {
    const params = new URLSearchParams({
      pa: payeeUpiId, // Payee UPI ID
      pn: payeeInfo.name || 'User', // Payee name
      am: amount.toFixed(2), // Amount
      cu: 'INR', // Currency
      tn: `SplitSmart: ${groupName || 'Expense settlement'}`, // Transaction note
    });

    return `upi://pay?${params.toString()}`;
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(payeeUpiId);
    setCopied(true);
    toast.success('UPI ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUPIApp = (appPackage?: string) => {
    const upiLink = generateUPILink(appPackage);
    
    // Try to open UPI intent
    const link = document.createElement('a');
    link.href = upiLink;
    link.click();
    
    // Show confirmation toast after a delay
    setTimeout(() => {
      toast.info('Complete the payment in your UPI app', {
        action: {
          label: 'Done',
          onClick: () => {
            if (onPaymentComplete) {
              onPaymentComplete();
            }
            onClose();
          }
        }
      });
    }, 1000);
  };

  const handleMarkAsPaid = () => {
    if (onPaymentComplete) {
      onPaymentComplete();
    }
    toast.success('Payment marked as complete');
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl glass-strong border-t border-border/50 overflow-y-auto">
        <SheetHeader className="text-center pb-4">
          <SheetTitle className="text-2xl font-display">
            {isSettlement ? 'Settle Balance' : 'Pay with UPI'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Payee Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="text-center py-6">
              <UserAvatar
                src={payeeInfo.avatarUrl}
                name={payeeInfo.name}
                size="lg"
                className="mx-auto mb-3"
              />
              <p className="font-semibold text-lg">{payeeInfo.name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{payeeInfo.email}</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-muted-foreground text-sm">
                  {isSettlement ? 'Amount to Settle' : 'Amount to Pay'}
                </p>
                <p className={`text-4xl font-display font-bold mt-1 ${isSettlement ? 'text-success' : 'text-primary'}`}>
                  {formatCurrency(amount)}
                </p>
                {groupName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    for {groupName}
                  </p>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Settlement Mode - Show confirm button directly */}
          {isSettlement ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <p className="text-center text-muted-foreground">
                Did <strong>{payeeInfo.name}</strong> pay you this amount?
              </p>
              <Button
                onClick={handleMarkAsPaid}
                className="w-full h-14 gradient-primary shadow-glow text-lg font-semibold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirm Payment Received
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                This will clear the balance between you and {payeeInfo.name}
              </p>
            </motion.div>
          ) : (
            <>
              {/* UPI ID Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label htmlFor="upiId">Payee's UPI ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="upiId"
                    placeholder="name@upi or 9876543210@paytm"
                    value={payeeUpiId}
                    onChange={(e) => setPayeeUpiId(e.target.value)}
                    className="h-12 bg-secondary/50 border-border/50 rounded-xl flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl"
                    onClick={handleCopyUPI}
                    disabled={!payeeUpiId}
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the UPI ID to pay directly
                </p>
              </motion.div>

          {/* UPI Apps Grid */}
          {payeeUpiId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <Label>Pay using</Label>
              <div className="grid grid-cols-2 gap-3">
                {UPI_APPS.map((app) => (
                  <Button
                    key={app.package}
                    variant="outline"
                    className="h-16 flex-col gap-1 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => handleOpenUPIApp(app.package)}
                  >
                    <span className="text-2xl">{app.icon}</span>
                    <span className="text-xs font-medium">{app.name}</span>
                  </Button>
                ))}
              </div>

              {/* Generic UPI Button */}
              <Button
                onClick={() => handleOpenUPIApp()}
                className="w-full h-14 gradient-primary shadow-glow text-lg font-semibold"
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Open Any UPI App
              </Button>
            </motion.div>
          )}

              {/* Alternative Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 pt-4 border-t border-border/50"
              >
                <p className="text-sm text-center text-muted-foreground">
                  Already paid outside the app?
                </p>
                <Button
                  variant="outline"
                  onClick={handleMarkAsPaid}
                  className="w-full h-12 rounded-xl"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Mark as Paid
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
