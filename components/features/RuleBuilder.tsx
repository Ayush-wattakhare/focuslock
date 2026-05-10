'use client';

/**
 * RuleBuilder Component
 * 
 * Multi-step form for creating/editing lock rules with dynamic fields based on selected lock_type.
 * 
 * Features:
 * - Multi-step form wizard (Step 1: Basic Info, Step 2: Lock Configuration, Step 3: Advanced Options)
 * - Dynamic fields based on selected lock_type
 * - Validation for schedule times, daily limits, unlock dates
 * - Visibility and strict mode toggles
 * - Responsive design with accessible keyboard navigation
 * 
 * Requirements: 2.1-2.12
 * - 2.1: Require app name and lock type
 * - 2.2: Support four lock types: timer, schedule, until_date, nuclear
 * - 2.3: Timer requires daily limit in minutes
 * - 2.4: Schedule requires start time, end time, and days of week
 * - 2.5: Until_date requires unlock date
 * - 2.6: Nuclear disables all override capabilities
 * - 2.7: Configure hide_from_home setting
 * - 2.8: Configure hide_from_search setting
 * - 2.9: Enable strict mode on individual rules
 * - 2.10: Persist changes with updated timestamp
 * - 2.11: Delete rule functionality
 * - 2.12: Row-level security enforcement
 */

import { useState } from 'react';
import { LockRule, LockType } from '@/types';

interface RuleBuilderProps {
  initialRule?: LockRule;
  onSave: (rule: Partial<LockRule>) => void;
  onCancel?: () => void;
}

type Step = 1 | 2 | 3;

const LOCK_TYPE_OPTIONS: Array<{ value: LockType; label: string; description: string }> = [
  { value: 'timer', label: 'Daily Timer', description: 'Lock after using for X minutes per day' },
  { value: 'schedule', label: 'Schedule', description: 'Lock during specific times and days' },
  { value: 'until_date', label: 'Until Date', description: 'Lock until a specific date' },
  { value: 'nuclear', label: 'Nuclear Mode', description: 'Complete lock with no override' },
];

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

export default function RuleBuilder({ initialRule, onSave, onCancel }: RuleBuilderProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state - Requirement 2.1: app name and lock type
  const [appName, setAppName] = useState(initialRule?.app_name || '');
  const [appIconUrl, setAppIconUrl] = useState(initialRule?.app_icon_url || '');
  const [appScheme, setAppScheme] = useState(initialRule?.app_scheme || '');
  const [lockType, setLockType] = useState<LockType>(initialRule?.lock_type || 'timer');

  // Timer fields - Requirement 2.3
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState<number>(
    initialRule?.daily_limit_minutes || 30
  );

  // Schedule fields - Requirement 2.4
  const [scheduleStart, setScheduleStart] = useState(initialRule?.schedule_start || '09:00');
  const [scheduleEnd, setScheduleEnd] = useState(initialRule?.schedule_end || '17:00');
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    initialRule?.schedule_days || ['mon', 'tue', 'wed', 'thu', 'fri']
  );

  // Until date fields - Requirement 2.5
  const [unlockDate, setUnlockDate] = useState(
    initialRule?.unlock_date ? initialRule.unlock_date.split('T')[0] : ''
  );

  // Advanced options - Requirements 2.7, 2.8, 2.9
  const [hideFromHome, setHideFromHome] = useState(initialRule?.hide_from_home ?? true);
  const [hideFromSearch, setHideFromSearch] = useState(initialRule?.hide_from_search ?? true);
  const [strictMode, setStrictMode] = useState(initialRule?.strict_mode ?? false);

  // Validation
  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Requirement 2.1: Validate app name and lock type
      if (!appName.trim()) {
        newErrors.appName = 'App name is required';
      }
      if (!lockType) {
        newErrors.lockType = 'Lock type is required';
      }
    }

    if (step === 2) {
      // Requirement 2.3: Validate timer fields
      if (lockType === 'timer') {
        if (!dailyLimitMinutes || dailyLimitMinutes <= 0) {
          newErrors.dailyLimitMinutes = 'Daily limit must be greater than 0';
        }
        if (dailyLimitMinutes > 1440) {
          newErrors.dailyLimitMinutes = 'Daily limit cannot exceed 1440 minutes (24 hours)';
        }
      }

      // Requirement 2.4: Validate schedule fields
      if (lockType === 'schedule') {
        if (!scheduleStart) {
          newErrors.scheduleStart = 'Start time is required';
        }
        if (!scheduleEnd) {
          newErrors.scheduleEnd = 'End time is required';
        }
        if (scheduleStart && scheduleEnd && scheduleStart >= scheduleEnd) {
          newErrors.scheduleEnd = 'End time must be after start time';
        }
        if (!scheduleDays || scheduleDays.length === 0) {
          newErrors.scheduleDays = 'Select at least one day';
        }
      }

      // Requirement 2.5: Validate until_date fields
      if (lockType === 'until_date') {
        if (!unlockDate) {
          newErrors.unlockDate = 'Unlock date is required';
        } else {
          const selectedDate = new Date(unlockDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate <= today) {
            newErrors.unlockDate = 'Unlock date must be in the future';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep((currentStep + 1) as Step);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Build rule object based on lock type
    const rule: Partial<LockRule> = {
      app_name: appName.trim(),
      app_icon_url: appIconUrl.trim() || null,
      app_scheme: appScheme.trim() || null,
      lock_type: lockType,
      hide_from_home: hideFromHome,
      hide_from_search: hideFromSearch,
      strict_mode: strictMode,
      is_active: true,
    };

    // Add lock-type-specific fields
    if (lockType === 'timer') {
      rule.daily_limit_minutes = dailyLimitMinutes;
      rule.schedule_start = null;
      rule.schedule_end = null;
      rule.schedule_days = null;
      rule.unlock_date = null;
    } else if (lockType === 'schedule') {
      rule.daily_limit_minutes = null;
      rule.schedule_start = scheduleStart;
      rule.schedule_end = scheduleEnd;
      rule.schedule_days = scheduleDays;
      rule.unlock_date = null;
    } else if (lockType === 'until_date') {
      rule.daily_limit_minutes = null;
      rule.schedule_start = null;
      rule.schedule_end = null;
      rule.schedule_days = null;
      rule.unlock_date = unlockDate;
    } else if (lockType === 'nuclear') {
      rule.daily_limit_minutes = null;
      rule.schedule_start = null;
      rule.schedule_end = null;
      rule.schedule_days = null;
      rule.unlock_date = null;
    }

    onSave(rule);
  };

  const handleDayToggle = (day: string) => {
    setScheduleDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`step-dot ${currentStep >= step ? 'active' : ''} ${
            currentStep === step ? 'current' : ''
          }`}
        >
          {step}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step">
      <h3 className="step-title">Basic Information</h3>
      <p className="step-description">Enter the app details and choose a lock type</p>

      {/* App Name - Requirement 2.1 */}
      <div className="form-group">
        <label htmlFor="app-name" className="form-label">
          App Name <span className="required">*</span>
        </label>
        <input
          id="app-name"
          type="text"
          className={`form-input ${errors.appName ? 'error' : ''}`}
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="e.g., Instagram, YouTube, TikTok"
          aria-required="true"
          aria-invalid={!!errors.appName}
          aria-describedby={errors.appName ? 'app-name-error' : undefined}
        />
        {errors.appName && (
          <span id="app-name-error" className="error-message" role="alert">
            {errors.appName}
          </span>
        )}
      </div>

      {/* App Icon URL */}
      <div className="form-group">
        <label htmlFor="app-icon-url" className="form-label">
          App Icon URL (optional)
        </label>
        <input
          id="app-icon-url"
          type="url"
          className="form-input"
          value={appIconUrl}
          onChange={(e) => setAppIconUrl(e.target.value)}
          placeholder="https://example.com/icon.png"
        />
      </div>

      {/* App Scheme */}
      <div className="form-group">
        <label htmlFor="app-scheme" className="form-label">
          App URL Scheme (optional)
        </label>
        <input
          id="app-scheme"
          type="text"
          className="form-input"
          value={appScheme}
          onChange={(e) => setAppScheme(e.target.value)}
          placeholder="e.g., instagram://, youtube://"
        />
      </div>

      {/* Lock Type - Requirements 2.1, 2.2 */}
      <div className="form-group">
        <label className="form-label">
          Lock Type <span className="required">*</span>
        </label>
        <div className="lock-type-options">
          {LOCK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`lock-type-button ${lockType === option.value ? 'selected' : ''}`}
              onClick={() => setLockType(option.value)}
              aria-pressed={lockType === option.value}
            >
              <div className="lock-type-label">{option.label}</div>
              <div className="lock-type-description">{option.description}</div>
            </button>
          ))}
        </div>
        {errors.lockType && (
          <span className="error-message" role="alert">
            {errors.lockType}
          </span>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h3 className="step-title">Lock Configuration</h3>
      <p className="step-description">
        Configure how the lock will work for {appName || 'this app'}
      </p>

      {/* Timer Configuration - Requirement 2.3 */}
      {lockType === 'timer' && (
        <div className="form-group">
          <label htmlFor="daily-limit" className="form-label">
            Daily Limit (minutes) <span className="required">*</span>
          </label>
          <input
            id="daily-limit"
            type="number"
            className={`form-input ${errors.dailyLimitMinutes ? 'error' : ''}`}
            value={dailyLimitMinutes}
            onChange={(e) => setDailyLimitMinutes(parseInt(e.target.value) || 0)}
            min="1"
            max="1440"
            placeholder="30"
            aria-required="true"
            aria-invalid={!!errors.dailyLimitMinutes}
            aria-describedby={errors.dailyLimitMinutes ? 'daily-limit-error' : undefined}
          />
          <div className="form-hint">
            App will lock after {dailyLimitMinutes} minutes of use per day
          </div>
          {errors.dailyLimitMinutes && (
            <span id="daily-limit-error" className="error-message" role="alert">
              {errors.dailyLimitMinutes}
            </span>
          )}
        </div>
      )}

      {/* Schedule Configuration - Requirement 2.4 */}
      {lockType === 'schedule' && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="schedule-start" className="form-label">
                Start Time <span className="required">*</span>
              </label>
              <input
                id="schedule-start"
                type="time"
                className={`form-input ${errors.scheduleStart ? 'error' : ''}`}
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                aria-required="true"
                aria-invalid={!!errors.scheduleStart}
              />
              {errors.scheduleStart && (
                <span className="error-message" role="alert">
                  {errors.scheduleStart}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="schedule-end" className="form-label">
                End Time <span className="required">*</span>
              </label>
              <input
                id="schedule-end"
                type="time"
                className={`form-input ${errors.scheduleEnd ? 'error' : ''}`}
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
                aria-required="true"
                aria-invalid={!!errors.scheduleEnd}
              />
              {errors.scheduleEnd && (
                <span className="error-message" role="alert">
                  {errors.scheduleEnd}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Days <span className="required">*</span>
            </label>
            <div className="days-selector">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  className={`day-button ${scheduleDays.includes(day.value) ? 'selected' : ''}`}
                  onClick={() => handleDayToggle(day.value)}
                  aria-pressed={scheduleDays.includes(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {errors.scheduleDays && (
              <span className="error-message" role="alert">
                {errors.scheduleDays}
              </span>
            )}
          </div>
        </>
      )}

      {/* Until Date Configuration - Requirement 2.5 */}
      {lockType === 'until_date' && (
        <div className="form-group">
          <label htmlFor="unlock-date" className="form-label">
            Unlock Date <span className="required">*</span>
          </label>
          <input
            id="unlock-date"
            type="date"
            className={`form-input ${errors.unlockDate ? 'error' : ''}`}
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            aria-required="true"
            aria-invalid={!!errors.unlockDate}
            aria-describedby={errors.unlockDate ? 'unlock-date-error' : undefined}
          />
          <div className="form-hint">App will remain locked until this date</div>
          {errors.unlockDate && (
            <span id="unlock-date-error" className="error-message" role="alert">
              {errors.unlockDate}
            </span>
          )}
        </div>
      )}

      {/* Nuclear Mode Warning - Requirement 2.6 */}
      {lockType === 'nuclear' && (
        <div className="nuclear-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>Nuclear Mode</h4>
            <p>
              This is the strictest lock mode. Once activated, you will NOT be able to override
              this lock. The app will remain completely locked according to your settings.
            </p>
            <p>Use this mode only when you&apos;re absolutely committed to staying away from this app.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h3 className="step-title">Advanced Options</h3>
      <p className="step-description">Customize visibility and override behavior</p>

      {/* Hide from Home - Requirement 2.7 */}
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={hideFromHome}
            onChange={(e) => setHideFromHome(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">
            <strong>Hide from Home</strong>
            <span className="toggle-description">
              Don&apos;t show this app on the dashboard (lock still applies)
            </span>
          </span>
        </label>
      </div>

      {/* Hide from Search - Requirement 2.8 */}
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={hideFromSearch}
            onChange={(e) => setHideFromSearch(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">
            <strong>Hide from Search</strong>
            <span className="toggle-description">
              Don&apos;t show this app in search results
            </span>
          </span>
        </label>
      </div>

      {/* Strict Mode - Requirement 2.9 */}
      {lockType !== 'nuclear' && (
        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              <strong>Strict Mode</strong>
              <span className="toggle-description">
                Require written explanation (min 10 characters) before allowing override
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Summary */}
      <div className="rule-summary">
        <h4>Rule Summary</h4>
        <div className="summary-item">
          <span className="summary-label">App:</span>
          <span className="summary-value">{appName || 'Not set'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Lock Type:</span>
          <span className="summary-value">
            {LOCK_TYPE_OPTIONS.find((opt) => opt.value === lockType)?.label}
          </span>
        </div>
        {lockType === 'timer' && (
          <div className="summary-item">
            <span className="summary-label">Daily Limit:</span>
            <span className="summary-value">{dailyLimitMinutes} minutes</span>
          </div>
        )}
        {lockType === 'schedule' && (
          <>
            <div className="summary-item">
              <span className="summary-label">Schedule:</span>
              <span className="summary-value">
                {scheduleStart} - {scheduleEnd}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Days:</span>
              <span className="summary-value">
                {scheduleDays.map((d) => d.toUpperCase()).join(', ')}
              </span>
            </div>
          </>
        )}
        {lockType === 'until_date' && (
          <div className="summary-item">
            <span className="summary-label">Unlock Date:</span>
            <span className="summary-value">{unlockDate || 'Not set'}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="rule-builder">
      {renderStepIndicator()}

      <div className="form-content">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        {currentStep > 1 && (
          <button type="button" className="btn btn-secondary" onClick={handleBack}>
            Back
          </button>
        )}
        {currentStep < 3 ? (
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {initialRule ? 'Update Rule' : 'Create Rule'}
          </button>
        )}
      </div>

      <style jsx>{`
        .rule-builder {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .step-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .step-dot {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e0e0e0;
          color: #999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .step-dot.active {
          background: #4a90e2;
          color: white;
        }

        .step-dot.current {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
        }

        .form-content {
          min-height: 400px;
          margin-bottom: 24px;
        }

        .form-step {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .step-title {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .step-description {
          font-size: 14px;
          color: #666;
          margin: 0 0 24px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 8px;
        }

        .required {
          color: #f44336;
        }

        .form-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #4a90e2;
        }

        .form-input.error {
          border-color: #f44336;
        }

        .form-hint {
          font-size: 12px;
          color: #666;
          margin-top: 6px;
        }

        .error-message {
          display: block;
          font-size: 12px;
          color: #f44336;
          margin-top: 6px;
        }

        .lock-type-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .lock-type-button {
          padding: 16px;
          background: #f5f5f5;
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          font-family: inherit;
        }

        .lock-type-button:hover {
          background: #e8e8e8;
          transform: translateY(-2px);
        }

        .lock-type-button:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .lock-type-button.selected {
          background: #e3f2fd;
          border-color: #4a90e2;
        }

        .lock-type-label {
          font-size: 15px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .lock-type-description {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .days-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .day-button {
          padding: 10px 16px;
          background: #f5f5f5;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .day-button:hover {
          background: #e8e8e8;
        }

        .day-button:focus {
          outline: 2px solid #4a90e2;
          outline-offset: 2px;
        }

        .day-button.selected {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .nuclear-warning {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: #fff3e0;
          border: 2px solid #ff9800;
          border-radius: 10px;
          margin-top: 16px;
        }

        .warning-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .warning-content h4 {
          font-size: 16px;
          font-weight: 600;
          color: #e65100;
          margin: 0 0 8px 0;
        }

        .warning-content p {
          font-size: 13px;
          color: #666;
          margin: 0 0 8px 0;
          line-height: 1.5;
        }

        .warning-content p:last-child {
          margin-bottom: 0;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 10px;
          transition: background 0.2s ease;
        }

        .toggle-label:hover {
          background: #f0f0f0;
        }

        .toggle-input {
          display: none;
        }

        .toggle-slider {
          position: relative;
          width: 48px;
          height: 28px;
          background: #ccc;
          border-radius: 14px;
          transition: background 0.3s ease;
          flex-shrink: 0;
        }

        .toggle-slider::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .toggle-input:checked + .toggle-slider {
          background: #4a90e2;
        }

        .toggle-input:checked + .toggle-slider::after {
          transform: translateX(20px);
        }

        .toggle-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .toggle-text strong {
          font-size: 14px;
          color: #333;
        }

        .toggle-description {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        .rule-summary {
          margin-top: 24px;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 10px;
        }

        .rule-summary h4 {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0 0 16px 0;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .summary-value {
          font-size: 13px;
          color: #333;
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
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

        .btn-secondary {
          background: #f5f5f5;
          color: #666;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-primary {
          background: #4a90e2;
          color: white;
        }

        .btn-primary:hover {
          background: #357abd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        @media (max-width: 768px) {
          .rule-builder {
            padding: 20px;
          }

          .step-indicator {
            gap: 12px;
            margin-bottom: 24px;
          }

          .step-dot {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .step-title {
            font-size: 20px;
          }

          .lock-type-options {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .days-selector {
            gap: 6px;
          }

          .day-button {
            padding: 8px 12px;
            font-size: 12px;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .rule-builder {
            padding: 16px;
          }

          .step-indicator {
            gap: 8px;
          }

          .step-dot {
            width: 32px;
            height: 32px;
            font-size: 13px;
          }

          .step-title {
            font-size: 18px;
          }

          .step-description {
            font-size: 13px;
          }

          .nuclear-warning {
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }

          .warning-icon {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}
