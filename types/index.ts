// Core type definitions for FocusLock application

export type LockType = 'timer' | 'schedule' | 'until_date' | 'nuclear';

export type Mood = 'bored' | 'stressed' | 'tired' | 'news' | 'other';

export type BuddyStatus = 'pending' | 'active' | 'removed';

export type PomodoroStatus = 'active' | 'completed' | 'abandoned';

export type ChallengeStatus = 'active' | 'completed' | 'failed';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
}

export interface LockRule {
  id: string;
  user_id: string;
  app_name: string;
  app_icon_url: string | null;
  app_scheme: string | null;
  lock_type: LockType;
  daily_limit_minutes: number | null;
  schedule_start: string | null; // HH:MM format
  schedule_end: string | null; // HH:MM format
  schedule_days: string[] | null; // ['mon', 'tue', ...]
  unlock_date: string | null; // ISO date
  hide_from_home: boolean;
  hide_from_search: boolean;
  strict_mode: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LockStatus {
  isLocked: boolean;
  unlocksAt: Date | null;
  reason: string | null;
}

export interface OverrideLog {
  id: string;
  user_id: string;
  lock_rule_id: string | null;
  app_name: string;
  mood: Mood | null;
  reason_text: string | null;
  overridden_at: string;
}

export interface UsageSession {
  id: string;
  user_id: string;
  app_name: string;
  session_start: string;
  session_end: string | null;
  minutes_used: number | null;
  date: string;
  created_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  condition: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface Buddy {
  id: string;
  user_id: string;
  buddy_user_id: string;
  rules_watching: string[] | null;
  status: BuddyStatus;
  invited_at: string;
  accepted_at: string | null;
}

export interface BuddyNotification {
  id: string;
  from_user_id: string;
  to_user_id: string;
  event_type: 'override' | 'streak_broken' | 'weekly_summary';
  app_name: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_label: string | null;
  work_minutes: number;
  break_minutes: number;
  sessions_target: number;
  sessions_done: number;
  status: PomodoroStatus;
  started_at: string;
  ended_at: string | null;
}

export interface WeeklyChallenge {
  id: string;
  user_id: string;
  app_name: string;
  daily_limit: number;
  week_start: string;
  week_end: string;
  days_completed: number;
  status: ChallengeStatus;
  created_at: string;
}

export interface ChildProfile {
  id: string;
  parent_user_id: string;
  child_user_id: string;
  created_at: string;
}
