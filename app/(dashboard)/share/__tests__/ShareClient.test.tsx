/**
 * ShareClient Component Tests
 * 
 * Tests for the share page client component.
 * Validates: Requirements 14.1-14.4
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShareClient from '../ShareClient';
import { User } from '@supabase/supabase-js';

// Mock ShareCard component
jest.mock('@/components/features/ShareCard', () => {
  return function MockShareCard({ stats }: any) {
    return (
      <div data-testid="share-card">
        <div data-testid="time-saved">{stats.timeSaved}</div>
        <div data-testid="compliance">{stats.compliancePercentage}</div>
        <div data-testid="streak">{stats.currentStreak}</div>
        <div data-testid="watermark">{stats.watermark}</div>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

describe('ShareClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading state while fetching stats', () => {
      // Mock fetch to never resolve
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ShareClient user={mockUser} />);

      expect(screen.getByText('Loading your progress...')).toBeInTheDocument();
    });

    it('should display spinner during loading', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(<ShareClient user={mockUser} />);
      const spinner = container.querySelector('.spinner');

      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Success State - Requirement 14.1-14.4', () => {
    const mockStats = {
      timeSaved: 180,
      compliancePercentage: 85.7,
      currentStreak: 12,
      watermark: 'focuslock.app',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStats,
      });
    });

    it('should fetch stats from /api/share-card endpoint', async () => {
      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/share-card');
      });
    });

    it('should display page title and subtitle', async () => {
      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Share Your Progress')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Show off your achievements and inspire others/i)
      ).toBeInTheDocument();
    });

    it('should render ShareCard with fetched stats - Requirement 14.1', async () => {
      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('share-card')).toBeInTheDocument();
      });

      expect(screen.getByTestId('time-saved')).toHaveTextContent('180');
      expect(screen.getByTestId('compliance')).toHaveTextContent('85.7');
    });

    it('should display current streak - Requirement 14.2', async () => {
      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('streak')).toHaveTextContent('12');
      });
    });

    it('should display FocusLock watermark - Requirement 14.3', async () => {
      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('watermark')).toHaveTextContent(
          'focuslock.app'
        );
      });
    });

    it('should pass all required stats to ShareCard component', async () => {
      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        const shareCard = screen.getByTestId('share-card');
        expect(shareCard).toBeInTheDocument();
      });

      // Verify all stats are passed
      expect(screen.getByTestId('time-saved')).toBeInTheDocument();
      expect(screen.getByTestId('compliance')).toBeInTheDocument();
      expect(screen.getByTestId('streak')).toBeInTheDocument();
      expect(screen.getByTestId('watermark')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when API request fails', async () => {
      const errorMessage = 'Failed to fetch stats';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: errorMessage },
        }),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Stats')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: 'Network error' },
        }),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Stats')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display error icon on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      const { container } = render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        const errorIcon = container.querySelector('.error-icon');
        expect(errorIcon).toBeInTheDocument();
        expect(errorIcon).toHaveTextContent('⚠️');
      });
    });

    it('should handle missing error message gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Stats')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch stats')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch stats on component mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSaved: 100,
          compliancePercentage: 90,
          currentStreak: 5,
          watermark: 'focuslock.app',
        }),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should only fetch stats once on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSaved: 100,
          compliancePercentage: 90,
          currentStreak: 5,
          watermark: 'focuslock.app',
        }),
      });

      const { rerender } = render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Rerender should not trigger another fetch
      rerender(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values in stats', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSaved: 0,
          compliancePercentage: 0,
          currentStreak: 0,
          watermark: 'focuslock.app',
        }),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('time-saved')).toHaveTextContent('0');
        expect(screen.getByTestId('compliance')).toHaveTextContent('0');
        expect(screen.getByTestId('streak')).toHaveTextContent('0');
      });
    });

    it('should handle large values in stats', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSaved: 10080, // 1 week in minutes
          compliancePercentage: 100,
          currentStreak: 365,
          watermark: 'focuslock.app',
        }),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('time-saved')).toHaveTextContent('10080');
        expect(screen.getByTestId('compliance')).toHaveTextContent('100');
        expect(screen.getByTestId('streak')).toHaveTextContent('365');
      });
    });

    it('should handle decimal compliance percentage', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSaved: 150,
          compliancePercentage: 87.5,
          currentStreak: 10,
          watermark: 'focuslock.app',
        }),
      });

      render(<ShareClient user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('compliance')).toHaveTextContent('87.5');
      });
    });
  });
});
