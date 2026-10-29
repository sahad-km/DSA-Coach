import {
  IAttempt,
  IQuestionProgress,
  ProgressStatus,
  SubmissionResult,
} from '@/lib/types';

export interface ScoringWeights {
  timeWeight: number;
  independenceWeight: number;
  failedSubmissionsWeight: number;
  retentionWeight: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  timeWeight: 0.30,
  independenceWeight: 0.30,
  failedSubmissionsWeight: 0.20,
  retentionWeight: 0.20,
};

export interface ScoreSignals {
  timeScore: number;
  independenceScore: number;
  submissionScore: number;
  retentionScore: number | null;
  hasRetention: boolean;
}

export interface ScoreResult {
  attemptScore: number; // 0 - 100
  newMasteryScore: number; // 0 - 100
  status: ProgressStatus;
  recallEstimate: number; // 0.0 - 1.0
  signals: ScoreSignals;
  explanation: string;
}

/**
 * Calculates normalized signal scores from an attempt
 */
export function calculateSignals(
  attempt: IAttempt,
  expectedSolvingTimeSeconds: number,
  previousProgress: IQuestionProgress | null
): ScoreSignals {
  const isAccepted = attempt.result === 'Accepted';

  // 1. Time Score (30%)
  // Compare active solving time against expected solving time
  let timeScore = 50;
  if (!isAccepted) {
    timeScore = 20; // Incomplete attempts receive a low base time score
  } else {
    const timeRatio = attempt.activeTimeSeconds / Math.max(60, expectedSolvingTimeSeconds);
    if (timeRatio <= 0.6) {
      timeScore = 100; // Fast and confident
    } else if (timeRatio <= 1.0) {
      // 100 down to 80 linearly
      timeScore = Math.round(100 - (timeRatio - 0.6) * 50);
    } else if (timeRatio <= 2.0) {
      // 80 down to 40 linearly
      timeScore = Math.round(80 - (timeRatio - 1.0) * 40);
    } else {
      timeScore = 30; // Significantly slower than target
    }
  }

  // 2. Independence Score (30%)
  let independenceScore = 0;
  if (!isAccepted) {
    independenceScore = attempt.solutionRevealed ? 0 : 20;
  } else if (attempt.solutionRevealed) {
    // Correct answer that required revealing full solution must not count as independent mastery
    independenceScore = 10;
  } else if (attempt.hintsUsed === 0) {
    independenceScore = 100; // 100% independent
  } else if (attempt.hintsUsed === 1) {
    independenceScore = 65; // Minor hint
  } else {
    independenceScore = 40; // Multiple hints
  }

  // 3. Failed Submissions Score (20%)
  let submissionScore = 100;
  if (!isAccepted) {
    submissionScore = Math.max(10, 50 - attempt.failedSubmissionCount * 10);
  } else {
    // If failed submissions were simple implementation typos (syntax/runtime), do not double-penalize
    const failurePenalty = attempt.errorType === 'implementation_mistake' ? 8 : 15;
    submissionScore = Math.max(25, 100 - attempt.failedSubmissionCount * failurePenalty);
  }

  // 4. Retention Score (20%)
  // Only valid if question was solved previously and revisited
  let retentionScore: number | null = null;
  let hasRetention = false;

  if (previousProgress && previousProgress.firstSolvedAt && previousProgress.acceptedCount > 0) {
    hasRetention = true;
    if (isAccepted) {
      if (attempt.solutionRevealed) {
        retentionScore = 25; // Forgot and needed full solution
      } else if (attempt.hintsUsed > 0) {
        retentionScore = 60; // Needed minor reminder
      } else {
        retentionScore = 100; // Retained knowledge independently
      }
    } else {
      // Failed a previously mastered/solved problem
      retentionScore = 15;
    }
  }

  return {
    timeScore,
    independenceScore,
    submissionScore,
    retentionScore,
    hasRetention,
  };
}

/**
 * Combines normalized signals into an attempt score and updates mastery
 */
export function scoreAttempt(
  attempt: IAttempt,
  expectedSolvingTimeSeconds: number,
  previousProgress: IQuestionProgress | null,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoreResult {
  const signals = calculateSignals(attempt, expectedSolvingTimeSeconds, previousProgress);

  let attemptScore = 0;

  if (signals.hasRetention && signals.retentionScore !== null) {
    // Standard weighted combination with all 4 signals
    attemptScore = Math.round(
      signals.timeScore * weights.timeWeight +
      signals.independenceScore * weights.independenceWeight +
      signals.submissionScore * weights.failedSubmissionsWeight +
      signals.retentionScore * weights.retentionWeight
    );
  } else {
    // Cold start: redistribute available weights proportionally so missing retention is not treated as zero
    const availableWeightTotal = weights.timeWeight + weights.independenceWeight + weights.failedSubmissionsWeight;
    const adjustedTimeWeight = weights.timeWeight / availableWeightTotal;
    const adjustedIndepWeight = weights.independenceWeight / availableWeightTotal;
    const adjustedSubWeight = weights.failedSubmissionsWeight / availableWeightTotal;

    attemptScore = Math.round(
      signals.timeScore * adjustedTimeWeight +
      signals.independenceScore * adjustedIndepWeight +
      signals.submissionScore * adjustedSubWeight
    );
  }

  // Clamp attempt score
  attemptScore = Math.max(0, Math.min(100, attemptScore));

  // Compute updated mastery score
  let newMasteryScore = attemptScore;
  let recallEstimate = 1.0;

  if (previousProgress && previousProgress.attemptCount > 0) {
    const prevMastery = previousProgress.masteryScore;

    if (attempt.result === 'Accepted') {
      if (attempt.solutionRevealed) {
        // Solution revealed caps mastery at 45
        newMasteryScore = Math.min(45, Math.round(prevMastery * 0.5 + attemptScore * 0.5));
      } else {
        // Blended moving average: 40% historical + 60% current attempt
        newMasteryScore = Math.round(prevMastery * 0.4 + attemptScore * 0.6);
      }
    } else {
      // Failed attempt: lower mastery estimate by 15-25 points without dropping to zero
      newMasteryScore = Math.max(15, Math.round(prevMastery * 0.7));
    }
  } else if (attempt.solutionRevealed) {
    newMasteryScore = Math.min(30, attemptScore);
  }

  newMasteryScore = Math.max(0, Math.min(100, newMasteryScore));

  // Compute recall estimate (0.0 to 1.0)
  if (attempt.result === 'Accepted') {
    recallEstimate = attempt.solutionRevealed ? 0.35 : attempt.hintsUsed > 0 ? 0.7 : 0.95;
  } else {
    recallEstimate = 0.25;
  }

  // Transparent status mapping
  let status: ProgressStatus = 'Learning';
  const totalAccepted = (previousProgress?.acceptedCount || 0) + (attempt.result === 'Accepted' ? 1 : 0);

  if (newMasteryScore >= 85 && totalAccepted >= 2) {
    status = 'Mastered';
  } else if (newMasteryScore >= 70 && totalAccepted >= 1) {
    status = 'Familiar';
  } else if (newMasteryScore >= 50) {
    status = 'Learning';
  } else {
    status = 'Needs Practice';
  }

  // Explainable description
  let explanation = '';
  if (attempt.result === 'Accepted') {
    if (attempt.solutionRevealed) {
      explanation = 'Solution revealed: Answer accepted, but marked as non-independent (score capped). Scheduled for review tomorrow.';
    } else if (attempt.hintsUsed > 0) {
      explanation = `Accepted with assistance (${attempt.hintsUsed} hint${attempt.hintsUsed === 1 ? '' : 's'}). Mastery increased to ${newMasteryScore}/100.`;
    } else if (signals.timeScore >= 80) {
      explanation = `Solved independently and quickly! Strong algorithmic mastery (${newMasteryScore}/100).`;
    } else {
      explanation = `Solved independently with steady execution. Personal mastery is now ${newMasteryScore}/100.`;
    }
  } else {
    explanation = `Submission was not accepted (${attempt.result}). Personal difficulty adjusted; scheduled for targeted practice.`;
  }

  return {
    attemptScore,
    newMasteryScore,
    status,
    recallEstimate,
    signals,
    explanation,
  };
}
