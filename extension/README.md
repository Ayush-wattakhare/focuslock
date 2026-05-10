# FocusLock Browser Extension

Browser extensions for Chrome and Firefox that sync with your FocusLock account to block distracting websites.

## Features

- **Automatic Sync**: Syncs lock rules from your FocusLock account every 5 minutes
- **Real-time Blocking**: Blocks websites corresponding to locked apps
- **Countdown UI**: Shows time remaining until unlock with visual countdown
- **Emergency Override**: Allows override with mood prompt (except nuclear mode)
- **Cross-browser**: Available for Chrome (Manifest V3) and Firefox (WebExtension)

## Installation

### Chrome

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension/chrome` directory
5. The FocusLock extension icon should appear in your toolbar

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `extension/firefox/manifest.json` file
4. The FocusLock extension icon should appear in your toolbar

## Setup

1. Click the FocusLock extension icon in your toolbar
2. Click "Get your API token from Settings"
3. Log in to your FocusLock account at https://focuslock.app
4. Navigate to Settings and generate an API token
5. Copy the token and paste it into the extension popup
6. Click "Connect"

Your lock rules will now sync automatically!

## How It Works

### Background Service Worker

The background script:
- Syncs lock rules from the FocusLock API every 5 minutes
- Evaluates lock status for the current tab
- Manages alarms for scheduled unlocks
- Handles messages from content script and popup

### Content Script

The content script:
- Intercepts page loads for locked domains
- Replaces the page with a countdown UI
- Listens for unlock events from the background script
- Handles mood prompt for overrides

### Popup UI

The popup shows:
- Current site lock status
- List of active lock rules
- Sync status and last sync time
- Quick actions (sync now, open dashboard)

## Domain Mapping

The extension maps apps to their corresponding website domains:

- **Instagram**: instagram.com
- **YouTube**: youtube.com, m.youtube.com
- **TikTok**: tiktok.com
- **Twitter**: twitter.com, x.com
- **Facebook**: facebook.com, m.facebook.com
- **Reddit**: reddit.com
- **LinkedIn**: linkedin.com
- **Snapchat**: snapchat.com
- **Pinterest**: pinterest.com
- **Twitch**: twitch.tv

## Development

### File Structure

```
extension/
├── chrome/                 # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js       # Service worker
│   ├── content.js          # Content script
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
├── firefox/                # Firefox extension (Manifest V2)
│   ├── manifest.json
│   ├── background.js       # Background script
│   ├── content.js          # Content script
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
└── README.md
```

### API Endpoints Used

- `GET /api/rules` - Fetch lock rules
- `GET /api/usage/daily?app={appName}` - Fetch daily usage for timer locks
- `POST /api/override` - Log override (redirected from blocked page)
- `GET /api/extension/token` - Generate API token (to be implemented)

### Testing

1. Create test lock rules in your FocusLock account
2. Install the extension in developer mode
3. Navigate to a blocked website
4. Verify the countdown UI appears
5. Test override flow
6. Test sync functionality

## Security

- API tokens are stored in encrypted browser storage
- All API requests use HTTPS
- Content Security Policy enforced
- No eval() or inline scripts
- Permissions limited to necessary domains

## Publishing

### Chrome Web Store

1. Create a ZIP file of the `extension/chrome` directory
2. Upload to Chrome Web Store Developer Dashboard
3. Fill in store listing details
4. Submit for review

### Firefox Add-ons

1. Create a ZIP file of the `extension/firefox` directory
2. Upload to Firefox Add-ons Developer Hub
3. Fill in listing details
4. Submit for review

## Troubleshooting

### Extension not syncing

- Check that you've entered a valid API token
- Click "Sync Now" in the popup
- Check browser console for errors

### Website not being blocked

- Verify the app is locked in your FocusLock dashboard
- Check that the domain is mapped correctly
- Reload the page after syncing

### Override not working

- Ensure the lock rule is not in nuclear mode
- Check that you're logged in to FocusLock
- Verify your API token is still valid

## License

Copyright © 2024 FocusLock. All rights reserved.
