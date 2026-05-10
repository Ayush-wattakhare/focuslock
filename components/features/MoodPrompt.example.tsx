'use client';

/**
 * MoodPrompt Component Examples
 * 
 * Demonstrates various usage scenarios for the MoodPrompt component.
 */

import { useState } from 'react';
import MoodPrompt from './MoodPrompt';
import { Mood } from '@/types';

export default function MoodPromptExamples() {
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{ mood: Mood; reason: string } | null>(null);

  const handleSubmit = (mood: Mood, reason: string) => {
    setLastSubmission({ mood, reason });
    setActiveExample(null);
  };

  const handleCancel = () => {
    setActiveExample(null);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
        MoodPrompt Component Examples
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Interactive examples demonstrating different configurations of the MoodPrompt component.
      </p>

      {/* Last Submission Display */}
      {lastSubmission && (
        <div
          style={{
            background: '#e3f2fd',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '32px',
            borderLeft: '4px solid #4a90e2',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            Last Submission:
          </h3>
          <p style={{ margin: '4px 0' }}>
            <strong>Mood:</strong> {lastSubmission.mood}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Reason:</strong> {lastSubmission.reason || '(none provided)'}
          </p>
        </div>
      )}

      {/* Example 1: Normal Mode */}
      <div style={{ marginBottom: '32px', padding: '24px', background: '#f9f9f9', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Example 1: Normal Mode
        </h2>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Basic mood prompt with optional reason text. Mood selection is required, but reason text is optional.
        </p>
        <button
          onClick={() => setActiveExample('normal')}
          style={{
            padding: '12px 24px',
            background: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
          }}
        >
          Open Normal Mode Prompt
        </button>
        <pre
          style={{
            marginTop: '16px',
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
          }}
        >
          {`<MoodPrompt
  onSubmit={(mood, reason) => {
    console.log('Override:', { mood, reason });
  }}
  isStrictMode={false}
  onCancel={() => setShowPrompt(false)}
/>`}
        </pre>
      </div>

      {/* Example 2: Strict Mode */}
      <div style={{ marginBottom: '32px', padding: '24px', background: '#f9f9f9', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Example 2: Strict Mode
        </h2>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Strict mode enforces minimum 10 characters for reason text. Used for critical lock rules that require deeper reflection.
        </p>
        <button
          onClick={() => setActiveExample('strict')}
          style={{
            padding: '12px 24px',
            background: '#ef5350',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
          }}
        >
          Open Strict Mode Prompt
        </button>
        <pre
          style={{
            marginTop: '16px',
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
          }}
        >
          {`<MoodPrompt
  onSubmit={(mood, reason) => {
    // Reason is guaranteed to be at least 10 characters
    console.log('Override:', { mood, reason });
  }}
  isStrictMode={true}
  onCancel={() => setShowPrompt(false)}
/>`}
        </pre>
      </div>

      {/* Example 3: Without Cancel Button */}
      <div style={{ marginBottom: '32px', padding: '24px', background: '#f9f9f9', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Example 3: Without Cancel Button
        </h2>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          When onCancel is not provided, the cancel button is hidden. User must complete the prompt.
        </p>
        <button
          onClick={() => setActiveExample('no-cancel')}
          style={{
            padding: '12px 24px',
            background: '#66bb6a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
          }}
        >
          Open Prompt (No Cancel)
        </button>
        <pre
          style={{
            marginTop: '16px',
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
          }}
        >
          {`<MoodPrompt
  onSubmit={(mood, reason) => {
    console.log('Override:', { mood, reason });
  }}
  isStrictMode={false}
  // No onCancel prop - cancel button hidden
/>`}
        </pre>
      </div>

      {/* Example 4: API Integration */}
      <div style={{ marginBottom: '32px', padding: '24px', background: '#f9f9f9', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Example 4: API Integration
        </h2>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Real-world example with API call to log override.
        </p>
        <pre
          style={{
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
          }}
        >
          {`const handleSubmit = async (mood: Mood, reason: string) => {
  try {
    const response = await fetch('/api/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lock_rule_id: 'rule-123',
        app_name: 'Instagram',
        mood,
        reason_text: reason,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Override logged:', data);
      
      // Check if buddy was notified
      if (data.buddyNotified) {
        showNotification('Your buddy was notified');
      }
      
      // Check if streak was broken
      if (data.streakBroken) {
        showNotification('Your streak was reset');
      }
      
      setShowPrompt(false);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

<MoodPrompt
  onSubmit={handleSubmit}
  isStrictMode={lockRule.strict_mode}
  onCancel={() => setShowPrompt(false)}
/>`}
        </pre>
      </div>

      {/* Mood Options Reference */}
      <div style={{ marginBottom: '32px', padding: '24px', background: '#f9f9f9', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Mood Options Reference
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Mood</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Label</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Emoji</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
                <code>bored</code>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Bored</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', fontSize: '24px' }}>😐</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Feeling bored or restless</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
                <code>stressed</code>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Stressed</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', fontSize: '24px' }}>😰</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Feeling stressed or anxious</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
                <code>tired</code>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Tired</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', fontSize: '24px' }}>😴</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Feeling tired or exhausted</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
                <code>news</code>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>News</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', fontSize: '24px' }}>📰</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>Need to check news or updates</td>
            </tr>
            <tr>
              <td style={{ padding: '12px' }}>
                <code>other</code>
              </td>
              <td style={{ padding: '12px' }}>Other</td>
              <td style={{ padding: '12px', fontSize: '24px' }}>🤔</td>
              <td style={{ padding: '12px' }}>Other reason</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Design Rationale */}
      <div style={{ padding: '24px', background: '#fff8e1', borderRadius: '12px', borderLeft: '4px solid #ffa726' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          Design Rationale: Friction-First UX
        </h2>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          The MoodPrompt component implements a "friction-first" design philosophy to reduce impulsive app usage:
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li>
            <strong>Intentional Delay:</strong> Forces users to pause and reflect before overriding
          </li>
          <li>
            <strong>Emotional Awareness:</strong> Mood selection helps users recognize patterns
          </li>
          <li>
            <strong>Reason Articulation:</strong> Writing reasons increases mindfulness
          </li>
          <li>
            <strong>Strict Mode:</strong> For critical locks, requires deeper reflection (10+ characters)
          </li>
        </ul>
        <p style={{ marginTop: '12px', lineHeight: '1.6' }}>
          The mood and reason data collected powers the AI Coach feature, which identifies emotional triggers,
          time-of-day patterns, and provides personalized insights to help users build better habits.
        </p>
      </div>

      {/* Render Active Example */}
      {activeExample === 'normal' && (
        <MoodPrompt onSubmit={handleSubmit} isStrictMode={false} onCancel={handleCancel} />
      )}

      {activeExample === 'strict' && (
        <MoodPrompt onSubmit={handleSubmit} isStrictMode={true} onCancel={handleCancel} />
      )}

      {activeExample === 'no-cancel' && <MoodPrompt onSubmit={handleSubmit} isStrictMode={false} />}
    </div>
  );
}
