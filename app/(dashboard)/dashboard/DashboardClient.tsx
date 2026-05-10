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
        /* Mobile-first responsive design with modern aesthetics */
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          position: relative;
        }

        .dashboard-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 280px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: 0;
        }

        .dashboard-header {
          background: transparent;
          border-bottom: none;
          padding: 20px;
          position: relative;
          z-index: 10;
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
          font-size: 20px;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .welcome-text {
          margin: 4px 0 0 0;
          color: rgba(255, 255, 255, 0.95);
          font-size: 14px;
          text-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
        }

        .signout-btn,
        .signin-btn {
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 50px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .signout-btn:hover,
        .signin-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .signout-btn:active,
        .signin-btn:active {
          transform: translateY(0);
        }

        .dashboard-main {
          padding: 20px;
          position: relative;
          z-index: 1;
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
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), 0 1px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transform: scaleX(0);
          transition: transform 0.3s;
        }

        .stat-card:hover::before {
          transform: scaleX(1);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15), 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .streak-card {
          border: none;
        }

        .badges-card {
          border: none;
        }

        .actions-card {
          border: none;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat-card-header-simple {
          margin-bottom: 18px;
        }

        .stat-icon {
          font-size: 32px;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .stat-title {
          margin: 0 0 2px 0;
          font-size: 16px;
          font-weight: 700;
          color: #333;
        }

        .stat-subtitle {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .stat-content {
          margin-top: 8px;
        }

        .stat-value {
          margin: 0 0 10px 0;
          font-size: 40px;
          font-weight: 800;
          line-height: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .streak-value {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .badges-value {
          background: linear-gradient(135deg, #ffa726 0%, #f57c00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-detail {
          margin: 0;
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .loading-text {
          margin: 0;
          font-size: 14px;
          color: #999;
        }

        .view-badges-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, #ffa726 0%, #f57c00 100%);
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          box-shadow: 0 4px 15px rgba(255, 167, 38, 0.3);
        }

        .view-badges-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 167, 38, 0.4);
        }

        .actions-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-btn {
          padding: 14px 18px;
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .action-btn:hover::before {
          left: 100%;
        }

        .action-btn:active {
          transform: scale(0.98);
        }

        .add-rule-btn {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        }

        .add-rule-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
        }

        .pomodoro-btn {
          background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
          box-shadow: 0 4px 15px rgba(102, 187, 106, 0.3);
        }

        .pomodoro-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 187, 106, 0.4);
        }

        .action-btn-text {
          display: inline;
        }

        .apps-section-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .apps-title {
          margin: 0 0 6px 0;
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .apps-subtitle {
          margin: 0;
          color: #666;
          font-size: 14px;
          font-weight: 500;
        }

        .empty-state {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 50px 20px;
          text-align: center;
          margin-top: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .empty-state-title {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .empty-state-text {
          margin: 0 0 24px 0;
          color: #666;
          font-size: 15px;
          line-height: 1.6;
        }

        .empty-state-btn {
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .empty-state-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        /* Tablet breakpoint (768px+) */
        @media (min-width: 768px) {
          .dashboard-container::before {
            height: 300px;
          }

          .dashboard-header {
            padding: 24px 32px;
          }

          .header-title h1 {
            font-size: 24px;
          }

          .welcome-text {
            font-size: 15px;
          }

          .signout-btn,
          .signin-btn {
            padding: 12px 24px;
            font-size: 15px;
          }

          .dashboard-main {
            padding: 32px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 32px;
          }

          .stat-card {
            padding: 28px;
          }

          .stat-icon {
            font-size: 36px;
          }

          .stat-title {
            font-size: 17px;
          }

          .stat-value {
            font-size: 44px;
          }

          .apps-section-header {
            padding: 24px;
            margin-bottom: 24px;
          }

          .apps-title {
            font-size: 22px;
          }

          .empty-state {
            padding: 60px 40px;
            margin-top: 32px;
          }

          .empty-state-title {
            font-size: 22px;
          }
        }

        /* Desktop breakpoint (1024px+) */
        @media (min-width: 1024px) {
          .dashboard-header {
            padding: 24px 40px;
          }

          .header-title h1 {
            font-size: 26px;
          }

          .dashboard-main {
            padding: 40px;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }

          .stat-card {
            padding: 32px;
          }

          .actions-buttons {
            flex-direction: row;
          }

          .action-btn {
            flex: 1;
          }

          .apps-section-header {
            padding: 28px;
          }

          .apps-title {
            font-size: 24px;
          }
        }

        /* Large desktop (1440px+) */
        @media (min-width: 1440px) {
          .stat-card {
            padding: 36px;
          }

          .stat-icon {
            font-size: 40px;
          }

          .stat-value {
            font-size: 48px;
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .action-btn,
          .signout-btn,
          .signin-btn,
          .view-badges-btn,
          .empty-state-btn {
            min-height: 48px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .signout-btn,
          .signin-btn,
          .action-btn,
          .view-badges-btn,
          .empty-state-btn,
          .stat-card,
          .stat-icon {
            transition: none;
            animation: none;
          }

          .action-btn:active,
          .signout-btn:active,
          .signin-btn:active {
            transform: none;
          }

          .stat-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
