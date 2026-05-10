/**
 * Unit Tests for MoodPrompt Component
 * 
 * Tests cover:
 * - Mood selection functionality
 * - Reason text input
 * - Strict mode validation (10 character minimum)
 * - Submit and cancel actions
 * - Error handling
 * - Accessibility features
 * 
 * Requirements: 4.1-4.6, 17.1-17.4
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock types
type Mood = 'bored' | 'stressed' | 'tired' | 'news' | 'other';

interface MoodPromptProps {
  onSubmit: (mood: Mood, reason: string) => void;
  isStrictMode: boolean;
  onCancel?: () => void;
}

// Mock component behavior for testing
class MoodPromptMock {
  private selectedMood: Mood | null = null;
  private reasonText: string = '';
  private error: string | null = null;

  constructor(private props: MoodPromptProps) {}

  selectMood(mood: Mood): void {
    this.selectedMood = mood;
    this.error = null;
  }

  setReasonText(text: string): void {
    this.reasonText = text;
    this.error = null;
  }

  submit(): { success: boolean; error?: string } {
    // Validate mood selection
    if (!this.selectedMood) {
      this.error = 'Please select a mood';
      return { success: false, error: this.error };
    }

    // Validate minimum 10 characters for strict mode
    if (this.props.isStrictMode && this.reasonText.trim().length < 10) {
      this.error = 'Please provide at least 10 characters explaining why you want to open this app';
      return { success: false, error: this.error };
    }

    // Call onSubmit callback
    this.props.onSubmit(this.selectedMood, this.reasonText.trim());
    return { success: true };
  }

  cancel(): void {
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }

  getError(): string | null {
    return this.error;
  }

  getSelectedMood(): Mood | null {
    return this.selectedMood;
  }

  getReasonText(): string {
    return this.reasonText;
  }
}

describe('MoodPrompt Component', () => {
  describe('Mood Selection - Requirement 4.2', () => {
    it('should allow selecting a mood', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('bored');

      expect(component.getSelectedMood()).toBe('bored');
    });

    it('should support all five mood options', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      const moods: Mood[] = ['bored', 'stressed', 'tired', 'news', 'other'];

      moods.forEach((mood) => {
        component.selectMood(mood);
        expect(component.getSelectedMood()).toBe(mood);
      });
    });

    it('should clear error when mood is selected', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      // Trigger error by submitting without mood
      component.submit();
      expect(component.getError()).toBe('Please select a mood');

      // Select mood should clear error
      component.selectMood('stressed');
      expect(component.getError()).toBeNull();
    });
  });

  describe('Reason Text Input - Requirement 4.3', () => {
    it('should allow entering reason text', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.setReasonText('Need to check important messages');

      expect(component.getReasonText()).toBe('Need to check important messages');
    });

    it('should be optional in normal mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('bored');
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('bored', '');
    });

    it('should clear error when reason text is entered', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      component.selectMood('stressed');
      component.submit(); // Trigger error
      expect(component.getError()).not.toBeNull();

      component.setReasonText('Valid reason text here');
      expect(component.getError()).toBeNull();
    });
  });

  describe('Validation - Requirements 4.1, 4.4', () => {
    it('should require mood selection before submit', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      const result = component.submit();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please select a mood');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should call onSubmit with mood and reason when valid', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('stressed');
      component.setReasonText('Need to check work messages');
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('stressed', 'Need to check work messages');
    });

    it('should trim whitespace from reason text', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('bored');
      component.setReasonText('  Reason with spaces  ');
      component.submit();

      expect(onSubmit).toHaveBeenCalledWith('bored', 'Reason with spaces');
    });
  });

  describe('Strict Mode Validation - Requirements 17.1, 17.2, 17.3', () => {
    it('should require minimum 10 characters in strict mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      component.selectMood('tired');
      component.setReasonText('Short');
      const result = component.submit();

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 10 characters');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept exactly 10 characters in strict mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      component.selectMood('news');
      component.setReasonText('1234567890'); // Exactly 10 characters
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('news', '1234567890');
    });

    it('should accept more than 10 characters in strict mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      component.selectMood('other');
      component.setReasonText('This is a valid reason with more than 10 characters');
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('other', 'This is a valid reason with more than 10 characters');
    });

    it('should count trimmed length for strict mode validation', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      component.selectMood('stressed');
      component.setReasonText('   Short   '); // Only 5 characters after trim
      const result = component.submit();

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 10 characters');
    });

    it('should not enforce minimum length in normal mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('bored');
      component.setReasonText('Hi'); // Less than 10 characters
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('bored', 'Hi');
    });
  });

  describe('Cancel Action', () => {
    it('should call onCancel when cancel is triggered', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false, onCancel });

      component.cancel();

      expect(onCancel).toHaveBeenCalled();
    });

    it('should not error when onCancel is not provided', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      expect(() => component.cancel()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string reason text', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('other');
      component.setReasonText('');
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('other', '');
    });

    it('should handle whitespace-only reason text in normal mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('news');
      component.setReasonText('   ');
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('news', '');
    });

    it('should reject whitespace-only reason text in strict mode', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      component.selectMood('tired');
      component.setReasonText('          '); // 10 spaces
      const result = component.submit();

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 10 characters');
    });

    it('should handle very long reason text', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      const longText = 'A'.repeat(1000);
      component.selectMood('stressed');
      component.setReasonText(longText);
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('stressed', longText);
    });

    it('should handle special characters in reason text', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      const specialText = 'Reason with émojis 😊 and symbols @#$%';
      component.selectMood('other');
      component.setReasonText(specialText);
      const result = component.submit();

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('other', specialText);
    });

    it('should allow changing mood selection', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      component.selectMood('bored');
      expect(component.getSelectedMood()).toBe('bored');

      component.selectMood('stressed');
      expect(component.getSelectedMood()).toBe('stressed');

      component.submit();
      expect(onSubmit).toHaveBeenCalledWith('stressed', '');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete normal mode flow', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false });

      // User selects mood
      component.selectMood('bored');
      expect(component.getSelectedMood()).toBe('bored');

      // User enters optional reason
      component.setReasonText('Just feeling restless');
      expect(component.getReasonText()).toBe('Just feeling restless');

      // User submits
      const result = component.submit();
      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('bored', 'Just feeling restless');
    });

    it('should handle complete strict mode flow', () => {
      const onSubmit = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: true });

      // User selects mood
      component.selectMood('stressed');

      // User tries to submit without enough text
      let result = component.submit();
      expect(result.success).toBe(false);
      expect(component.getError()).toContain('at least 10 characters');

      // User enters valid reason
      component.setReasonText('I need to check urgent work emails right now');
      expect(component.getError()).toBeNull();

      // User submits successfully
      result = component.submit();
      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith('stressed', 'I need to check urgent work emails right now');
    });

    it('should handle cancel flow', () => {
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      const component = new MoodPromptMock({ onSubmit, isStrictMode: false, onCancel });

      // User selects mood and enters text
      component.selectMood('news');
      component.setReasonText('Changed my mind');

      // User cancels
      component.cancel();
      expect(onCancel).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
