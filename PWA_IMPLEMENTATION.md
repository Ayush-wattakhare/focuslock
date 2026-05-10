# PWA Implementation Guide

## Overview

FocusLock is now configured as a Progressive Web App (PWA) with full offline support, installability, and background sync capabilities.

## Features Implemented

### 1. PWA Manifest (`public/manifest.json`)

The manifest defines the app's appearance and behavior when installed:

- **App Name**: FocusLock - Social Media Addiction Reducer
- **Short Name**: FocusLock
- **Display Mode**: Standalone (looks like a native app)
- **Theme Color**: #6366f1 (Indigo)
- **Background Color**: #ffffff (White)
- **Icons**: 192x192 and 512x512 PNG icons
- **Start URL**: /dashboard
- **Shortcuts**: Quick access to Dashboard, Add Rule, and Focus Mode

### 2. Service Worker (`public/sw.js`)

The service worker implements intelligent caching strategies:

#### Caching Strategies

1. **Network-First for API Routes**
   - Tries network first, falls back to cache if offline
   - Caches successful responses for offline access
   - Cache duration: 5 minutes

2. **Cache-First for Static Assets**
   - Serves from cache immediately if available
   - Updates cache in background
   - Includes: JS, CSS, images, fonts, icons

3. **Network-First with Fallback for Pages**
   - Tries network first for fresh content
   - Falls back to cached version if offline
   - Redirects to dashboard if no cache available

#### Offline Support

- **Lock Rules**: Cached for offline viewing
- **Countdown Screens**: Available offline
- **Override Logs**: Queued for sync when back online
- **Streak Data**: Cached with fallback values

#### Background Sync

- Queues override logs when offline
- Automatically syncs when connection restored
- Uses Background Sync API when available
- Falls back to manual sync on reconnection

### 3. Next.js PWA Configuration (`next.config.mjs`)

Configured with `next-pwa` package:

- **Automatic Service Worker Generation**: Disabled in development
- **Runtime Caching**: Configured for fonts, images, API calls
- **Workbox Integration**: Advanced caching strategies
- **Skip Waiting**: Immediate activation of new service workers

### 4. PWA Components

#### PWAInstallPrompt (`components/PWAInstallPrompt.tsx`)

- Detects if app is installable
- Shows install prompt to users
- Handles install acceptance/dismissal
- Remembers dismissal for 7 days
- Responsive design for mobile and desktop

#### OfflineIndicator (`components/OfflineIndicator.tsx`)

- Shows banner when offline
- Notifies users of limited functionality
- Displays update notification when new version available
- One-click update button

#### OfflineQueueStatus (`components/OfflineQueueStatus.tsx`)

- Shows count of queued actions
- Manual sync button when online
- Auto-syncs when connection restored
- Real-time queue count updates

### 5. PWA Hook (`hooks/usePWA.ts`)

Custom React hook for PWA state management:

```typescript
const { isInstalled, isOnline, needsUpdate, updateServiceWorker } = usePWA();
```

- **isInstalled**: Whether app is installed as PWA
- **isOnline**: Current network status
- **needsUpdate**: Whether new version is available
- **updateServiceWorker**: Function to update to new version

### 6. Offline Queue Manager (`lib/offlineQueue.ts`)

Manages queuing and syncing of offline actions:

```typescript
// Queue an override when offline
queueOverride({ lock_rule_id, app_name, mood, reason_text });

// Sync all queued items
await syncQueue();

// Get queue status
const count = getQueueCount();
const hasItems = hasQueuedItems();
```

## Installation

### For Users

#### Desktop (Chrome/Edge)

1. Visit FocusLock in Chrome or Edge
2. Look for the install icon in the address bar
3. Click "Install" in the prompt
4. App will be added to your applications

#### Mobile (Android)

1. Visit FocusLock in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. Confirm installation
5. App icon will appear on home screen

#### Mobile (iOS)

1. Visit FocusLock in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Confirm and name the app
5. App icon will appear on home screen

### For Developers

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Test PWA Locally**
   ```bash
   npm run start
   ```
   
   Note: Service worker only works in production mode

4. **Test Offline Functionality**
   - Open DevTools → Application → Service Workers
   - Check "Offline" to simulate offline mode
   - Navigate the app to test cached content

## Testing PWA Features

### 1. Test Installation

- Open Chrome DevTools → Application → Manifest
- Verify manifest is loaded correctly
- Check "Add to home screen" link works

### 2. Test Service Worker

- Open Chrome DevTools → Application → Service Workers
- Verify service worker is registered and activated
- Check cache storage for cached assets

### 3. Test Offline Mode

1. Load the app while online
2. Open DevTools → Network → Check "Offline"
3. Navigate to different pages
4. Verify cached content loads
5. Try to override a lock (should queue)
6. Uncheck "Offline"
7. Verify queued actions sync automatically

### 4. Test Background Sync

1. Queue an override while offline
2. Check OfflineQueueStatus shows queued item
3. Go back online
4. Verify automatic sync occurs
5. Check queue is cleared

### 5. Test Updates

1. Make a change to the service worker
2. Deploy new version
3. Reload the app
4. Verify update notification appears
5. Click "Update Now"
6. Verify app reloads with new version

## Lighthouse PWA Audit

Run Lighthouse audit to verify PWA compliance:

```bash
npm run build
npm run start
```

Then in Chrome DevTools:
1. Open Lighthouse tab
2. Select "Progressive Web App" category
3. Click "Generate report"

**Target Scores:**
- PWA: 100/100
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥90
- SEO: ≥90

## Troubleshooting

### Service Worker Not Registering

- Ensure you're running in production mode (`npm run build && npm run start`)
- Check browser console for errors
- Verify HTTPS is enabled (required for service workers)
- Clear browser cache and reload

### Install Prompt Not Showing

- Verify manifest.json is accessible at `/manifest.json`
- Check manifest has all required fields
- Ensure icons are accessible
- Try in incognito mode (clears previous dismissals)

### Offline Mode Not Working

- Verify service worker is activated
- Check cache storage in DevTools
- Ensure fetch events are being intercepted
- Check network tab shows "(from ServiceWorker)"

### Background Sync Not Working

- Background Sync API requires HTTPS
- Not all browsers support Background Sync
- Check browser compatibility
- Falls back to manual sync on reconnection

## Browser Support

### Full PWA Support
- Chrome 67+ (Desktop & Android)
- Edge 79+
- Samsung Internet 8.2+
- Opera 54+

### Partial Support (Install Only)
- Safari 11.1+ (iOS)
- Firefox 79+ (Android)

### Not Supported
- Internet Explorer
- Firefox Desktop (no install, but service worker works)

## Performance Optimizations

### Caching Strategy

1. **Static Assets**: Cache-first (instant load)
2. **API Calls**: Network-first (fresh data, offline fallback)
3. **Pages**: Network-first (fresh content, offline fallback)

### Cache Sizes

- Static Cache: ~2-5 MB (app shell, icons, fonts)
- API Cache: ~1-2 MB (lock rules, streak data)
- Runtime Cache: ~5-10 MB (pages, images)

### Cache Expiration

- Static assets: 24 hours
- API responses: 5 minutes
- Images: 24 hours
- Fonts: 1 year

## Security Considerations

### Service Worker Scope

- Service worker controls all routes under `/`
- Cannot access cross-origin resources without CORS
- Runs in separate thread (no DOM access)

### Cache Security

- Only caches same-origin resources
- HTTPS required for service worker
- No sensitive data cached (tokens, passwords)

### Background Sync

- Only syncs when user is online
- Requires user permission for notifications
- Respects user's data saver settings

## Future Enhancements

### Planned Features

1. **Push Notifications**
   - Buddy override notifications
   - Unlock reminders
   - Badge earned notifications

2. **Periodic Background Sync**
   - Auto-refresh lock rules
   - Sync streak data
   - Update AI insights

3. **Advanced Offline Support**
   - Offline rule creation (queued)
   - Offline stats viewing
   - Offline badge viewing

4. **Install Analytics**
   - Track install rate
   - Monitor PWA usage vs web
   - A/B test install prompts

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [next-pwa](https://github.com/shadowwalker/next-pwa)

## Support

For issues or questions about PWA implementation:
1. Check browser console for errors
2. Review service worker logs
3. Test in incognito mode
4. Clear cache and try again
5. Check browser compatibility

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready
