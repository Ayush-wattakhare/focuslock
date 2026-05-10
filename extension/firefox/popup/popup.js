// FocusLock Browser Extension - Popup Script (Firefox)

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is authenticated
  const { apiToken } = await browser.storage.local.get('apiToken');
  
  if (!apiToken) {
    showAuthSection();
  } else {
    showMainSection();
    await loadCurrentSiteStatus();
    await loadLockRules();
    updateSyncStatus();
  }
  
  // Set up event listeners
  setupEventListeners();
});

function showAuthSection() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('main-section').style.display = 'none';
}

function showMainSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('main-section').style.display = 'block';
}

function setupEventListeners() {
  // Save API token
  document.getElementById('save-token-btn')?.addEventListener('click', async () => {
    const token = document.getElementById('api-token-input').value.trim();
    
    if (!token) {
      alert('Please enter an API token');
      return;
    }
    
    // Save token and sync rules
    await browser.runtime.sendMessage({
      type: 'SET_API_TOKEN',
      payload: { token }
    });
    
    showMainSection();
    await loadCurrentSiteStatus();
    await loadLockRules();
    updateSyncStatus();
  });
  
  // Sync button
  document.getElementById('sync-btn')?.addEventListener('click', async () => {
    const syncBtn = document.getElementById('sync-btn');
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    
    await browser.runtime.sendMessage({ type: 'SYNC_RULES' });
    
    await loadLockRules();
    updateSyncStatus();
    
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<span>🔄</span> Sync Now';
  });
  
  // Disconnect button
  document.getElementById('disconnect-btn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to disconnect? Your lock rules will no longer sync.')) {
      await browser.storage.local.remove(['apiToken', 'lockRules', 'lastSync']);
      showAuthSection();
    }
  });
}

async function loadCurrentSiteStatus() {
  try {
    // Get current tab
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      document.getElementById('site-name').textContent = 'No active tab';
      document.getElementById('site-status').textContent = 'N/A';
      return;
    }
    
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Check lock status
    const lockStatus = await browser.runtime.sendMessage({
      type: 'CHECK_LOCK_STATUS',
      payload: { domain }
    });
    
    // Update UI
    document.getElementById('site-name').textContent = domain;
    
    const statusElement = document.getElementById('site-status');
    if (lockStatus.isLocked) {
      statusElement.textContent = `🔒 Locked - ${lockStatus.reason}`;
      statusElement.className = 'site-status locked';
    } else {
      statusElement.textContent = '✅ Unlocked';
      statusElement.className = 'site-status unlocked';
    }
    
  } catch (error) {
    console.error('Failed to load current site status:', error);
    document.getElementById('site-name').textContent = 'Error';
    document.getElementById('site-status').textContent = 'Failed to check status';
  }
}

async function loadLockRules() {
  try {
    const { lockRules } = await browser.storage.local.get('lockRules');
    
    const rulesList = document.getElementById('rules-list');
    
    if (!lockRules || lockRules.length === 0) {
      rulesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div>No lock rules found</div>
          <div style="margin-top: 0.5rem;">
            <a href="https://focuslock.app/rules/new" target="_blank" class="link-btn">
              Create your first rule
            </a>
          </div>
        </div>
      `;
      return;
    }
    
    // Filter active rules
    const activeRules = lockRules.filter(r => r.is_active);
    
    if (activeRules.length === 0) {
      rulesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💤</div>
          <div>All rules are inactive</div>
        </div>
      `;
      return;
    }
    
    // Render rules
    rulesList.innerHTML = activeRules.map(rule => {
      const lockTypeLabel = getLockTypeLabel(rule.lock_type);
      const icon = getAppIcon(rule.app_name);
      
      return `
        <div class="rule-item">
          <div class="rule-info">
            <div class="rule-icon">${icon}</div>
            <div class="rule-details">
              <div class="rule-name">${rule.app_name}</div>
              <div class="rule-type">${lockTypeLabel}</div>
            </div>
          </div>
          <div class="rule-status active">Active</div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Failed to load lock rules:', error);
    document.getElementById('rules-list').innerHTML = `
      <div class="empty-state">
        <div>Failed to load rules</div>
      </div>
    `;
  }
}

async function updateSyncStatus() {
  try {
    const { lastSync } = await browser.storage.local.get('lastSync');
    
    const syncIcon = document.querySelector('.sync-icon');
    const syncText = document.querySelector('.sync-text');
    
    if (lastSync) {
      const timeSince = Date.now() - lastSync;
      const minutesAgo = Math.floor(timeSince / (1000 * 60));
      
      syncIcon.classList.add('synced');
      
      if (minutesAgo < 1) {
        syncText.textContent = 'Just synced';
      } else if (minutesAgo < 60) {
        syncText.textContent = `${minutesAgo}m ago`;
      } else {
        const hoursAgo = Math.floor(minutesAgo / 60);
        syncText.textContent = `${hoursAgo}h ago`;
      }
    } else {
      syncIcon.classList.remove('synced');
      syncText.textContent = 'Not synced';
    }
    
  } catch (error) {
    console.error('Failed to update sync status:', error);
  }
}

function getLockTypeLabel(lockType) {
  const labels = {
    'timer': 'Daily Limit',
    'schedule': 'Schedule',
    'until_date': 'Until Date',
    'nuclear': 'Nuclear Mode'
  };
  return labels[lockType] || lockType;
}

function getAppIcon(appName) {
  const icons = {
    'Instagram': '📷',
    'YouTube': '▶️',
    'TikTok': '🎵',
    'Twitter': '🐦',
    'Facebook': '👥',
    'Reddit': '🤖',
    'LinkedIn': '💼',
    'Snapchat': '👻',
    'Pinterest': '📌',
    'Twitch': '🎮'
  };
  return icons[appName] || '📱';
}
