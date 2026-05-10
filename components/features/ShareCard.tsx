'use client';

/**
 * ShareCard Component
 * 
 * Generates shareable progress image with stats.
 * 
 * Features:
 * - Shows time saved, compliance %, streak
 * - Includes FocusLock watermark
 * - Export options: WhatsApp, Instagram, PNG download
 * 
 * Requirements: 14.1-14.4
 * - 14.1: Generate shareable stats card with time saved and compliance %
 * - 14.2: Include current streak in share card
 * - 14.3: Add FocusLock watermark to share card
 * - 14.4: Support export to WhatsApp, Instagram, PNG download
 */

import React, { useRef } from 'react';

interface ShareCardStats {
  timeSaved: number; // minutes
  compliancePercentage: number;
  currentStreak: number;
  watermark: string;
}

interface ShareCardProps {
  stats: ShareCardStats;
}

// Helper to format minutes to hours and minutes
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function ShareCard({ stats }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Export as PNG using html2canvas
  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;

    try {
      // Dynamically import html2canvas to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `focuslock-progress-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Failed to generate image. Please try again.');
    }
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = `🎯 My FocusLock Progress This Week!\n\n⏰ Time Saved: ${formatMinutes(stats.timeSaved)}\n✅ Compliance: ${stats.compliancePercentage}%\n🔥 Streak: ${stats.currentStreak} days\n\nJoin me at ${stats.watermark}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Share to Instagram (opens Instagram app with text copied to clipboard)
  const handleShareInstagram = async () => {
    const text = `🎯 My FocusLock Progress!\n⏰ ${formatMinutes(stats.timeSaved)} saved\n✅ ${stats.compliancePercentage}% compliance\n🔥 ${stats.currentStreak} day streak\n\n${stats.watermark}`;
    
    try {
      // Copy text to clipboard
      await navigator.clipboard.writeText(text);
      
      // Download the image first
      await handleDownloadPNG();
      
      alert('Image downloaded and caption copied! Open Instagram and paste the caption with your image.');
    } catch (error) {
      console.error('Error sharing to Instagram:', error);
      alert('Please manually copy the text and download the image.');
    }
  };

  return (
    <div className="share-card-container">
      {/* Shareable Card - Requirement 14.1, 14.2, 14.3 */}
      <div className="share-card" ref={cardRef}>
        {/* Header */}
        <div className="share-card-header">
          <h2 className="share-card-title">My FocusLock Progress</h2>
          <p className="share-card-subtitle">This Week's Achievements</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {/* Time Saved - Requirement 14.1 */}
          <div className="stat-item">
            <div className="stat-icon">⏰</div>
            <div className="stat-value">{formatMinutes(stats.timeSaved)}</div>
            <div className="stat-label">Time Saved</div>
          </div>

          {/* Compliance Percentage - Requirement 14.1 */}
          <div className="stat-item">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.compliancePercentage}%</div>
            <div className="stat-label">Compliance</div>
          </div>

          {/* Current Streak - Requirement 14.2 */}
          <div className="stat-item">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>

        {/* Watermark - Requirement 14.3 */}
        <div className="share-card-watermark">
          <span className="watermark-text">{stats.watermark}</span>
        </div>

        {/* Decorative Elements */}
        <div className="decorative-circle circle-1" />
        <div className="decorative-circle circle-2" />
      </div>

      {/* Export Options - Requirement 14.4 */}
      <div className="export-options">
        <h3 className="export-title">Share Your Progress</h3>
        <div className="export-buttons">
          <button
            className="export-button whatsapp"
            onClick={handleShareWhatsApp}
            aria-label="Share to WhatsApp"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>

          <button
            className="export-button instagram"
            onClick={handleShareInstagram}
            aria-label="Share to Instagram"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </button>

          <button
            className="export-button download"
            onClick={handleDownloadPNG}
            aria-label="Download as PNG"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </button>
        </div>
      </div>

      <style jsx>{`
        .share-card-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .share-card {
          position: relative;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          padding: 40px 30px;
          color: white;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          margin-bottom: 30px;
        }

        .decorative-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          pointer-events: none;
        }

        .circle-1 {
          width: 200px;
          height: 200px;
          top: -100px;
          right: -50px;
        }

        .circle-2 {
          width: 150px;
          height: 150px;
          bottom: -75px;
          left: -30px;
        }

        .share-card-header {
          text-align: center;
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
        }

        .share-card-title {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .share-card-subtitle {
          font-size: 16px;
          margin: 0;
          opacity: 0.9;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px 16px;
          text-align: center;
          transition: transform 0.2s;
        }

        .stat-item:hover {
          transform: translateY(-4px);
        }

        .stat-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 500;
        }

        .share-card-watermark {
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .watermark-text {
          font-size: 18px;
          font-weight: 600;
          opacity: 0.9;
          letter-spacing: 0.5px;
        }

        .export-options {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .export-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 20px 0;
          text-align: center;
        }

        .export-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .export-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 12px;
          border: 2px solid transparent;
          border-radius: 12px;
          background: #f9fafb;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .export-button:active {
          transform: translateY(0);
        }

        .export-button.whatsapp {
          border-color: #25d366;
          color: #25d366;
        }

        .export-button.whatsapp:hover {
          background: #25d366;
          color: white;
        }

        .export-button.instagram {
          border-color: #e4405f;
          color: #e4405f;
        }

        .export-button.instagram:hover {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
          color: white;
        }

        .export-button.download {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .export-button.download:hover {
          background: #3b82f6;
          color: white;
        }

        @media (max-width: 640px) {
          .share-card-container {
            padding: 16px;
          }

          .share-card {
            padding: 30px 20px;
          }

          .share-card-title {
            font-size: 24px;
          }

          .share-card-subtitle {
            font-size: 14px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 30px;
          }

          .stat-item {
            padding: 20px 16px;
          }

          .stat-icon {
            font-size: 32px;
          }

          .stat-value {
            font-size: 24px;
          }

          .stat-label {
            font-size: 13px;
          }

          .watermark-text {
            font-size: 16px;
          }

          .export-buttons {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .export-button {
            flex-direction: row;
            justify-content: center;
            padding: 14px 16px;
          }
        }

        @media (max-width: 480px) {
          .share-card {
            padding: 24px 16px;
          }

          .share-card-title {
            font-size: 22px;
          }

          .stat-icon {
            font-size: 28px;
            margin-bottom: 8px;
          }

          .stat-value {
            font-size: 22px;
          }

          .export-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
