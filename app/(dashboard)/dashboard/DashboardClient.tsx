'use client';

/**
 * Dashboard Client Component
 * 
 * Client-side dashboard that integrates the AppGrid component
 * Fetches usage data and displays apps with lock status
 * 
 * Requirements: 2.1-2.12, 3.1-3.8, 6.1-6.7, 7.1-7.6
 * - Displays AppGrid with locked/unlocked apps
 * - Shows current streak and badges summary
 * - Provides quick actions: add rule, start Pomodoro
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppGrid from '@/components/features/AppGrid';
import { LockRule, LockStatus, Streak, UserBadge, BadgeDefinition } from '@/types';
import { useBuddyNotifications } from '@/lib/hooks/useBuddyNotifications';

interface DashboardClientProps {
  user: {
    id: string;
    email: string;
  } | null; // User can be null for guest mode
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    timezone: string;
    created_at: string;
  } | null;
  initialRules: LockRule[];
}

interface BadgeWithDefinition extends UserBadge {
  badge_definitions?: BadgeDefinition;
}

export default function DashboardClient({ user, profile, initialRules }: DashboardClientProps) {
  const router = useRouter();
  const [rules, setRules] = useState<LockRule[]>(initialRules);
  const [usageData, setUsageData] = useState<Map<string, number>>(new Map());
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<BadgeWithDefinition[]>([]);
  const [isLoadingStreak, setIsLoadingStreak] = useState(true);
  const [isLoadingBadges, setIsLoadingBadges] = useState(true);
  const isGuest = !user;

  // Listen for buddy notifications and show browser notifications
  useBuddyNotifications(user?.id || null);

  // Load data from localStorage for guest users
  useEffect(() => {
    if (isGuest && typeof window !== 'undefined') {
      // Dynamically import localStorage utilities
      import('@/lib/storage/localStorage').then(({ getLockRules, getStreak }) => {
        const localRules = getLockRules();
        setRules(localRules);
        
        const localStreak = getStreak();
        setStreak(localStreak);
        setIsLoadingStreak(false);
        
        // For guest users, we don't have usage data yet
        setIsLoadingUsage(false);
        setIsLoadingBadges(false);
      });
    }
  }, [isGuest]);

  // Fetch today's usage data (only for logged-in users)
  useEffect(() => {
    if (isGuest) return; // Skip API calls for guests
    
    async function fetchUsageData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/usage/daily?date=${today}`);
        
        if (response.ok) {
          const data = await response.json();
          const usageMap = new Map<string, number>();
          
          data.usage.forEach((item: { app_name: string; total_minutes: number }) => {
            usageMap.set(item.app_name, item.total_minutes);
          });
          
          setUsageData(usageMap);
        }
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    }

    fetchUsageData();
  }, [isGuest]);

  // Fetch streak data (only for logged-in users)
  useEffect(() => {
    if (isGuest) return; // Skip API calls for guests
    
    async function fetchStreak() {
      try {
        const response = await fetch('/api/streak');
        
        if (response.ok) {
          const data = await response.json();
          setStreak(data);
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error);
      } finally {
        setIsLoadingStreak(false);
      }
    }

    fetchStreak();
  }, [isGuest]);

  // Fetch badges data (only for logged-in users)
  useEffect(() => {
    if (isGuest) return; // Skip API calls for guests
    
    async function fetchBadges() {
      try {
        const response = await fetch('/api/export');
        
        if (response.ok) {
          const data = await response.json();
          // Export API returns all user data including badges
          if (data.badges) {
            setBadges(data.badges);
          }
        }
      } catch (error) {
        console.error('Failed to fetch badges:', error);
      } finally {
        setIsLoadingBadges(false);
      }
    }

    fetchBadges();
  }, [isGuest]);

  const handleAppClick = (rule: LockRule, lockStatus: LockStatus) => {
    if (lockStatus.isLocked) {
      // Navigate to lock screen page
      router.push(`/lock/${rule.id}`);
    } else {
      // App is unlocked, could open it or show details
      console.log('App is unlocked:', rule.app_name);
      alert(`${rule.app_name} is unlocked and ready to use!`);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>FocusLock Dashboard</h1>
            <p className="welcome-text">
              {user 
                ? `Welcome, ${profile?.full_name || user.email}!`
                : 'Welcome, Guest! Your data is stored locally.'}
            </p>
          </div>
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="signout-btn">
                Sign Out
              </button>
            </form>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="signin-btn"
            >
              Sign In to Sync
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          
          {/* Stats Summary Section - Requirements 6.1-6.7, 7.1-7.6 */}
          <div className="stats-grid">
            {/* Streak Card */}
            <div className="stat-card streak-card">
              <div className="stat-card-header">
                <span className="stat-icon">🔥</span>
                <div>
                  <h3 className="stat-title">Current Streak</h3>
                  <p className="stat-subtitle">Days without override</p>
                </div>
              </div>
              {isLoadingStreak ? (
                <p className="loading-text">Loading...</p>
              ) : (
                <div className="stat-content">
                  <p className="stat-value streak-value">
                    {streak?.current_streak || 0}
                  </p>
                  <p className="stat-detail">
                    Longest: {streak?.longest_streak || 0} days
                  </p>
                </div>
              )}
            </div>

            {/* Badges Card */}
            <div className="stat-card badges-card">
              <div className="stat-card-header">
                <span className="stat-icon">🏆</span>
                <div>
                  <h3 className="stat-title">Badges Earned</h3>
                  <p className="stat-subtitle">Achievements unlocked</p>
                </div>
              </div>
              {isLoadingBadges ? (
                <p className="loading-text">Loading...</p>
              ) : (
                <div className="stat-content">
                  <p className="stat-value badges-value">
                    {badges.length}
                  </p>
                  <button
                    onClick={() => router.push('/badges')}
                    className="view-badges-btn"
                  >
                    View All Badges
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="stat-card actions-card">
              <div className="stat-card-header-simple">
                <h3 className="stat-title">Quick Actions</h3>
                <p className="stat-subtitle">Manage your focus</p>
              </div>
              <div className="actions-buttons">
                <button
                  onClick={() => router.push('/rules/new')}
                  className="action-btn add-rule-btn"
                >
                  <span>➕</span>
                  <span className="action-btn-text">Add Lock Rule</span>
                </button>
                <button
                  onClick={() => router.push('/focus')}
                  className="action-btn pomodoro-btn"
                >
                  <span>🍅</span>
                  <span className="action-btn-text">Start Pomodoro</span>
                </button>
              </div>
            </div>
          </div>

          {/* Apps Section */}
          <div className="apps-section-header">
            <h2 className="apps-title">Your Apps</h2>
            <p className="apps-subtitle">
              {isLoadingUsage 
                ? 'Loading usage data...' 
                : `Showing ${rules.filter(r => !r.hide_from_home).length} apps`}
            </p>
          </div>

          {/* AppGrid Component - Requirements 2.1-2.12, 3.1-3.8 */}
          <AppGrid 
            rules={rules}
            usageData={usageData}
            userTimezone={profile?.timezone || 'Asia/Kolkata'}
            onAppClick={handleAppClick}
          />

          {/* Info Section */}
          {rules.length === 0 && (
            <div className="empty-state">
              <h3 className="empty-state-title">No Lock Rules Yet</h3>
              <p className="empty-state-text">
                Create your first lock rule to start managing your app usage
              </p>
              <button
                className="empty-state-btn"
                onClick={() => router.push('/rules/new')}
              >
                Create Lock Rule
              </button>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        /* Mobile-first responsive design */
        .dashboard-container {
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .dashboard-header {
          background-color: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-title h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .welcome-text {
          margin: 4px 0 0 0;
          color: #666;
          font-size: 13px;
        }

        .signout-btn {
          padding: 8px 16px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: background-color 0.2s;
        }

        .signout-btn:hover {
          background-color: #c82333;
        }

        .signout-btn:active {
          transform: scale(0.98);
        }

        .signin-btn {
          padding: 8px 16px;
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: background-color 0.2s;
        }

        .signin-btn:hover {
          background-color: #357abd;
        }

        .signin-btn:active {
          transform: scale(0.98);
        }

        .dashboard-main {
          padding: 20px;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .streak-card {
          border: 2px solid #4a90e2;
        }

        .badges-card {
          border: 2px solid #ffa726;
        }

        .actions-card {
          border: 2px solid #66bb6a;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card-header-simple {
          margin-bottom: 16px;
        }

        .stat-icon {
          font-size: 28px;
          line-height: 1;
        }

        .stat-title {
          margin: 0 0 2px 0;
          font-size: 15px;
          font-weight: 600;
          color: #333;
        }

        .stat-subtitle {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .stat-content {
          margin-top: 8px;
        }

        .stat-value {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .streak-value {
          color: #4a90e2;
        }

        .badges-value {
          color: #ffa726;
        }

        .stat-detail {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .loading-text {
          margin: 0;
          font-size: 14px;
          color: #999;
        }

        .view-badges-btn {
          padding: 8px 14px;
          background-color: transparent;
          color: #ffa726;
          border: 1px solid #ffa726;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          width: 100%;
        }

        .view-badges-btn:hover {
          background-color: #ffa726;
          color: white;
        }

        .actions-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn {
          padding: 12px 16px;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          width: 100%;
        }

        .action-btn:active {
          transform: scale(0.98);
        }

        .add-rule-btn {
          background-color: #4a90e2;
        }

        .add-rule-btn:hover {
          background-color: #357abd;
        }

        .pomodoro-btn {
          background-color: #66bb6a;
        }

        .pomodoro-btn:hover {
          background-color: #4caf50;
        }

        .action-btn-text {
          display: inline;
        }

        .apps-section-header {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .apps-title {
          margin: 0 0 6px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .apps-subtitle {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .empty-state {
          background-color: white;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          margin-top: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .empty-state-title {
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .empty-state-text {
          margin: 0 0 20px 0;
          color: #666;
          font-size: 14px;
        }

        .empty-state-btn {
          padding: 12px 24px;
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .empty-state-btn:hover {
          background-color: #357abd;
        }

        /* Tablet breakpoint (768px+) */
        @media (min-width: 768px) {
          .dashboard-header {
            padding: 20px 32px;
          }

          .header-title h1 {
            font-size: 22px;
          }

          .welcome-text {
            font-size: 14px;
          }

          .signout-btn {
            padding: 10px 20px;
            font-size: 14px;
          }

          .signin-btn {
            padding: 10px 20px;
            font-size: 14px;
          }

          .dashboard-main {
            padding: 32px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }

          .stat-card {
            padding: 24px;
          }

          .stat-icon {
            font-size: 32px;
          }

          .stat-title {
            font-size: 16px;
          }

          .stat-value {
            font-size: 36px;
          }

          .apps-section-header {
            padding: 24px;
            margin-bottom: 24px;
          }

          .apps-title {
            font-size: 20px;
          }

          .empty-state {
            padding: 50px 30px;
            margin-top: 30px;
          }
        }

        /* Desktop breakpoint (1024px+) */
        @media (min-width: 1024px) {
          .dashboard-header {
            padding: 20px 40px;
          }

          .header-title h1 {
            font-size: 24px;
          }

          .dashboard-main {
            padding: 40px;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .actions-buttons {
            flex-direction: row;
          }

          .action-btn {
            flex: 1;
          }

          .apps-section-header {
            padding: 30px;
          }
        }

        /* Large desktop (1440px+) */
        @media (min-width: 1440px) {
          .stat-card {
            padding: 28px;
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .action-btn,
          .signout-btn,
          .signin-btn,
          .view-badges-btn,
          .empty-state-btn {
            min-height: 44px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .signout-btn,
          .signin-btn,
          .action-btn,
          .view-badges-btn,
          .empty-state-btn {
            transition: none;
          }

          .action-btn:active,
          .signout-btn:active,
          .signin-btn:active {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
