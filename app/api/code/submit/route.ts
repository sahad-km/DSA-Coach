import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { IQuestion, QuestionListType } from '@/lib/types';
import {
  extractFunctionName,
  generateTestHarnessScript,
  TestCase,
} from '@/lib/test-harness';
import { executeHarness } from '@/lib/judge0';

import { persistAttempt } from '@/lib/attempt-tracking';
import { scoreAttempt } from '@/lib/adaptive/score-attempt';
import { scheduleReview } from '@/lib/adaptive/schedule-review';
import { QuestionProgress } from '@/models/QuestionProgress';
import { IQuestionProgress } from '@/lib/types';

const SubmitCodeSchema = z.object({
  slug: z.string().min(1),
  code: z.string().min(1, 'Code cannot be empty'),
  selectedList: z.enum(['blind75', 'neetcode150']).default('blind75'),
  startedAt: z.string().optional(),
  activeTimeSeconds: z.number().int().min(0).default(0),
  runCount: z.number().int().min(0).default(0),
  failedSubmissionCount: z.number().int().min(0).default(0),
  hintsUsed: z.number().int().min(0).default(0),
  solutionRevealed: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SubmitCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { slug, code, selectedList } = parsed.data;

    let question: IQuestion | null = null;
    try {
      await connectToDatabase();
      const dbQ = await Question.findOne({ slug }).lean();
      if (dbQ) question = dbQ as unknown as IQuestion;
    } catch (e) {
      console.warn('MongoDB query failed, using local catalogue fallback:', e);
    }

    if (!question) {
      const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
      if (fs.existsSync(cataloguePath)) {
        const raw = fs.readFileSync(cataloguePath, 'utf-8');
        const questions: IQuestion[] = JSON.parse(raw);
        question = questions.find((q) => q.slug === slug) || null;
      }
    }

    if (!question) {
      return NextResponse.json({ success: false, error: 'Problem not found' }, { status: 404 });
    }

    const functionName =
      extractFunctionName(question.starterCode) || extractFunctionName(code) || 'solution';

    // 1. Gather visible sample test cases
    const fullTestSuite: TestCase[] = question.sampleTestCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expected: tc.expected,
      rawInputStr: tc.rawInputStr,
      isSample: true,
    }));

    // 2. Load hidden evaluation test cases from server-side repository
    const evalPath = path.resolve(process.cwd(), 'data/evaluation-tests.json');
    if (fs.existsSync(evalPath)) {
      try {
        const evalJson = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
        const extraTests: Array<{ id: string; input: unknown[]; expected: unknown }> =
          evalJson[question.canonicalId] || [];

        for (const et of extraTests) {
          // Avoid duplicate IDs if sample tests overlap
          if (!fullTestSuite.some((t) => t.id === et.id)) {
            fullTestSuite.push({
              id: et.id,
              input: et.input,
              expected: et.expected,
              isSample: false,
            });
          }
        }
      } catch (err) {
        console.error('Error loading evaluation tests:', err);
      }
    }

    // 3. Build and execute test harness in evaluation mode
    const harnessScript = generateTestHarnessScript(code, functionName, fullTestSuite, true);
    const rawOutcome = await executeHarness(harnessScript);

    // 4. Critical Security Rule: Never leak hidden expected outputs or inputs to the browser!
    const sanitizedResults = rawOutcome.results.map((r) => {
      if (r.isSample) {
        return r; // Sample tests can show input/expected/actual
      }
      return {
        id: r.id,
        passed: r.passed,
        isSample: false,
        errorMessage: r.errorMessage,
        executionTimeMs: r.executionTimeMs,
        // Omit input, expected, and actual for evaluation tests!
      };
    });

    const sanitizedOutcome = {
      ...rawOutcome,
      results: sanitizedResults,
    };

    // 5. Automatically track and persist attempt learning signals
    const startedAtDate = parsed.data.startedAt
      ? new Date(parsed.data.startedAt)
      : new Date(Date.now() - parsed.data.activeTimeSeconds * 1000);
    const completedAtDate = new Date();

    const savedAttempt = await persistAttempt({
      questionId: question.canonicalId,
      selectedList: parsed.data.selectedList,
      startedAt: startedAtDate,
      completedAt: completedAtDate,
      activeTimeSeconds: parsed.data.activeTimeSeconds,
      runCount: parsed.data.runCount,
      failedSubmissionCount: parsed.data.failedSubmissionCount,
      hintsUsed: parsed.data.hintsUsed,
      solutionRevealed: parsed.data.solutionRevealed,
      result: sanitizedOutcome.status,
      testsPassed: sanitizedOutcome.passedTests,
      testsTotal: sanitizedOutcome.totalTests,
      codeSnapshot: code,
    });

    // 6. Compute Adaptive Personal Mastery & Spaced Revision Schedule
    let prevProgress: IQuestionProgress | null = null;
    try {
      await connectToDatabase();
      const existingProg = await QuestionProgress.findOne({
        questionId: question.canonicalId,
        selectedList: parsed.data.selectedList,
      }).lean();
      if (existingProg) {
        prevProgress = existingProg as unknown as IQuestionProgress;
      }
    } catch (dbErr) {
      console.warn('Failed to fetch existing progress for adaptive scoring:', dbErr);
    }

    const scoreResult = scoreAttempt(
      savedAttempt,
      question.expectedSolvingTimeSeconds,
      prevProgress
    );

    const reviewResult = scheduleReview(
      savedAttempt,
      prevProgress,
      completedAtDate
    );

    // Synchronize QuestionProgress with adaptive mastery and scheduled review
    try {
      const isAccepted = sanitizedOutcome.status === 'Accepted';
      const progressUpdate: Record<string, unknown> = {
        $set: {
          masteryScore: scoreResult.newMasteryScore,
          recallEstimate: scoreResult.recallEstimate,
          status: scoreResult.status,
          nextReviewAt: reviewResult.nextReviewAt,
          lastAttemptAt: completedAtDate,
        },
      };

      if (isAccepted && (!prevProgress || !prevProgress.firstSolvedAt)) {
        (progressUpdate.$set as Record<string, unknown>).firstSolvedAt = completedAtDate;
      }

      await QuestionProgress.findOneAndUpdate(
        { questionId: question.canonicalId, selectedList: parsed.data.selectedList },
        progressUpdate,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (syncErr) {
      console.warn('Failed to sync adaptive progress to database:', syncErr);
    }

    return NextResponse.json({
      success: true,
      selectedList,
      questionId: question.canonicalId,
      outcome: sanitizedOutcome,
      attempt: savedAttempt,
      score: scoreResult,
      review: reviewResult,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/code/submit:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Submission failed', message: errorMsg },
      { status: 500 }
    );
  }
}
