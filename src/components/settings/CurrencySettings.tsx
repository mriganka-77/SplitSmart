import { Coins, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SUPPORTED_CURRENCIES } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';

interface CurrencySettingsProps {
  currency: string;
  onUpdate: (currency: string) => void;
}

export function CurrencySettings({ currency, onUpdate }: CurrencySettingsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Coins className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Currency
        </h3>
      </div>
      
      <GlassCard className="p-2">
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_CURRENCIES.map((curr) => (
            <button
              key={curr.code}
              onClick={() => onUpdate(curr.code)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                "hover:bg-secondary/50",
                currency === curr.code 
                  ? "bg-primary/20 border border-primary/50" 
                  : "border border-transparent"
              )}
            >
              <span className="text-lg font-bold">{curr.symbol}</span>
              <span className="text-xs text-muted-foreground">{curr.code}</span>
              {currency === curr.code && (
                <Check className="w-3 h-3 text-primary absolute top-1 right-1" />
              )}
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
