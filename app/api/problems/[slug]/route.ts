import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { IQuestion } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    let question: IQuestion | null = null;

    try {
      await connectToDatabase();
      const dbQ = await Question.findOne({ slug, isActive: true }).lean();
      if (dbQ) {
        question = dbQ as unknown as IQuestion;
      }
    } catch (err) {
      console.warn('MongoDB query failed, attempting local fallback:', err);
    }

    if (!question) {
      const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
      if (fs.existsSync(cataloguePath)) {
        const raw = fs.readFileSync(cataloguePath, 'utf-8');
        const questions: IQuestion[] = JSON.parse(raw);
        question = questions.find((q) => q.slug === slug && q.isActive) || null;
      }
    }

    if (!question) {
      return NextResponse.json({ success: false, error: 'Problem not found' }, { status: 404 });
    }

    // Return problem details (safe for client, includes visible sample tests)
    return NextResponse.json({
      success: true,
      data: {
        canonicalId: question.canonicalId,
        slug: question.slug,
        title: question.title,
        officialDifficulty: question.officialDifficulty,
        topicTags: question.topicTags,
        blind75: question.blind75,
        neetcode150: question.neetcode150,
        officialUrl: question.officialUrl,
        starterCode: question.starterCode,
        description: question.description,
        authorizedExamples: question.authorizedExamples,
        sampleTestCases: question.sampleTestCases,
        expectedSolvingTimeSeconds: question.expectedSolvingTimeSeconds,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch problem', message: errorMsg },
      { status: 500 }
    );
  }
}
