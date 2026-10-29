import { describe, it, expect } from 'vitest';
import {
  selectNextQuestion,
  calculateTopicSummaries,
  DEFAULT_PROGRESSION_CONFIG,
} from '@/lib/adaptive/select-next-question';
import { IQuestion, IQuestionProgress } from '@/lib/types';

// Mock question set for testing
const mockQuestions: IQuestion[] = [
  {
    canonicalId: 'two-sum',
    slug: 'two-sum',
    title: 'Two Sum',
    officialDifficulty: 'Easy',
    topicTags: ['Arrays & Hashing'],
    blind75: true,
    neetcode150: true,
    officialUrl: 'https://leetcode.com/problems/two-sum/',
    starterCode: 'function twoSum() {}',
    description: 'Two sum description',
    authorizedExamples: [{ input: 'nums=[2,7], target=9', output: '[0,1]' }],
    sampleTestCases: [{ id: '1', input: [[2, 7], 9], expected: [0, 1] }],
    expectedSolvingTimeSeconds: 900,
    isActive: true,
  },
  {
    canonicalId: 'group-anagrams',
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    officialDifficulty: 'Medium',
    topicTags: ['Arrays & Hashing'],
    blind75: true,
    neetcode150: true,
    officialUrl: 'https://leetcode.com/problems/group-anagrams/',
    starterCode: 'function groupAnagrams() {}',
    description: 'Group anagrams description',
    authorizedExamples: [],
    sampleTestCases: [{ id: '1', input: [['eat']], expected: [['eat']] }],
    expectedSolvingTimeSeconds: 1500,
    isActive: true,
  },
  {
    canonicalId: 'binary-search',
    slug: 'binary-search',
    title: 'Binary Search',
    officialDifficulty: 'Easy',
    topicTags: ['Binary Search'],
    blind75: false, // NOT in Blind 75, only NeetCode 150
    neetcode150: true,
    officialUrl: 'https://leetcode.com/problems/binary-search/',
    starterCode: 'function search() {}',
    description: 'Binary search description',
    authorizedExamples: [],
    sampleTestCases: [{ id: '1', input: [[-1, 0, 3], 0], expected: 1 }],
    expectedSolvingTimeSeconds: 600,
    isActive: true,
  },
  {
    canonicalId: '3sum',
    slug: '3sum',
    title: '3Sum',
    officialDifficulty: 'Medium',
    topicTags: ['Two Pointers'],
    blind75: true,
    neetcode150: true,
    officialUrl: 'https://leetcode.com/problems/3sum/',
    starterCode: 'function threeSum() {}',
    description: '3Sum description',
    authorizedExamples: [],
    sampleTestCases: [],
    expectedSolvingTimeSeconds: 1500,
    isActive: true,
  },
  {
    canonicalId: 'valid-palindrome',
    slug: 'valid-palindrome',
    title: 'Valid Palindrome',
    officialDifficulty: 'Easy',
    topicTags: ['Two Pointers'],
    blind75: true,
    neetcode150: true,
    officialUrl: 'https://leetcode.com/problems/valid-palindrome/',
    starterCode: 'function isPalindrome() {}',
    description: 'Valid palindrome description',
    authorizedExamples: [],
    sampleTestCases: [],
    expectedSolvingTimeSeconds: 600,
    isActive: true,
  },
];

describe('Adaptive Recommendation Engine: selectNextQuestion', () => {
  const fixedNow = new Date('2026-10-29T12:00:00Z');

  it('Scenario 1: A new user receives an eligible Easy question', () => {
    const progressMap = new Map<string, IQuestionProgress>();

    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });

    expect(recommendation.question).not.toBeNull();
    expect(recommendation.question?.officialDifficulty).toBe('Easy');
    expect(recommendation.category).toBe('learning_unseen');
    expect(recommendation.reason).toMatch(/Easy problem/);
  });

  it('Scenario 2: Selecting Blind 75 never returns a question outside Blind 75', () => {
    const progressMap = new Map<string, IQuestionProgress>();

    // Test multiple times or iterate through recommendations
    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });

    expect(recommendation.question?.blind75).toBe(true);
    expect(recommendation.question?.canonicalId).not.toBe('binary-search'); // binary-search is neetcode150 only
  });

  it('Scenario 3: Selecting NeetCode 150 can return questions exclusive to NeetCode 150', () => {
    // If all shared questions are completed, binary-search should be recommended
    const progressMap = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'neetcode150',
          attemptCount: 1,
          acceptedCount: 1,
          masteryScore: 80,
          recallEstimate: 1.0,
          status: 'Familiar',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-05T12:00:00Z'),
        },
      ],
      [
        'valid-palindrome',
        {
          questionId: 'valid-palindrome',
          selectedList: 'neetcode150',
          attemptCount: 1,
          acceptedCount: 1,
          masteryScore: 85,
          recallEstimate: 1.0,
          status: 'Familiar',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-05T12:00:00Z'),
        },
      ],
    ]);

    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'neetcode150',
      now: fixedNow,
    });

    expect(recommendation.question?.canonicalId).toBe('binary-search');
    expect(recommendation.question?.neetcode150).toBe(true);
  });

  it('Scenario 4: Due and overdue reviews take precedence over new unseen questions', () => {
    const overdueDate = new Date('2026-10-25T12:00:00Z'); // 4 days overdue
    const progressMap = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 1,
          acceptedCount: 1,
          masteryScore: 50,
          recallEstimate: 0.7,
          status: 'Needs Practice',
          firstSolvedAt: new Date('2026-10-20T12:00:00Z'),
          lastAttemptAt: new Date('2026-10-20T12:00:00Z'),
          nextReviewAt: overdueDate,
        },
      ],
    ]);

    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });

    // Should recommend 'two-sum' for review despite valid-palindrome being unseen
    expect(recommendation.question?.canonicalId).toBe('two-sum');
    expect(recommendation.category).toBe('overdue_review');
    expect(recommendation.reason).toContain('overdue for revision by 4 days');
  });

  it('Scenario 5: Weak questions in struggling topics take precedence over brand new topics', () => {
    const futureReviewDate = new Date('2026-11-10T12:00:00Z');
    const progressMap = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 2,
          acceptedCount: 0,
          masteryScore: 35, // low mastery!
          recallEstimate: 0.5,
          status: 'Needs Practice',
          firstSolvedAt: null,
          lastAttemptAt: new Date('2026-10-28T12:00:00Z'),
          nextReviewAt: futureReviewDate, // not overdue yet
        },
      ],
    ]);

    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });

    expect(recommendation.question?.canonicalId).toBe('two-sum');
    expect(recommendation.category).toBe('weak_topic');
    expect(recommendation.reason).toContain('struggled with Arrays & Hashing');
  });

  it('Scenario 6: Medium questions are locked for a topic until configured threshold is met', () => {
    // Only 2 attempts on Arrays & Hashing Easy problems (threshold is 5)
    const progressMap = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 2,
          acceptedCount: 2,
          masteryScore: 80,
          recallEstimate: 1.0,
          status: 'Mastered',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-15T12:00:00Z'),
        },
      ],
    ]);

    const summaries = calculateTopicSummaries(mockQuestions, progressMap, 'blind75');
    const arraysSummary = summaries.get('Arrays & Hashing');
    expect(arraysSummary?.unlockedMedium).toBe(false);

    // Group Anagrams is Medium in Arrays & Hashing - it should NOT be recommended yet
    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });

    // Should recommend unseen Easy from Two Pointers ('valid-palindrome') instead of locked Medium
    expect(recommendation.question?.canonicalId).toBe('valid-palindrome');
    expect(recommendation.question?.officialDifficulty).toBe('Easy');
  });

  it('Scenario 7: Mastery in one topic does NOT unlock Medium in another topic', () => {
    // Meet criteria for Arrays & Hashing: 5 attempts, 4 independent solves, 75 mastery
    const progressMap = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 5,
          acceptedCount: 4,
          masteryScore: 75,
          recallEstimate: 1.0,
          status: 'Mastered',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-15T12:00:00Z'),
        },
      ],
      // Two Pointers has 0 attempts
    ]);

    const summaries = calculateTopicSummaries(mockQuestions, progressMap, 'blind75');
    const arraysSummary = summaries.get('Arrays & Hashing');
    const twoPointersSummary = summaries.get('Two Pointers');

    expect(arraysSummary?.unlockedMedium).toBe(true);
    expect(twoPointersSummary?.unlockedMedium).toBe(false); // MUST REMAIN LOCKED!
  });

  it('Scenario 8: Returns clean completion message when all questions are mastered and not due', () => {
    const futureDate = new Date('2026-12-01T12:00:00Z');
    const progressMap = new Map<string, IQuestionProgress>();

    // Mark all Blind 75 questions as completed with high mastery
    for (const q of mockQuestions.filter((q) => q.blind75)) {
      progressMap.set(q.canonicalId, {
        questionId: q.canonicalId,
        selectedList: 'blind75',
        attemptCount: 1,
        acceptedCount: 1,
        masteryScore: 100,
        recallEstimate: 1.0,
        status: 'Mastered',
        firstSolvedAt: fixedNow,
        lastAttemptAt: fixedNow,
        nextReviewAt: futureDate,
      });
    }

    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap,
      selectedList: 'blind75',
      now: fixedNow,
    });

    // When all are solved, returns general review with reason
    expect(recommendation.category).toBe('standard_review');
    expect(recommendation.reason).toContain('All questions in this list have been practiced');
  });

  it('Scenario 9: Shared problems maintain strictly separate progress per list', () => {
    // Progress exists on 'two-sum' in Blind 75 (mastered)
    const blind75Progress = new Map<string, IQuestionProgress>([
      [
        'two-sum',
        {
          questionId: 'two-sum',
          selectedList: 'blind75',
          attemptCount: 3,
          acceptedCount: 3,
          masteryScore: 95,
          recallEstimate: 1.0,
          status: 'Mastered',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-20T12:00:00Z'),
        },
      ],
    ]);

    // Progress on NeetCode 150 has binary-search and valid-palindrome, but NOT two-sum
    const neetcodeProgress = new Map<string, IQuestionProgress>([
      [
        'binary-search',
        {
          questionId: 'binary-search',
          selectedList: 'neetcode150',
          attemptCount: 1,
          acceptedCount: 1,
          masteryScore: 80,
          recallEstimate: 1.0,
          status: 'Familiar',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-20T12:00:00Z'),
        },
      ],
      [
        'valid-palindrome',
        {
          questionId: 'valid-palindrome',
          selectedList: 'neetcode150',
          attemptCount: 1,
          acceptedCount: 1,
          masteryScore: 80,
          recallEstimate: 1.0,
          status: 'Familiar',
          firstSolvedAt: fixedNow,
          lastAttemptAt: fixedNow,
          nextReviewAt: new Date('2026-11-20T12:00:00Z'),
        },
      ],
    ]);

    // When querying NeetCode 150, two-sum is considered unseen despite being mastered in Blind 75
    const recommendation = selectNextQuestion({
      questions: mockQuestions,
      progressMap: neetcodeProgress,
      selectedList: 'neetcode150',
      now: fixedNow,
    });

    expect(recommendation.question?.canonicalId).toBe('two-sum');
    expect(recommendation.category).toBe('learning_unseen');
    expect(recommendation.reason).toContain('Arrays & Hashing');
  });
});

