import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDB, getOfflineQueue } from '@/lib/indexedDB';

interface OfflineContextType {
  isDBReady: boolean;
  pendingActionsCount: number;
  refreshPendingCount: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDBReady, setIsDBReady] = useState(false);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        setIsDBReady(true);
        const queue = await getOfflineQueue();
        setPendingActionsCount(queue.length);
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        // Still mark as ready - app should work without offline support
        setIsDBReady(true);
      }
    };
    init();
  }, []);

  const refreshPendingCount = async () => {
    try {
      const queue = await getOfflineQueue();
      setPendingActionsCount(queue.length);
    } catch (error) {
      console.error('Failed to refresh pending count:', error);
    }
  };

  return (
    <OfflineContext.Provider value={{ isDBReady, pendingActionsCount, refreshPendingCount }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineContext = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
};
