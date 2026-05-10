'use client';

/**
 * Add Rule Client Component
 * 
 * Client-side component for creating new lock rules
 * Renders RuleBuilder and handles form submission to POST /api/rules
 * 
 * Requirements: 2.1-2.12
 * - Render RuleBuilder component
 * - Handle form submission to POST /api/rules
 * - Redirect to dashboard on success
 * - Display loading states during submission
 * - Handle error states with user feedback
 * 
 * Responsive Design:
 * - Mobile (320px-767px): Single column, full-width form, touch-friendly buttons
 * - Tablet (768px-1023px): Optimized spacing and typography
 * - Desktop (1024px+): Centered layout with max-width constraint
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RuleBuilder from '@/components/features/RuleBuilder';
import { LockRule } from '@/types';

export default function AddRuleClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (rule: Partial<LockRule>) => {
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

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error creating lock rule:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="add-rule-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <button
            onClick={handleCancel}
            className="back-btn"
            aria-label="Go back to dashboard"
          >
            ← Back
          </button>
          <div className="header-title">
            <h1>Create Lock Rule</h1>
            <p className="header-subtitle">Set up a new app lock to manage your focus</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-main">
        <div className="page-content">
          {/* Error Message */}
          {error && (
            <div className="error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <strong>Error creating lock rule</strong>
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

          {/* RuleBuilder Component */}
          <div className="rule-builder-container">
            <RuleBuilder
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>

          {/* Loading Overlay */}
          {isSubmitting && (
            <div className="loading-overlay" role="status" aria-live="polite">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p className="loading-text">Creating lock rule...</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        /* Mobile-first responsive design */
        .add-rule-page {
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .page-header {
          background-color: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .back-btn {
          padding: 8px 12px;
          background-color: transparent;
          color: #4a90e2;
          border: 1px solid #4a90e2;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .back-btn:hover {
          background-color: #4a90e2;
          color: white;
        }

        .back-btn:active {
          transform: scale(0.98);
        }

        .header-title h1 {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }

        .header-subtitle {
          margin: 0;
          color: #666;
          font-size: 13px;
        }

        .page-main {
          padding: 20px;
        }

        .page-content {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background-color: #fff3e0;
          border: 2px solid #ff9800;
          border-radius: 10px;
          margin-bottom: 20px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          line-height: 1.5;
        }

        .error-close {
          padding: 4px 8px;
          background-color: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .error-close:hover {
          color: #333;
        }

        .rule-builder-container {
          background-color: white;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .loading-spinner {
          background-color: white;
          border-radius: 12px;
          padding: 32px 40px;
          text-align: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e0e0e0;
          border-top-color: #4a90e2;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          color: #333;
        }

        /* Tablet breakpoint (768px+) */
        @media (min-width: 768px) {
          .page-header {
            padding: 20px 32px;
          }

          .back-btn {
            padding: 10px 16px;
            font-size: 15px;
            margin-bottom: 16px;
          }

          .header-title h1 {
            font-size: 24px;
          }

          .header-subtitle {
            font-size: 14px;
          }

          .page-main {
            padding: 32px;
          }

          .error-banner {
            padding: 20px;
            margin-bottom: 24px;
          }

          .error-icon {
            font-size: 28px;
          }

          .error-content strong {
            font-size: 15px;
          }

          .error-content p {
            font-size: 14px;
          }

          .rule-builder-container {
            padding: 8px;
          }

          .loading-spinner {
            padding: 40px 50px;
          }

          .spinner {
            width: 56px;
            height: 56px;
          }

          .loading-text {
            font-size: 16px;
          }
        }

        /* Desktop breakpoint (1024px+) */
        @media (min-width: 1024px) {
          .page-header {
            padding: 24px 40px;
          }

          .header-title h1 {
            font-size: 28px;
          }

          .page-main {
            padding: 40px;
          }

          .page-content {
            max-width: 800px;
          }

          .rule-builder-container {
            padding: 16px;
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .back-btn,
          .error-close {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .error-banner,
          .loading-overlay {
            animation: none;
          }

          .spinner {
            animation: none;
            border-top-color: #4a90e2;
            border-right-color: #4a90e2;
          }

          .back-btn:active {
            transform: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .page-header {
            border-bottom-width: 2px;
          }

          .back-btn {
            border-width: 2px;
          }

          .error-banner {
            border-width: 3px;
          }
        }
      `}</style>
    </div>
  );
}
