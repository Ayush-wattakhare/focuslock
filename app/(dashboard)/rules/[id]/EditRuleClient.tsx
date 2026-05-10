'use client';

/**
 * Edit Rule Client Component
 * 
 * Client-side component for editing existing lock rules
 * Renders RuleBuilder with initial data and handles form submission to PUT /api/rules/[id]
 * Includes delete functionality with confirmation dialog
 * 
 * Requirements: 2.1-2.12
 * - Fetch existing rule data from API
 * - Render RuleBuilder component with initial values
 * - Handle form submission to PUT /api/rules/[id]
 * - Add delete button with confirmation dialog
 * - Display loading states during submission/deletion
 * - Handle error states with user feedback
 * - Redirect to dashboard on success
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

interface EditRuleClientProps {
  initialRule: LockRule;
}

export default function EditRuleClient({ initialRule }: EditRuleClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (rule: Partial<LockRule>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/rules/${initialRule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update lock rule');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error updating lock rule:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/rules/${initialRule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete lock rule');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error deleting lock rule:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="edit-rule-page">
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
            <h1>Edit Lock Rule</h1>
            <p className="header-subtitle">Update settings for {initialRule.app_name}</p>
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

          {/* RuleBuilder Component */}
          <div className="rule-builder-container">
            <RuleBuilder
              initialRule={initialRule}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>

          {/* Delete Button */}
          <div className="delete-section">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="delete-btn"
              disabled={isDeleting || isSubmitting}
            >
              🗑️ Delete Lock Rule
            </button>
            <p className="delete-hint">
              Permanently remove this lock rule. This action cannot be undone.
            </p>
          </div>

          {/* Loading Overlay */}
          {isSubmitting && (
            <div className="loading-overlay" role="status" aria-live="polite">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p className="loading-text">Updating lock rule...</p>
              </div>
            </div>
          )}

          {isDeleting && (
            <div className="loading-overlay" role="status" aria-live="polite">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p className="loading-text">Deleting lock rule...</p>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 id="delete-dialog-title" className="modal-title">Delete Lock Rule?</h2>
                </div>
                <div className="modal-body">
                  <p className="modal-message">
                    Are you sure you want to delete the lock rule for <strong>{initialRule.app_name}</strong>?
                  </p>
                  <p className="modal-warning">
                    This action cannot be undone. All settings for this rule will be permanently removed.
                  </p>
                </div>
                <div className="modal-actions">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-secondary"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-danger"
                    disabled={isDeleting}
                  >
                    Delete Rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        /* Mobile-first responsive design */
        .edit-rule-page {
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
          margin-bottom: 20px;
        }

        .delete-section {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          text-align: center;
        }

        .delete-btn {
          padding: 12px 24px;
          background-color: #fff;
          color: #f44336;
          border: 2px solid #f44336;
          border-radius: 8px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .delete-btn:hover:not(:disabled) {
          background-color: #f44336;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
        }

        .delete-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .delete-hint {
          margin: 12px 0 0 0;
          font-size: 12px;
          color: #999;
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background-color: white;
          border-radius: 16px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }

        .modal-body {
          padding: 20px 24px;
        }

        .modal-message {
          margin: 0 0 12px 0;
          font-size: 15px;
          color: #333;
          line-height: 1.5;
        }

        .modal-message strong {
          color: #f44336;
          font-weight: 600;
        }

        .modal-warning {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          padding: 12px;
          background-color: #fff3e0;
          border-left: 3px solid #ff9800;
          border-radius: 4px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 16px 24px 24px;
          justify-content: flex-end;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #666;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-danger {
          background: #f44336;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #d32f2f;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
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
            margin-bottom: 24px;
          }

          .delete-section {
            padding: 24px;
          }

          .delete-btn {
            padding: 14px 28px;
            font-size: 16px;
          }

          .delete-hint {
            font-size: 13px;
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

          .modal-header {
            padding: 28px 28px 20px;
          }

          .modal-title {
            font-size: 22px;
          }

          .modal-body {
            padding: 24px 28px;
          }

          .modal-message {
            font-size: 16px;
          }

          .modal-warning {
            font-size: 14px;
          }

          .modal-actions {
            padding: 20px 28px 28px;
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

          .delete-section {
            padding: 28px;
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .back-btn,
          .error-close,
          .delete-btn,
          .btn {
            min-height: 44px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .error-banner,
          .loading-overlay,
          .modal-content {
            animation: none;
          }

          .spinner {
            animation: none;
            border-top-color: #4a90e2;
            border-right-color: #4a90e2;
          }

          .back-btn:active,
          .delete-btn:active:not(:disabled),
          .btn-danger:hover:not(:disabled) {
            transform: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .page-header {
            border-bottom-width: 2px;
          }

          .back-btn,
          .delete-btn {
            border-width: 2px;
          }

          .error-banner {
            border-width: 3px;
          }

          .modal-header {
            border-bottom-width: 2px;
          }
        }
      `}</style>
    </div>
  );
}
