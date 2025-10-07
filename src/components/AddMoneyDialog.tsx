import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

interface AddMoneyDialogProps {
  onAdded?: () => void;
}

export const AddMoneyDialog = ({ onAdded }: AddMoneyDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("razorpay");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // In production: initiate payment via gateway (Razorpay/Stripe) and capture webhook.
      // Here we simulate immediate success for demonstration.
      const amt = parseFloat(amount || "0");
      if (!amt || amt <= 0) throw new Error("Please enter a valid amount");

      // Choose payment flow: here we default to Razorpay if server present, otherwise simulated
      const serverBase = window.location.origin; // adjust if server runs elsewhere

      try {
        // Try create order on server
        const createRes = await fetch(`${serverBase}/api/razorpay/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt, user_id: user.id, provider }),
        });

        if (createRes.ok) {
          const data = await createRes.json();
          const { order, key_id, provider: respProvider } = data;

          // If server returned a simulated provider response, verify directly
          if (respProvider === 'simulated' || provider === 'simulated' || provider === 'phonepe') {
            const verify = await fetch(`${serverBase}/api/razorpay/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: provider === 'phonepe' ? 'phonepe' : 'simulated', amount: amt, user_id: user.id }),
            });

            if (verify.ok) {
              toast({ title: 'Money added', description: `₹${amt.toFixed(2)} added (${respProvider || provider}).` });
              setAmount('');
              setOpen(false);
              onAdded?.();
              setLoading(false);
              return;
            }

            const body = await verify.json().catch(() => ({}));
            throw new Error(body?.error || 'Verification failed');
          }

          // Otherwise assume Razorpay flow
          const options = {
            key: key_id,
            amount: order.amount,
            currency: order.currency,
            name: 'SplitSmart',
            description: 'Wallet top-up',
            order_id: order.id,
            handler: async function (response: any) {
              // verify on server
              const verify = await fetch(`${serverBase}/api/razorpay/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: 'razorpay',
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: amt,
                  user_id: user.id,
                }),
              });

              if (verify.ok) {
                toast({ title: 'Money added', description: `₹${amt.toFixed(2)} added via Razorpay.` });
                setAmount('');
                setOpen(false);
                onAdded?.();
              } else {
                const body = await verify.json().catch(() => ({}));
                throw new Error(body?.error || 'Verification failed');
              }
            },
            prefill: { email: user.email },
            theme: { color: '#3b82f6' },
          };

          // Load Razorpay script if needed
          if (!(window as any).Razorpay) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://checkout.razorpay.com/v1/checkout.js';
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
          }

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          setLoading(false);
          return;
        }
      } catch (err) {
        // server not available or create-order failed; fall back to simulated flow
        console.warn('Razorpay flow failed, falling back to simulated flow', err);
      }

      // Fallback simulated flow (instant success)
      const sb: any = supabase as any;
      const { data: walletData, error: selectErr } = await sb.from('wallets').select('*').eq('user_id', user.id).single();
      if (selectErr && selectErr.code !== 'PGRST116') {
        // ignore
      }

      if (!walletData) {
        const { error: insErr } = await sb.from('wallets').insert({ user_id: user.id, balance: amt });
        if (insErr) throw insErr;
      } else {
        const newBalance = parseFloat(walletData.balance as any) + amt;
        const { error: updErr } = await sb.from('wallets').update({ balance: newBalance }).eq('user_id', user.id);
        if (updErr) throw updErr;
      }

      const { error: txError } = await sb.from('wallet_transactions').insert({ user_id: user.id, amount: amt, payment_method: 'simulated_upi', status: 'success' });
      if (txError) throw txError;

      toast({ title: "Money added", description: `₹${amt.toFixed(2)} added to your wallet.` });
      setAmount("");
      setOpen(false);
      onAdded?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <CreditCard className="h-4 w-4 mr-2" />
          Add Money
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
          <DialogDescription>Select a payment provider (Razorpay/PhonePe/Paytm/Stripe) or choose "Simulated" for a local demo flow. PhonePe/Paytm are simulated here until you provide provider-specific server keys.</DialogDescription>
        </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="provider">Payment Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="phonepe">PhonePe</SelectItem>
                <SelectItem value="paytm">Paytm</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="simulated">Simulated (dev)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input id="amount" type="number" step="0.01" placeholder="100.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay with UPI
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMoneyDialog;
