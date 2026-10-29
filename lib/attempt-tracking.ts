import { AttemptErrorType, IAttempt, SubmissionResult } from './types';
import { connectToDatabase } from './db';
import { Attempt } from '@/models/Attempt';
import { QuestionProgress } from '@/models/QuestionProgress';

/**
 * Distinguishes between an execution error caused by a simple implementation mistake
 * and a failure that indicates a misunderstanding of the algorithm.
 */
export function classifyErrorType(result: SubmissionResult): AttemptErrorType {
  if (result === 'Accepted') {
    return 'none';
  }

  // Syntax and runtime crashes indicate syntax typos or undefined references
  if (result === 'Compilation Error' || result === 'Runtime Error') {
    return 'implementation_mistake';
  }

  // Wrong output or algorithmic timeouts indicate algorithmic misunderstanding
  if (result === 'Wrong Answer' || result === 'Time Limit Exceeded') {
    return 'algorithmic_misunderstanding';
  }

  return 'none';
}

/**
 * Determines whether the solution was solved independently
 */
export function calculateIndependence(
  result: SubmissionResult,
  hintsUsed: number,
  solutionRevealed: boolean
): boolean {
  if (result !== 'Accepted') return false;
  if (solutionRevealed) return false;
  if (hintsUsed > 0) return false;
  return true;
}

export interface SaveAttemptParams {
  questionId: string;
  selectedList: 'blind75' | 'neetcode150';
  startedAt: Date;
  completedAt: Date;
  activeTimeSeconds: number;
  runCount: number;
  failedSubmissionCount: number;
  hintsUsed: number;
  solutionRevealed: boolean;
  result: SubmissionResult;
  testsPassed: number;
  testsTotal: number;
  codeSnapshot?: string;
}

/**
 * Persists a completed attempt and synchronizes basic question progress
 */
export async function persistAttempt(params: SaveAttemptParams): Promise<IAttempt> {
  const errorType = classifyErrorType(params.result);
  const isIndependent = calculateIndependence(
    params.result,
    params.hintsUsed,
    params.solutionRevealed
  );

  const attemptData: IAttempt = {
    ...params,
    errorType,
    isIndependent,
    createdAt: new Date(),
  };

  try {
    await connectToDatabase();

    // 1. Save Attempt record
    const created = await Attempt.create(attemptData);

    // 2. Synchronize QuestionProgress
    const isAccepted = params.result === 'Accepted';
    const progressUpdate: Record<string, unknown> = {
      $inc: {
        attemptCount: 1,
        acceptedCount: isAccepted ? 1 : 0,
      },
      $set: {
        lastAttemptAt: params.completedAt,
      },
    };

    if (isAccepted) {
      // Set firstSolvedAt if not yet set
      const existing = await QuestionProgress.findOne({
        questionId: params.questionId,
        selectedList: params.selectedList,
      });

      if (!existing || !existing.firstSolvedAt) {
        progressUpdate.$set = {
          ...((progressUpdate.$set as Record<string, unknown>) || {}),
          firstSolvedAt: params.completedAt,
        };
      }
    }

    await QuestionProgress.findOneAndUpdate(
      { questionId: params.questionId, selectedList: params.selectedList },
      progressUpdate,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return created.toObject();
  } catch (err) {
    console.warn('Failed to persist attempt to MongoDB (using local object):', err);
    return attemptData;
  }
}
