/**
 * Offline Queue Manager
 * Handles queuing of override logs when offline and syncing when back online
 */

interface QueuedOverride {
  id: string;
  lock_rule_id: string;
  app_name: string;
  mood: 'bored' | 'stressed' | 'tired' | 'news' | 'other';
  reason_text?: string;
  timestamp: number;
}

const QUEUE_KEY = 'focuslock_offline_queue';

/**
 * Add an override to the offline queue
 */
export function queueOverride(override: Omit<QueuedOverride, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  const queue = getQueue();
  const queuedOverride: QueuedOverride = {
    ...override,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  queue.push(queuedOverride);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  // Register background sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register('sync-override-logs');
    }).catch((error) => {
      console.error('[OfflineQueue] Failed to register background sync:', error);
    });
  }
}

/**
 * Get all queued overrides
 */
export function getQueue(): QueuedOverride[] {
  if (typeof window === 'undefined') return [];

  try {
    const queueJson = localStorage.getItem(QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error('[OfflineQueue] Failed to parse queue:', error);
    return [];
  }
}

/**
 * Remove an override from the queue
 */
export function removeFromQueue(id: string): void {
  if (typeof window === 'undefined') return;

  const queue = getQueue();
  const filteredQueue = queue.filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filteredQueue));
}

/**
 * Clear the entire queue
 */
export function clearQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Sync all queued overrides to the server
 */
export async function syncQueue(): Promise<{ success: number; failed: number }> {
  const queue = getQueue();
  
  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const override of queue) {
    try {
      const response = await fetch('/api/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lock_rule_id: override.lock_rule_id,
          app_name: override.app_name,
          mood: override.mood,
          reason_text: override.reason_text,
        }),
      });

      if (response.ok) {
        removeFromQueue(override.id);
        successCount++;
      } else {
        failedCount++;
        console.error('[OfflineQueue] Failed to sync override:', override.id);
      }
    } catch (error) {
      failedCount++;
      console.error('[OfflineQueue] Error syncing override:', error);
    }
  }

  return { success: successCount, failed: failedCount };
}

/**
 * Get the number of queued items
 */
export function getQueueCount(): number {
  return getQueue().length;
}

/**
 * Check if there are queued items
 */
export function hasQueuedItems(): boolean {
  return getQueueCount() > 0;
}

/**
 * Hook to automatically sync queue when online
 */
export function setupAutoSync(): void {
  if (typeof window === 'undefined') return;

  // Sync when coming back online
  window.addEventListener('online', () => {
    console.log('[OfflineQueue] Back online, syncing queue...');
    syncQueue().then(({ success, failed }) => {
      console.log(`[OfflineQueue] Sync complete: ${success} success, ${failed} failed`);
    });
  });

  // Sync on page load if online
  if (navigator.onLine && hasQueuedItems()) {
    syncQueue().then(({ success, failed }) => {
      console.log(`[OfflineQueue] Initial sync: ${success} success, ${failed} failed`);
    });
  }
}
