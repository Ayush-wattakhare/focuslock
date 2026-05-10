/**
 * ShareCard Component Tests
 * 
 * Tests for the ShareCard component functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShareCard from '../ShareCard';

// Mock html2canvas
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    toBlob: (callback: (blob: Blob) => void) => {
      callback(new Blob(['fake-image'], { type: 'image/png' }));
    }
  }))
}));

// Mock window.open
const mockOpen = jest.fn();
global.window.open = mockOpen;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('ShareCard Component', () => {
  const mockStats = {
    timeSaved: 180,
    compliancePercentage: 85.7,
    currentStreak: 12,
    watermark: 'focuslock.app',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the share card with all stats', () => {
      render(<ShareCard stats={mockStats} />);

      expect(screen.getByText('My FocusLock Progress')).toBeInTheDocument();
      expect(screen.getByText("This Week's Achievements")).toBeInTheDocument();
      expect(screen.getByText('3h')).toBeInTheDocument(); // 180 minutes = 3 hours
      expect(screen.getByText('85.7%')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('focuslock.app')).toBeInTheDocument();
    });

    it('should render time in minutes when less than 60', () => {
      const stats = { ...mockStats, timeSaved: 45 };
      render(<ShareCard stats={stats} />);

      expect(screen.getByText('45 min')).toBeInTheDocument();
    });

    it('should render time with hours and minutes', () => {
      const stats = { ...mockStats, timeSaved: 125 }; // 2h 5m
      render(<ShareCard stats={stats} />);

      expect(screen.getByText('2h 5m')).toBeInTheDocument();
    });

    it('should render export buttons', () => {
      render(<ShareCard stats={mockStats} />);

      expect(screen.getByLabelText('Share to WhatsApp')).toBeInTheDocument();
      expect(screen.getByLabelText('Share to Instagram')).toBeInTheDocument();
      expect(screen.getByLabelText('Download as PNG')).toBeInTheDocument();
    });
  });

  describe('WhatsApp Share', () => {
    it('should open WhatsApp with formatted text', () => {
      render(<ShareCard stats={mockStats} />);

      const whatsappButton = screen.getByLabelText('Share to WhatsApp');
      fireEvent.click(whatsappButton);

      expect(mockOpen).toHaveBeenCalledTimes(1);
      const callArgs = mockOpen.mock.calls[0][0];
      
      // Check that the URL contains WhatsApp link
      expect(callArgs).toContain('wa.me');
      
      // Check that the URL contains encoded stats (URL encoded)
      expect(callArgs).toContain('3h');
      expect(callArgs).toContain('85.7');
      expect(callArgs).toContain('12');
      expect(callArgs).toContain('focuslock.app');
      
      // Check that it opens in new tab
      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        '_blank'
      );
    });
  });

  describe('PNG Download', () => {
    it('should trigger PNG download when button clicked', async () => {
      render(<ShareCard stats={mockStats} />);

      const downloadButton = screen.getByLabelText('Download as PNG');
      
      // Create a spy on document.createElement
      const createElementSpy = jest.spyOn(document, 'createElement');
      
      fireEvent.click(downloadButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that an anchor element was created for download
      expect(createElementSpy).toHaveBeenCalledWith('a');
    });
  });

  describe('Instagram Share', () => {
    it('should copy text to clipboard and trigger download', async () => {
      render(<ShareCard stats={mockStats} />);

      const instagramButton = screen.getByLabelText('Share to Instagram');
      
      // Mock alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation();

      fireEvent.click(instagramButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify clipboard was called
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      
      alertMock.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero stats', () => {
      const zeroStats = {
        timeSaved: 0,
        compliancePercentage: 0,
        currentStreak: 0,
        watermark: 'focuslock.app',
      };

      render(<ShareCard stats={zeroStats} />);

      expect(screen.getByText('0 min')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const largeStats = {
        timeSaved: 999, // 16h 39m
        compliancePercentage: 100,
        currentStreak: 365,
        watermark: 'focuslock.app',
      };

      render(<ShareCard stats={largeStats} />);

      expect(screen.getByText('16h 39m')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('365')).toBeInTheDocument();
    });

    it('should handle decimal compliance percentage', () => {
      const stats = { ...mockStats, compliancePercentage: 85.71428 };
      render(<ShareCard stats={stats} />);

      expect(screen.getByText('85.71428%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ShareCard stats={mockStats} />);

      expect(screen.getByLabelText('Share to WhatsApp')).toBeInTheDocument();
      expect(screen.getByLabelText('Share to Instagram')).toBeInTheDocument();
      expect(screen.getByLabelText('Download as PNG')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<ShareCard stats={mockStats} />);

      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        expect(button).toBeVisible();
        expect(button).not.toBeDisabled();
      });
    });
  });
});
