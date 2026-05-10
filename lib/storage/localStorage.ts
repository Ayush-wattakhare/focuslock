/**
 * Local Storage Utility for FocusLock
 * 
 * Handles data storage when users are not logged in.
 * Data is stored locally and can be synced to Supabase when user signs in.
 */

const STORAGE_PREFIX = 'focuslock_';

export interface LocalLockRule {
  id: string;
  app_name: string;
  app_icon_url?: string;
  lock_type: 'timer' | 'schedule' | 'until_date' | 'nuclear';
  daily_limit_minutes?: number;
  schedule_start?: string;
  schedule_end?: string;
  schedule_days?: string[];
  unlock_date?: string;
  hide_from_home: boolean;
  hide_from_search: boolean;
  strict_mode: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalStreak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface LocalOverrideLog {
  id: string;
  lock_rule_id: string;
  app_name: string;
  mood: 'bored' | 'stressed' | 'tired' | 'news' | 'other';
  reason_text?: string;
  overridden_at: string;
}

// Generic storage functions
function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
}

// Lock Rules
export function getLockRules(): LocalLockRule[] {
  return getItem<LocalLockRule[]>('lock_rules') || [];
}

export function saveLockRule(rule: LocalLockRule): void {
  const rules = getLockRules();
  const existingIndex = rules.findIndex(r => r.id === rule.id);
  
  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }
  
  setItem('lock_rules', rules);
}

export function deleteLockRule(ruleId: string): void {
  const rules = getLockRules().filter(r => r.id !== ruleId);
  setItem('lock_rules', rules);
}

// Streak
export function getStreak(): LocalStreak {
  return getItem<LocalStreak>('streak') || {
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
  };
}

export function saveStreak(streak: LocalStreak): void {
  setItem('streak', streak);
}

// Override Logs
export function getOverrideLogs(): LocalOverrideLog[] {
  return getItem<LocalOverrideLog[]>('override_logs') || [];
}

export function saveOverrideLog(log: LocalOverrideLog): void {
  const logs = getOverrideLogs();
  logs.push(log);
  setItem('override_logs', logs);
}

// Usage Sessions
export interface LocalUsageSession {
  id: string;
  app_name: string;
  session_start: string;
  session_end?: string;
  minutes_used?: number;
  date: string;
}

export function getUsageSessions(): LocalUsageSession[] {
  return getItem<LocalUsageSession[]>('usage_sessions') || [];
}

export function saveUsageSession(session: LocalUsageSession): void {
  const sessions = getUsageSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  
  setItem('usage_sessions', sessions);
}

// Clear all local data (for logout or sync)
export function clearAllLocalData(): void {
  if (typeof window === 'undefined') return;
  
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith(STORAGE_PREFIX)
  );
  
  keys.forEach(key => localStorage.removeItem(key));
}

// Check if user has local data
export function hasLocalData(): boolean {
  const rules = getLockRules();
  const logs = getOverrideLogs();
  const sessions = getUsageSessions();
  
  return rules.length > 0 || logs.length > 0 || sessions.length > 0;
}

// Export all local data for sync
export function exportLocalData() {
  return {
    lock_rules: getLockRules(),
    override_logs: getOverrideLogs(),
    usage_sessions: getUsageSessions(),
    streak: getStreak(),
  };
}
