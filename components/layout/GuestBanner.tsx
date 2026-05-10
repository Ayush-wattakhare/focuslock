/**
 * GuestBanner Component
 * 
 * Shows a subtle banner encouraging users to sign in to sync their data.
 * Only visible when user is not logged in.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function GuestBanner() {
  const { isGuest, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user is logged in, still loading, or banner was dismissed
  if (!isGuest || loading || dismissed) {
    return null;
  }

  return (
    <div className="guest-banner">
      <div className="guest-banner-content">
        <span className="guest-banner-icon">💾</span>
        <p className="guest-banner-text">
          You're using FocusLock as a guest. Your data is stored locally.
          <Link href="/login" className="guest-banner-link">
            Sign in to sync across devices
          </Link>
        </p>
        <button
          className="guest-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>

      <style jsx>{`
        .guest-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .guest-banner-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .guest-banner-icon {
          font-size: 1.5rem;
        }

        .guest-banner-text {
          flex: 1;
          margin: 0;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .guest-banner-link {
          color: white;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity 0.2s;
        }

        .guest-banner-link:hover {
          opacity: 0.8;
        }

        .guest-banner-dismiss {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 1.5rem;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .guest-banner-dismiss:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 768px) {
          .guest-banner {
            padding: 0.875rem;
          }

          .guest-banner-icon {
            font-size: 1.25rem;
          }

          .guest-banner-text {
            font-size: 0.875rem;
          }

          .guest-banner-dismiss {
            width: 28px;
            height: 28px;
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
