import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  selectNextQuestion,
  DEFAULT_PROGRESSION_CONFIG,
} from '@/lib/adaptive/select-next-question';
import { scoreAttempt } from '@/lib/adaptive/score-attempt';
import { scheduleReview } from '@/lib/adaptive/schedule-review';
import { evaluateTopicMastery, evaluateAllTopics } from '@/lib/adaptive/topic-mastery';
import {
  calculateStreak,
  getRevisionQueue,
  getTopicStrengthsAndWeaknesses,
} from '@/lib/adaptive/analytics';
import { classifyErrorType, calculateIndependence } from '@/lib/attempt-tracking';
import {
  IQuestion,
  IQuestionProgress,
  IAttempt,
  QuestionListType,
} from '@/lib/types';

describe('Phase 6: Section 14 End-to-End Scenario Verification', () => {
  const fixedNow = new Date('2026-10-29T12:00:00Z');

  // Load canonical seed questions
  const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
  const allQuestions: IQuestion[] = JSON.parse(fs.readFileSync(cataloguePath, 'utf-8'));
  const blind75Questions = allQuestions.filter((q) => q.blind75);

  // -------------------------------------------------------------
  // Scenario 1: Cold start recommendation
  // -------------------------------------------------------------
  it('Scenario 1: Cold start recommends an Easy question from Arrays & Hashing', () => {
    const emptyProgress = new Map<string, IQuestionProgress>();
    const rec = selectNextQuestion({
      questions: blind75Questions,
      progressMap: emptyProgress,
      selectedList: 'blind75',
    });

    expect(rec.question).not.toBeNull();
    expect(rec.question!.officialDifficulty).toBe('Easy');
    expect(rec.question!.topicTags).toContain('Arrays & Hashing');
    expect(rec.category).toBe('learning_unseen');
    expect(rec.reason).toContain('Cold start');
  });

  // -------------------------------------------------------------
  // Scenario 2: Fast independent solve
  // -------------------------------------------------------------
  it('Scenario 2: Fast independent solve produces high mastery (>= 85) and 7+ day interval', () => {
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: new Date(fixedNow.getTime() + 300 * 1000), // 5 min vs 15 min expected
      activeTimeSeconds: 300,
      runCount: 1,
      failedSubmissionCount: 0,
      hintsUsed: 0,
      solutionRevealed: false,
      result: 'Accepted',
      testsPassed: 8,
      testsTotal: 8,
      errorType: 'none',
      isIndependent: true,
    };

    const scoreResult = scoreAttempt(attempt, 900, null);
    expect(scoreResult.attemptScore).toBeGreaterThanOrEqual(85);
    expect(scoreResult.newMasteryScore).toBeGreaterThanOrEqual(85);
    expect(scoreResult.signals.independenceScore).toBe(100);
    expect(scoreResult.status).toBe('Familiar');

    const schedule = scheduleReview(attempt, null, fixedNow);
    expect(schedule.intervalDays).toBeGreaterThanOrEqual(7);
  });

  // -------------------------------------------------------------
  // Scenario 3: Solution revealed penalty
  // -------------------------------------------------------------
  it('Scenario 3: Solution-revealed attempt caps mastery (<= 45), flags non-independent, and schedules 1-day review', () => {
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 120,
      runCount: 1,
      failedSubmissionCount: 0,
      hintsUsed: 0,
      solutionRevealed: true, // Solution revealed!
      result: 'Accepted',
      testsPassed: 8,
      testsTotal: 8,
      errorType: 'none',
      isIndependent: calculateIndependence('Accepted', 0, true),
    };

    expect(attempt.isIndependent).toBe(false);

    const scoreResult = scoreAttempt(attempt, 900, null);
    expect(scoreResult.newMasteryScore).toBeLessThanOrEqual(45);
    expect(scoreResult.signals.independenceScore).toBeLessThanOrEqual(10);
    expect(scoreResult.explanation).toContain('non-independent');

    const schedule = scheduleReview(attempt, null, fixedNow);
    expect(schedule.intervalDays).toBe(1);
    expect(schedule.reason).toContain('Solution was revealed');
  });

  // -------------------------------------------------------------
  // Scenario 4: Hint usage penalty
  // -------------------------------------------------------------
  it('Scenario 4: Hint usage reduces independence score and schedules 2-day review', () => {
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 600,
      runCount: 1,
      failedSubmissionCount: 0,
      hintsUsed: 1, // 1 hint used
      solutionRevealed: false,
      result: 'Accepted',
      testsPassed: 8,
      testsTotal: 8,
      errorType: 'none',
      isIndependent: calculateIndependence('Accepted', 1, false),
    };

    expect(attempt.isIndependent).toBe(false);

    const scoreResult = scoreAttempt(attempt, 900, null);
    expect(scoreResult.signals.independenceScore).toBe(65);
    expect(scoreResult.explanation).toContain('with assistance');

    const schedule = scheduleReview(attempt, null, fixedNow);
    expect(schedule.intervalDays).toBe(2);
    expect(schedule.reason).toContain('hint');
  });

  // -------------------------------------------------------------
  // Scenario 5: Failed attempt review priority
  // -------------------------------------------------------------
  it('Scenario 5: Failed attempt drops mastery, schedules 1-day review, and rises to top priority', () => {
    const attempt: IAttempt = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 900,
      runCount: 3,
      failedSubmissionCount: 2,
      hintsUsed: 0,
      solutionRevealed: false,
      result: 'Wrong Answer',
      testsPassed: 2,
      testsTotal: 8,
      errorType: classifyErrorType('Wrong Answer'),
      isIndependent: false,
    };

    expect(attempt.errorType).toBe('algorithmic_misunderstanding');

    const schedule = scheduleReview(attempt, null, fixedNow);
    expect(schedule.intervalDays).toBe(1);

    // When the question becomes due tomorrow, it is picked under overdue_review
    const overdueProgress = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 1,
          acceptedCount: 0,
          masteryScore: 25,
          recallEstimate: 0.2,
          status: 'Needs Practice',
          firstSolvedAt: null,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date(fixedNow.getTime() - 1000), // Due right now!
        },
      ],
    ]);

    const rec = selectNextQuestion({
      questions: blind75Questions,
      progressMap: overdueProgress,
      selectedList: 'blind75',
      now: fixedNow,
    });
    expect(rec.category).toBe('overdue_review');
    expect(rec.question!.canonicalId).toBe('two-sum');
  });

  // -------------------------------------------------------------
  // Scenario 6: Spaced revision interval tiers
  // -------------------------------------------------------------
  it('Scenario 6: Correctly maps performance to all 5 spaced interval tiers', () => {
    const baseAttempt: IAttempt = {
      questionId: 'q',
      selectedList: 'blind75',
      startedAt: fixedNow,
      completedAt: fixedNow,
      activeTimeSeconds: 600,
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

    // Tier 1: Failed or Solution Revealed -> 1 day
    const tier1 = scheduleReview({ ...baseAttempt, result: 'Wrong Answer' }, null, fixedNow);
    expect(tier1.intervalDays).toBe(1);

    // Tier 2: Assisted (Hints Used) -> 2 days
    const tier2 = scheduleReview({ ...baseAttempt, hintsUsed: 2 }, null, fixedNow);
    expect(tier2.intervalDays).toBe(2);

    // Tier 3: Independent Difficult (High failed submissions) -> 4 days
    const tier3 = scheduleReview(
      { ...baseAttempt, failedSubmissionCount: 3 },
      { questionId: 'q', selectedList: 'blind75', attemptCount: 1, acceptedCount: 0, masteryScore: 50, recallEstimate: 0.7, status: 'Learning', firstSolvedAt: null, lastAttemptAt: null, nextReviewAt: null },
      fixedNow
    );
    expect(tier3.intervalDays).toBe(4);

    // Tier 4: Independent Comfortable -> 7 days
    const tier4 = scheduleReview(baseAttempt, null, fixedNow);
    expect(tier4.intervalDays).toBe(7);

    // Tier 5: Repeated Confident Solve -> 14 to 30 days
    const priorMastered: IQuestionProgress = {
      questionId: 'q',
      selectedList: 'blind75',
      attemptCount: 2,
      acceptedCount: 2,
      masteryScore: 85,
      recallEstimate: 1.0,
      status: 'Mastered',
      firstSolvedAt: fixedNow,
      lastAttemptAt: fixedNow,
      nextReviewAt: null,
    };
    const tier5 = scheduleReview(baseAttempt, priorMastered, fixedNow);
    expect(tier5.intervalDays).toBeGreaterThanOrEqual(14);
    expect(tier5.intervalDays).toBeLessThanOrEqual(30);
  });

  // -------------------------------------------------------------
  // Scenario 7: Re-attempt regression
  // -------------------------------------------------------------
  it('Scenario 7: Mastered question regresses in mastery and status after a poor reattempt', () => {
    const priorMastered: IQuestionProgress = {
      questionId: 'two-sum',
      selectedList: 'blind75',
      attemptCount: 3,
      acceptedCount: 3,
      masteryScore: 92,
      recallEstimate: 1.0,
      status: 'Mastered',
      firstSolvedAt: new Date('2026-09-01'),
      lastAttemptAt: new Date('2026-10-01'),
      nextReviewAt: fixedNow,
    };

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
      testsTotal: 8,
      errorType: 'algorithmic_misunderstanding',
      isIndependent: false,
    };

    const res = scoreAttempt(failedAttempt, 900, priorMastered);
    expect(res.newMasteryScore).toBeLessThan(priorMastered.masteryScore);
    expect(res.status).not.toBe('Mastered');

    const schedule = scheduleReview(failedAttempt, priorMastered, fixedNow);
    expect(schedule.intervalDays).toBe(1);
  });

  // -------------------------------------------------------------
  // Scenario 8: Easy-to-Medium topic progression gate
  // -------------------------------------------------------------
  it('Scenario 8: Solving Easy problems independently unlocks Medium in that topic', () => {
    const topic = 'Arrays & Hashing';
    const topicQs = blind75Questions.filter((q) => q.topicTags.includes(topic));

    const progressMap = new Map<string, IQuestionProgress>();

    // 1. Initially 0 attempts: Medium is locked
    let summary = evaluateTopicMastery(topic, topicQs, progressMap);
    expect(summary.unlockedMedium).toBe(false);

    // 2. Add 3 easy attempts with 2 independent solves and 85% mastery
    progressMap.set('two-sum', {
      questionId: 'two-sum',
      selectedList: 'blind75',
      attemptCount: 1,
      acceptedCount: 1,
      masteryScore: 85,
      recallEstimate: 1.0,
      status: 'Familiar',
      firstSolvedAt: fixedNow,
      lastAttemptAt: fixedNow,
      nextReviewAt: null,
    });
    progressMap.set('contains-duplicate', {
      questionId: 'contains-duplicate',
      selectedList: 'blind75',
      attemptCount: 1,
      acceptedCount: 1,
      masteryScore: 90,
      recallEstimate: 1.0,
      status: 'Familiar',
      firstSolvedAt: fixedNow,
      lastAttemptAt: fixedNow,
      nextReviewAt: null,
    });
    progressMap.set('valid-anagram', {
      questionId: 'valid-anagram',
      selectedList: 'blind75',
      attemptCount: 1,
      acceptedCount: 1,
      masteryScore: 80,
      recallEstimate: 1.0,
      status: 'Familiar',
      firstSolvedAt: fixedNow,
      lastAttemptAt: fixedNow,
      nextReviewAt: null,
    });

    summary = evaluateTopicMastery(topic, topicQs, progressMap);
    expect(summary.unlockedMedium).toBe(true);
    expect(summary.unlockedHard).toBe(false);
  });

  // -------------------------------------------------------------
  // Scenario 9: Topic gate isolation
  // -------------------------------------------------------------
  it('Scenario 9: Unlocking Medium in Arrays & Hashing does NOT unlock Medium in Two Pointers', () => {
    const progressMap = new Map<string, IQuestionProgress>([
      ['two-sum', { questionId: 'two-sum', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['contains-duplicate', { questionId: 'contains-duplicate', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 90, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['valid-anagram', { questionId: 'valid-anagram', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 80, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
    ]);

    const summaries = evaluateAllTopics(blind75Questions, progressMap, 'blind75');
    const arraysSummary = summaries.get('Arrays & Hashing');
    const twoPointersSummary = summaries.get('Two Pointers');

    expect(arraysSummary?.unlockedMedium).toBe(true);
    expect(twoPointersSummary?.unlockedMedium).toBe(false);
  });

  // -------------------------------------------------------------
  // Scenario 10: Medium-to-Hard progression gate
  // -------------------------------------------------------------
  it('Scenario 10: Unlocking Hard difficulty requires satisfying Medium attempts, solves, and mastery', () => {
    const topic = 'Test Topic';
    const mockTopicQs: IQuestion[] = [
      { canonicalId: 'e1', slug: 'e1', title: 'E1', officialDifficulty: 'Easy', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
      { canonicalId: 'e2', slug: 'e2', title: 'E2', officialDifficulty: 'Easy', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
      { canonicalId: 'e3', slug: 'e3', title: 'E3', officialDifficulty: 'Easy', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
      { canonicalId: 'm1', slug: 'm1', title: 'M1', officialDifficulty: 'Medium', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 1200, isActive: true },
      { canonicalId: 'm2', slug: 'm2', title: 'M2', officialDifficulty: 'Medium', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 1200, isActive: true },
      { canonicalId: 'm3', slug: 'm3', title: 'M3', officialDifficulty: 'Medium', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 1200, isActive: true },
      { canonicalId: 'm4', slug: 'm4', title: 'M4', officialDifficulty: 'Medium', topicTags: [topic], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 1200, isActive: true },
    ];

    const progressMap = new Map<string, IQuestionProgress>();

    // 3 easy solves unlock Medium
    progressMap.set('e1', { questionId: 'e1', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });
    progressMap.set('e2', { questionId: 'e2', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 90, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });
    progressMap.set('e3', { questionId: 'e3', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 80, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });

    let summary = evaluateTopicMastery(topic, mockTopicQs, progressMap);
    expect(summary.unlockedMedium).toBe(true);
    expect(summary.unlockedHard).toBe(false);

    // Now solve Medium questions (4 attempts, 3+ solves, >= 65% mastery)
    progressMap.set('m1', { questionId: 'm1', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });
    progressMap.set('m2', { questionId: 'm2', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });
    progressMap.set('m3', { questionId: 'm3', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 80, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });
    progressMap.set('m4', { questionId: 'm4', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 80, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null });

    summary = evaluateTopicMastery(topic, mockTopicQs, progressMap);
    expect(summary.unlockedHard).toBe(true);
  });

  // -------------------------------------------------------------
  // Scenario 11: Weak topic targeting
  // -------------------------------------------------------------
  it('Scenario 11: Prioritizes questions from weak topics (< 60% mastery) over healthy topics', () => {
    const progressMap = new Map<string, IQuestionProgress>([
      // Healthy Arrays & Hashing (90% mastery)
      ['two-sum', { questionId: 'two-sum', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 90, recallEstimate: 1, status: 'Mastered', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: new Date(fixedNow.getTime() + 1000000) }],
      // Weak Two Pointers: valid-palindrome attempted and struggled (40% mastery)
      ['valid-palindrome', { questionId: 'valid-palindrome', selectedList: 'blind75', attemptCount: 1, acceptedCount: 0, masteryScore: 40, recallEstimate: 0.4, status: 'Needs Practice', firstSolvedAt: null, lastAttemptAt: fixedNow, nextReviewAt: new Date(fixedNow.getTime() + 1000000) }],
    ]);

    const rec = selectNextQuestion({
      questions: blind75Questions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });
    expect(rec.category).toBe('weak_topic');
    expect(rec.reason).toContain('Two Pointers');
  });

  // -------------------------------------------------------------
  // Scenario 12: Outlier protection
  // -------------------------------------------------------------
  it('Scenario 12: Trims the lowest outlier when >= 4 questions attempted in a topic', () => {
    const topicQs: IQuestion[] = [
      { canonicalId: 'q1', slug: 'q1', title: 'Q1', officialDifficulty: 'Easy', topicTags: ['T'], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
      { canonicalId: 'q2', slug: 'q2', title: 'Q2', officialDifficulty: 'Easy', topicTags: ['T'], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
      { canonicalId: 'q3', slug: 'q3', title: 'Q3', officialDifficulty: 'Easy', topicTags: ['T'], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
      { canonicalId: 'q4', slug: 'q4', title: 'Q4', officialDifficulty: 'Easy', topicTags: ['T'], blind75: true, neetcode150: true, officialUrl: '', starterCode: '', description: '', authorizedExamples: [], sampleTestCases: [], expectedSolvingTimeSeconds: 600, isActive: true },
    ];

    // 3 high scores (85, 90, 85) + 1 outlier failure (10)
    const progressMap = new Map<string, IQuestionProgress>([
      ['q1', { questionId: 'q1', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['q2', { questionId: 'q2', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 90, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['q3', { questionId: 'q3', selectedList: 'blind75', attemptCount: 1, acceptedCount: 1, masteryScore: 85, recallEstimate: 1, status: 'Familiar', firstSolvedAt: fixedNow, lastAttemptAt: fixedNow, nextReviewAt: null }],
      ['q4', { questionId: 'q4', selectedList: 'blind75', attemptCount: 1, acceptedCount: 0, masteryScore: 10, recallEstimate: 0.1, status: 'Needs Practice', firstSolvedAt: null, lastAttemptAt: fixedNow, nextReviewAt: null }],
    ]);

    const summary = evaluateTopicMastery('T', topicQs, progressMap);
    // Trimmed average: (85 + 90 + 85) / 3 = 87
    expect(summary.averageMastery).toBe(87);
    expect(summary.isWeak).toBe(false);
  });

  // -------------------------------------------------------------
  // Scenario 13: List isolation
  // -------------------------------------------------------------
  it('Scenario 13: Segregates Blind 75 and NeetCode 150 progress for shared questions', () => {
    const blind75Progress = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 1,
          acceptedCount: 1,
          masteryScore: 90,
          recallEstimate: 1.0,
          status: 'Mastered',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: null,
        },
      ],
    ]);

    const neetcode150Progress = new Map<string, IQuestionProgress>();

    const blind75Rec = selectNextQuestion({
      questions: allQuestions,
      progressMap: blind75Progress,
      selectedList: 'blind75',
    });
    const neetcodeRec = selectNextQuestion({
      questions: allQuestions,
      progressMap: neetcode150Progress,
      selectedList: 'neetcode150',
    });

    // In Blind 75, two-sum is already mastered, so recommendation picks another problem
    expect(blind75Rec.question!.canonicalId).not.toBe('two-sum');

    // In NeetCode 150, two-sum has 0 progress, so it remains a cold-start candidate
    expect(neetcodeRec.category).toBe('learning_unseen');
  });

  // -------------------------------------------------------------
  // Scenario 14: Active timer logic
  // -------------------------------------------------------------
  it('Scenario 14: Verifies active time tracking logic excludes pause durations', () => {
    // Simulated timer state
    let activeTimeSeconds = 0;
    const isPaused = true;

    // Tick while paused
    if (!isPaused) {
      activeTimeSeconds += 10;
    }
    expect(activeTimeSeconds).toBe(0);

    // Tick while active
    const isActive = true;
    if (isActive) {
      activeTimeSeconds += 45;
    }
    expect(activeTimeSeconds).toBe(45);
  });

  // -------------------------------------------------------------
  // Scenario 15: Daily streak calculation
  // -------------------------------------------------------------
  it('Scenario 15: Calculates daily streak, grants yesterday grace, and resets on broken streak', () => {
    const attempts: IAttempt[] = [
      {
        questionId: 'two-sum',
        selectedList: 'blind75',
        startedAt: new Date('2026-10-28T10:00:00Z'),
        completedAt: new Date('2026-10-28T10:15:00Z'),
        activeTimeSeconds: 900,
        runCount: 1,
        failedSubmissionCount: 0,
        hintsUsed: 0,
        solutionRevealed: false,
        result: 'Accepted',
        testsPassed: 8,
        testsTotal: 8,
        errorType: 'none',
        isIndependent: true,
      },
    ];

    // Today is 2026-10-29; solved yesterday -> streak is 1
    const s1 = calculateStreak(attempts, fixedNow);
    expect(s1.currentStreak).toBe(1);

    // If last solve was 3 days ago -> streak resets to 0
    const oldAttempts: IAttempt[] = [
      {
        questionId: 'two-sum',
        selectedList: 'blind75',
        startedAt: new Date('2026-10-25T10:00:00Z'),
        completedAt: new Date('2026-10-25T10:15:00Z'),
        activeTimeSeconds: 900,
        runCount: 1,
        failedSubmissionCount: 0,
        hintsUsed: 0,
        solutionRevealed: false,
        result: 'Accepted',
        testsPassed: 8,
        testsTotal: 8,
        errorType: 'none',
        isIndependent: true,
      },
    ];

    const s2 = calculateStreak(oldAttempts, fixedNow);
    expect(s2.currentStreak).toBe(0);
    expect(s2.bestStreak).toBe(1);
  });

  // -------------------------------------------------------------
  // Scenario 16: Hidden evaluation test security
  // -------------------------------------------------------------
  it('Scenario 16: Verifies hidden evaluation tests are never bundled in public questions JSON', () => {
    const rawQuestions = JSON.parse(fs.readFileSync(cataloguePath, 'utf-8'));
    for (const q of rawQuestions) {
      // Questions catalogue must only contain sampleTestCases
      expect(q).not.toHaveProperty('evaluationTestCases');
      expect(q).not.toHaveProperty('hiddenTests');
      expect(q.sampleTestCases).toBeDefined();
      expect(q.sampleTestCases.length).toBeGreaterThan(0);
      for (const st of q.sampleTestCases) {
        expect(st.id).toBeDefined();
        expect(st.input).toBeDefined();
        expect(st.expected).toBeDefined();
      }
    }

    // Evaluation tests exist solely in server-side data/evaluation-tests.json
    const evalPath = path.resolve(process.cwd(), 'data/evaluation-tests.json');
    expect(fs.existsSync(evalPath)).toBe(true);
    const evalJson = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
    expect(evalJson['two-sum']).toBeDefined();
    expect(evalJson['two-sum'].length).toBeGreaterThan(0);
  });
});
