'use client';

/**
 * RuleBuilder Component Examples
 * 
 * This file demonstrates various usage patterns for the RuleBuilder component.
 */

import { useState } from 'react';
import RuleBuilder from './RuleBuilder';
import { LockRule } from '@/types';

// Example 1: Creating a new rule
export function CreateRuleExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async (rule: Partial<LockRule>) => {
    console.log('Creating new rule:', rule);
    
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Rule created:', data.rule);
        setIsOpen(false);
        // Optionally: refresh rules list, show success message, etc.
      } else {
        console.error('Failed to create rule');
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Create New Rule</button>
      
      {isOpen && (
        <div style={{ padding: '20px' }}>
          <RuleBuilder onSave={handleSave} onCancel={handleCancel} />
        </div>
      )}
    </div>
  );
}

// Example 2: Editing an existing rule
export function EditRuleExample() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mock existing rule
  const existingRule: LockRule = {
    id: '123',
    user_id: 'user-1',
    app_name: 'Instagram',
    app_icon_url: 'https://example.com/instagram.png',
    app_scheme: 'instagram://',
    lock_type: 'timer',
    daily_limit_minutes: 30,
    schedule_start: null,
    schedule_end: null,
    schedule_days: null,
    unlock_date: null,
    hide_from_home: true,
    hide_from_search: true,
    strict_mode: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const handleSave = async (updatedRule: Partial<LockRule>) => {
    console.log('Updating rule:', updatedRule);
    
    try {
      const response = await fetch(`/api/rules/${existingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRule),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Rule updated:', data.rule);
        setIsOpen(false);
      } else {
        console.error('Failed to update rule');
      }
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Edit Rule</button>
      
      {isOpen && (
        <div style={{ padding: '20px' }}>
          <RuleBuilder 
            initialRule={existingRule}
            onSave={handleSave} 
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}

// Example 3: Creating different lock types
export function LockTypeExamples() {
  const [selectedType, setSelectedType] = useState<'timer' | 'schedule' | 'until_date' | 'nuclear'>('timer');

  const handleSave = (rule: Partial<LockRule>) => {
    console.log(`Created ${rule.lock_type} rule:`, rule);
  };

  return (
    <div>
      <h2>Create Lock Rule by Type</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setSelectedType('timer')}>Timer Lock</button>
        <button onClick={() => setSelectedType('schedule')}>Schedule Lock</button>
        <button onClick={() => setSelectedType('until_date')}>Until Date Lock</button>
        <button onClick={() => setSelectedType('nuclear')}>Nuclear Lock</button>
      </div>

      <div style={{ padding: '20px' }}>
        <RuleBuilder 
          initialRule={{
            lock_type: selectedType,
          } as any}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

// Example 4: Modal wrapper
export function ModalRuleBuilderExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSave = async (rule: Partial<LockRule>) => {
    console.log('Saving rule:', rule);
    // API call here
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        Add Lock Rule
      </button>

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <RuleBuilder onSave={handleSave} onCancel={handleCancel} />
          </div>
        </div>
      )}
    </div>
  );
}

// Example 5: With success/error handling
export function RuleBuilderWithFeedbackExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async (rule: Partial<LockRule>) => {
    setStatus('saving');
    setErrorMessage('');

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          setIsOpen(false);
          setStatus('idle');
        }, 2000);
      } else {
        const data = await response.json();
        setStatus('error');
        setErrorMessage(data.error?.message || 'Failed to create rule');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Create Rule</button>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          {status === 'saving' && (
            <div style={{ 
              padding: '12px', 
              background: '#e3f2fd', 
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              Saving rule...
            </div>
          )}

          {status === 'success' && (
            <div style={{ 
              padding: '12px', 
              background: '#e8f5e9', 
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              ✓ Rule created successfully!
            </div>
          )}

          {status === 'error' && (
            <div style={{ 
              padding: '12px', 
              background: '#ffebee', 
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              ✗ {errorMessage}
            </div>
          )}

          <RuleBuilder onSave={handleSave} onCancel={handleCancel} />
        </div>
      )}
    </div>
  );
}

// Example 6: Pre-filled form for quick setup
export function QuickSetupExample() {
  const commonApps = [
    { name: 'Instagram', icon: 'https://example.com/instagram.png', scheme: 'instagram://' },
    { name: 'YouTube', icon: 'https://example.com/youtube.png', scheme: 'youtube://' },
    { name: 'TikTok', icon: 'https://example.com/tiktok.png', scheme: 'tiktok://' },
    { name: 'Twitter', icon: 'https://example.com/twitter.png', scheme: 'twitter://' },
  ];

  const [selectedApp, setSelectedApp] = useState<typeof commonApps[0] | null>(null);

  const handleSave = async (rule: Partial<LockRule>) => {
    console.log('Quick setup rule:', rule);
    // API call here
    setSelectedApp(null);
  };

  const handleCancel = () => {
    setSelectedApp(null);
  };

  return (
    <div>
      <h2>Quick Setup</h2>
      <p>Select an app to quickly create a lock rule:</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {commonApps.map((app) => (
          <button
            key={app.name}
            onClick={() => setSelectedApp(app)}
            style={{
              padding: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            {app.name}
          </button>
        ))}
      </div>

      {selectedApp && (
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '12px' }}>
          <RuleBuilder
            initialRule={{
              app_name: selectedApp.name,
              app_icon_url: selectedApp.icon,
              app_scheme: selectedApp.scheme,
              lock_type: 'timer',
              daily_limit_minutes: 30,
            } as any}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}

// Example 7: All examples in one demo page
export default function RuleBuilderExamples() {
  const [activeExample, setActiveExample] = useState<string>('create');

  const examples = {
    create: <CreateRuleExample />,
    edit: <EditRuleExample />,
    types: <LockTypeExamples />,
    modal: <ModalRuleBuilderExample />,
    feedback: <RuleBuilderWithFeedbackExample />,
    quick: <QuickSetupExample />,
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>RuleBuilder Component Examples</h1>
      
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => setActiveExample('create')}>Create New</button>
        <button onClick={() => setActiveExample('edit')}>Edit Existing</button>
        <button onClick={() => setActiveExample('types')}>Lock Types</button>
        <button onClick={() => setActiveExample('modal')}>Modal</button>
        <button onClick={() => setActiveExample('feedback')}>With Feedback</button>
        <button onClick={() => setActiveExample('quick')}>Quick Setup</button>
      </div>

      <div>
        {examples[activeExample as keyof typeof examples]}
      </div>
    </div>
  );
}
