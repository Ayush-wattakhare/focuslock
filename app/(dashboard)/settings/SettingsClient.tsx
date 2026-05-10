'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types/database';
import { syncNotificationPreferences } from '@/lib/core/notificationService';
import ThemeToggle from '@/components/ThemeToggle';

interface SettingsClientProps {
  profile: Profile;
}

export default function SettingsClient({ profile }: SettingsClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [timezone, setTimezone] = useState(profile.timezone || 'Asia/Kolkata');

  // Notification preferences state (from profile)
  const [notifyUnlock, setNotifyUnlock] = useState(profile.notify_unlock || false);
  const [notifyBuddyOverride, setNotifyBuddyOverride] = useState(profile.notify_buddy_override || false);
  const [notifyStreakBroken, setNotifyStreakBroken] = useState(profile.notify_streak_broken || false);
  const [notifyBadgeEarned, setNotifyBadgeEarned] = useState(profile.notify_badge_earned ?? true);

  // Sync notification preferences to localStorage on mount
  useEffect(() => {
    syncNotificationPreferences({
      notify_unlock: profile.notify_unlock,
      notify_buddy_override: profile.notify_buddy_override,
      notify_streak_broken: profile.notify_streak_broken,
      notify_badge_earned: profile.notify_badge_earned,
    });
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName || null,
          avatar_url: avatarUrl || null,
          timezone,
          notify_unlock: notifyUnlock,
          notify_buddy_override: notifyBuddyOverride,
          notify_streak_broken: notifyStreakBroken,
          notify_badge_earned: notifyBadgeEarned,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update profile');
      }

      // Sync notification preferences to localStorage
      syncNotificationPreferences({
        notify_unlock: notifyUnlock,
        notify_buddy_override: notifyBuddyOverride,
        notify_streak_broken: notifyStreakBroken,
        notify_badge_earned: notifyBadgeEarned,
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      router.refresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/export');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to export data');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focuslock-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to export data' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete account');
      }

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to delete account' 
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Avatar URL
              </label>
              <input
                type="url"
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyUnlock}
                onChange={(e) => setNotifyUnlock(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Notify me when an app is about to unlock
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyBuddyOverride}
                onChange={(e) => setNotifyBuddyOverride(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Notify me when my buddy overrides a watched rule
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyStreakBroken}
                onChange={(e) => setNotifyStreakBroken(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Notify my buddy when I break my streak
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyBadgeEarned}
                onChange={(e) => setNotifyBadgeEarned(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Notify me when I earn a new badge
              </span>
            </label>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Theme</p>
              <p className="text-xs text-gray-500 mt-1">Choose your preferred color scheme</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Data Export Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Export</h2>
          <p className="text-sm text-gray-600 mb-4">
            Download all your FocusLock data including lock rules, override logs, usage sessions, streaks, and badges.
          </p>
          <button
            onClick={handleExportData}
            disabled={isLoading}
            className="bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Privacy Policy Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Privacy Policy</h2>
          <p className="text-sm text-gray-600 mb-4">
            FocusLock collects and stores your lock rules, usage data, and profile information to provide the service. 
            We do not share your data with third parties except for essential service providers (Supabase for database, 
            Anthropic for AI coaching). You can export or delete your data at any time.
          </p>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Read Full Privacy Policy →
          </a>
        </div>

        {/* Account Deletion Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Delete Account</h2>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-600">
                Are you sure? This will permanently delete all your data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
