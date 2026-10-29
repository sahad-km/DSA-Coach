import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { QuestionProgress } from '@/models/QuestionProgress';
import { selectNextQuestion } from '@/lib/adaptive/select-next-question';
import { NextQuestionQuerySchema } from '@/lib/validations/question';
import { IQuestion, IQuestionProgress } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = NextQuestionQuerySchema.safeParse({
      list: searchParams.get('list') || 'blind75',
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsedQuery.error.format() },
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
      }).lean();

      if (dbQuestions && dbQuestions.length > 0) {
        questions = dbQuestions as unknown as IQuestion[];

        // Fetch user progress for this list
        const progressDocs = await QuestionProgress.find({ selectedList }).lean();
        for (const doc of progressDocs) {
          progressMap.set(doc.questionId, doc as unknown as IQuestionProgress);
        }
      }
    } catch (dbErr) {
      console.warn('MongoDB query failed or not connected, falling back to local catalogue:', dbErr);
    }

    // Fallback if database is empty or not yet seeded
    if (questions.length === 0) {
      const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
      if (fs.existsSync(cataloguePath)) {
        const fileContent = fs.readFileSync(cataloguePath, 'utf-8');
        const rawQuestions: IQuestion[] = JSON.parse(fileContent);
        questions = rawQuestions.filter((q) =>
          selectedList === 'blind75' ? q.blind75 : q.neetcode150
        );
      }
    }

    const recommendation = selectNextQuestion({
      questions,
      progressMap,
      selectedList,
      now: new Date(),
    });

    return NextResponse.json({
      success: true,
      selectedList,
      data: recommendation,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/questions/next:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: errorMsg },
      { status: 500 }
    );
  }
}
