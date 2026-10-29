import {
  DEFAULT_SCORING_WEIGHTS,
  ScoringWeights,
} from './adaptive/score-attempt';
import {
  DEFAULT_REVIEW_SCHEDULE_CONFIG,
  ReviewScheduleConfig,
} from './adaptive/schedule-review';
import {
  DEFAULT_PROGRESSION_CONFIG,
  ProgressionConfig,
} from './adaptive/select-next-question';

export interface UserSettings {
  weights: ScoringWeights;
  schedule: ReviewScheduleConfig;
  progression: ProgressionConfig;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  weights: DEFAULT_SCORING_WEIGHTS,
  schedule: DEFAULT_REVIEW_SCHEDULE_CONFIG,
  progression: DEFAULT_PROGRESSION_CONFIG,
};

export const SETTINGS_STORAGE_KEY = 'dsa_coach_user_settings';

export function getLocalSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      weights: { ...DEFAULT_USER_SETTINGS.weights, ...(parsed.weights || {}) },
      schedule: { ...DEFAULT_USER_SETTINGS.schedule, ...(parsed.schedule || {}) },
      progression: { ...DEFAULT_USER_SETTINGS.progression, ...(parsed.progression || {}) },
    };
  } catch (e) {
    console.warn('Failed to parse settings from localStorage:', e);
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveLocalSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}
