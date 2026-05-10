'use client';

import { useEffect, useState } from 'react';
import { getQueueCount, syncQueue, setupAutoSync } from '@/lib/offlineQueue';

export default function OfflineQueueStatus() {
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Setup auto-sync on mount
    setupAutoSync();

    // Update queue count
    const updateCount = () => {
      setQueueCount(getQueueCount());
    };

    updateCount();

    // Update count periodically
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncQueue();
      console.log('Manual sync result:', result);
      setQueueCount(getQueueCount());
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (queueCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg shadow-md p-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        
        <div className="flex-1">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            {queueCount} {queueCount === 1 ? 'action' : 'actions'} queued
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Will sync when online
          </p>
        </div>
        
        {navigator.onLine && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
}
