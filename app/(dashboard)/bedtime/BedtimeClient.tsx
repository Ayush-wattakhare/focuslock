'use client';

/**
 * Bedtime Mode Client Component
 * 
 * Allows users to configure bedtime mode with separate schedules for weekdays and weekends.
 * Displays bedtime compliance streak.
 * 
 * Features:
 * - Enable/disable bedtime mode toggle
 * - Separate time pickers for weekdays (Mon-Fri) and weekends (Sat-Sun)
 * - Bedtime and wake time configuration
 * - Display compliance streak with moon icon
 * - Save settings to database
 * 
 * Requirements: 12.1-12.7
 */

import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';

interface BedtimeSettings {
  user_id: string;
  is_enabled: boolean;
  weekday_bedtime: string;
  weekday_waketime: string;
  weekend_bedtime: string;
  weekend_waketime: string;
  compliance_streak: number;
  last_compliance_date: string | null;
}

interface BedtimeClientProps {
  user: User;
  initialSettings: BedtimeSettings;
}

export default function BedtimeClient({
  user,
  initialSettings,
}: BedtimeClientProps) {
  const [settings, setSettings] = useState<BedtimeSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Format time from HH:MM:SS to HH:MM for input
  const formatTimeForInput = (time: string): string => {
    return time.substring(0, 5);
  };

  // Handle toggle change
  const handleToggle = () => {
    setSettings(prev => ({
      ...prev,
      is_enabled: !prev.is_enabled,
    }));
  };

  // Handle time change
  const handleTimeChange = (field: keyof BedtimeSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value + ':00', // Add seconds
    }));
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/bedtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_enabled: settings.is_enabled,
          weekday_bedtime: settings.weekday_bedtime,
          weekday_waketime: settings.weekday_waketime,
          weekend_bedtime: settings.weekend_bedtime,
          weekend_waketime: settings.weekend_waketime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setSaveMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving bedtime settings:', error);
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bedtime-page">
      <header className="bedtime-header">
        <div className="header-content">
          <div className="header-icon">🌙</div>
          <div>
            <h1 className="bedtime-title">Bedtime Mode</h1>
            <p className="bedtime-subtitle">
              Automatically lock entertainment apps at bedtime
            </p>
          </div>
        </div>
      </header>

      <div className="bedtime-container">
        {/* Compliance Streak Card */}
        <div className="streak-card">
          <div className="streak-icon">🌙</div>
          <div className="streak-content">
            <h2 className="streak-title">Compliance Streak</h2>
            <div className="streak-count">
              {settings.compliance_streak} {settings.compliance_streak === 1 ? 'day' : 'days'}
            </div>
            <p className="streak-description">
              {settings.compliance_streak >= 7
                ? '🏆 Amazing! Keep it up!'
                : `${7 - settings.compliance_streak} more days to earn the Night Owl Slayer badge`}
            </p>
          </div>
        </div>

        {/* Settings Card */}
        <div className="settings-card">
          {/* Enable/Disable Toggle */}
          <div className="setting-row toggle-row">
            <div className="setting-label">
              <h3>Enable Bedtime Mode</h3>
              <p>Automatically lock apps at configured times</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.is_enabled}
                onChange={handleToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Weekday Schedule */}
          <div className="schedule-section">
            <h3 className="schedule-title">
              <span className="schedule-icon">📅</span>
              Weekdays (Monday - Friday)
            </h3>
            <div className="time-inputs">
              <div className="time-input-group">
                <label htmlFor="weekday-bedtime">Bedtime</label>
                <input
                  id="weekday-bedtime"
                  type="time"
                  value={formatTimeForInput(settings.weekday_bedtime)}
                  onChange={(e) => handleTimeChange('weekday_bedtime', e.target.value)}
                  disabled={!settings.is_enabled}
                />
              </div>
              <div className="time-input-group">
                <label htmlFor="weekday-waketime">Wake Time</label>
                <input
                  id="weekday-waketime"
                  type="time"
                  value={formatTimeForInput(settings.weekday_waketime)}
                  onChange={(e) => handleTimeChange('weekday_waketime', e.target.value)}
                  disabled={!settings.is_enabled}
                />
              </div>
            </div>
          </div>

          {/* Weekend Schedule */}
          <div className="schedule-section">
            <h3 className="schedule-title">
              <span className="schedule-icon">🎉</span>
              Weekends (Saturday - Sunday)
            </h3>
            <div className="time-inputs">
              <div className="time-input-group">
                <label htmlFor="weekend-bedtime">Bedtime</label>
                <input
                  id="weekend-bedtime"
                  type="time"
                  value={formatTimeForInput(settings.weekend_bedtime)}
                  onChange={(e) => handleTimeChange('weekend_bedtime', e.target.value)}
                  disabled={!settings.is_enabled}
                />
              </div>
              <div className="time-input-group">
                <label htmlFor="weekend-waketime">Wake Time</label>
                <input
                  id="weekend-waketime"
                  type="time"
                  value={formatTimeForInput(settings.weekend_waketime)}
                  onChange={(e) => handleTimeChange('weekend_waketime', e.target.value)}
                  disabled={!settings.is_enabled}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="save-section">
            <button
              className="save-button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveMessage && (
              <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
                {saveMessage}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="info-box">
            <div className="info-icon">ℹ️</div>
            <div className="info-content">
              <p>
                When bedtime mode is active, all entertainment apps will be automatically locked at your configured bedtime and unlocked at wake time.
              </p>
              <p>
                Maintain 7 consecutive days of bedtime compliance to earn the <strong>Night Owl Slayer</strong> badge! 🌙
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bedtime-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%);
          padding: 24px;
        }

        .bedtime-header {
          max-width: 800px;
          margin: 0 auto 32px;
          color: white;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          font-size: 48px;
        }

        .bedtime-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .bedtime-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }

        .bedtime-container {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .streak-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .streak-icon {
          font-size: 64px;
          flex-shrink: 0;
        }

        .streak-content {
          flex: 1;
        }

        .streak-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .streak-count {
          font-size: 36px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 8px;
        }

        .streak-description {
          font-size: 14px;
          color: #666;
        }

        .settings-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .setting-row {
          padding-bottom: 24px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .setting-label h3 {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .setting-label p {
          font-size: 14px;
          color: #666;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 34px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #1e3a8a;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .schedule-section {
          margin-bottom: 32px;
        }

        .schedule-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .schedule-icon {
          font-size: 20px;
        }

        .time-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .time-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .time-input-group label {
          font-size: 14px;
          font-weight: 500;
          color: #666;
        }

        .time-input-group input {
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }

        .time-input-group input:focus {
          outline: none;
          border-color: #1e3a8a;
        }

        .time-input-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .save-section {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .save-button {
          width: 100%;
          padding: 16px;
          background: #1e3a8a;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .save-button:hover:not(:disabled) {
          background: #1e40af;
        }

        .save-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .save-message {
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
        }

        .save-message.success {
          background: #d1fae5;
          color: #065f46;
        }

        .save-message.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .info-box {
          margin-top: 24px;
          padding: 20px;
          background: #eff6ff;
          border-radius: 12px;
          display: flex;
          gap: 16px;
        }

        .info-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
        }

        .info-content p {
          font-size: 14px;
          color: #1e40af;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .info-content p:last-child {
          margin-bottom: 0;
        }

        .info-content strong {
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .bedtime-page {
            padding: 20px;
          }

          .header-icon {
            font-size: 40px;
          }

          .bedtime-title {
            font-size: 28px;
          }

          .bedtime-subtitle {
            font-size: 14px;
          }

          .streak-card {
            padding: 24px;
            flex-direction: column;
            text-align: center;
          }

          .streak-icon {
            font-size: 56px;
          }

          .streak-count {
            font-size: 32px;
          }

          .settings-card {
            padding: 24px;
          }

          .toggle-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .time-inputs {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .bedtime-page {
            padding: 16px;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
          }

          .header-icon {
            font-size: 36px;
          }

          .bedtime-title {
            font-size: 24px;
          }

          .bedtime-subtitle {
            font-size: 13px;
          }

          .streak-card {
            padding: 20px;
          }

          .streak-icon {
            font-size: 48px;
          }

          .streak-count {
            font-size: 28px;
          }

          .settings-card {
            padding: 20px;
          }

          .setting-label h3 {
            font-size: 18px;
          }

          .schedule-title {
            font-size: 16px;
          }

          .info-box {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
