// FocusLock Browser Extension - Content Script
// Intercepts page loads and displays countdown UI for locked sites

let isBlocked = false;

// Check lock status when page loads
(async function checkLockStatus() {
  const domain = window.location.hostname;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_LOCK_STATUS',
      payload: { domain }
    });
    
    if (response && response.isLocked) {
      blockPage(response);
    }
  } catch (error) {
    console.error('Failed to check lock status:', error);
  }
})();

// Listen for lock status updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOCK_STATUS_UPDATE') {
    if (message.payload.isLocked && !isBlocked) {
      blockPage(message.payload);
    } else if (!message.payload.isLocked && isBlocked) {
      unblockPage();
    }
  }
});

// Block the page and show countdown UI
function blockPage(lockStatus) {
  isBlocked = true;
  
  // Stop page loading
  window.stop();
  
  // Clear page content
  document.documentElement.innerHTML = '';
  
  // Create blocked page UI
  const blockedPage = createBlockedPageUI(lockStatus);
  document.documentElement.appendChild(blockedPage);
  
  // Start countdown timer if unlock time is available
  if (lockStatus.unlocksAt) {
    startCountdown(lockStatus.unlocksAt);
  }
}

// Unblock the page
function unblockPage() {
  isBlocked = false;
  window.location.reload();
}

// Create the blocked page UI
function createBlockedPageUI(lockStatus) {
  const container = document.createElement('div');
  container.id = 'focuslock-blocked-page';
  
  container.innerHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FocusLock - Site Blocked</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .container {
          text-align: center;
          padding: 2rem;
          max-width: 600px;
        }
        
        .lock-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }
        
        .app-name {
          font-size: 1.5rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        
        .countdown-ring {
          width: 200px;
          height: 200px;
          margin: 2rem auto;
          position: relative;
        }
        
        .countdown-ring svg {
          transform: rotate(-90deg);
        }
        
        .countdown-ring circle {
          fill: none;
          stroke-width: 8;
        }
        
        .countdown-ring .background {
          stroke: rgba(255, 255, 255, 0.2);
        }
        
        .countdown-ring .progress {
          stroke: white;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s linear;
        }
        
        .countdown-time {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 2rem;
          font-weight: 700;
        }
        
        .reason {
          font-size: 1.1rem;
          margin: 2rem 0;
          opacity: 0.9;
          line-height: 1.6;
        }
        
        .actions {
          margin-top: 2rem;
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 0.75rem 1.5rem;
          border: 2px solid white;
          background: transparent;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }
        
        .btn:hover {
          background: white;
          color: #667eea;
        }
        
        .btn-primary {
          background: white;
          color: #667eea;
        }
        
        .btn-primary:hover {
          background: transparent;
          color: white;
        }
        
        .nuclear-mode {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.9rem;
        }
        
        .footer {
          margin-top: 3rem;
          opacity: 0.7;
          font-size: 0.9rem;
        }
        
        .footer a {
          color: white;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="lock-icon">🔒</div>
        <h1>Site Blocked</h1>
        <div class="app-name">${lockStatus.appName || 'This site'}</div>
        
        ${lockStatus.unlocksAt ? `
          <div class="countdown-ring">
            <svg width="200" height="200">
              <circle class="background" cx="100" cy="100" r="90"></circle>
              <circle class="progress" cx="100" cy="100" r="90" 
                      stroke-dasharray="565.48" 
                      stroke-dashoffset="0"
                      id="progress-circle"></circle>
            </svg>
            <div class="countdown-time" id="countdown-time">--:--</div>
          </div>
        ` : ''}
        
        <div class="reason">${lockStatus.reason || 'This site is currently locked'}</div>
        
        ${lockStatus.rule && lockStatus.rule.lock_type !== 'nuclear' ? `
          <div class="actions">
            <button class="btn btn-primary" id="override-btn">Emergency Override</button>
            <a href="https://focuslock.app/dashboard" class="btn" target="_blank">Open Dashboard</a>
          </div>
        ` : `
          <div class="nuclear-mode">
            <strong>Nuclear Mode Active</strong><br>
            Override is not available for this lock rule.
          </div>
          <div class="actions">
            <a href="https://focuslock.app/dashboard" class="btn btn-primary" target="_blank">Open Dashboard</a>
          </div>
        `}
        
        <div class="footer">
          Powered by <a href="https://focuslock.app" target="_blank">FocusLock</a>
        </div>
      </div>
      
      <script>
        // Countdown timer logic will be injected here
      </script>
    </body>
    </html>
  `;
  
  return container;
}

// Start countdown timer
function startCountdown(unlocksAtISO) {
  const countdownElement = document.getElementById('countdown-time');
  const progressCircle = document.getElementById('progress-circle');
  
  if (!countdownElement) return;
  
  const unlocksAt = new Date(unlocksAtISO);
  const totalDuration = unlocksAt - Date.now();
  const circumference = 2 * Math.PI * 90; // radius = 90
  
  function updateCountdown() {
    const now = Date.now();
    const remaining = unlocksAt - now;
    
    if (remaining <= 0) {
      countdownElement.textContent = 'Unlocked!';
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }
    
    // Format time remaining
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      countdownElement.textContent = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      countdownElement.textContent = `${minutes}m ${seconds}s`;
    } else {
      countdownElement.textContent = `${seconds}s`;
    }
    
    // Update progress circle
    if (progressCircle) {
      const progress = remaining / totalDuration;
      const offset = circumference * (1 - progress);
      progressCircle.style.strokeDashoffset = offset;
    }
    
    setTimeout(updateCountdown, 1000);
  }
  
  updateCountdown();
}

// Handle override button click
document.addEventListener('click', async (e) => {
  if (e.target.id === 'override-btn') {
    e.preventDefault();
    
    // Open mood prompt in new tab
    const domain = window.location.hostname;
    const overrideUrl = `https://focuslock.app/override?domain=${encodeURIComponent(domain)}&return=${encodeURIComponent(window.location.href)}`;
    window.location.href = overrideUrl;
  }
});
