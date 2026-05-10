'use client';

/**
 * Onboarding Client Component
 * 
 * 3-step wizard for new users:
 * - Step 1: Add first lock rule
 * - Step 2: Explain mood prompt and override system
 * - Step 3: Introduce streak and badge system
 * 
 * Requirements: 20.1-20.6
 * - Display 3-step onboarding wizard (20.1)
 * - Guide user to add first lock rule (20.2)
 * - Explain mood prompt and override system (20.3)
 * - Introduce streak and badge system (20.4)
 * - Award quick_start badge if completed within 10 minutes (20.5)
 * - Allow users to skip onboarding (20.6)
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import RuleBuilder from '@/components/features/RuleBuilder';
import { LockRule, Profile } from '@/types';
import { User } from '@supabase/supabase-js';

interface OnboardingClientProps {
  user: User;
  profile: Profile;
}

export default function OnboardingClient({ user, profile }: OnboardingClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRuleId, setCreatedRuleId] = useState<string | null>(null);

  const handleSkip = async () => {
    // Skip onboarding and go to dashboard
    router.push('/dashboard');
  };

  const handleRuleSave = async (rule: Partial<LockRule>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create lock rule');
      }

      const data = await response.json();
      setCreatedRuleId(data.rule.id);
      
      // Move to next step
      setCurrentStep(2);
    } catch (err) {
      console.error('Error creating lock rule:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // Call badge API to check and award quick_start badge
      const response = await fetch('/api/badges/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'onboarding_complete',
          context: {},
        }),
      });

      if (!response.ok) {
        console.error('Failed to check badges');
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      // Still redirect to dashboard even if badge check fails
      router.push('/dashboard');
    }
  };

  return (
    <div className="onboarding-page">
      {/* Header with progress */}
      <header className="onboarding-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🔒</span>
            <span className="logo-text">FocusLock</span>
          </div>
          <button onClick={handleSkip} className="skip-btn">
            Skip
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="progress-bar">
          <div className="progress-steps">
            <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <div className="step-circle">1</div>
              <div className="step-label">Add Rule</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <div className="step-circle">2</div>
              <div className="step-label">Learn Override</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <div className="step-label">Gamification</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="onboarding-main">
        <div className="onboarding-content">
          {/* Step 1: Add first lock rule */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="step-intro">
                <h1>Create Your First Lock Rule</h1>
                <p>
                  Choose an app you want to limit and set up a lock rule. 
                  You can always edit or add more rules later.
                </p>
              </div>

              {error && (
                <div className="error-banner" role="alert">
                  <span className="error-icon">⚠️</span>
                  <div className="error-content">
                    <strong>Error</strong>
                    <p>{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="error-close"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="rule-builder-wrapper">
                <RuleBuilder
                  onSave={handleRuleSave}
                  onCancel={handleSkip}
                />
              </div>

              {isSubmitting && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p>Creating your first rule...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Explain mood prompt and override system */}
          {currentStep === 2 && (
            <div className="step-content">
              <div className="step-intro">
                <h1>Understanding Overrides</h1>
                <p>
                  Sometimes you need to access a locked app. Here's how it works:
                </p>
              </div>

              <div className="info-cards">
                <div className="info-card">
                  <div className="card-icon">⏱️</div>
                  <h3>Countdown Screen</h3>
                  <p>
                    When you try to open a locked app, you'll see a countdown screen 
                    showing when it will unlock.
                  </p>
                </div>

                <div className="info-card">
                  <div className="card-icon">😊</div>
                  <h3>Mood Prompt</h3>
                  <p>
                    If you need to override the lock, you'll be asked to select your mood 
                    (bored, stressed, tired, etc.) to help you understand your patterns.
                  </p>
                </div>

                <div className="info-card">
                  <div className="card-icon">📝</div>
                  <h3>Optional Reason</h3>
                  <p>
                    You can optionally write why you're overriding. This helps our AI coach 
                    provide better insights later.
                  </p>
                </div>

                <div className="info-card highlight">
                  <div className="card-icon">⚠️</div>
                  <h3>Streak Impact</h3>
                  <p>
                    Overriding a lock will reset your streak. Try to stick to your rules 
                    to build longer streaks!
                  </p>
                </div>
              </div>

              <div className="step-actions">
                <button onClick={() => setCurrentStep(1)} className="btn-secondary">
                  Back
                </button>
                <button onClick={() => setCurrentStep(3)} className="btn-primary">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Introduce streak and badge system */}
          {currentStep === 3 && (
            <div className="step-content">
              <div className="step-intro">
                <h1>Streaks & Badges</h1>
                <p>
                  Stay motivated with our gamification system:
                </p>
              </div>

              <div className="info-cards">
                <div className="info-card">
                  <div className="card-icon">🔥</div>
                  <h3>Build Streaks</h3>
                  <p>
                    Every day you follow your lock rules without overriding, your streak grows. 
                    Track your current and longest streaks on the dashboard.
                  </p>
                </div>

                <div className="info-card">
                  <div className="card-icon">🏆</div>
                  <h3>Earn Badges</h3>
                  <p>
                    Unlock achievements like "7-Day Warrior" (7-day streak), "Iron Will" 
                    (complete a weekly challenge), and more!
                  </p>
                </div>

                <div className="info-card">
                  <div className="card-icon">⚡</div>
                  <h3>Quick Start Badge</h3>
                  <p>
                    Complete this onboarding within 10 minutes to earn your first badge: 
                    "Quick Starter"!
                  </p>
                </div>

                <div className="info-card">
                  <div className="card-icon">👥</div>
                  <h3>Buddy System</h3>
                  <p>
                    Invite accountability buddies to watch your progress and get notified 
                    when you override locks.
                  </p>
                </div>
              </div>

              <div className="step-actions">
                <button onClick={() => setCurrentStep(2)} className="btn-secondary">
                  Back
                </button>
                <button 
                  onClick={handleComplete} 
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Completing...' : 'Get Started'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
        }

        .onboarding-header {
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .skip-btn {
          padding: 8px 16px;
          background-color: transparent;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .skip-btn:hover {
          background-color: #f5f5f5;
          border-color: #999;
          color: #333;
        }

        .progress-bar {
          max-width: 1200px;
          margin: 0 auto;
        }

        .progress-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #e0e0e0;
          color: #999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s;
          z-index: 1;
        }

        .step.active .step-circle {
          background-color: #667eea;
          color: white;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
        }

        .step.completed .step-circle {
          background-color: #4caf50;
          color: white;
        }

        .step.completed .step-circle::after {
          content: '✓';
        }

        .step-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          white-space: nowrap;
        }

        .step.active .step-label {
          color: #667eea;
          font-weight: 600;
        }

        .step-line {
          width: 80px;
          height: 2px;
          background-color: #e0e0e0;
          margin: 0 -10px;
          margin-bottom: 28px;
        }

        .onboarding-main {
          flex: 1;
          padding: 40px 20px;
          overflow-y: auto;
        }

        .onboarding-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .step-content {
          background-color: white;
          border-radius: 16px;
          padding: 32px 24px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .step-intro {
          text-align: center;
          margin-bottom: 32px;
        }

        .step-intro h1 {
          margin: 0 0 12px 0;
          font-size: 28px;
          font-weight: 700;
          color: #333;
        }

        .step-intro p {
          margin: 0;
          font-size: 16px;
          color: #666;
          line-height: 1.6;
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background-color: #fff3e0;
          border: 2px solid #ff9800;
          border-radius: 10px;
          margin-bottom: 24px;
        }

        .error-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .error-content {
          flex: 1;
        }

        .error-content strong {
          display: block;
          font-size: 14px;
          color: #e65100;
          margin-bottom: 4px;
        }

        .error-content p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .error-close {
          padding: 4px 8px;
          background-color: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 18px;
          transition: color 0.2s;
        }

        .error-close:hover {
          color: #333;
        }

        .rule-builder-wrapper {
          background-color: #f9f9f9;
          border-radius: 12px;
          padding: 16px;
        }

        .info-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        .info-card {
          background-color: #f9f9f9;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .info-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .info-card.highlight {
          background-color: #fff3e0;
          border-color: #ff9800;
        }

        .card-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .info-card h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .info-card p {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }

        .step-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background-color: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: white;
          color: #667eea;
          border: 2px solid #667eea;
        }

        .btn-secondary:hover {
          background-color: #f5f7ff;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 1000;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-overlay p {
          color: white;
          font-size: 16px;
          font-weight: 500;
        }

        /* Tablet breakpoint */
        @media (min-width: 768px) {
          .onboarding-header {
            padding: 20px 32px;
          }

          .step-intro h1 {
            font-size: 32px;
          }

          .step-intro p {
            font-size: 18px;
          }

          .info-cards {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .step-content {
            padding: 40px 32px;
          }

          .step-line {
            width: 120px;
          }
        }

        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .onboarding-main {
            padding: 60px 40px;
          }

          .step-content {
            padding: 48px 40px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .step-content {
            animation: none;
          }

          .spinner {
            animation: none;
          }

          .btn-primary:hover:not(:disabled) {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
