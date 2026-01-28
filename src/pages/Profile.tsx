import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, LogOut, Moon, Sun, Camera, Edit2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { preferences, updatePreferences, updateNotification, resetPreferences } = useUserPreferences();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
    toast.success('Signed out successfully');
  };

  const handleEditProfile = () => {
    setEditName(profile?.full_name || '');
    setEditAvatarUrl(profile?.avatar_url || '');
    setShowEditDialog(true);
  };

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      full_name: editName,
      avatar_url: editAvatarUrl || null,
    });
    setShowEditDialog(false);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Profile" subtitle="Manage your account" />

      <div className="px-4 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="flex flex-col items-center py-8">
            <div className="relative mb-4">
              <UserAvatar
                src={profile?.avatar_url}
                name={profile?.full_name}
                size="xl"
              />
              <button
                onClick={handleEditProfile}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow-sm"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <h2 className="text-xl font-display font-bold mb-1">
              {profile?.full_name || 'Set your name'}
            </h2>
            <p className="text-muted-foreground">{profile?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditProfile}
              className="mt-4"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </GlassCard>
        </motion.div>

        {/* Appearance */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Appearance
          </h3>
          
          <GlassCard className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-warning" />
              )}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  {theme === 'dark' ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </GlassCard>
        </div>

        {/* Currency Settings */}
        <CurrencySettings
          currency={preferences.currency}
          onUpdate={(currency) => {
            updatePreferences({ currency });
            toast.success(`Currency changed to ${currency}`);
          }}
        />

        {/* Language Settings */}
        <LanguageSettings
          language={preferences.language}
          onUpdate={(language) => {
            updatePreferences({ language });
            toast.success('Language preference saved');
          }}
        />

        {/* Notification Settings */}
        <NotificationSettings
          notifications={preferences.notifications}
          onUpdate={(key, value) => {
            updateNotification(key, value);
            toast.success(`${value ? 'Enabled' : 'Disabled'} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
          }}
        />

        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Account
          </h3>
          
          <GlassCard className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => {
              resetPreferences();
              toast.success('Preferences reset to defaults');
            }}
            variant="outline"
            className="w-full h-12"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset Preferences
          </Button>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* App Version */}
        <p className="text-center text-sm text-muted-foreground pt-4">
          SplitSmart v1.0.0
        </p>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass-strong border-border/50 max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex justify-center mb-4">
              <UserAvatar
                src={editAvatarUrl}
                name={editName}
                size="xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editName">Full Name</Label>
              <Input
                id="editName"
                placeholder="Your name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editAvatar">Avatar URL</Label>
              <Input
                id="editAvatar"
                placeholder="https://example.com/avatar.jpg"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl"
              />
              <p className="text-sm text-muted-foreground">
                Enter an image URL for your profile picture
              </p>
            </div>
            
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="w-full h-12 gradient-primary shadow-glow-sm"
            >
              {updateProfile.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
