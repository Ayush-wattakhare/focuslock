'use client';

import { usePWA } from '@/hooks/usePWA';

export default function OfflineIndicator() {
  const { isOnline, needsUpdate, updateServiceWorker } = usePWA();

  if (isOnline && !needsUpdate) {
    return null;
  }

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span>You're offline. Some features may be unavailable.</span>
          </div>
        </div>
      )}

      {/* Update available indicator */}
      {needsUpdate && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-indigo-600 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1">Update Available</h3>
              <p className="text-xs opacity-90 mb-3">
                A new version of FocusLock is available. Update now to get the latest features.
              </p>
              
              <button
                onClick={updateServiceWorker}
                className="w-full px-4 py-2 bg-white text-indigo-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
