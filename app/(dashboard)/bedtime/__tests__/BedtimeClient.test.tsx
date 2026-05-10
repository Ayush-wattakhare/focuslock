/**
 * Bedtime Client Component Tests
 * 
 * Tests for the bedtime mode configuration interface.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BedtimeClient from '../BedtimeClient';

// Mock user object
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

// Mock initial settings
const mockSettings = {
  user_id: 'test-user-id',
  is_enabled: false,
  weekday_bedtime: '22:00:00',
  weekday_waketime: '07:00:00',
  weekend_bedtime: '23:00:00',
  weekend_waketime: '08:00:00',
  compliance_streak: 0,
  last_compliance_date: null,
};

// Mock fetch
global.fetch = jest.fn();

describe('BedtimeClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders bedtime mode page with initial settings', () => {
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    expect(screen.getByText('Bedtime Mode')).toBeInTheDocument();
    expect(screen.getByText('Automatically lock entertainment apps at bedtime')).toBeInTheDocument();
    expect(screen.getByText('Compliance Streak')).toBeInTheDocument();
    expect(screen.getByText('0 days')).toBeInTheDocument();
  });

  it('displays compliance streak correctly', () => {
    const settingsWithStreak = {
      ...mockSettings,
      compliance_streak: 5,
    };
    
    render(<BedtimeClient user={mockUser as any} initialSettings={settingsWithStreak} />);
    
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('2 more days to earn the Night Owl Slayer badge')).toBeInTheDocument();
  });

  it('displays achievement message when streak is 7 or more', () => {
    const settingsWithStreak = {
      ...mockSettings,
      compliance_streak: 7,
    };
    
    render(<BedtimeClient user={mockUser as any} initialSettings={settingsWithStreak} />);
    
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('🏆 Amazing! Keep it up!')).toBeInTheDocument();
  });

  it('toggles bedtime mode on and off', () => {
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    const toggle = screen.getByRole('checkbox');
    expect(toggle).not.toBeChecked();
    
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it('disables time inputs when bedtime mode is off', () => {
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    const weekdayBedtime = screen.getByLabelText('Bedtime', { selector: '#weekday-bedtime' });
    const weekdayWaketime = screen.getByLabelText('Wake Time', { selector: '#weekday-waketime' });
    
    expect(weekdayBedtime).toBeDisabled();
    expect(weekdayWaketime).toBeDisabled();
  });

  it('enables time inputs when bedtime mode is on', () => {
    const enabledSettings = {
      ...mockSettings,
      is_enabled: true,
    };
    
    render(<BedtimeClient user={mockUser as any} initialSettings={enabledSettings} />);
    
    const weekdayBedtime = screen.getByLabelText('Bedtime', { selector: '#weekday-bedtime' });
    const weekdayWaketime = screen.getByLabelText('Wake Time', { selector: '#weekday-waketime' });
    
    expect(weekdayBedtime).not.toBeDisabled();
    expect(weekdayWaketime).not.toBeDisabled();
  });

  it('displays correct time values in inputs', () => {
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    const weekdayBedtime = screen.getByLabelText('Bedtime', { selector: '#weekday-bedtime' }) as HTMLInputElement;
    const weekdayWaketime = screen.getByLabelText('Wake Time', { selector: '#weekday-waketime' }) as HTMLInputElement;
    const weekendBedtime = screen.getByLabelText('Bedtime', { selector: '#weekend-bedtime' }) as HTMLInputElement;
    const weekendWaketime = screen.getByLabelText('Wake Time', { selector: '#weekend-waketime' }) as HTMLInputElement;
    
    expect(weekdayBedtime.value).toBe('22:00');
    expect(weekdayWaketime.value).toBe('07:00');
    expect(weekendBedtime.value).toBe('23:00');
    expect(weekendWaketime.value).toBe('08:00');
  });

  it('saves settings successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        settings: {
          ...mockSettings,
          is_enabled: true,
        },
      }),
    });
    
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    // Enable bedtime mode
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    
    // Click save button
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    // Check loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    });
    
    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith('/api/bedtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
  });

  it('displays error message when save fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save' }),
    });
    
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument();
    });
  });

  it('updates time values when changed', () => {
    const enabledSettings = {
      ...mockSettings,
      is_enabled: true,
    };
    
    render(<BedtimeClient user={mockUser as any} initialSettings={enabledSettings} />);
    
    const weekdayBedtime = screen.getByLabelText('Bedtime', { selector: '#weekday-bedtime' }) as HTMLInputElement;
    
    fireEvent.change(weekdayBedtime, { target: { value: '21:30' } });
    
    expect(weekdayBedtime.value).toBe('21:30');
  });

  it('displays weekday and weekend sections', () => {
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    expect(screen.getByText('Weekdays (Monday - Friday)')).toBeInTheDocument();
    expect(screen.getByText('Weekends (Saturday - Sunday)')).toBeInTheDocument();
  });

  it('displays info box with badge information', () => {
    render(<BedtimeClient user={mockUser as any} initialSettings={mockSettings} />);
    
    expect(screen.getByText(/When bedtime mode is active/)).toBeInTheDocument();
    // Use getAllByText since "Night Owl Slayer" appears in multiple places
    const nightOwlElements = screen.getAllByText(/Night Owl Slayer/);
    expect(nightOwlElements.length).toBeGreaterThan(0);
  });
});
