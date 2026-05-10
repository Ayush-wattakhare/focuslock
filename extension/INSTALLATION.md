# FocusLock Browser Extension - Installation Guide

## Quick Start

### For Chrome Users

1. **Download the Extension**
   - Download `focuslock-chrome.zip` from the releases page
   - Extract the ZIP file to a folder on your computer

2. **Install in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" using the toggle in the top right
   - Click "Load unpacked"
   - Select the extracted `chrome` folder
   - The FocusLock icon should appear in your toolbar

3. **Connect to Your Account**
   - Click the FocusLock icon in your toolbar
   - Click "Get your API token from Settings"
   - Log in to https://focuslock.app
   - Go to Settings → Browser Extension
   - Click "Generate Token"
   - Copy the token
   - Paste it into the extension popup
   - Click "Connect"

4. **You're Done!**
   - Your lock rules will sync automatically
   - Blocked websites will show a countdown screen
   - Check the popup to see your active rules

### For Firefox Users

1. **Download the Extension**
   - Download `focuslock-firefox.zip` from the releases page
   - Extract the ZIP file to a folder on your computer

2. **Install in Firefox**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Navigate to the extracted `firefox` folder
   - Select the `manifest.json` file
   - The FocusLock icon should appear in your toolbar

3. **Connect to Your Account**
   - Click the FocusLock icon in your toolbar
   - Click "Get your API token from Settings"
   - Log in to https://focuslock.app
   - Go to Settings → Browser Extension
   - Click "Generate Token"
   - Copy the token
   - Paste it into the extension popup
   - Click "Connect"

4. **You're Done!**
   - Your lock rules will sync automatically
   - Blocked websites will show a countdown screen
   - Check the popup to see your active rules

## Troubleshooting

### Extension Not Syncing

**Problem**: Lock rules aren't appearing in the extension

**Solutions**:
1. Check that you entered the correct API token
2. Click "Sync Now" in the extension popup
3. Verify you're logged in to FocusLock
4. Check your internet connection
5. Try disconnecting and reconnecting with a new token

### Website Not Being Blocked

**Problem**: A website that should be blocked is still accessible

**Solutions**:
1. Verify the app is locked in your FocusLock dashboard
2. Check that the lock rule is active (not paused)
3. Reload the page after syncing
4. Check if the domain is supported (see supported apps below)
5. Try manually syncing in the extension popup

### Override Not Working

**Problem**: Can't override a lock when needed

**Solutions**:
1. Check if the rule is in Nuclear Mode (overrides disabled)
2. Verify you're logged in to FocusLock
3. Check that your API token is still valid
4. Try generating a new token

### Extension Icon Not Showing

**Problem**: Can't find the extension icon in toolbar

**Solutions**:
1. **Chrome**: Click the puzzle piece icon → Pin FocusLock
2. **Firefox**: Right-click toolbar → Customize → Drag FocusLock icon to toolbar
3. Verify the extension is enabled in your browser's extension settings

## Supported Apps & Websites

The extension blocks these websites when their corresponding apps are locked:

| App       | Blocked Websites                                    |
|-----------|-----------------------------------------------------|
| Instagram | instagram.com, www.instagram.com                    |
| YouTube   | youtube.com, www.youtube.com, m.youtube.com         |
| TikTok    | tiktok.com, www.tiktok.com                          |
| Twitter   | twitter.com, x.com, www.twitter.com, www.x.com      |
| Facebook  | facebook.com, www.facebook.com, m.facebook.com      |
| Reddit    | reddit.com, www.reddit.com                          |
| LinkedIn  | linkedin.com, www.linkedin.com                      |
| Snapchat  | snapchat.com, www.snapchat.com                      |
| Pinterest | pinterest.com, www.pinterest.com                    |
| Twitch    | twitch.tv, www.twitch.tv                            |

## Features

### Automatic Sync
- Lock rules sync every 5 minutes
- Manual sync available in popup
- Sync status shown in popup

### Real-time Blocking
- Websites blocked instantly when locked
- Countdown timer shows time remaining
- Visual progress ring

### Emergency Override
- Override button for non-nuclear locks
- Redirects to mood prompt
- Logs override in your account

### Popup Dashboard
- See current site status
- View all active lock rules
- Quick access to dashboard
- Sync controls

## Privacy & Security

- **Secure Storage**: API tokens stored in encrypted browser storage
- **HTTPS Only**: All communication encrypted
- **No Tracking**: Extension doesn't track your browsing
- **Minimal Permissions**: Only requests necessary permissions
- **Open Source**: Code available for review

## Permissions Explained

### Why does the extension need these permissions?

- **Storage**: Store your API token and synced lock rules
- **Alarms**: Schedule automatic sync every 5 minutes
- **Tabs**: Check which website you're visiting to apply locks
- **All URLs**: Block any website that matches your lock rules

## Uninstalling

### Chrome
1. Go to `chrome://extensions/`
2. Find FocusLock
3. Click "Remove"
4. Confirm removal

### Firefox
1. Go to `about:addons`
2. Find FocusLock
3. Click "Remove"
4. Confirm removal

Your FocusLock account and lock rules will remain intact. You can reinstall the extension anytime.

## Getting Help

- **Documentation**: https://focuslock.app/docs
- **Support**: support@focuslock.app
- **Bug Reports**: https://github.com/focuslock/extension/issues
- **Feature Requests**: https://focuslock.app/feedback

## Updates

The extension will automatically update when new versions are released through the Chrome Web Store or Firefox Add-ons.

To check for updates manually:
- **Chrome**: `chrome://extensions/` → Developer mode → Update
- **Firefox**: `about:addons` → Settings → Check for Updates

## Version History

### v1.0.0 (Current)
- Initial release
- Chrome and Firefox support
- Automatic sync every 5 minutes
- Real-time website blocking
- Countdown UI with progress ring
- Emergency override support
- Popup dashboard

---

**Need more help?** Visit https://focuslock.app/help or contact support@focuslock.app
