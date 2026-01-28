import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader2, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const { isOnline, isSyncing, pendingCount, syncOfflineActions } = useOfflineSync();

  // Show nothing if online and no pending items and not syncing
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 px-4 py-2',
          className
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-md rounded-b-lg px-4 py-2 flex items-center justify-between gap-3 shadow-lg',
            !isOnline
              ? 'bg-destructive/90 text-destructive-foreground backdrop-blur-md'
              : isSyncing
              ? 'bg-primary/90 text-primary-foreground backdrop-blur-md'
              : 'bg-warning/90 text-warning-foreground backdrop-blur-md'
          )}
        >
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">You're offline</span>
              </>
            ) : isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Syncing changes...</span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          {isOnline && pendingCount > 0 && !isSyncing && (
            <button
              onClick={syncOfflineActions}
              className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync now
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
