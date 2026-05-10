/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import FamilyClient from '../FamilyClient';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('FamilyClient', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'parent@example.com',
  };

  const mockProfile = {
    id: 'user-123',
    full_name: 'Parent User',
    avatar_url: null,
    timezone: 'Asia/Kolkata',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the family mode page with header', () => {
    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={[]}
      />
    );

    expect(screen.getByText('Family Mode')).toBeInTheDocument();
    expect(screen.getByText('Manage child accounts and monitor compliance')).toBeInTheDocument();
  });

  it('renders add child form', () => {
    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={[]}
      />
    );

    expect(screen.getByText('Add Child Account')).toBeInTheDocument();
    expect(screen.getByLabelText("Child's Email Address")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Child' })).toBeInTheDocument();
  });

  it('shows empty state when no children are linked', () => {
    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={[]}
      />
    );

    expect(screen.getByText('No child accounts linked yet')).toBeInTheDocument();
    expect(screen.getByText('Add a child account using the form above')).toBeInTheDocument();
  });

  it('displays child accounts when provided', async () => {
    const mockChildren = [
      {
        id: 'child-profile-1',
        child_user_id: 'child-123',
        created_at: '2024-01-15T00:00:00Z',
        profiles: {
          id: 'child-123',
          full_name: 'Child One',
          avatar_url: null,
          timezone: 'Asia/Kolkata',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
    ];

    // Mock the child stats API call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        compliance: {
          current_streak: 5,
          longest_streak: 10,
          total_overrides_this_week: 2,
          total_overrides_all_time: 15,
          compliance_percentage: 85.5,
        },
        recent_overrides: [],
      }),
    });

    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={mockChildren}
      />
    );

    expect(screen.getByText('Child One')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('85.5%')).toBeInTheDocument();
      expect(screen.getByText('5 days')).toBeInTheDocument();
    });
  });

  it('handles add child form submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        child_profile: {
          id: 'new-child-profile',
          parent_user_id: 'user-123',
          child_user_id: 'child-456',
          created_at: '2024-01-20T00:00:00Z',
        },
        child_info: {
          id: 'child-456',
          full_name: 'New Child',
          avatar_url: null,
        },
      }),
    });

    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={[]}
      />
    );

    const emailInput = screen.getByLabelText("Child's Email Address");
    const submitButton = screen.getByRole('button', { name: 'Add Child' });

    fireEvent.change(emailInput, { target: { value: 'child@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/family/add-child',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ child_email: 'child@example.com' }),
        })
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('displays error message when add child fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: 'NOT_FOUND',
          message: 'Child account not found',
        },
      }),
    });

    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={[]}
      />
    );

    const emailInput = screen.getByLabelText("Child's Email Address");
    const submitButton = screen.getByRole('button', { name: 'Add Child' });

    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Child account not found')).toBeInTheDocument();
    });
  });

  it('navigates back to dashboard when back button is clicked', () => {
    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={[]}
      />
    );

    const backButton = screen.getByRole('button', { name: '← Dashboard' });
    fireEvent.click(backButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('displays override notifications', async () => {
    const mockChildren = [
      {
        id: 'child-profile-1',
        child_user_id: 'child-123',
        created_at: '2024-01-15T00:00:00Z',
        profiles: {
          id: 'child-123',
          full_name: 'Child One',
          avatar_url: null,
          timezone: 'Asia/Kolkata',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
    ];

    // Mock the child stats API call with overrides
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        compliance: {
          current_streak: 5,
          longest_streak: 10,
          total_overrides_this_week: 2,
          total_overrides_all_time: 15,
          compliance_percentage: 85.5,
        },
        recent_overrides: [
          {
            id: 'override-1',
            app_name: 'Instagram',
            mood: 'bored',
            overridden_at: '2024-01-20T10:30:00Z',
          },
        ],
      }),
    });

    render(
      <FamilyClient
        user={mockUser}
        profile={mockProfile}
        initialChildren={mockChildren}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Child One')).toBeInTheDocument();
      expect(screen.getByText(/overrode/)).toBeInTheDocument();
      expect(screen.getByText(/Instagram/)).toBeInTheDocument();
      expect(screen.getByText('Mood: bored')).toBeInTheDocument();
    });
  });
});
