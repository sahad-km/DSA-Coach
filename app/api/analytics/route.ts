import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { QuestionProgress } from '@/models/QuestionProgress';
import { Attempt } from '@/models/Attempt';
import { NextQuestionQuerySchema } from '@/lib/validations/question';
import { IQuestion, IQuestionProgress, IAttempt } from '@/lib/types';
import { evaluateAllTopics } from '@/lib/adaptive/topic-mastery';
import {
  calculateStreak,
  getRevisionQueue,
  getTopicStrengthsAndWeaknesses,
  getDifficultyBreakdown,
} from '@/lib/adaptive/analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = NextQuestionQuerySchema.safeParse({
      list: searchParams.get('list') || 'blind75',
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const selectedList = parsedQuery.data.list;
    let questions: IQuestion[] = [];
    const progressMap = new Map<string, IQuestionProgress>();
    let attempts: IAttempt[] = [];

    try {
      await connectToDatabase();

      // Fetch questions
      const dbQuestions = await Question.find({
        isActive: true,
        ...(selectedList === 'blind75' ? { blind75: true } : { neetcode150: true }),
      })
        .select('-sampleTestCases')
        .lean();

      if (dbQuestions && dbQuestions.length > 0) {
        questions = dbQuestions as unknown as IQuestion[];
      }

      // Fetch progress
      const progressDocs = await QuestionProgress.find({ selectedList }).lean();
      for (const doc of progressDocs) {
        progressMap.set(doc.questionId, doc as unknown as IQuestionProgress);
      }

      // Fetch attempts
      const attemptDocs = await Attempt.find({ selectedList })
        .sort({ completedAt: -1 })
        .lean();
      attempts = attemptDocs as unknown as IAttempt[];
    } catch (dbErr) {
      console.warn('MongoDB query failed, falling back to local files:', dbErr);
    }

    // Fallback to local files if database empty or offline
    if (questions.length === 0) {
      const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
      if (fs.existsSync(cataloguePath)) {
        const fileContent = fs.readFileSync(cataloguePath, 'utf-8');
        const rawQuestions: IQuestion[] = JSON.parse(fileContent);
        questions = rawQuestions
          .filter((q) => (selectedList === 'blind75' ? q.blind75 : q.neetcode150))
          .map(({ sampleTestCases, ...rest }) => rest as unknown as IQuestion);
      }
    }

    // Compute Topic Progress & Unlock Gates
    const topicSummariesMap = evaluateAllTopics(questions, progressMap, selectedList);
    const topics = Array.from(topicSummariesMap.values());

    // Analytics Computations
    const streak = calculateStreak(attempts);
    const revisionQueue = getRevisionQueue(questions, progressMap);
    const { weakestTopics, strongestTopics } = getTopicStrengthsAndWeaknesses(topics);
    const difficultyBreakdown = getDifficultyBreakdown(questions, progressMap);

    // High-level statistics
    const totalQuestions = questions.length;
    let solvedCount = 0;
    let attemptedCount = 0;
    let dueReviewCount = 0;
    const now = new Date();

    for (const q of questions) {
      const prog = progressMap.get(q.canonicalId);
      if (prog) {
        if (prog.acceptedCount > 0) solvedCount++;
        if (prog.attemptCount > 0) attemptedCount++;
        if (prog.nextReviewAt && new Date(prog.nextReviewAt) <= now) {
          dueReviewCount++;
        }
      }
    }

    // Recent 5 attempts with question title
    const questionTitleMap = new Map(questions.map((q) => [q.canonicalId, q.title]));
    const questionSlugMap = new Map(questions.map((q) => [q.canonicalId, q.slug]));
    const recentAttempts = attempts.slice(0, 5).map((att) => ({
      ...att,
      questionTitle: questionTitleMap.get(att.questionId) || att.questionId,
      questionSlug: questionSlugMap.get(att.questionId) || att.questionId,
    }));

    return NextResponse.json({
      success: true,
      selectedList,
      stats: {
        totalQuestions,
        solvedCount,
        attemptedCount,
        dueReviewCount,
      },
      streak,
      topics,
      weakestTopics,
      strongestTopics,
      revisionQueue,
      difficultyBreakdown,
      recentAttempts,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/analytics:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: errorMsg },
      { status: 500 }
    );
  }
}
