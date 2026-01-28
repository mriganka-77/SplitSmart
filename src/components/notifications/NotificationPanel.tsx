import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useActivityLogs, useRealtimeActivityLogs } from '@/hooks/useActivityLogs';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  className?: string;
}

export function NotificationPanel({ className }: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: activities, isLoading } = useActivityLogs(undefined, 30);
  
  // Enable realtime updates
  useRealtimeActivityLogs();

  // Load last seen timestamp from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notifications_last_seen');
    if (stored) {
      setLastSeenAt(new Date(stored));
    }
  }, []);

  // Calculate unread count
  useEffect(() => {
    if (!activities) return;

    if (!lastSeenAt) {
      setUnreadCount(activities.length > 0 ? Math.min(activities.length, 9) : 0);
      return;
    }

    const unread = activities.filter(
      (a) => new Date(a.created_at) > lastSeenAt
    ).length;

    setUnreadCount(Math.min(unread, 9));
  }, [activities, lastSeenAt]);

  // Mark as read when opening
  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const now = new Date();
      setLastSeenAt(now);
      localStorage.setItem('notifications_last_seen', now.toISOString());
      setUnreadCount(0);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-10 w-10 rounded-xl hover:bg-primary/10 ${className}`}
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md tech-card border-l border-border/30">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-display flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Activity
            </SheetTitle>
            {activities && activities.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCheck className="w-3 h-3" />
                All caught up
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 -mx-2 overflow-y-auto max-h-[calc(100vh-120px)]">
          <ActivityFeed
            activities={activities || []}
            isLoading={isLoading}
            showGroupName
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
