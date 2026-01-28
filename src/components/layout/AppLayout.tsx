import React from 'react';
import { BottomNav } from './BottomNav';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <main className="pb-24 pt-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
