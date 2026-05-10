'use client';

/**
 * BuddyPanel Component
 * 
 * Displays buddy system interface with active buddies and invite functionality.
 * 
 * Features:
 * - List of active buddies with status indicators
 * - Invite form with email input
 * - Rule selection checkboxes for watching
 * - Accessible keyboard navigation
 * - Responsive design
 * 
 * Requirements: 9.1-9.9
 * - 9.1: Create buddy relationship with status 'pending'
 * - 9.2: Update relationship status to 'active' on acceptance
 * - 9.3: Allow buddies to select which lock rules they want to watch
 * - 9.4: Create buddy notification when user overrides watched rule
 * - 9.5: Send buddy notifications via Supabase Realtime
 * - 9.6: Allow buddies to view override logs for watched rules only
 * - 9.7: Update status to 'removed' when relationship is removed
 * - 9.8: Prevent users from modifying buddy's lock rules
 * - 9.9: Enforce row-level security for buddy relationships
 */

import { useState } from 'react';
import { Buddy, LockRule } from '@/types';

interface BuddyPanelProps {
  buddies: Buddy[];
  lockRules: LockRule[];
  onInvite: (email: string, rulesWatching: string[]) => Promise<void>;
  onRemove?: (buddyId: string) => Promise<void>;
}

export default function BuddyPanel({ 
  buddies, 
  lockRules,
  onInvite,
  onRemove 
}: BuddyPanelProps) {
  const [email, setEmail] = useState('');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter active buddies
  const activeBuddies = buddies.filter(b => b.status === 'active');
  const pendingBuddies = buddies.filter(b => b.status === 'pending');

  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
    setSuccess(null);
  };

  // Handle rule checkbox toggle
  const handleRuleToggle = (ruleId: string) => {
    setSelectedRules(prev => 
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  // Handle invite submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate email
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await onInvite(email, selectedRules);
      setSuccess('Buddy invitation sent successfully!');
      setEmail('');
      setSelectedRules([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle buddy removal
  const handleRemove = async (buddyId: string) => {
    if (!onRemove) return;
    
    if (confirm('Are you sure you want to remove this buddy?')) {
      try {
        await onRemove(buddyId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove buddy');
      }
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'removed':
        return '#9e9e9e';
      default:
        return '#757575';
    }
  };

  // Get watched rules for a buddy
  const getWatchedRules = (buddy: Buddy) => {
    if (!buddy.rules_watching || buddy.rules_watching.length === 0) {
      return 'All rules';
    }
    
    const watchedRuleNames = lockRules
      .filter(rule => buddy.rules_watching?.includes(rule.id))
      .map(rule => rule.app_name);
    
    return watchedRuleNames.length > 0 
      ? watchedRuleNames.join(', ') 
      : 'No rules selected';
  };

  return (
    <div
      className="buddy-panel"
      role="region"
      aria-label="Accountability buddy system"
    >
      {/* Active Buddies Section */}
      <div className="buddy-section">
        <h2 className="buddy-section-title">
          Active Buddies ({activeBuddies.length})
        </h2>
        
        {activeBuddies.length === 0 ? (
          <div className="buddy-empty-state">
            <p>No active buddies yet. Invite someone to be your accountability partner!</p>
          </div>
        ) : (
          <div className="buddy-list" role="list">
            {activeBuddies.map(buddy => (
              <div
                key={buddy.id}
                className="buddy-card"
                role="listitem"
              >
                <div className="buddy-card-header">
                  <div className="buddy-info">
                    <div className="buddy-avatar">
                      {buddy.buddy_user_id.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="buddy-details">
                      <div className="buddy-name">Buddy</div>
                      <div className="buddy-status">
                        <span 
                          className="status-indicator"
                          style={{ backgroundColor: getStatusColor(buddy.status) }}
                          aria-label={`Status: ${buddy.status}`}
                        />
                        <span className="status-text">{buddy.status}</span>
                      </div>
                    </div>
                  </div>
                  {onRemove && (
                    <button
                      className="buddy-remove-btn"
                      onClick={() => handleRemove(buddy.id)}
                      aria-label="Remove buddy"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                <div className="buddy-card-body">
                  <div className="buddy-watching">
                    <strong>Watching:</strong> {getWatchedRules(buddy)}
                  </div>
                  <div className="buddy-date">
                    Accepted: {new Date(buddy.accepted_at || buddy.invited_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingBuddies.length > 0 && (
        <div className="buddy-section">
          <h2 className="buddy-section-title">
            Pending Invitations ({pendingBuddies.length})
          </h2>
          
          <div className="buddy-list" role="list">
            {pendingBuddies.map(buddy => (
              <div
                key={buddy.id}
                className="buddy-card pending"
                role="listitem"
              >
                <div className="buddy-card-header">
                  <div className="buddy-info">
                    <div className="buddy-avatar pending">
                      {buddy.buddy_user_id.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="buddy-details">
                      <div className="buddy-name">Buddy</div>
                      <div className="buddy-status">
                        <span 
                          className="status-indicator"
                          style={{ backgroundColor: getStatusColor(buddy.status) }}
                          aria-label={`Status: ${buddy.status}`}
                        />
                        <span className="status-text">{buddy.status}</span>
                      </div>
                    </div>
                  </div>
                  {onRemove && (
                    <button
                      className="buddy-remove-btn"
                      onClick={() => handleRemove(buddy.id)}
                      aria-label="Cancel invitation"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                <div className="buddy-card-body">
                  <div className="buddy-watching">
                    <strong>Will watch:</strong> {getWatchedRules(buddy)}
                  </div>
                  <div className="buddy-date">
                    Invited: {new Date(buddy.invited_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Form Section */}
      <div className="buddy-section">
        <h2 className="buddy-section-title">Invite Accountability Buddy</h2>
        
        <form onSubmit={handleInviteSubmit} className="buddy-invite-form">
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="buddy-email" className="form-label">
              Buddy Email Address
            </label>
            <input
              id="buddy-email"
              type="email"
              className="form-input"
              placeholder="buddy@example.com"
              value={email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'email-error' : undefined}
            />
            {error && (
              <div id="email-error" className="form-error" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="form-success" role="status">
                {success}
              </div>
            )}
          </div>

          {/* Rule Selection */}
          {lockRules.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Select Rules to Watch (optional)
              </label>
              <div className="form-hint">
                If no rules are selected, your buddy will watch all rules.
              </div>
              <div className="rule-checkboxes" role="group" aria-label="Lock rules to watch">
                {lockRules.map(rule => (
                  <label
                    key={rule.id}
                    className="checkbox-label"
                  >
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={selectedRules.includes(rule.id)}
                      onChange={() => handleRuleToggle(rule.id)}
                      disabled={isSubmitting}
                    />
                    <span className="checkbox-text">
                      {rule.app_name}
                      <span className="rule-type-badge">{rule.lock_type}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="invite-submit-btn"
            disabled={isSubmitting || !email.trim()}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .buddy-panel {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .buddy-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .buddy-section-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin: 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
        }

        .buddy-empty-state {
          padding: 32px;
          text-align: center;
          background: #f5f5f5;
          border-radius: 12px;
          color: #666;
        }

        .buddy-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .buddy-card {
          padding: 16px;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .buddy-card:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }

        .buddy-card.pending {
          border-color: #ff9800;
          background: #fff8f0;
        }

        .buddy-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .buddy-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .buddy-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }

        .buddy-avatar.pending {
          background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        }

        .buddy-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .buddy-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .buddy-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-text {
          font-size: 13px;
          color: #666;
          text-transform: capitalize;
        }

        .buddy-remove-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          border-radius: 50%;
          color: #666;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .buddy-remove-btn:hover {
          background: #ff5252;
          color: white;
        }

        .buddy-card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
        }

        .buddy-watching {
          font-size: 14px;
          color: #666;
        }

        .buddy-watching strong {
          color: #333;
        }

        .buddy-date {
          font-size: 12px;
          color: #9e9e9e;
        }

        .buddy-invite-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .form-hint {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }

        .form-input {
          padding: 12px 16px;
          font-size: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .form-input[aria-invalid="true"] {
          border-color: #ff5252;
        }

        .form-error {
          font-size: 13px;
          color: #ff5252;
          padding: 8px 12px;
          background: #ffebee;
          border-radius: 6px;
        }

        .form-success {
          font-size: 13px;
          color: #4caf50;
          padding: 8px 12px;
          background: #e8f5e9;
          border-radius: 6px;
        }

        .rule-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: background 0.2s ease;
        }

        .checkbox-label:hover {
          background: #e0e0e0;
        }

        .checkbox-input {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #667eea;
        }

        .checkbox-text {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #333;
          flex: 1;
        }

        .rule-type-badge {
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          background: #667eea;
          color: white;
          border-radius: 4px;
        }

        .invite-submit-btn {
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .invite-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .invite-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .buddy-panel {
            padding: 20px;
            gap: 28px;
          }

          .buddy-section-title {
            font-size: 18px;
          }

          .buddy-avatar {
            width: 42px;
            height: 42px;
            font-size: 14px;
          }

          .buddy-name {
            font-size: 15px;
          }

          .rule-checkboxes {
            max-height: 250px;
          }
        }

        @media (max-width: 480px) {
          .buddy-panel {
            padding: 16px;
            gap: 24px;
          }

          .buddy-section-title {
            font-size: 17px;
          }

          .buddy-card {
            padding: 14px;
          }

          .buddy-avatar {
            width: 40px;
            height: 40px;
            font-size: 13px;
          }

          .buddy-name {
            font-size: 14px;
          }

          .buddy-watching,
          .checkbox-text {
            font-size: 13px;
          }

          .form-input {
            padding: 10px 14px;
            font-size: 14px;
          }

          .invite-submit-btn {
            padding: 12px 20px;
            font-size: 15px;
          }

          .rule-checkboxes {
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}
