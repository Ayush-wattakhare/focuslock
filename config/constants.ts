// Application constants and configuration

export const APP_NAME = 'FocusLock';
export const APP_DESCRIPTION = 'Social Media Addiction Reducer';

// Default timezone
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// Pomodoro defaults
export const DEFAULT_WORK_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const DEFAULT_SESSIONS_TARGET = 4;

// Nuclear mode cooldown (in hours)
export const NUCLEAR_MODE_COOLDOWN_HOURS = 48;

// Streak check time (UTC)
export const STREAK_CHECK_HOUR = 0; // Midnight UTC

// AI coaching defaults
export const AI_COACHING_DAYS_DEFAULT = 7;
export const AI_INSIGHT_MAX_SENTENCES = 2;

// Strict mode minimum reason length
export const STRICT_MODE_MIN_REASON_LENGTH = 10;

// Badge IDs
export const BADGE_IDS = {
  QUICK_START: 'quick_start',
  FIRST_WEEK: 'first_week',
  SEVEN_DAY_WARRIOR: 'seven_day_warrior',
  IRON_WILL: 'iron_will',
  SOCIAL_DETOX: 'social_detox',
  NIGHT_OWL_SLAYER: 'night_owl_slayer',
  POMODORO_MASTER: 'pomodoro_master',
} as const;

// Mood options
export const MOOD_OPTIONS = [
  { value: 'bored', label: 'Bored', emoji: '😐' },
  { value: 'stressed', label: 'Stressed', emoji: '😰' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
  { value: 'news', label: 'Checking News', emoji: '📰' },
  { value: 'other', label: 'Other', emoji: '🤷' },
] as const;

// Lock types
export const LOCK_TYPES = {
  TIMER: 'timer',
  SCHEDULE: 'schedule',
  UNTIL_DATE: 'until_date',
  NUCLEAR: 'nuclear',
} as const;

// Days of week
export const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
] as const;

// API routes
export const API_ROUTES = {
  RULES: '/api/rules',
  OVERRIDE: '/api/override',
  STATS: '/api/stats',
  AI_COACH: '/api/ai-coach',
  BUDDY: '/api/buddy',
  STREAK: '/api/streak',
  BADGES: '/api/badges',
  POMODORO: '/api/pomodoro',
  CHALLENGE: '/api/challenge',
  FAMILY: '/api/family',
} as const;
