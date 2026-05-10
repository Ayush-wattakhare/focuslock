'use client';

/**
 * Family Mode Client Component
 * 
 * Parent dashboard for managing child accounts
 * 
 * Requirements: 16.1-16.6
 * - Add child profile by email
 * - List child accounts with compliance stats
 * - Display child override notifications
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ChildInfo {
  id: string;
  child_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
  linked_at: string;
}

interface ComplianceStats {
  current_streak: number;
  longest_streak: number;
  total_overrides_this_week: number;
  total_overrides_all_time: number;
  compliance_percentage: number;
}

interface ChildWithStats extends ChildInfo {
  stats?: ComplianceStats;
  isLoadingStats?: boolean;
}

interface OverrideNotification {
  id: string;
  app_name: string;
  mood: string | null;
  overridden_at: string;
  child_name: string | null;
  child_user_id: string;
}

interface FamilyClientProps {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    timezone: string;
    created_at: string;
  } | null;
  initialChildren: any[];
}

export default function FamilyClient({ user, profile, initialChildren }: FamilyClientProps) {
  const router = useRouter();
  const [children, setChildren] = useState<ChildWithStats[]>([]);
  const [childEmail, setChildEmail] = useState('');
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [recentOverrides, setRecentOverrides] = useState<OverrideNotification[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(true);

  // Transform initial children data
  useEffect(() => {
    const transformedChildren: ChildWithStats[] = initialChildren.map((cp: any) => {
      const childProfile = cp.profiles;
      return {
        id: cp.id,
        child_user_id: cp.child_user_id,
        full_name: childProfile?.full_name || null,
        avatar_url: childProfile?.avatar_url || null,
        timezone: childProfile?.timezone || 'Asia/Kolkata',
        created_at: childProfile?.created_at || cp.created_at,
        linked_at: cp.created_at,
        isLoadingStats: true,
      };
    });
    setChildren(transformedChildren);

    // Fetch stats for each child
    transformedChildren.forEach((child) => {
      fetchChildStats(child.child_user_id);
    });
  }, [initialChildren]);

  // Fetch recent override notifications from all children
  useEffect(() => {
    async function fetchOverrides() {
      try {
        // Fetch recent overrides for all children
        const overridePromises = children.map(async (child) => {
          const response = await fetch(
            `/api/family/child-stats?child_user_id=${child.child_user_id}`
          );
          if (response.ok) {
            const data = await response.json();
            return data.recent_overrides.map((override: any) => ({
              ...override,
              child_name: child.full_name,
              child_user_id: child.child_user_id,
            }));
          }
          return [];
        });

        const allOverrides = await Promise.all(overridePromises);
        const flatOverrides = allOverrides.flat();
        
        // Sort by most recent
        flatOverrides.sort((a, b) => 
          new Date(b.overridden_at).getTime() - new Date(a.overridden_at).getTime()
        );

        setRecentOverrides(flatOverrides.slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch override notifications:', error);
      } finally {
        setIsLoadingOverrides(false);
      }
    }

    if (children.length > 0) {
      fetchOverrides();
    } else {
      setIsLoadingOverrides(false);
    }
  }, [children]);

  // Fetch stats for a specific child
  async function fetchChildStats(childUserId: string) {
    try {
      const response = await fetch(
        `/api/family/child-stats?child_user_id=${childUserId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setChildren((prev) =>
          prev.map((child) =>
            child.child_user_id === childUserId
              ? { ...child, stats: data.compliance, isLoadingStats: false }
              : child
          )
        );
      }
    } catch (error) {
      console.error('Failed to fetch child stats:', error);
      setChildren((prev) =>
        prev.map((child) =>
          child.child_user_id === childUserId
            ? { ...child, isLoadingStats: false }
            : child
        )
      );
    }
  }

  // Handle add child form submission
  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setIsAddingChild(true);

    try {
      const response = await fetch('/api/family/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_email: childEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAddError(data.error?.message || 'Failed to add child account');
        return;
      }

      // Success - refresh the page to show new child
      router.refresh();
      setChildEmail('');
    } catch (error) {
      console.error('Failed to add child:', error);
      setAddError('An unexpected error occurred');
    } finally {
      setIsAddingChild(false);
    }
  }

  // Format date for display
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  return (
    <div className="family-container">
      {/* Header */}
      <header className="family-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Family Mode</h1>
            <p className="subtitle">Manage child accounts and monitor compliance</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="back-btn"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="family-main">
        <div className="family-content">
          
          {/* Add Child Form */}
          <section className="add-child-section">
            <h2 className="section-title">Add Child Account</h2>
            <form onSubmit={handleAddChild} className="add-child-form">
              <div className="form-group">
                <label htmlFor="child-email" className="form-label">
                  Child's Email Address
                </label>
                <input
                  id="child-email"
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="child@example.com"
                  className="form-input"
                  required
                  disabled={isAddingChild}
                />
                <p className="form-hint">
                  The child must have an existing FocusLock account
                </p>
              </div>
              {addError && (
                <div className="error-message">
                  {addError}
                </div>
              )}
              <button
                type="submit"
                className="submit-btn"
                disabled={isAddingChild}
              >
                {isAddingChild ? 'Adding...' : 'Add Child'}
              </button>
            </form>
          </section>

          {/* Child Accounts List */}
          <section className="children-section">
            <h2 className="section-title">Child Accounts</h2>
            {children.length === 0 ? (
              <div className="empty-state">
                <p className="empty-text">No child accounts linked yet</p>
                <p className="empty-hint">Add a child account using the form above</p>
              </div>
            ) : (
              <div className="children-grid">
                {children.map((child) => (
                  <div key={child.id} className="child-card">
                    <div className="child-header">
                      <div className="child-avatar">
                        {child.avatar_url ? (
                          <img src={child.avatar_url} alt={child.full_name || 'Child'} />
                        ) : (
                          <div className="avatar-placeholder">
                            {(child.full_name || 'C')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="child-info">
                        <h3 className="child-name">
                          {child.full_name || 'Child Account'}
                        </h3>
                        <p className="child-linked">
                          Linked {formatDate(child.linked_at)}
                        </p>
                      </div>
                    </div>

                    {child.isLoadingStats ? (
                      <div className="stats-loading">Loading stats...</div>
                    ) : child.stats ? (
                      <div className="child-stats">
                        <div className="stat-item">
                          <span className="stat-label">Compliance</span>
                          <span className="stat-value compliance">
                            {child.stats.compliance_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Current Streak</span>
                          <span className="stat-value streak">
                            {child.stats.current_streak} days
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Overrides (Week)</span>
                          <span className="stat-value overrides">
                            {child.stats.total_overrides_this_week}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="stats-error">Failed to load stats</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Override Notifications */}
          <section className="notifications-section">
            <h2 className="section-title">Recent Override Notifications</h2>
            {isLoadingOverrides ? (
              <div className="loading-state">Loading notifications...</div>
            ) : recentOverrides.length === 0 ? (
              <div className="empty-state">
                <p className="empty-text">No recent override notifications</p>
                <p className="empty-hint">
                  You'll see notifications when children override lock rules
                </p>
              </div>
            ) : (
              <div className="notifications-list">
                {recentOverrides.map((override) => (
                  <div key={override.id} className="notification-item">
                    <div className="notification-icon">⚠️</div>
                    <div className="notification-content">
                      <p className="notification-text">
                        <strong>{override.child_name || 'Child'}</strong> overrode{' '}
                        <strong>{override.app_name}</strong>
                      </p>
                      {override.mood && (
                        <p className="notification-mood">
                          Mood: {override.mood}
                        </p>
                      )}
                      <p className="notification-time">
                        {formatDate(override.overridden_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <style jsx>{`
        /* Mobile-first responsive design */
        .family-container {
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .family-header {
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

        .subtitle {
          margin: 4px 0 0 0;
          color: #666;
          font-size: 13px;
        }

        .back-btn {
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

        .back-btn:hover {
          background-color: #357abd;
        }

        .family-main {
          padding: 20px;
        }

        .family-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        /* Add Child Section */
        .add-child-section {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .add-child-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #4a90e2;
        }

        .form-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .form-hint {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .error-message {
          padding: 10px 12px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          color: #c33;
          font-size: 13px;
        }

        .submit-btn {
          padding: 12px 24px;
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
          align-self: flex-start;
        }

        .submit-btn:hover:not(:disabled) {
          background-color: #357abd;
        }

        .submit-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        /* Children Section */
        .children-section {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .children-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .child-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          background-color: #fafafa;
        }

        .child-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .child-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .child-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background-color: #4a90e2;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
        }

        .child-info {
          flex: 1;
        }

        .child-name {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
          color: #333;
        }

        .child-linked {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .child-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 600;
        }

        .stat-value.compliance {
          color: #66bb6a;
        }

        .stat-value.streak {
          color: #4a90e2;
        }

        .stat-value.overrides {
          color: #ff9800;
        }

        .stats-loading,
        .stats-error {
          padding: 12px;
          text-align: center;
          font-size: 13px;
          color: #666;
        }

        /* Notifications Section */
        .notifications-section {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background-color: #fff9e6;
          border: 1px solid #ffe0a3;
          border-radius: 8px;
        }

        .notification-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-text {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #333;
        }

        .notification-mood {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: #666;
        }

        .notification-time {
          margin: 0;
          font-size: 11px;
          color: #999;
        }

        /* Empty States */
        .empty-state,
        .loading-state {
          padding: 40px 20px;
          text-align: center;
        }

        .empty-text {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: #666;
        }

        .empty-hint {
          margin: 0;
          font-size: 13px;
          color: #999;
        }

        .loading-state {
          font-size: 14px;
          color: #666;
        }

        /* Tablet breakpoint (768px+) */
        @media (min-width: 768px) {
          .family-header {
            padding: 20px 32px;
          }

          .header-title h1 {
            font-size: 22px;
          }

          .subtitle {
            font-size: 14px;
          }

          .family-main {
            padding: 32px;
          }

          .section-title {
            font-size: 18px;
          }

          .add-child-section,
          .children-section,
          .notifications-section {
            padding: 24px;
          }

          .children-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .child-card {
            padding: 20px;
          }
        }

        /* Desktop breakpoint (1024px+) */
        @media (min-width: 1024px) {
          .family-header {
            padding: 20px 40px;
          }

          .header-title h1 {
            font-size: 24px;
          }

          .family-main {
            padding: 40px;
          }

          .children-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .back-btn,
          .submit-btn {
            min-height: 44px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .back-btn,
          .submit-btn,
          .form-input {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
