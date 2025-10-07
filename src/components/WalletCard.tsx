import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import AddMoneyDialog from './AddMoneyDialog';

export default function WalletCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const sb: any = supabase as any;
      const { data: w } = await sb.from('wallets').select('balance').eq('user_id', session.user.id).single();
      setBalance(w?.balance ?? null);

      const { data: t } = await sb.from('wallet_transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10);
      setTxs(t || []);
    } catch (e) {
      console.warn('fetch wallet failed', e);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
        <CardDescription>Top up and view recent transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className="text-2xl font-bold">{balance !== null ? `₹${Number(balance).toFixed(2)}` : '—'}</div>
          </div>
          <div>
            <AddMoneyDialog onAdded={fetchWallet} />
          </div>
        </div>

        <div className="space-y-2">
          {txs.length > 0 ? (
            txs.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-2 rounded-md bg-muted/5">
                <div>
                  <div className="text-sm font-medium">{tx.payment_method}</div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
                </div>
                <div className="font-semibold">₹{Number(tx.amount).toFixed(2)}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No transactions</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
