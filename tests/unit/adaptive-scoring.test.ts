import { describe, it, expect } from 'vitest';
import { scoreAttempt } from '@/lib/adaptive/score-attempt';
import { scheduleReview } from '@/lib/adaptive/schedule-review';
import { evaluateTopicMastery } from '@/lib/adaptive/topic-mastery';
import { IAttempt, IQuestion, IQuestionProgress } from '@/lib/types';

describe('Phase 4: Adaptive Personal Difficulty & Revision Scheduling', () => {
  const fixedNow = new Date('2026-10-29T12:00:00Z');

  it('Scenario 1: Cold start does not penalize a first attempt (redistributes weights)', () => {
    // First attempt, no prior progress
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: new Date(fixedNow.getTime() + 450 * 1000), // 7.5 mins (fast, expected is 15 min)
      activeTimeSeconds: 450,
      runCount: 2,
      failedSubmissionCount: 0,
      hintsUsed: 0,
      solutionRevealed: false,
      result: 'Accepted',
      testsPassed: 5,
      testsTotal: 5,
      errorType: 'none',
      isIndependent: true,
    };

    const result = scoreAttempt(attempt, 900, null);

    // Missing retention signal must NOT pull the score down to zero
    expect(result.signals.hasRetention).toBe(false);
    expect(result.signals.retentionScore).toBeNull();
    expect(result.attemptScore).toBeGreaterThanOrEqual(90);
    expect(result.newMasteryScore).toBeGreaterThanOrEqual(90);
    expect(result.status).toBe('Familiar'); // Single accepted solve reaches Familiar
  });

  it('Scenario 2: Solution-revealed attempt does NOT count as independent mastery', () => {
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 300,
      runCount: 1,
      failedSubmissionCount: 0,
      hintsUsed: 0,
      solutionRevealed: true, // Revealed full solution!
      result: 'Accepted',
      testsPassed: 5,
      testsTotal: 5,
      errorType: 'none',
      isIndependent: false,
    };

    const result = scoreAttempt(attempt, 900, null);

    // Mastery is capped significantly
    expect(result.signals.independenceScore).toBeLessThanOrEqual(10);
    expect(result.newMasteryScore).toBeLessThanOrEqual(45);
    expect(result.status).not.toBe('Mastered');
    expect(result.explanation).toContain('marked as non-independent');

    // Review schedule should be set to 1 day
    const review = scheduleReview(attempt, null, fixedNow);
    expect(review.intervalDays).toBe(1);
    expect(review.reason).toContain('Solution was revealed');
  });

  it('Scenario 3: Failed attempt increases revision priority (1 day review)', () => {
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 600,
      runCount: 3,
      failedSubmissionCount: 2,
      hintsUsed: 0,
      solutionRevealed: false,
      result: 'Wrong Answer',
      testsPassed: 2,
      testsTotal: 5,
      errorType: 'algorithmic_misunderstanding',
      isIndependent: false,
    };

    const review = scheduleReview(attempt, null, fixedNow);
    expect(review.intervalDays).toBe(1);
    expect(review.nextReviewAt.getTime()).toBe(
      fixedNow.getTime() + 1 * 24 * 60 * 60 * 1000
    );
  });

  it('Scenario 4: Repeated independent success reduces revision frequency to 14-30 days', () => {
    const priorProgress: IQuestionProgress = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      attemptCount: 2,
      acceptedCount: 2,
      masteryScore: 88,
      recallEstimate: 1.0,
      status: 'Mastered',
      firstSolvedAt: new Date('2026-10-01T12:00:00Z'),
      lastAttemptAt: new Date('2026-10-15T12:00:00Z'),
      nextReviewAt: fixedNow,
    };

    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 400,
      runCount: 1,
      failedSubmissionCount: 0,
      hintsUsed: 0,
      solutionRevealed: false,
      result: 'Accepted',
      testsPassed: 5,
      testsTotal: 5,
      errorType: 'none',
      isIndependent: true,
    };

    const review = scheduleReview(attempt, priorProgress, fixedNow);
    expect(review.intervalDays).toBeGreaterThanOrEqual(14);
    expect(review.reason).toContain('Consistently solved');
  });

  it('Scenario 5: A previously mastered question returns to review queue after a poor reattempt', () => {
    const masteredProgress: IQuestionProgress = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      attemptCount: 3,
      acceptedCount: 3,
      masteryScore: 92,
      recallEstimate: 1.0,
      status: 'Mastered',
      firstSolvedAt: new Date('2026-09-01T12:00:00Z'),
      lastAttemptAt: new Date('2026-10-01T12:00:00Z'),
      nextReviewAt: fixedNow,
    };

    // User revisits after a month, but fails!
    const failedAttempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 1200,
      runCount: 4,
      failedSubmissionCount: 3,
      hintsUsed: 1,
      solutionRevealed: false,
      result: 'Wrong Answer',
      testsPassed: 1,
      testsTotal: 5,
      errorType: 'algorithmic_misunderstanding',
      isIndependent: false,
    };

    const result = scoreAttempt(failedAttempt, 900, masteredProgress);
    expect(result.newMasteryScore).toBeLessThan(masteredProgress.masteryScore);
    expect(result.status).not.toBe('Mastered');

    const review = scheduleReview(failedAttempt, masteredProgress, fixedNow);
    expect(review.intervalDays).toBe(1); // Back in queue immediately!
  });

  it('Scenario 6: Outlier protection prevents a single unusually difficult problem from destroying topic mastery', () => {
    const topicQuestions: IQuestion[] = [
      {
        canonicalId: 'q1',
        slug: 'q1',
        title: 'Q1',
        officialDifficulty: 'Easy',
        topicTags: ['Arrays & Hashing'],
        blind75: true,
        neetcode150: true,
        officialUrl: 'https://example.com',
        starterCode: '',
        description: '',
        authorizedExamples: [],
        sampleTestCases: [],
        expectedSolvingTimeSeconds: 600,
        isActive: true,
      },
      {
        canonicalId: 'q2',
        slug: 'q2',
        title: 'Q2',
        officialDifficulty: 'Easy',
        topicTags: ['Arrays & Hashing'],
        blind75: true,
        neetcode150: true,
        officialUrl: 'https://example.com',
        starterCode: '',
        description: '',
        authorizedExamples: [],
        sampleTestCases: [],
        expectedSolvingTimeSeconds: 600,
        isActive: true,
      },
      {
        canonicalId: 'q3',
        slug: 'q3',
        title: 'Q3',
        officialDifficulty: 'Easy',
        topicTags: ['Arrays & Hashing'],
        blind75: true,
        neetcode150: true,
        officialUrl: 'https://example.com',
        starterCode: '',
        description: '',
        authorizedExamples: [],
        sampleTestCases: [],
        expectedSolvingTimeSeconds: 600,
        isActive: true,
      },
      {
        canonicalId: 'q4',
        slug: 'q4',
        title: 'Q4',
        officialDifficulty: 'Easy',
        topicTags: ['Arrays & Hashing'],
        blind75: true,
        neetcode150: true,
        officialUrl: 'https://example.com',
        starterCode: '',
        description: '',
        authorizedExamples: [],
        sampleTestCases: [],
        expectedSolvingTimeSeconds: 600,
        isActive: true,
      },
    ];

    // 3 high scores (85, 90, 85) and 1 brutal outlier (10)
    const progressMap = new Map<string, IQuestionProgress>([
      ['q1', { questionId: 'q1', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['q2', { questionId: 'q2', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 90, recallEstimate: 1, status: 'Mastered', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['q3', { questionId: 'q3', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['q4', { questionId: 'q4', selectedList: 'blind75', attemptCount: 1, acceptedCount: 0, masteryScore: 10, recallEstimate: 0.2, status: 'Needs Practice', firstSolvedAt: null, lastAttemptAt: fixedNow, nextReviewAt: null }],
    ]);

    const summary = evaluateTopicMastery('Arrays & Hashing', topicQuestions, progressMap);
    // Trimmed average drops the 10 outlier: (85 + 90 + 85) / 3 = 87
    expect(summary.averageMastery).toBeGreaterThanOrEqual(80);
    expect(summary.isWeak).toBe(false);
  });
});
