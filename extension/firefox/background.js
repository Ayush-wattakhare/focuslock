// FocusLock Browser Extension - Background Script (Firefox)
// Syncs lock rules from FocusLock API and manages lock status

const API_BASE_URL = 'https://focuslock.app'; // Update with actual production URL
const SYNC_INTERVAL_MINUTES = 5;

// Domain mapping for apps to websites
const APP_DOMAIN_MAP = {
  'Instagram': ['instagram.com', 'www.instagram.com'],
  'YouTube': ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
  'TikTok': ['tiktok.com', 'www.tiktok.com'],
  'Twitter': ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'],
  'Facebook': ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  'Reddit': ['reddit.com', 'www.reddit.com'],
  'LinkedIn': ['linkedin.com', 'www.linkedin.com'],
  'Snapchat': ['snapchat.com', 'www.snapchat.com'],
  'Pinterest': ['pinterest.com', 'www.pinterest.com'],
  'Twitch': ['twitch.tv', 'www.twitch.tv']
};

// Initialize extension
browser.runtime.onInstalled.addListener(() => {
  console.log('FocusLock extension installed');
  
  // Set up periodic sync alarm
  browser.alarms.create('syncRules', {
    periodInMinutes: SYNC_INTERVAL_MINUTES
  });
  
  // Initial sync
  syncLockRules();
});

// Handle alarm events
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncRules') {
    syncLockRules();
  }
});

// Sync lock rules from FocusLock API
async function syncLockRules() {
  try {
    const { apiToken } = await browser.storage.local.get('apiToken');
    
    if (!apiToken) {
      console.log('No API token found. User needs to authenticate.');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/rules`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rules: ${response.status}`);
    }
    
    const data = await response.json();
    const rules = data.rules || [];
    
    // Store rules in local storage
    await browser.storage.local.set({ 
      lockRules: rules,
      lastSync: Date.now()
    });
    
    console.log(`Synced ${rules.length} lock rules`);
    
    // Update badge to show sync status
    browser.browserAction.setBadgeText({ text: '' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#4CAF50' });
    
  } catch (error) {
    console.error('Failed to sync lock rules:', error);
    browser.browserAction.setBadgeText({ text: '!' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#F44336' });
  }
}

// Evaluate lock status for a given domain
async function evaluateLockStatus(domain) {
  try {
    const { lockRules, apiToken } = await browser.storage.local.get(['lockRules', 'apiToken']);
    
    if (!lockRules || !apiToken) {
      return { isLocked: false };
    }
    
    // Find which app this domain belongs to
    let appName = null;
    for (const [app, domains] of Object.entries(APP_DOMAIN_MAP)) {
      if (domains.some(d => domain.includes(d))) {
        appName = app;
        break;
      }
    }
    
    if (!appName) {
      return { isLocked: false };
    }
    
    // Find active lock rule for this app
    const rule = lockRules.find(r => 
      r.app_name === appName && r.is_active
    );
    
    if (!rule) {
      return { isLocked: false };
    }
    
    // Fetch current usage for timer locks
    let todayUsageMinutes = 0;
    if (rule.lock_type === 'timer') {
      const response = await fetch(`${API_BASE_URL}/api/usage/daily?app=${encodeURIComponent(appName)}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (response.ok) {
        const usageData = await response.json();
        todayUsageMinutes = usageData.minutes || 0;
      }
    }
    
    // Evaluate lock status based on rule type
    const lockStatus = evaluateLock(rule, new Date(), todayUsageMinutes);
    
    return {
      ...lockStatus,
      appName,
      rule
    };
    
  } catch (error) {
    console.error('Failed to evaluate lock status:', error);
    return { isLocked: false };
  }
}

// Lock evaluation logic (matches server-side logic)
function evaluateLock(rule, now, todayUsageMinutes = 0) {
  if (!rule.is_active) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }
  
  switch (rule.lock_type) {
    case 'timer':
      return evaluateTimerLock(rule, now, todayUsageMinutes);
    
    case 'schedule':
      return evaluateScheduleLock(rule, now);
    
    case 'until_date':
      return evaluateUntilDateLock(rule, now);
    
    case 'nuclear':
      return { 
        isLocked: true, 
        unlocksAt: null, 
        reason: 'Nuclear mode active — no override possible' 
      };
    
    default:
      return { isLocked: false, unlocksAt: null, reason: null };
  }
}

function evaluateTimerLock(rule, now, todayUsageMinutes) {
  const isLocked = todayUsageMinutes >= rule.daily_limit_minutes;
  
  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }
  
  // Unlocks at midnight
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  
  return {
    isLocked: true,
    unlocksAt: midnight.toISOString(),
    reason: `Daily limit of ${rule.daily_limit_minutes} minutes reached`
  };
}

function evaluateScheduleLock(rule, now) {
  // Check if today is in the schedule
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  
  if (!rule.schedule_days || !rule.schedule_days.includes(dayOfWeek)) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }
  
  // Parse schedule times
  const [startHour, startMin] = rule.schedule_start.split(':').map(Number);
  const [endHour, endMin] = rule.schedule_end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Check if current time is within schedule window
  const isLocked = nowMinutes >= startMinutes && nowMinutes < endMinutes;
  
  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }
  
  // Calculate unlock time
  const unlocksAt = new Date(now);
  unlocksAt.setHours(endHour, endMin, 0, 0);
  
  return {
    isLocked: true,
    unlocksAt: unlocksAt.toISOString(),
    reason: `Locked by schedule until ${formatTime(unlocksAt)}`
  };
}

function evaluateUntilDateLock(rule, now) {
  const unlockDate = new Date(rule.unlock_date);
  unlockDate.setHours(0, 0, 0, 0);
  
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);
  
  const isLocked = currentDate < unlockDate;
  
  if (!isLocked) {
    return { isLocked: false, unlocksAt: null, reason: null };
  }
  
  return {
    isLocked: true,
    unlocksAt: unlockDate.toISOString(),
    reason: `Locked until ${formatDate(unlockDate)}`
  };
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Listen for messages from content script and popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_LOCK_STATUS') {
    evaluateLockStatus(message.payload.domain).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'SYNC_RULES') {
    syncLockRules().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (message.type === 'SET_API_TOKEN') {
    browser.storage.local.set({ apiToken: message.payload.token }).then(() => {
      syncLockRules();
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'GET_LOCK_RULES') {
    browser.storage.local.get(['lockRules', 'lastSync']).then(sendResponse);
    return true;
  }
});

// Handle tab updates to check lock status
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const url = new URL(tab.url);
    evaluateLockStatus(url.hostname).then(lockStatus => {
      if (lockStatus.isLocked) {
        // Send message to content script to show blocked page
        browser.tabs.sendMessage(tabId, {
          type: 'LOCK_STATUS_UPDATE',
          payload: lockStatus
        }).catch(() => {
          // Ignore errors if content script not ready
        });
      }
    });
  }
});
