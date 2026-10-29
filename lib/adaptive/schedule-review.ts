import { IAttempt, IQuestionProgress } from '@/lib/types';

export interface ReviewScheduleResult {
  nextReviewAt: Date;
  intervalDays: number;
  reason: string;
}

export interface ReviewScheduleConfig {
  failedOrRevealedDays: number;
  assistedDays: number;
  independentDifficultDays: number;
  independentComfortableDays: number;
  repeatedConfidentMinDays: number;
  repeatedConfidentMaxDays: number;
}

export const DEFAULT_REVIEW_SCHEDULE_CONFIG: ReviewScheduleConfig = {
  failedOrRevealedDays: 1,
  assistedDays: 2,
  independentDifficultDays: 4,
  independentComfortableDays: 7,
  repeatedConfidentMinDays: 14,
  repeatedConfidentMaxDays: 30,
};

/**
 * Calculates the next spaced revision timestamp based on performance signals
 */
export function scheduleReview(
  attempt: IAttempt,
  currentProgress: IQuestionProgress | null,
  now: Date = new Date(),
  config: ReviewScheduleConfig = DEFAULT_REVIEW_SCHEDULE_CONFIG
): ReviewScheduleResult {
  const isAccepted = attempt.result === 'Accepted';
  let intervalDays = config.failedOrRevealedDays;
  let reason = '';

  const totalAcceptedCount =
    (currentProgress?.acceptedCount || 0) + (isAccepted ? 1 : 0);
  const masteryScore = currentProgress?.masteryScore || 0;

  // 1. Failed or Solution-revealed: 1 day
  if (!isAccepted || attempt.solutionRevealed) {
    intervalDays = config.failedOrRevealedDays;
    reason = attempt.solutionRevealed
      ? 'Solution was revealed. Review scheduled in 1 day to verify independent recall.'
      : 'Attempt was not accepted. Review scheduled in 1 day to reinforce algorithmic pattern.';
  }
  // 2. Accepted with substantial assistance (hints used): 2 days
  else if (attempt.hintsUsed > 0) {
    intervalDays = config.assistedDays;
    reason = `Solved with ${attempt.hintsUsed} hint${attempt.hintsUsed === 1 ? '' : 's'}. Review scheduled in 2 days to test retention without clues.`;
  }
  // 3. Repeatedly solved confidently: 14–30 days
  else if (totalAcceptedCount >= 2 && masteryScore >= 80) {
    // Incrementally expand interval: 14 days on 2nd solve, 21 on 3rd, up to 30 max
    const bonusDays = Math.min(
      config.repeatedConfidentMaxDays - config.repeatedConfidentMinDays,
      (totalAcceptedCount - 2) * 7
    );
    intervalDays = config.repeatedConfidentMinDays + bonusDays;
    reason = `Consistently solved with high mastery (${masteryScore}/100). Long-term revision scheduled in ${intervalDays} days.`;
  }
  // 4. Independently solved comfortably (mastery >= 70, no hints, reasonable time): 7 days
  else if (masteryScore >= 70 || attempt.failedSubmissionCount <= 1) {
    intervalDays = config.independentComfortableDays;
    reason = `Independently solved comfortably. Review scheduled in 7 days to maintain recall.`;
  }
  // 5. Independently solved but with notable struggle/difficulty: 4 days
  else {
    intervalDays = config.independentDifficultDays;
    reason = `Independently solved with notable effort. Review scheduled in 4 days to reinforce fluency.`;
  }

  // Calculate nextReviewAt timestamp
  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    nextReviewAt,
    intervalDays,
    reason,
  };
}
