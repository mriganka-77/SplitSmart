import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, DollarSign, Search, X } from 'lucide-react';
import { useGroups, useCreateGroup } from '@/hooks/useGroups';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Groups() {
  const navigate = useNavigate();
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const filteredGroups = groups?.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    await createGroup.mutateAsync({
      name: newGroupName,
      description: newGroupDescription || undefined,
    });
    
    setShowCreateDialog(false);
    setNewGroupName('');
    setNewGroupDescription('');
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Groups" 
        subtitle="Manage your expense groups"
        action={
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="icon"
            className="rounded-full gradient-primary shadow-glow-sm"
          >
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-card border-border/50 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Groups List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredGroups && filteredGroups.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    hover
                    onClick={() => navigate(`/group/${group.id}`)}
                    className="flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <Users className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(group.total_expense)}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <GlassCard className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-6">
              Create a group to start tracking shared expenses
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gradient-primary">
              <Plus className="w-5 h-5 mr-2" />
              Create Group
            </Button>
          </GlassCard>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass-strong border-border/50 max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Trip to Hawaii"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description (optional)</Label>
              <Textarea
                id="groupDescription"
                placeholder="Add a description..."
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="bg-secondary/50 border-border/50 rounded-xl resize-none"
                rows={3}
              />
            </div>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || createGroup.isPending}
              className="w-full h-12 gradient-primary shadow-glow-sm"
            >
              {createGroup.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Group
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
