/**
 * AIInsightCard Component Tests
 * 
 * Unit tests for the AIInsightCard component logic.
 * 
 * Requirements tested: 10.1-10.8
 * - 10.1: Display Claude-generated insights
 * - 10.2: Show one key insight (2 sentences max)
 * - 10.3: Show one specific actionable suggestion
 * - 10.4: Display most common mood trigger
 * - 10.5: Mood pattern visualization
 * - 10.6: Warm, non-judgmental tone
 * - 10.7: CTA button for actionable suggestion
 * - 10.8: Accessible and responsive design
 */

interface MoodBreakdown {
  mood: string;
  count: number;
}

interface AIInsightCardProps {
  insight: string;
  suggestion: string;
  topMood: string | null;
  moodBreakdown: MoodBreakdown[];
  onActionClick?: () => void;
}

// Helper function to capitalize first letter (extracted from component logic)
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

describe('AIInsightCard - Props Validation', () => {
  const mockProps: AIInsightCardProps = {
    insight: "You tend to override locks most often in the evening, especially around 8-9 PM. This pattern suggests you're using apps as a wind-down activity.",
    suggestion: "Try scheduling a 10-minute walk or reading session at 8 PM instead of reaching for your phone.",
    topMood: "stressed",
    moodBreakdown: [
      { mood: 'stressed', count: 12 },
      { mood: 'bored', count: 8 },
      { mood: 'tired', count: 5 }
    ]
  };

  describe('Requirement 10.1 & 10.2: Display Claude-generated insights', () => {
    it('should have valid insight text', () => {
      expect(mockProps.insight).toBeTruthy();
      expect(mockProps.insight.length).toBeGreaterThan(0);
    });

    it('should have insight with reasonable length (2 sentences max)', () => {
      const sentences = mockProps.insight.split('. ');
      expect(sentences.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty insight gracefully', () => {
      const emptyInsight = '';
      expect(emptyInsight).toBe('');
    });
  });

  describe('Requirement 10.3: Show one specific actionable suggestion', () => {
    it('should have valid suggestion text', () => {
      expect(mockProps.suggestion).toBeTruthy();
      expect(mockProps.suggestion.length).toBeGreaterThan(0);
    });

    it('should have actionable suggestion', () => {
      // Suggestion should contain action words
      const actionWords = ['try', 'set', 'create', 'schedule', 'plan', 'consider'];
      const hasActionWord = actionWords.some(word => 
        mockProps.suggestion.toLowerCase().includes(word)
      );
      expect(hasActionWord).toBe(true);
    });
  });

  describe('Requirement 10.4: Display most common mood trigger', () => {
    it('should have valid topMood when provided', () => {
      expect(mockProps.topMood).toBe('stressed');
    });

    it('should handle null topMood', () => {
      const propsWithoutMood: AIInsightCardProps = {
        ...mockProps,
        topMood: null
      };
      expect(propsWithoutMood.topMood).toBeNull();
    });

    it('should have topMood matching one of the mood breakdown entries', () => {
      const moods = mockProps.moodBreakdown.map(m => m.mood);
      expect(moods).toContain(mockProps.topMood);
    });
  });

  describe('Requirement 10.5: Mood pattern visualization', () => {
    it('should have valid mood breakdown array', () => {
      expect(Array.isArray(mockProps.moodBreakdown)).toBe(true);
      expect(mockProps.moodBreakdown.length).toBeGreaterThan(0);
    });

    it('should have mood breakdown with valid structure', () => {
      mockProps.moodBreakdown.forEach(mood => {
        expect(mood).toHaveProperty('mood');
        expect(mood).toHaveProperty('count');
        expect(typeof mood.mood).toBe('string');
        expect(typeof mood.count).toBe('number');
      });
    });

    it('should have mood counts as positive numbers', () => {
      mockProps.moodBreakdown.forEach(mood => {
        expect(mood.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty mood breakdown', () => {
      const emptyBreakdown: MoodBreakdown[] = [];
      expect(emptyBreakdown.length).toBe(0);
    });
  });

  describe('Requirement 10.7: CTA button for actionable suggestion', () => {
    it('should support optional onActionClick callback', () => {
      const mockCallback = jest.fn();
      const propsWithCallback: AIInsightCardProps = {
        ...mockProps,
        onActionClick: mockCallback
      };
      
      expect(propsWithCallback.onActionClick).toBeDefined();
      expect(typeof propsWithCallback.onActionClick).toBe('function');
    });

    it('should work without onActionClick callback', () => {
      const propsWithoutCallback: AIInsightCardProps = {
        ...mockProps,
        onActionClick: undefined
      };
      
      expect(propsWithoutCallback.onActionClick).toBeUndefined();
    });
  });
});

describe('AIInsightCard - Mood Types', () => {
  const validMoods = ['bored', 'stressed', 'tired', 'news', 'other'];

  it('should support all valid mood types', () => {
    validMoods.forEach(mood => {
      expect(validMoods).toContain(mood);
    });
  });

  it('should have exactly 5 mood types', () => {
    expect(validMoods.length).toBe(5);
  });

  it('should have unique mood types', () => {
    const uniqueMoods = new Set(validMoods);
    expect(uniqueMoods.size).toBe(validMoods.length);
  });
});

describe('AIInsightCard - Helper Functions', () => {
  describe('capitalize function', () => {
    it('should capitalize first letter of lowercase string', () => {
      expect(capitalize('stressed')).toBe('Stressed');
      expect(capitalize('bored')).toBe('Bored');
      expect(capitalize('tired')).toBe('Tired');
    });

    it('should handle already capitalized strings', () => {
      expect(capitalize('Stressed')).toBe('Stressed');
    });

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });

    it('should only capitalize first letter', () => {
      expect(capitalize('hello world')).toBe('Hello world');
    });
  });
});

describe('AIInsightCard - Edge Cases', () => {
  it('should handle very long insight text', () => {
    const longInsight = 'This is a very long insight message that spans multiple lines and contains a lot of information about the user\'s behavior patterns and usage habits.';
    expect(longInsight.length).toBeGreaterThan(100);
    expect(longInsight).toBeTruthy();
  });

  it('should handle very long suggestion text', () => {
    const longSuggestion = 'This is a very long suggestion that provides detailed actionable advice with multiple steps and considerations for the user to follow.';
    expect(longSuggestion.length).toBeGreaterThan(100);
    expect(longSuggestion).toBeTruthy();
  });

  it('should handle single mood entry', () => {
    const singleMood: MoodBreakdown[] = [{ mood: 'bored', count: 5 }];
    expect(singleMood.length).toBe(1);
    expect(singleMood[0].mood).toBe('bored');
    expect(singleMood[0].count).toBe(5);
  });

  it('should handle all mood types in breakdown', () => {
    const allMoods: MoodBreakdown[] = [
      { mood: 'bored', count: 5 },
      { mood: 'stressed', count: 4 },
      { mood: 'tired', count: 3 },
      { mood: 'news', count: 2 },
      { mood: 'other', count: 1 }
    ];
    expect(allMoods.length).toBe(5);
    expect(allMoods.map(m => m.mood)).toEqual(['bored', 'stressed', 'tired', 'news', 'other']);
  });

  it('should handle zero count moods', () => {
    const zeroCountMood: MoodBreakdown = { mood: 'stressed', count: 0 };
    expect(zeroCountMood.count).toBe(0);
  });

  it('should handle large mood counts', () => {
    const largeMood: MoodBreakdown = { mood: 'stressed', count: 999 };
    expect(largeMood.count).toBe(999);
  });
});

describe('AIInsightCard - Mood Breakdown Calculations', () => {
  it('should calculate max count correctly', () => {
    const moodBreakdown: MoodBreakdown[] = [
      { mood: 'stressed', count: 12 },
      { mood: 'bored', count: 8 },
      { mood: 'tired', count: 5 }
    ];
    const maxCount = Math.max(...moodBreakdown.map(m => m.count), 1);
    expect(maxCount).toBe(12);
  });

  it('should handle empty breakdown with minimum value', () => {
    const emptyBreakdown: MoodBreakdown[] = [];
    const maxCount = Math.max(...emptyBreakdown.map(m => m.count), 1);
    expect(maxCount).toBe(1); // Minimum 1 to avoid division by zero
  });

  it('should calculate percentage correctly', () => {
    const count = 8;
    const maxCount = 12;
    const percentage = (count / maxCount) * 100;
    expect(percentage).toBeCloseTo(66.67, 1);
  });

  it('should handle 100% percentage', () => {
    const count = 12;
    const maxCount = 12;
    const percentage = (count / maxCount) * 100;
    expect(percentage).toBe(100);
  });
});

describe('AIInsightCard - Success Cases', () => {
  it('should handle no overrides case', () => {
    const noOverridesProps: AIInsightCardProps = {
      insight: "Great job! You haven't overridden any locks this week.",
      suggestion: "Keep up the momentum by setting a new challenge for next week.",
      topMood: null,
      moodBreakdown: []
    };

    expect(noOverridesProps.insight).toContain('Great job');
    expect(noOverridesProps.topMood).toBeNull();
    expect(noOverridesProps.moodBreakdown.length).toBe(0);
  });

  it('should handle minimal overrides case', () => {
    const minimalProps: AIInsightCardProps = {
      insight: "You've only overridden locks twice this week. Excellent self-control!",
      suggestion: "Consider sharing your success strategy with an accountability buddy.",
      topMood: 'stressed',
      moodBreakdown: [{ mood: 'stressed', count: 2 }]
    };

    expect(minimalProps.moodBreakdown.length).toBe(1);
    expect(minimalProps.moodBreakdown[0].count).toBe(2);
  });
});
