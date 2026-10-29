import {
  Difficulty,
  IAttempt,
  IQuestion,
  IQuestionProgress,
  TopicProgressSummary,
} from '@/lib/types';

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  solvedToday: number;
  attemptedToday: number;
  activeSecondsToday: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  activeDaysLast30: string[]; // List of YYYY-MM-DD strings
}

export interface RevisionQueueItem {
  question: IQuestion;
  progress: IQuestionProgress;
  isOverdue: boolean;
  dueInDays: number; // negative if overdue
  dueDescription: string;
}

export interface DifficultyBreakdown {
  easy: { solved: number; total: number };
  medium: { solved: number; total: number };
  hard: { solved: number; total: number };
}

/**
 * Normalizes a date to YYYY-MM-DD in local time
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current streak, best streak, and today's activity from attempts
 */
export function calculateStreak(
  attempts: IAttempt[],
  now: Date = new Date()
): StreakStats {
  if (attempts.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      solvedToday: 0,
      attemptedToday: 0,
      activeSecondsToday: 0,
      lastActiveDate: null,
      activeDaysLast30: [],
    };
  }

  const todayStr = toLocalDateString(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = toLocalDateString(yesterday);

  // Group attempts by date
  const dateMap = new Map<string, { attempts: number; solves: number; seconds: number }>();

  for (const att of attempts) {
    const d = new Date(att.completedAt || att.startedAt);
    const dateStr = toLocalDateString(d);

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { attempts: 0, solves: 0, seconds: 0 });
    }
    const entry = dateMap.get(dateStr)!;
    entry.attempts++;
    if (att.result === 'Accepted') {
      entry.solves++;
    }
    entry.seconds += att.activeTimeSeconds || 0;
  }

  const todayEntry = dateMap.get(todayStr);
  const solvedToday = todayEntry ? todayEntry.solves : 0;
  const attemptedToday = todayEntry ? todayEntry.attempts : 0;
  const activeSecondsToday = todayEntry ? todayEntry.seconds : 0;

  // Sorted unique active dates (most recent first)
  const uniqueDates = Array.from(dateMap.keys()).sort().reverse();
  const lastActiveDate = uniqueDates.length > 0 ? uniqueDates[0] : null;

  // Filter 30-day window
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = toLocalDateString(thirtyDaysAgo);
  const activeDaysLast30 = uniqueDates.filter((d) => d >= thirtyDaysAgoStr);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(now);

  // If user hasn't solved today yet, check if they solved yesterday to maintain streak
  if (!dateMap.has(todayStr)) {
    if (dateMap.has(yesterdayStr)) {
      checkDate = yesterday;
    } else {
      // Streak broken
      checkDate = new Date(0);
    }
  }

  if (checkDate.getTime() > 0) {
    while (true) {
      const dStr = toLocalDateString(checkDate);
      if (dateMap.has(dStr)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  // Calculate best streak across all history
  // Sort ascending for forward scan
  const ascendingDates = [...uniqueDates].reverse();
  let bestStreak = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dateStr of ascendingDates) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const currDate = new Date(year, month - 1, day);

    if (prevDate) {
      const diffMs = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    } else {
      currentRun = 1;
    }

    if (currentRun > bestStreak) {
      bestStreak = currentRun;
    }
    prevDate = currDate;
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    solvedToday,
    attemptedToday,
    activeSecondsToday,
    lastActiveDate,
    activeDaysLast30,
  };
}

/**
 * Builds the prioritized spaced revision queue
 */
export function getRevisionQueue(
  questions: IQuestion[],
  progressMap: Map<string, IQuestionProgress>,
  now: Date = new Date()
): RevisionQueueItem[] {
  const queue: RevisionQueueItem[] = [];

  for (const q of questions) {
    const prog = progressMap.get(q.canonicalId);
    if (!prog || !prog.nextReviewAt) continue;

    const reviewDate = new Date(prog.nextReviewAt);
    const diffMs = reviewDate.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    const isOverdue = diffMs <= 0;

    let dueDescription = '';
    if (isOverdue) {
      const overdueDays = Math.abs(diffDays);
      dueDescription =
        overdueDays === 0
          ? 'Due today'
          : `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
    } else {
      dueDescription =
        diffDays === 0
          ? 'Due today'
          : `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    }

    queue.push({
      question: q,
      progress: prog,
      isOverdue,
      dueInDays: diffDays,
      dueDescription,
    });
  }

  // Sort queue: overdue items first (most overdue first), then upcoming items (soonest first)
  return queue.sort((a, b) => {
    const aTime = new Date(a.progress.nextReviewAt!).getTime();
    const bTime = new Date(b.progress.nextReviewAt!).getTime();
    return aTime - bTime;
  });
}

/**
 * Identifies weakest and strongest topics
 */
export function getTopicStrengthsAndWeaknesses(
  topicSummaries: TopicProgressSummary[]
): {
  weakestTopics: TopicProgressSummary[];
  strongestTopics: TopicProgressSummary[];
} {
  // Only evaluate topics that have been attempted
  const attemptedTopics = topicSummaries.filter((t) => t.solvedQuestions > 0 || t.averageMastery > 0);

  const sorted = [...attemptedTopics].sort((a, b) => a.averageMastery - b.averageMastery);

  // Weakest: mastery < 65 or lowest 3
  const weakestTopics = sorted.filter((t) => t.averageMastery < 65).slice(0, 3);
  // Strongest: mastery >= 75 or top 3
  const strongestTopics = [...sorted].reverse().filter((t) => t.averageMastery >= 75).slice(0, 3);

  return {
    weakestTopics,
    strongestTopics,
  };
}

/**
 * Calculates difficulty breakdown (solved vs total)
 */
export function getDifficultyBreakdown(
  questions: IQuestion[],
  progressMap: Map<string, IQuestionProgress>
): DifficultyBreakdown {
  const breakdown: DifficultyBreakdown = {
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
  };

  for (const q of questions) {
    const diffKey = q.officialDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
    if (!breakdown[diffKey]) continue;

    breakdown[diffKey].total++;
    const prog = progressMap.get(q.canonicalId);
    if (prog && prog.acceptedCount > 0) {
      breakdown[diffKey].solved++;
    }
  }

  return breakdown;
}
