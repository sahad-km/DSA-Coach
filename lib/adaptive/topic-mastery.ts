import {
  Difficulty,
  IQuestion,
  IQuestionProgress,
  QuestionListType,
  TopicProgressSummary,
} from '@/lib/types';
import {
  DEFAULT_PROGRESSION_CONFIG,
  ProgressionConfig,
} from './select-next-question';

/**
 * Calculates robust topic mastery and progression thresholds without allowing
 * a single outlier question to permanently suppress an entire topic.
 */
export function evaluateTopicMastery(
  topic: string,
  topicQuestions: IQuestion[],
  progressMap: Map<string, IQuestionProgress>,
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG
): TopicProgressSummary {
  const scores: number[] = [];
  let easyAttempts = 0;
  let easySolved = 0;
  let mediumAttempts = 0;
  let mediumSolved = 0;
  let totalSolved = 0;

  for (const q of topicQuestions) {
    const prog = progressMap.get(q.canonicalId);
    if (!prog || prog.attemptCount === 0) continue;

    scores.push(prog.masteryScore);

    if (prog.acceptedCount > 0) {
      totalSolved++;
    }

    if (q.officialDifficulty === 'Easy') {
      easyAttempts += prog.attemptCount;
      easySolved += prog.acceptedCount;
    } else if (q.officialDifficulty === 'Medium') {
      mediumAttempts += prog.attemptCount;
      mediumSolved += prog.acceptedCount;
    }
  }

  // Robust average calculation:
  // If at least 4 questions attempted, drop the lowest single outlier to protect against
  // an unusually punishing question permanently lowering topic mastery.
  let averageMastery = 0;
  if (scores.length > 0) {
    if (scores.length >= 4) {
      const sorted = [...scores].sort((a, b) => a - b);
      // Drop lowest outlier
      const trimmed = sorted.slice(1);
      const sum = trimmed.reduce((acc, s) => acc + s, 0);
      averageMastery = Math.round(sum / trimmed.length);
    } else {
      const sum = scores.reduce((acc, s) => acc + s, 0);
      averageMastery = Math.round(sum / scores.length);
    }
  }

  // Check Easy -> Medium unlock
  const unlockedMedium =
    easyAttempts >= config.easyToMediumAttemptsRequired &&
    easySolved >= config.easyToMediumIndependentSolvedRequired &&
    averageMastery >= config.easyToMediumTopicMasteryThreshold;

  // Check Medium -> Hard unlock
  const unlockedHard =
    unlockedMedium &&
    mediumAttempts >= config.mediumToHardAttemptsRequired &&
    mediumSolved >= config.mediumToHardIndependentSolvedRequired &&
    averageMastery >= config.mediumToHardTopicMasteryThreshold;

  const isWeak = scores.length > 0 && averageMastery < 60;

  return {
    topic,
    totalQuestions: topicQuestions.length,
    solvedQuestions: totalSolved,
    averageMastery,
    unlockedMedium,
    unlockedHard,
    isWeak,
  };
}

/**
 * Calculates topic summaries across all topics in a catalogue
 */
export function evaluateAllTopics(
  questions: IQuestion[],
  progressMap: Map<string, IQuestionProgress>,
  selectedList: QuestionListType,
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG
): Map<string, TopicProgressSummary> {
  const topicMap = new Map<string, IQuestion[]>();

  // Filter by selected list
  const listQuestions = questions.filter((q) =>
    selectedList === 'blind75' ? q.blind75 : q.neetcode150
  );

  for (const q of listQuestions) {
    for (const topic of q.topicTags) {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(q);
    }
  }

  const summaries = new Map<string, TopicProgressSummary>();

  for (const [topic, qList] of topicMap.entries()) {
    const summary = evaluateTopicMastery(topic, qList, progressMap, config);
    summaries.set(topic, summary);
  }

  return summaries;
}
