import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { QuestionProgress } from '@/models/QuestionProgress';
import { NextQuestionQuerySchema } from '@/lib/validations/question';
import { IQuestion, IQuestionProgress } from '@/lib/types';
import { calculateTopicSummaries } from '@/lib/adaptive/select-next-question';

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

    try {
      await connectToDatabase();
      const dbQuestions = await Question.find({
        isActive: true,
        ...(selectedList === 'blind75' ? { blind75: true } : { neetcode150: true }),
      })
        .select('-sampleTestCases') // omit sample tests from general catalogue list
        .lean();

      if (dbQuestions && dbQuestions.length > 0) {
        questions = dbQuestions as unknown as IQuestion[];

        const progressDocs = await QuestionProgress.find({ selectedList }).lean();
        for (const doc of progressDocs) {
          progressMap.set(doc.questionId, doc as unknown as IQuestionProgress);
        }
      }
    } catch (dbErr) {
      console.warn('MongoDB query failed, falling back to local catalogue:', dbErr);
    }

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

    const topicSummaries = Array.from(
      calculateTopicSummaries(questions, progressMap, selectedList).values()
    );

    // Compute high-level stats
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

    return NextResponse.json({
      success: true,
      selectedList,
      stats: {
        totalQuestions,
        solvedCount,
        attemptedCount,
        dueReviewCount,
      },
      topics: topicSummaries,
      questions: questions.map((q) => ({
        ...q,
        progress: progressMap.get(q.canonicalId) || null,
      })),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: errorMsg },
      { status: 500 }
    );
  }
}
