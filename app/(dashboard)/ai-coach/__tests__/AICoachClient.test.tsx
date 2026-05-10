/**
 * AICoachClient Component Tests
 * 
 * Tests for the AI Coach page client component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AICoachClient from '../AICoachClient';
import { User } from '@supabase/supabase-js';

// Mock fetch
global.fetch = jest.fn();

// Mock user
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
};

describe('AICoachClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders welcome screen initially', () => {
    render(<AICoachClient user={mockUser} />);
    
    expect(screen.getByText('AI Coach')).toBeInTheDocument();
    expect(screen.getByText('Welcome to AI Coach')).toBeInTheDocument();
    expect(screen.getByText('Generate New Insights')).toBeInTheDocument();
  });

  test('shows loading state when generating insights', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<AICoachClient user={mockUser} />);
    
    const button = screen.getByText('Generate New Insights');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Analyzing your patterns...')).toBeInTheDocument();
    });
  });

  test('displays insights after successful API call', async () => {
    const mockInsights = {
      insight: 'You tend to override locks in the evening.',
      suggestion: 'Try scheduling a walk at 8 PM.',
      topMood: 'stressed',
      moodBreakdown: [
        { mood: 'stressed', count: 10 },
        { mood: 'bored', count: 5 }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockInsights
    });

    render(<AICoachClient user={mockUser} />);
    
    const button = screen.getByText('Generate New Insights');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('You tend to override locks in the evening.')).toBeInTheDocument();
    });
  });

  test('displays error message on API failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: { message: 'Internal server error' }
      })
    });

    render(<AICoachClient user={mockUser} />);
    
    const button = screen.getByText('Generate New Insights');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Failed to Generate Insights')).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  test('displays rate limit message when rate limited', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: { 
          message: 'Rate limit exceeded. You can request new insights in 45 minutes.',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      })
    });

    render(<AICoachClient user={mockUser} />);
    
    const button = screen.getByText('Generate New Insights');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Rate Limit Reached')).toBeInTheDocument();
      expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
    });
  });

  test('retry button works after error', async () => {
    // First call fails
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: { message: 'Server error' }
      })
    });

    render(<AICoachClient user={mockUser} />);
    
    const generateButton = screen.getByText('Generate New Insights');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to Generate Insights')).toBeInTheDocument();
    });

    // Second call succeeds
    const mockInsights = {
      insight: 'Test insight',
      suggestion: 'Test suggestion',
      topMood: null,
      moodBreakdown: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockInsights
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test insight')).toBeInTheDocument();
    });
  });
});
