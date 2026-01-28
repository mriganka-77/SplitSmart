import { Bell, Receipt, Wallet, Calendar, Mail } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Switch } from '@/components/ui/switch';
import { UserPreferences } from '@/hooks/useUserPreferences';

interface NotificationSettingsProps {
  notifications: UserPreferences['notifications'];
  onUpdate: (key: keyof UserPreferences['notifications'], value: boolean) => void;
}

const notificationOptions = [
  {
    key: 'expenseAdded' as const,
    icon: Receipt,
    title: 'Expense Added',
    description: 'When someone adds an expense in your group',
  },
  {
    key: 'paymentReceived' as const,
    icon: Wallet,
    title: 'Payment Received',
    description: 'When you receive a payment from someone',
  },
  {
    key: 'settlementReminders' as const,
    icon: Calendar,
    title: 'Settlement Reminders',
    description: 'Remind you about pending settlements',
  },
  {
    key: 'weeklyDigest' as const,
    icon: Mail,
    title: 'Weekly Digest',
    description: 'Weekly summary of your expenses',
  },
];

export function NotificationSettings({ notifications, onUpdate }: NotificationSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Notifications
        </h3>
      </div>
      
      <div className="space-y-2">
        {notificationOptions.map((option) => {
          const Icon = option.icon;
          return (
            <GlassCard key={option.key} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{option.title}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <Switch
                checked={notifications[option.key]}
                onCheckedChange={(checked) => onUpdate(option.key, checked)}
              />
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
