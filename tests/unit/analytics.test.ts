import { describe, it, expect } from 'vitest';
import {
  calculateStreak,
  getRevisionQueue,
  getTopicStrengthsAndWeaknesses,
  getDifficultyBreakdown,
  toLocalDateString,
} from '@/lib/adaptive/analytics';
import { IAttempt, IQuestion, IQuestionProgress, TopicProgressSummary } from '@/lib/types';

describe('Phase 5: Adaptive Analytics & Streak Engine', () => {
  const fixedNow = new Date('2026-10-29T14:00:00');

  describe('Streak Calculation', () => {
    it('returns zeros for empty attempts history', () => {
      const stats = calculateStreak([], fixedNow);
      expect(stats.currentStreak).toBe(0);
      expect(stats.bestStreak).toBe(0);
      expect(stats.solvedToday).toBe(0);
      expect(stats.attemptedToday).toBe(0);
      expect(stats.lastActiveDate).toBeNull();
    });

    it('calculates 3-day active streak ending today', () => {
      const attempts: IAttempt[] = [
        // 2 days ago
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          startedAt: new Date('2026-10-27T10:00:00'),
          completedAt: new Date('2026-10-27T10:15:00'),
          activeTimeSeconds: 900,
          runCount: 1,
          failedSubmissionCount: 0,
          hintsUsed: 0,
          solutionRevealed: false,
          result: 'Accepted',
          testsPassed: 5,
          testsTotal: 5,
          errorType: 'none',
          isIndependent: true,
        },
        // Yesterday (2 attempts on same day)
        {
          questionId: 'valid-anagram',
          selectedList: 'blind75',
          startedAt: new Date('2026-10-28T11:00:00'),
          completedAt: new Date('2026-10-28T11:10:00'),
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
        },
        {
          questionId: 'contains-duplicate',
          selectedList: 'blind75',
          startedAt: new Date('2026-10-28T15:00:00'),
          completedAt: new Date('2026-10-28T15:08:00'),
          activeTimeSeconds: 480,
          runCount: 1,
          failedSubmissionCount: 0,
          hintsUsed: 0,
          solutionRevealed: false,
          result: 'Accepted',
          testsPassed: 5,
          testsTotal: 5,
          errorType: 'none',
          isIndependent: true,
        },
        // Today
        {
          questionId: 'group-anagrams',
          selectedList: 'blind75',
          startedAt: new Date('2026-10-29T09:00:00'),
          completedAt: new Date('2026-10-29T09:20:00'),
          activeTimeSeconds: 1200,
          runCount: 2,
          failedSubmissionCount: 1,
          hintsUsed: 0,
          solutionRevealed: false,
          result: 'Accepted',
          testsPassed: 6,
          testsTotal: 6,
          errorType: 'none',
          isIndependent: true,
        },
      ];

      const stats = calculateStreak(attempts, fixedNow);
      expect(stats.currentStreak).toBe(3);
      expect(stats.bestStreak).toBe(3);
      expect(stats.solvedToday).toBe(1);
      expect(stats.attemptedToday).toBe(1);
      expect(stats.activeSecondsToday).toBe(1200);
      expect(stats.lastActiveDate).toBe('2026-10-29');
    });

    it('maintains streak if user solved yesterday but has not solved today yet', () => {
      const attempts: IAttempt[] = [
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          startedAt: new Date('2026-10-28T10:00:00'),
          completedAt: new Date('2026-10-28T10:15:00'),
          activeTimeSeconds: 900,
          runCount: 1,
          failedSubmissionCount: 0,
          hintsUsed: 0,
          solutionRevealed: false,
          result: 'Accepted',
          testsPassed: 5,
          testsTotal: 5,
          errorType: 'none',
          isIndependent: true,
        },
      ];

      const stats = calculateStreak(attempts, fixedNow);
      // Since yesterday was active, current streak is 1 (pending today)
      expect(stats.currentStreak).toBe(1);
      expect(stats.solvedToday).toBe(0);
    });

    it('resets current streak to 0 if last activity was 2 or more days ago', () => {
      const attempts: IAttempt[] = [
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          startedAt: new Date('2026-10-26T10:00:00'),
          completedAt: new Date('2026-10-26T10:15:00'),
          activeTimeSeconds: 900,
          runCount: 1,
          failedSubmissionCount: 0,
          hintsUsed: 0,
          solutionRevealed: false,
          result: 'Accepted',
          testsPassed: 5,
          testsTotal: 5,
          errorType: 'none',
          isIndependent: true,
        },
      ];

      const stats = calculateStreak(attempts, fixedNow);
      expect(stats.currentStreak).toBe(0);
      expect(stats.bestStreak).toBe(1);
    });
  });

  describe('Revision Queue Builder', () => {
    const q1: IQuestion = {
      canonicalId: 'two-sum',
      slug: 'two-sum',
      title: 'Two Sum',
      officialDifficulty: 'Easy',
      topicTags: ['Arrays & Hashing'],
      blind75: true,
      neetcode150: true,
      officialUrl: '',
      starterCode: '',
      description: '',
      authorizedExamples: [],
      sampleTestCases: [],
      expectedSolvingTimeSeconds: 900,
      isActive: true,
    };

    const q2: IQuestion = {
      canonicalId: 'valid-anagram',
      slug: 'valid-anagram',
      title: 'Valid Anagram',
      officialDifficulty: 'Easy',
      topicTags: ['Arrays & Hashing'],
      blind75: true,
      neetcode150: true,
      officialUrl: '',
      starterCode: '',
      description: '',
      authorizedExamples: [],
      sampleTestCases: [],
      expectedSolvingTimeSeconds: 600,
      isActive: true,
    };

    it('prioritizes overdue questions before future reviews', () => {
      const progressMap = new Map<string, IQuestionProgress>([
        [
          'two-sum',
          {
            questionId: 'two-sum',
            selectedList: 'blind75',
            attemptCount: 1,
            acceptedCount: 1,
            masteryScore: 80,
            recallEstimate: 0.9,
            status: 'Familiar',
            firstSolvedAt: new Date('2026-10-20'),
            lastAttemptAt: new Date('2026-10-20'),
            nextReviewAt: new Date('2026-10-27T12:00:00'), // Overdue by 2 days
          },
        ],
        [
          'valid-anagram',
          {
            questionId: 'valid-anagram',
            selectedList: 'blind75',
            attemptCount: 1,
            acceptedCount: 1,
            masteryScore: 90,
            recallEstimate: 1.0,
            status: 'Mastered',
            firstSolvedAt: new Date('2026-10-28'),
            lastAttemptAt: new Date('2026-10-28'),
            nextReviewAt: new Date('2026-11-04T12:00:00'), // Due in 6 days
          },
        ],
      ]);

      const queue = getRevisionQueue([q1, q2], progressMap, fixedNow);
      expect(queue.length).toBe(2);
      expect(queue[0].question.canonicalId).toBe('two-sum');
      expect(queue[0].isOverdue).toBe(true);
      expect(queue[0].dueDescription).toContain('Overdue');

      expect(queue[1].question.canonicalId).toBe('valid-anagram');
      expect(queue[1].isOverdue).toBe(false);
      expect(queue[1].dueDescription).toContain('Due in');
    });
  });

  describe('Topic Strengths and Weaknesses', () => {
    it('accurately filters weak topics (< 65%) and strong topics (>= 75%)', () => {
      const summaries: TopicProgressSummary[] = [
        {
          topic: 'Arrays & Hashing',
          totalQuestions: 10,
          solvedQuestions: 8,
          averageMastery: 88,
          unlockedMedium: true,
          unlockedHard: true,
          isWeak: false,
        },
        {
          topic: 'Dynamic Programming',
          totalQuestions: 8,
          solvedQuestions: 2,
          averageMastery: 45,
          unlockedMedium: false,
          unlockedHard: false,
          isWeak: true,
        },
        {
          topic: 'Trees',
          totalQuestions: 12,
          solvedQuestions: 0,
          averageMastery: 0, // Unattempted, should not be marked weak or strong
          unlockedMedium: false,
          unlockedHard: false,
          isWeak: false,
        },
      ];

      const { weakestTopics, strongestTopics } = getTopicStrengthsAndWeaknesses(summaries);
      expect(weakestTopics.length).toBe(1);
      expect(weakestTopics[0].topic).toBe('Dynamic Programming');

      expect(strongestTopics.length).toBe(1);
      expect(strongestTopics[0].topic).toBe('Arrays & Hashing');
    });
  });

  describe('Difficulty Breakdown', () => {
    it('computes solved and total per difficulty level', () => {
      const questions: IQuestion[] = [
        {
          canonicalId: 'q1',
          slug: 'q1',
          title: 'Q1',
          officialDifficulty: 'Easy',
          topicTags: ['Arrays & Hashing'],
          blind75: true,
          neetcode150: true,
          officialUrl: '',
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
          officialUrl: '',
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
          officialDifficulty: 'Medium',
          topicTags: ['Arrays & Hashing'],
          blind75: true,
          neetcode150: true,
          officialUrl: '',
          starterCode: '',
          description: '',
          authorizedExamples: [],
          sampleTestCases: [],
          expectedSolvingTimeSeconds: 1200,
          isActive: true,
        },
      ];

      const progressMap = new Map<string, IQuestionProgress>([
        [
          'q1',
          {
            questionId: 'q1',
            selectedList: 'blind75',
            attemptCount: 1,
            acceptedCount: 1,
            masteryScore: 85,
            recallEstimate: 1,
            status: 'Familiar',
            firstSolvedAt: fixedNow,
            lastAttemptAt: fixedNow,
            nextReviewAt: null,
          },
        ],
      ]);

      const breakdown = getDifficultyBreakdown(questions, progressMap);
      expect(breakdown.easy.total).toBe(2);
      expect(breakdown.easy.solved).toBe(1);
      expect(breakdown.medium.total).toBe(1);
      expect(breakdown.medium.solved).toBe(0);
      expect(breakdown.hard.total).toBe(0);
      expect(breakdown.hard.solved).toBe(0);
    });
  });
});
