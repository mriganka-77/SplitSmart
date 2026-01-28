import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Phone, Mail, Wallet, Edit, Trash2, IndianRupee, ArrowUpRight, ArrowDownLeft, Search, UserPlus, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useExternalContacts, 
  useExternalBalances, 
  useCreateExternalContact, 
  useDeleteExternalContact,
  useUpdateExternalBalance,
  ExternalContact 
} from '@/hooks/useExternalContacts';
import { useCreatePaymentRecord } from '@/hooks/usePaymentRecords';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

export default function Contacts() {
  const { user } = useAuth();
  const { data: contacts, isLoading: contactsLoading } = useExternalContacts();
  const { data: balancesData, isLoading: balancesLoading } = useExternalBalances();
  const createContact = useCreateExternalContact();
  const deleteContact = useDeleteExternalContact();
  const updateBalance = useUpdateExternalBalance();
  const createPaymentRecord = useCreatePaymentRecord();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ExternalContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<ExternalContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    upi_id: '',
    notes: '',
  });

  // Balance form state
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'they_owe' | 'i_owe'>('they_owe');

  const handleCreateContact = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    await createContact.mutateAsync({
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      upi_id: formData.upi_id || null,
      notes: formData.notes || null,
      avatar_url: null,
    });

    setShowAddDialog(false);
    setFormData({ name: '', phone: '', email: '', upi_id: '', notes: '' });
  };

  const handleAddBalance = async () => {
    if (!selectedContact || !balanceAmount) return;

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    await updateBalance.mutateAsync({
      contactId: selectedContact.id,
      amount,
      operation: balanceType === 'they_owe' ? 'add' : 'subtract',
    });

    // Record the transaction
    await createPaymentRecord.mutateAsync({
      from_user_id: balanceType === 'i_owe' ? user?.id || null : null,
      to_user_id: balanceType === 'they_owe' ? user?.id || null : null,
      from_contact_id: balanceType === 'they_owe' ? selectedContact.id : null,
      to_contact_id: balanceType === 'i_owe' ? selectedContact.id : null,
      group_id: null,
      amount,
      payment_method: 'other',
      status: 'pending',
      reference_id: null,
      notes: `Balance added with ${selectedContact.name}`,
      payment_date: new Date().toISOString(),
    });

    toast.success('Balance updated!');
    setShowBalanceDialog(false);
    setBalanceAmount('');
    setSelectedContact(null);
  };

  const handleSettleBalance = async (contact: ExternalContact) => {
    const balance = balancesData?.contacts.find(b => b.contact_id === contact.id);
    if (!balance) return;

    await updateBalance.mutateAsync({
      contactId: contact.id,
      amount: 0,
      operation: 'settle',
    });

    // Record the settlement
    await createPaymentRecord.mutateAsync({
      from_user_id: balance.amount > 0 ? null : user?.id || null,
      to_user_id: balance.amount > 0 ? user?.id || null : null,
      from_contact_id: balance.amount > 0 ? contact.id : null,
      to_contact_id: balance.amount < 0 ? contact.id : null,
      group_id: null,
      amount: Math.abs(balance.amount),
      payment_method: 'cash',
      status: 'completed',
      reference_id: null,
      notes: `Settled balance with ${contact.name}`,
      payment_date: new Date().toISOString(),
    });

    toast.success(`Settled ${formatCurrency(Math.abs(balance.amount))} with ${contact.name}`);
  };

  const filteredContacts = contacts?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getContactBalance = (contactId: string) => {
    return balancesData?.contacts.find(b => b.contact_id === contactId);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="My Contacts" 
        subtitle="Track money with friends outside the app"
      />

      <div className="px-4 space-y-6">
        {/* Summary Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          <GlassCard className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ArrowDownLeft className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">You're Owed</span>
            </div>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(balancesData?.totalOwed || 0)}
            </p>
          </GlassCard>
          <GlassCard className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">You Owe</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(balancesData?.totalOwing || 0)}
            </p>
          </GlassCard>
        </motion.div>

        {/* Search and Add */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-secondary/50 border-border/50"
            />
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="h-12 w-12 rounded-xl gradient-primary shadow-glow"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Contacts List */}
        <div className="space-y-3">
          {contactsLoading || balancesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredContacts.length > 0 ? (
            <AnimatePresence>
              {filteredContacts.map((contact, index) => {
                const balance = getContactBalance(contact.id);
                return (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-4">
                        <UserAvatar name={contact.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{contact.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {contact.phone}
                              </span>
                            )}
                            {contact.upi_id && (
                              <span className="flex items-center gap-1">
                                <Wallet className="w-3 h-3" /> {contact.upi_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {balance ? (
                            <div className="space-y-1">
                              <p className={`font-bold ${balance.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                                {balance.amount > 0 ? '+' : ''}{formatCurrency(balance.amount)}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleSettleBalance(contact)}
                              >
                                Settle
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => {
                                setSelectedContact(contact);
                                setShowBalanceDialog(true);
                              }}
                            >
                              <IndianRupee className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setContactToDelete(contact)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-primary/50" />
              </div>
              <p className="font-medium text-muted-foreground">No contacts yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add friends who don't use the app to track balances
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-4 gradient-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Add External Contact
            </DialogTitle>
            <DialogDescription>
              Add someone who doesn't use the app to track money with them
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upi">UPI ID</Label>
              <Input
                id="upi"
                placeholder="john@upi"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            <Button
              onClick={handleCreateContact}
              disabled={createContact.isPending}
              className="w-full h-12 gradient-primary"
            >
              {createContact.isPending ? <LoadingSpinner size="sm" /> : 'Add Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Balance Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Balance</DialogTitle>
            <DialogDescription>
              Record a balance with {selectedContact?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={balanceType === 'they_owe' ? 'default' : 'outline'}
                className={`h-14 rounded-xl ${balanceType === 'they_owe' ? 'gradient-primary' : ''}`}
                onClick={() => setBalanceType('they_owe')}
              >
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                They Owe Me
              </Button>
              <Button
                variant={balanceType === 'i_owe' ? 'default' : 'outline'}
                className={`h-14 rounded-xl ${balanceType === 'i_owe' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                onClick={() => setBalanceType('i_owe')}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                I Owe Them
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="pl-10 h-14 text-2xl font-bold rounded-xl"
                />
              </div>
            </div>
            <Button
              onClick={handleAddBalance}
              disabled={updateBalance.isPending}
              className="w-full h-12 gradient-primary"
            >
              {updateBalance.isPending ? <LoadingSpinner size="sm" /> : 'Add Balance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.name}? This will also remove any balance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (contactToDelete) {
                  deleteContact.mutate(contactToDelete.id);
                  setContactToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
