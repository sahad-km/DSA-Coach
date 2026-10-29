import {
  Difficulty,
  IQuestion,
  IQuestionProgress,
  NextQuestionRecommendation,
  QuestionListType,
  TopicProgressSummary,
} from '@/lib/types';

export interface ProgressionConfig {
  easyToMediumAttemptsRequired: number;
  easyToMediumIndependentSolvedRequired: number;
  easyToMediumTopicMasteryThreshold: number;
  mediumToHardAttemptsRequired: number;
  mediumToHardIndependentSolvedRequired: number;
  mediumToHardTopicMasteryThreshold: number;
}

export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  easyToMediumAttemptsRequired: 3,
  easyToMediumIndependentSolvedRequired: 2,
  easyToMediumTopicMasteryThreshold: 60,
  mediumToHardAttemptsRequired: 4,
  mediumToHardIndependentSolvedRequired: 3,
  mediumToHardTopicMasteryThreshold: 65,
};

export interface SelectNextQuestionOptions {
  questions: IQuestion[];
  progressMap: Map<string, IQuestionProgress>;
  selectedList: QuestionListType;
  now?: Date;
  config?: ProgressionConfig;
}

/**
 * Calculates per-topic mastery and difficulty eligibility
 */
export function calculateTopicSummaries(
  questions: IQuestion[],
  progressMap: Map<string, IQuestionProgress>,
  selectedList: QuestionListType,
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG
): Map<string, TopicProgressSummary> {
  const topicStats = new Map<
    string,
    {
      total: number;
      solved: number;
      easyAttempts: number;
      easySolved: number;
      easyMasterySum: number;
      easyCount: number;
      mediumAttempts: number;
      mediumSolved: number;
      mediumMasterySum: number;
      mediumCount: number;
      totalMasterySum: number;
      attemptedCount: number;
    }
  >();

  // Filter questions by list
  const listQuestions = questions.filter((q) =>
    selectedList === 'blind75' ? q.blind75 : q.neetcode150
  );

  for (const q of listQuestions) {
    for (const topic of q.topicTags) {
      if (!topicStats.has(topic)) {
        topicStats.set(topic, {
          total: 0,
          solved: 0,
          easyAttempts: 0,
          easySolved: 0,
          easyMasterySum: 0,
          easyCount: 0,
          mediumAttempts: 0,
          mediumSolved: 0,
          mediumMasterySum: 0,
          mediumCount: 0,
          totalMasterySum: 0,
          attemptedCount: 0,
        });
      }

      const stat = topicStats.get(topic)!;
      stat.total++;

      const prog = progressMap.get(q.canonicalId);
      if (prog) {
        if (prog.attemptCount > 0) {
          stat.attemptedCount++;
          stat.totalMasterySum += prog.masteryScore;
        }
        if (prog.acceptedCount > 0) {
          stat.solved++;
        }

        if (q.officialDifficulty === 'Easy') {
          stat.easyCount++;
          stat.easyAttempts += prog.attemptCount;
          stat.easySolved += prog.acceptedCount;
          stat.easyMasterySum += prog.masteryScore;
        } else if (q.officialDifficulty === 'Medium') {
          stat.mediumCount++;
          stat.mediumAttempts += prog.attemptCount;
          stat.mediumSolved += prog.acceptedCount;
          stat.mediumMasterySum += prog.masteryScore;
        }
      }
    }
  }

  const summaries = new Map<string, TopicProgressSummary>();

  for (const [topic, stat] of topicStats.entries()) {
    const avgMastery =
      stat.attemptedCount > 0 ? Math.round(stat.totalMasterySum / stat.attemptedCount) : 0;

    // Check Medium unlock condition for this topic
    const unlockedMedium =
      stat.easyAttempts >= config.easyToMediumAttemptsRequired &&
      stat.easySolved >= config.easyToMediumIndependentSolvedRequired &&
      avgMastery >= config.easyToMediumTopicMasteryThreshold;

    // Check Hard unlock condition for this topic
    const unlockedHard =
      unlockedMedium &&
      stat.mediumAttempts >= config.mediumToHardAttemptsRequired &&
      stat.mediumSolved >= config.mediumToHardIndependentSolvedRequired &&
      avgMastery >= config.mediumToHardTopicMasteryThreshold;

    const isWeak = stat.attemptedCount > 0 && avgMastery < 60;

    summaries.set(topic, {
      topic,
      totalQuestions: stat.total,
      solvedQuestions: stat.solved,
      averageMastery: avgMastery,
      unlockedMedium,
      unlockedHard,
      isWeak,
    });
  }

  return summaries;
}

/**
 * Checks if a question's difficulty is eligible for its topic
 */
export function isDifficultyUnlocked(
  question: IQuestion,
  topicSummaries: Map<string, TopicProgressSummary>
): boolean {
  if (question.officialDifficulty === 'Easy') return true;

  // Question difficulty is unlocked if any of its topic tags have unlocked it
  for (const topic of question.topicTags) {
    const summary = topicSummaries.get(topic);
    if (!summary) continue;

    if (question.officialDifficulty === 'Medium' && summary.unlockedMedium) {
      return true;
    }
    if (question.officialDifficulty === 'Hard' && summary.unlockedHard) {
      return true;
    }
  }

  return false;
}

/**
 * Deterministic recommendation engine to select the next question
 */
export function selectNextQuestion(
  options: SelectNextQuestionOptions
): NextQuestionRecommendation {
  const {
    questions,
    progressMap,
    selectedList,
    now = new Date(),
    config = DEFAULT_PROGRESSION_CONFIG,
  } = options;

  // 1. Filter questions strictly by the selected list
  const listQuestions = questions.filter((q) =>
    selectedList === 'blind75' ? q.blind75 : q.neetcode150
  );

  if (listQuestions.length === 0) {
    return {
      question: null,
      reason: `No questions found in the ${selectedList === 'blind75' ? 'Blind 75' : 'NeetCode 150'} catalogue.`,
      priorityScore: 0,
      category: 'none',
    };
  }

  const topicSummaries = calculateTopicSummaries(
    listQuestions,
    progressMap,
    selectedList,
    config
  );

  // -------------------------------------------------------------
  // TIER 1: Due and Overdue Revision Questions
  // -------------------------------------------------------------
  const overdueCandidates: Array<{
    question: IQuestion;
    daysOverdue: number;
    score: number;
    reason: string;
  }> = [];

  for (const q of listQuestions) {
    const prog = progressMap.get(q.canonicalId);
    if (prog && prog.nextReviewAt) {
      const reviewTime = new Date(prog.nextReviewAt).getTime();
      const currentTime = now.getTime();

      if (reviewTime <= currentTime) {
        const daysOverdue = Math.max(0, (currentTime - reviewTime) / (1000 * 3600 * 24));
        // Priority score: higher overdue days + lower mastery score
        const masteryDeficit = 100 - prog.masteryScore;
        const urgencyScore = 1000 + daysOverdue * 50 + masteryDeficit * 2;

        const reason =
          daysOverdue >= 1
            ? `This question is overdue for revision by ${Math.floor(daysOverdue)} day${Math.floor(daysOverdue) === 1 ? '' : 's'}. Reviewing now prevents memory decay.`
            : `This question is due for revision today to solidify your recall.`;

        overdueCandidates.push({
          question: q,
          daysOverdue,
          score: urgencyScore,
          reason,
        });
      }
    }
  }

  if (overdueCandidates.length > 0) {
    // Sort descending by score; tie-break deterministically by canonicalId
    overdueCandidates.sort((a, b) => b.score - a.score || a.question.canonicalId.localeCompare(b.question.canonicalId));
    const top = overdueCandidates[0];
    return {
      question: top.question,
      reason: top.reason,
      priorityScore: top.score,
      category: 'overdue_review',
    };
  }

  // -------------------------------------------------------------
  // TIER 2: Weak Questions in Topics That Need Reinforcement
  // -------------------------------------------------------------
  const weakCandidates: Array<{
    question: IQuestion;
    score: number;
    reason: string;
  }> = [];

  for (const q of listQuestions) {
    const prog = progressMap.get(q.canonicalId);
    // Find questions with attempts that have low mastery or status 'Needs Practice'
    if (prog && prog.attemptCount > 0 && (prog.masteryScore < 60 || prog.status === 'Needs Practice')) {
      const isWeakTopic = q.topicTags.some((t) => topicSummaries.get(t)?.isWeak);
      const topicBonus = isWeakTopic ? 100 : 0;
      const score = 500 + topicBonus + (100 - prog.masteryScore) * 2;

      const mainTopic = q.topicTags[0];
      const reason = `You have struggled with ${mainTopic} problems. Reinforcing this question will build confidence.`;

      weakCandidates.push({
        question: q,
        score,
        reason,
      });
    }
  }

  if (weakCandidates.length > 0) {
    weakCandidates.sort((a, b) => b.score - a.score || a.question.canonicalId.localeCompare(b.question.canonicalId));
    const top = weakCandidates[0];
    return {
      question: top.question,
      reason: top.reason,
      priorityScore: top.score,
      category: 'weak_topic',
    };
  }

  // -------------------------------------------------------------
  // TIER 3: Unseen Questions from Topics Currently Being Learned
  // -------------------------------------------------------------
  const unseenCandidates: Array<{
    question: IQuestion;
    score: number;
    reason: string;
  }> = [];

  for (const q of listQuestions) {
    const prog = progressMap.get(q.canonicalId);
    const isUnseen = !prog || prog.attemptCount === 0;

    if (isUnseen) {
      // Check if this question's difficulty is unlocked for its topic
      if (!isDifficultyUnlocked(q, topicSummaries)) {
        continue;
      }

      // Check topic engagement
      let activeLearningBonus = 0;
      for (const topic of q.topicTags) {
        const summary = topicSummaries.get(topic);
        if (summary && summary.solvedQuestions > 0 && summary.averageMastery < 85) {
          activeLearningBonus += 50;
        }
      }

      // Cold start / foundational topic preference
      let foundationalBonus = 0;
      const isColdStart = listQuestions.every(
        (item) => !progressMap.get(item.canonicalId)?.attemptCount
      );
      if (isColdStart) {
        if (q.topicTags.includes('Arrays & Hashing')) {
          foundationalBonus = 50;
        } else if (q.topicTags.includes('Two Pointers')) {
          foundationalBonus = 25;
        }
      }

      // Favor Easy questions first for unseen
      const difficultyScore =
        q.officialDifficulty === 'Easy' ? 100 : q.officialDifficulty === 'Medium' ? 60 : 20;

      const score = 200 + activeLearningBonus + foundationalBonus + difficultyScore;
      const mainTopic = q.topicTags[0];

      let reason = `You're ready for another ${q.officialDifficulty} problem in ${mainTopic}.`;
      if (isColdStart) {
        reason = `Cold start: Beginning your DSA journey with a foundational ${q.officialDifficulty} problem in ${mainTopic}.`;
      } else if (q.officialDifficulty === 'Medium') {
        reason = `Your recent progress unlocked Medium problems in ${mainTopic}. Try this next challenge!`;
      }

      unseenCandidates.push({
        question: q,
        score,
        reason,
      });
    }
  }

  if (unseenCandidates.length > 0) {
    unseenCandidates.sort((a, b) => b.score - a.score || a.question.canonicalId.localeCompare(b.question.canonicalId));
    const top = unseenCandidates[0];
    return {
      question: top.question,
      reason: top.reason,
      priorityScore: top.score,
      category: top.question.officialDifficulty === 'Medium' ? 'difficulty_advancement' : 'learning_unseen',
    };
  }

  // -------------------------------------------------------------
  // TIER 4: Lower-Priority / General Revision
  // -------------------------------------------------------------
  // If all questions are attempted and none are overdue, pick the least recently attempted or lowest mastery
  const reviewCandidates: Array<{
    question: IQuestion;
    score: number;
    reason: string;
  }> = [];

  for (const q of listQuestions) {
    const prog = progressMap.get(q.canonicalId);
    if (prog) {
      const masteryDeficit = 100 - prog.masteryScore;
      const daysSinceAttempt = prog.lastAttemptAt
        ? (now.getTime() - new Date(prog.lastAttemptAt).getTime()) / (1000 * 3600 * 24)
        : 1;

      const score = 50 + masteryDeficit + Math.min(daysSinceAttempt * 2, 50);
      const reason = `All questions in this list have been practiced! Reviewing "${q.title}" keeps your mastery sharp.`;

      reviewCandidates.push({
        question: q,
        score,
        reason,
      });
    }
  }

  if (reviewCandidates.length > 0) {
    reviewCandidates.sort((a, b) => b.score - a.score || a.question.canonicalId.localeCompare(b.question.canonicalId));
    const top = reviewCandidates[0];
    return {
      question: top.question,
      reason: top.reason,
      priorityScore: top.score,
      category: 'standard_review',
    };
  }

  return {
    question: null,
    reason: 'All available questions have been solved and mastered!',
    priorityScore: 0,
    category: 'none',
  };
}
