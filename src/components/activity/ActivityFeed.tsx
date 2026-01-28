import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  CheckCircle, 
  Activity,
  IndianRupee,
  Users,
  Zap
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/currency';
import type { ActivityLog } from '@/hooks/useActivityLogs';

interface ActivityFeedProps {
  activities: ActivityLog[];
  isLoading: boolean;
  showGroupName?: boolean;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'expense_created':
      return <Plus className="w-3 h-3" />;
    case 'expense_updated':
      return <Edit className="w-3 h-3" />;
    case 'expense_deleted':
      return <Trash2 className="w-3 h-3" />;
    case 'member_added':
      return <UserPlus className="w-3 h-3" />;
    case 'member_removed':
      return <UserMinus className="w-3 h-3" />;
    case 'balance_settled':
      return <CheckCircle className="w-3 h-3" />;
    default:
      return <Activity className="w-3 h-3" />;
  }
};

const getActivityColor = (action: string) => {
  switch (action) {
    case 'expense_created':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'expense_updated':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'expense_deleted':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'member_added':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'member_removed':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'balance_settled':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getActivityMessage = (activity: ActivityLog) => {
  const metadata = activity.metadata as Record<string, unknown>;
  const userName = activity.user?.full_name || activity.user?.email || 'Someone';

  switch (activity.action) {
    case 'expense_created':
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' added '}
          <span className="font-medium text-primary">
            {metadata.title as string}
          </span>
          {metadata.amount && (
            <span className="font-mono text-primary ml-1">
              ({formatCurrency(metadata.amount as number)})
            </span>
          )}
        </>
      );
    case 'expense_updated':
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' updated '}
          <span className="font-medium text-amber-400">
            {metadata.title as string}
          </span>
        </>
      );
    case 'expense_deleted':
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' deleted '}
          <span className="font-medium text-destructive">
            {metadata.title as string}
          </span>
        </>
      );
    case 'member_added':
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' added '}
          <span className="font-medium text-emerald-400">
            {metadata.member_name as string || 'a member'}
          </span>
        </>
      );
    case 'member_removed':
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' removed '}
          <span className="font-medium text-orange-400">
            {metadata.member_name as string || 'a member'}
          </span>
        </>
      );
    case 'balance_settled':
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' settled '}
          <span className="font-mono text-cyan-400">
            {formatCurrency(metadata.amount as number)}
          </span>
          {metadata.with_user && (
            <>
              {' with '}
              <span className="font-medium text-foreground">
                {metadata.with_user as string}
              </span>
            </>
          )}
        </>
      );
    default:
      return (
        <>
          <span className="font-medium text-foreground">{userName}</span>
          {' performed an action'}
        </>
      );
  }
};

export function ActivityFeed({ activities, isLoading, showGroupName = false }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="tech-card text-center py-12"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-primary/50" />
        </div>
        <p className="text-muted-foreground font-medium">No activity yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Actions will appear here as they happen
        </p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />

      <div className="space-y-4">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="relative pl-12"
            >
              {/* Timeline dot */}
              <div className={`absolute left-3 top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.action)}`}>
                {getActivityIcon(activity.action)}
              </div>

              <div className="tech-card p-4">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    src={activity.user?.avatar_url}
                    name={activity.user?.full_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      {getActivityMessage(activity)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                      {showGroupName && activity.group && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {activity.group.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
