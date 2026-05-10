'use client';

/**
 * MoodPrompt Component
 * 
 * Modal dialog with mood selection buttons and optional textarea for reason text.
 * Provides friction layer before allowing override of lock rules.
 * 
 * Features:
 * - Modal dialog with mood selection buttons
 * - Optional textarea for reason text
 * - Validation for strict mode (minimum 10 characters)
 * - Accessible keyboard navigation
 * - Responsive design
 * 
 * Requirements: 4.1-4.6, 17.1-17.4
 * - 4.1: Display mood prompt before allowing override
 * - 4.2: Provide mood options: bored, stressed, tired, news, other
 * - 4.3: Allow optional text reason for override
 * - 4.4: Log override with mood and reason
 * - 17.1: Display text input prompt for strict mode rules
 * - 17.2: Require minimum 10 characters for strict mode
 * - 17.3: Save reason text to override log
 * - 17.4: AI Coach references recurring intention reasons
 */

import { useState } from 'react';
import { Mood } from '@/types';

interface MoodPromptProps {
  onSubmit: (mood: Mood, reason: string) => void;
  isStrictMode: boolean;
  onCancel?: () => void;
}

const MOOD_OPTIONS: Array<{ value: Mood; label: string; emoji: string; description: string }> = [
  { value: 'bored', label: 'Bored', emoji: '😐', description: 'Feeling bored or restless' },
  { value: 'stressed', label: 'Stressed', emoji: '😰', description: 'Feeling stressed or anxious' },
  { value: 'tired', label: 'Tired', emoji: '😴', description: 'Feeling tired or exhausted' },
  { value: 'news', label: 'News', emoji: '📰', description: 'Need to check news or updates' },
  { value: 'other', label: 'Other', emoji: '🤔', description: 'Other reason' },
];

export default function MoodPrompt({ onSubmit, isStrictMode, onCancel }: MoodPromptProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setError(null);
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReasonText(e.target.value);
    setError(null);
  };

  const handleSubmit = () => {
    // Requirement 4.2: Validate mood selection
    if (!selectedMood) {
      setError('Please select a mood');
      return;
    }

    // Requirement 17.2: Validate minimum 10 characters for strict mode
    if (isStrictMode && reasonText.trim().length < 10) {
      setError('Please provide at least 10 characters explaining why you want to open this app');
      return;
    }

    // Requirement 4.4, 17.3: Submit mood and reason
    onSubmit(selectedMood, reasonText.trim());
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="mood-prompt-overlay" onKeyDown={handleKeyDown}>
      <div className="mood-prompt-modal" role="dialog" aria-labelledby="mood-prompt-title" aria-modal="true">
        {/* Header */}
        <div className="mood-prompt-header">
          <h2 id="mood-prompt-title" className="mood-prompt-title">
            {isStrictMode ? 'Why do you want to open this app right now?' : 'How are you feeling?'}
          </h2>
          <p className="mood-prompt-subtitle">
            {isStrictMode 
              ? 'Take a moment to reflect on your intention'
              : 'Understanding your patterns helps you build better habits'}
          </p>
        </div>

        {/* Mood Selection - Requirement 4.2 */}
        <div className="mood-prompt-moods">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`mood-button ${selectedMood === option.value ? 'selected' : ''}`}
              onClick={() => handleMoodSelect(option.value)}
              aria-label={`${option.label}: ${option.description}`}
              aria-pressed={selectedMood === option.value}
            >
              <span className="mood-emoji">{option.emoji}</span>
              <span className="mood-label">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Reason Text - Requirements 4.3, 17.1 */}
        <div className="mood-prompt-reason">
          <label htmlFor="reason-text" className="reason-label">
            {isStrictMode ? 'Explain your reason (required)' : 'Add a note (optional)'}
          </label>
          <textarea
            id="reason-text"
            className="reason-textarea"
            placeholder={
              isStrictMode
                ? 'I want to open this app because...'
                : 'Optional: Add more context about why you need to override this lock'
            }
            value={reasonText}
            onChange={handleReasonChange}
            rows={3}
            aria-required={isStrictMode}
            aria-describedby={error ? 'reason-error' : undefined}
          />
          {isStrictMode && (
            <div className="reason-hint">
              {reasonText.trim().length}/10 characters minimum
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div id="reason-error" className="mood-prompt-error" role="alert">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mood-prompt-actions">
          {onCancel && (
            <button
              type="button"
              className="mood-prompt-button cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="mood-prompt-button submit"
            onClick={handleSubmit}
            disabled={!selectedMood}
          >
            Continue
          </button>
        </div>
      </div>

      <style jsx>{`
        .mood-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .mood-prompt-modal {
          background: #ffffff;
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

        .mood-prompt-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .mood-prompt-title {
          font-size: 22px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .mood-prompt-subtitle {
          font-size: 14px;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }

        .mood-prompt-moods {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .mood-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 8px;
          background: #f5f5f5;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .mood-button:hover {
          background: #e8e8e8;
          transform: translateY(-2px);
        }

        .mood-button:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .mood-button.selected {
          background: #e3f2fd;
          border-color: #4a90e2;
        }

        .mood-emoji {
          font-size: 32px;
          margin-bottom: 6px;
          display: block;
        }

        .mood-label {
          font-size: 12px;
          font-weight: 500;
          color: #333;
          text-align: center;
        }

        .mood-prompt-reason {
          margin-bottom: 20px;
        }

        .reason-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 8px;
        }

        .reason-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .reason-textarea:focus {
          outline: none;
          border-color: #4a90e2;
        }

        .reason-textarea::placeholder {
          color: #999;
        }

        .reason-hint {
          font-size: 12px;
          color: #666;
          margin-top: 6px;
        }

        .mood-prompt-error {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 20px;
          border-left: 4px solid #c62828;
        }

        .mood-prompt-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .mood-prompt-button {
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .mood-prompt-button:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .mood-prompt-button.cancel {
          background: #f5f5f5;
          color: #666;
        }

        .mood-prompt-button.cancel:hover {
          background: #e0e0e0;
        }

        .mood-prompt-button.submit {
          background: #4a90e2;
          color: white;
        }

        .mood-prompt-button.submit:hover:not(:disabled) {
          background: #357abd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .mood-prompt-button.submit:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .mood-prompt-modal {
            padding: 24px;
            max-width: 100%;
          }

          .mood-prompt-title {
            font-size: 20px;
          }

          .mood-prompt-subtitle {
            font-size: 13px;
          }

          .mood-prompt-moods {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .mood-button {
            padding: 14px 6px;
          }

          .mood-emoji {
            font-size: 28px;
          }

          .mood-label {
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .mood-prompt-overlay {
            padding: 16px;
          }

          .mood-prompt-modal {
            padding: 20px;
          }

          .mood-prompt-title {
            font-size: 18px;
          }

          .mood-prompt-moods {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .mood-button {
            padding: 12px 4px;
          }

          .mood-emoji {
            font-size: 24px;
            margin-bottom: 4px;
          }

          .mood-label {
            font-size: 10px;
          }

          .mood-prompt-actions {
            flex-direction: column-reverse;
          }

          .mood-prompt-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
