'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { NextQuestionCard } from '@/components/dashboard/NextQuestionCard';
import { ListSummaryCard } from '@/components/dashboard/ListSummaryCard';
import { TopicMasteryCard } from '@/components/dashboard/TopicMasteryCard';
import { RevisionQueueCard } from '@/components/dashboard/RevisionQueueCard';
import { StreakSummary } from '@/components/dashboard/StreakSummary';
import {
  QuestionListType,
  NextQuestionRecommendation,
  IQuestion,
  IQuestionProgress,
  TopicProgressSummary,
  LearningStage,
} from '@/lib/types';
import {
  StreakStats,
  RevisionQueueItem,
  DifficultyBreakdown,
} from '@/lib/adaptive/analytics';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Code2,
  Search,
  Filter,
  Layers,
  Flame,
} from 'lucide-react';

export default function DashboardPage() {
  const [selectedList, setSelectedList] = useState<QuestionListType>('blind75');
  const [recommendation, setRecommendation] = useState<NextQuestionRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState<boolean>(true);

  // Search & Filter in Problem Catalogue
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');

  // Analytics Data
  const [analyticsData, setAnalyticsData] = useState<{
    stats: {
      totalQuestions: number;
      solvedCount: number;
      attemptedCount: number;
      dueReviewCount: number;
    };
    streak: StreakStats;
    topics: TopicProgressSummary[];
    weakestTopics: TopicProgressSummary[];
    strongestTopics: TopicProgressSummary[];
    revisionQueue: RevisionQueueItem[];
    difficultyBreakdown: DifficultyBreakdown;
  }>({
    stats: { totalQuestions: 0, solvedCount: 0, attemptedCount: 0, dueReviewCount: 0 },
    streak: {
      currentStreak: 0,
      bestStreak: 0,
      solvedToday: 0,
      attemptedToday: 0,
      activeSecondsToday: 0,
      lastActiveDate: null,
      activeDaysLast30: [],
    },
    topics: [],
    weakestTopics: [],
    strongestTopics: [],
    revisionQueue: [],
    difficultyBreakdown: {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 },
    },
  });

  const [questions, setQuestions] = useState<Array<IQuestion & { progress?: IQuestionProgress | null }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch recommendation
  const fetchRecommendation = useCallback(async (list: QuestionListType) => {
    setIsRecLoading(true);
    try {
      const res = await fetch(`/api/questions/next?list=${list}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setRecommendation(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recommendation:', err);
    } finally {
      setIsRecLoading(false);
    }
  }, []);

  // Fetch full analytics & questions
  const fetchDashboardData = useCallback(async (list: QuestionListType) => {
    setIsLoading(true);
    try {
      const [analyticsRes, questionsRes] = await Promise.all([
        fetch(`/api/analytics?list=${list}`),
        fetch(`/api/questions?list=${list}`),
      ]);

      if (analyticsRes.ok) {
        const aJson = await analyticsRes.json();
        if (aJson.success) {
          setAnalyticsData({
            stats: aJson.stats,
            streak: aJson.streak,
            topics: aJson.topics || [],
            weakestTopics: aJson.weakestTopics || [],
            strongestTopics: aJson.strongestTopics || [],
            revisionQueue: aJson.revisionQueue || [],
            difficultyBreakdown: aJson.difficultyBreakdown || {
              easy: { solved: 0, total: 0 },
              medium: { solved: 0, total: 0 },
              hard: { solved: 0, total: 0 },
            },
          });
        }
      }

      if (questionsRes.ok) {
        const qJson = await questionsRes.json();
        if (qJson.success) {
          setQuestions(qJson.questions || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update when selected list changes
  useEffect(() => {
    fetchRecommendation(selectedList);
    fetchDashboardData(selectedList);
  }, [selectedList, fetchRecommendation, fetchDashboardData]);

  // Compute overall learning stage
  const hasUnlockedMedium = analyticsData.topics.some((t) => t.unlockedMedium);
  const hasUnlockedHard = analyticsData.topics.some((t) => t.unlockedHard);
  const learningStage: LearningStage = hasUnlockedHard
    ? 'Advanced'
    : hasUnlockedMedium
    ? 'Mixed Easy/Medium'
    : 'Easy';

  // Filtered Questions Catalogue
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topicTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDifficulty =
      difficultyFilter === 'All' || q.officialDifficulty === difficultyFilter;

    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Header
        selectedList={selectedList}
        onSelectList={(list) => setSelectedList(list)}
        learningStage={learningStage}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. Recommendation Engine Spotlight */}
        <section aria-labelledby="recommendation-heading">
          <NextQuestionCard
            recommendation={recommendation}
            selectedList={selectedList}
            isLoading={isRecLoading}
            onRefresh={() => {
              fetchRecommendation(selectedList);
              fetchDashboardData(selectedList);
            }}
          />
        </section>

        {/* 2. Streak & Daily Progress Tracker */}
        <section aria-labelledby="streak-heading">
          <StreakSummary
            streak={analyticsData.streak}
            difficultyBreakdown={analyticsData.difficultyBreakdown}
          />
        </section>

        {/* 3. List Summary & Difficulty Unlocks */}
        <section aria-labelledby="summary-heading">
          <ListSummaryCard
            selectedList={selectedList}
            stats={analyticsData.stats}
            topics={analyticsData.topics}
          />
        </section>

        {/* 4. Spaced Revision Queue & Weak Topics Priority */}
        <section aria-labelledby="revision-heading">
          <RevisionQueueCard
            queue={analyticsData.revisionQueue}
            weakestTopics={analyticsData.weakestTopics}
          />
        </section>

        {/* 5. Topic Mastery Breakdown & Difficulty Gates */}
        <section aria-labelledby="topics-heading">
          <TopicMasteryCard
            topics={analyticsData.topics}
            selectedList={selectedList}
          />
        </section>

        {/* 6. Problem Catalogue for Selected List */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {selectedList === 'blind75' ? 'Blind 75' : 'NeetCode 150'} Catalogue
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Explore canonical problems, official difficulties, and your personal mastery.
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search problem or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 font-mono w-48 sm:w-60 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      difficultyFilter === diff
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              Loading catalogue...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No questions found matching your filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3 font-semibold">STATUS</th>
                    <th className="pb-3 font-semibold">TITLE</th>
                    <th className="pb-3 font-semibold">DIFFICULTY</th>
                    <th className="pb-3 font-semibold">TOPICS</th>
                    <th className="pb-3 font-semibold">EST. TIME</th>
                    <th className="pb-3 font-semibold">MASTERY</th>
                    <th className="pb-3 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredQuestions.map((q) => {
                    const status = q.progress?.status || 'New';
                    const masteryScore = q.progress?.masteryScore || 0;

                    return (
                      <tr
                        key={q.canonicalId}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Status Badge */}
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              status === 'Mastered'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : status === 'Familiar'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : status === 'Learning'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : status === 'Needs Practice'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="py-3.5 font-sans font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                          <a href={`/problems/${q.slug}`} className="hover:underline">
                            {q.title}
                          </a>
                        </td>

                        {/* Official Difficulty */}
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              q.officialDifficulty === 'Easy'
                                ? 'badge-easy'
                                : q.officialDifficulty === 'Medium'
                                ? 'badge-medium'
                                : 'badge-hard'
                            }`}
                          >
                            {q.officialDifficulty}
                          </span>
                        </td>

                        {/* Topic Tags */}
                        <td className="py-3.5 font-sans text-slate-400">
                          {q.topicTags.join(', ')}
                        </td>

                        {/* Est Time */}
                        <td className="py-3.5 text-slate-400">
                          {Math.round(q.expectedSolvingTimeSeconds / 60)}m
                        </td>

                        {/* Personal Mastery */}
                        <td className="py-3.5">
                          {q.progress && q.progress.attemptCount > 0 ? (
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[11px] font-bold ${
                                  masteryScore >= 80
                                    ? 'text-emerald-400'
                                    : masteryScore >= 60
                                    ? 'text-blue-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {masteryScore}%
                              </span>
                              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${
                                    masteryScore >= 80
                                      ? 'bg-emerald-500'
                                      : masteryScore >= 60
                                      ? 'bg-blue-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${masteryScore}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 text-right space-x-2 font-sans">
                          <a
                            href={`/problems/${q.slug}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-colors"
                          >
                            <Code2 className="h-3 w-3" />
                            <span>Solve</span>
                          </a>
                          <a
                            href={q.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                            title="Official Problem on LeetCode"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
        DSA Coach • Adaptive Learning Platform • Deterministic Mastery Engine
      </footer>
    </div>
  );
}
