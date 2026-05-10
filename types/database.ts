// FocusLock Database Types
// Auto-generated types matching Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          timezone: string
          notify_unlock: boolean
          notify_buddy_override: boolean
          notify_streak_broken: boolean
          notify_badge_earned: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          notify_unlock?: boolean
          notify_buddy_override?: boolean
          notify_streak_broken?: boolean
          notify_badge_earned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          notify_unlock?: boolean
          notify_buddy_override?: boolean
          notify_streak_broken?: boolean
          notify_badge_earned?: boolean
          created_at?: string
        }
      }
      lock_rules: {
        Row: {
          id: string
          user_id: string
          app_name: string
          app_icon_url: string | null
          app_scheme: string | null
          lock_type: 'timer' | 'schedule' | 'until_date' | 'nuclear'
          daily_limit_minutes: number | null
          schedule_start: string | null
          schedule_end: string | null
          schedule_days: string[] | null
          unlock_date: string | null
          hide_from_home: boolean
          hide_from_search: boolean
          strict_mode: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app_name: string
          app_icon_url?: string | null
          app_scheme?: string | null
          lock_type: 'timer' | 'schedule' | 'until_date' | 'nuclear'
          daily_limit_minutes?: number | null
          schedule_start?: string | null
          schedule_end?: string | null
          schedule_days?: string[] | null
          unlock_date?: string | null
          hide_from_home?: boolean
          hide_from_search?: boolean
          strict_mode?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app_name?: string
          app_icon_url?: string | null
          app_scheme?: string | null
          lock_type?: 'timer' | 'schedule' | 'until_date' | 'nuclear'
          daily_limit_minutes?: number | null
          schedule_start?: string | null
          schedule_end?: string | null
          schedule_days?: string[] | null
          unlock_date?: string | null
          hide_from_home?: boolean
          hide_from_search?: boolean
          strict_mode?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      override_logs: {
        Row: {
          id: string
          user_id: string
          lock_rule_id: string | null
          app_name: string
          mood: 'bored' | 'stressed' | 'tired' | 'news' | 'other' | null
          reason_text: string | null
          overridden_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lock_rule_id?: string | null
          app_name: string
          mood?: 'bored' | 'stressed' | 'tired' | 'news' | 'other' | null
          reason_text?: string | null
          overridden_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lock_rule_id?: string | null
          app_name?: string
          mood?: 'bored' | 'stressed' | 'tired' | 'news' | 'other' | null
          reason_text?: string | null
          overridden_at?: string
        }
      }
      usage_sessions: {
        Row: {
          id: string
          user_id: string
          app_name: string
          session_start: string
          session_end: string | null
          minutes_used: number | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app_name: string
          session_start: string
          session_end?: string | null
          minutes_used?: number | null
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app_name?: string
          session_start?: string
          session_end?: string | null
          minutes_used?: number | null
          date?: string
          created_at?: string
        }
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_active_date: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          updated_at?: string
        }
      }
      badge_definitions: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          condition: string | null
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          icon?: string | null
          condition?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          condition?: string | null
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
      }
      buddies: {
        Row: {
          id: string
          user_id: string
          buddy_user_id: string
          rules_watching: string[] | null
          status: 'pending' | 'active' | 'removed'
          invited_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          buddy_user_id: string
          rules_watching?: string[] | null
          status?: 'pending' | 'active' | 'removed'
          invited_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          buddy_user_id?: string
          rules_watching?: string[] | null
          status?: 'pending' | 'active' | 'removed'
          invited_at?: string
          accepted_at?: string | null
        }
      }
      buddy_notifications: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          event_type: 'override' | 'streak_broken' | 'weekly_summary'
          app_name: string | null
          message: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          event_type: 'override' | 'streak_broken' | 'weekly_summary'
          app_name?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          event_type?: 'override' | 'streak_broken' | 'weekly_summary'
          app_name?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      pomodoro_sessions: {
        Row: {
          id: string
          user_id: string
          task_label: string | null
          work_minutes: number
          break_minutes: number
          sessions_target: number
          sessions_done: number
          status: 'active' | 'completed' | 'abandoned'
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          task_label?: string | null
          work_minutes?: number
          break_minutes?: number
          sessions_target?: number
          sessions_done?: number
          status?: 'active' | 'completed' | 'abandoned'
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          task_label?: string | null
          work_minutes?: number
          break_minutes?: number
          sessions_target?: number
          sessions_done?: number
          status?: 'active' | 'completed' | 'abandoned'
          started_at?: string
          ended_at?: string | null
        }
      }
      weekly_challenges: {
        Row: {
          id: string
          user_id: string
          app_name: string
          daily_limit: number
          week_start: string
          week_end: string
          days_completed: number
          status: 'active' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app_name: string
          daily_limit: number
          week_start: string
          week_end: string
          days_completed?: number
          status?: 'active' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app_name?: string
          daily_limit?: number
          week_start?: string
          week_end?: string
          days_completed?: number
          status?: 'active' | 'completed' | 'failed'
          created_at?: string
        }
      }
      child_profiles: {
        Row: {
          id: string
          parent_user_id: string
          child_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          parent_user_id: string
          child_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_user_id?: string
          child_user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_usage: {
        Args: {
          p_user_id: string
          p_app_name: string
          p_date?: string
        }
        Returns: number
      }
      has_active_lock: {
        Args: {
          p_user_id: string
          p_app_name: string
        }
        Returns: boolean
      }
      get_compliance_percentage: {
        Args: {
          p_user_id: string
          p_days?: number
        }
        Returns: number
      }
      award_badge: {
        Args: {
          p_user_id: string
          p_badge_id: string
        }
        Returns: boolean
      }
      get_worst_performing_app: {
        Args: {
          p_user_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          app_name: string
          override_count: number
        }[]
      }
      check_streak_badges: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      check_pomodoro_badge: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for common use cases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type LockRule = Database['public']['Tables']['lock_rules']['Row']
export type OverrideLog = Database['public']['Tables']['override_logs']['Row']
export type UsageSession = Database['public']['Tables']['usage_sessions']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type BadgeDefinition = Database['public']['Tables']['badge_definitions']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type Buddy = Database['public']['Tables']['buddies']['Row']
export type BuddyNotification = Database['public']['Tables']['buddy_notifications']['Row']
export type PomodoroSession = Database['public']['Tables']['pomodoro_sessions']['Row']
export type WeeklyChallenge = Database['public']['Tables']['weekly_challenges']['Row']
export type ChildProfile = Database['public']['Tables']['child_profiles']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type LockRuleInsert = Database['public']['Tables']['lock_rules']['Insert']
export type OverrideLogInsert = Database['public']['Tables']['override_logs']['Insert']
export type UsageSessionInsert = Database['public']['Tables']['usage_sessions']['Insert']
export type WeeklyChallengeInsert = Database['public']['Tables']['weekly_challenges']['Insert']
export type PomodoroSessionInsert = Database['public']['Tables']['pomodoro_sessions']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type LockRuleUpdate = Database['public']['Tables']['lock_rules']['Update']

// Enum types
export type LockType = 'timer' | 'schedule' | 'until_date' | 'nuclear'
export type Mood = 'bored' | 'stressed' | 'tired' | 'news' | 'other'
export type BuddyStatus = 'pending' | 'active' | 'removed'
export type NotificationEventType = 'override' | 'streak_broken' | 'weekly_summary'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type ChallengeStatus = 'active' | 'completed' | 'failed'
