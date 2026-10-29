import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Attempt } from '@/models/Attempt';

const AttemptsQuerySchema = z.object({
  questionId: z.string().min(1),
  list: z.enum(['blind75', 'neetcode150']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = AttemptsQuerySchema.safeParse({
      questionId: searchParams.get('questionId'),
      list: searchParams.get('list') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { questionId, list } = parsed.data;

    try {
      await connectToDatabase();
      const query: Record<string, unknown> = { questionId };
      if (list) query.selectedList = list;

      const attempts = await Attempt.find(query)
        .sort({ completedAt: -1 })
        .limit(20)
        .lean();

      return NextResponse.json({
        success: true,
        data: attempts,
      });
    } catch (err) {
      console.warn('MongoDB connection error, returning empty attempts:', err);
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attempts', message: errorMsg },
      { status: 500 }
    );
  }
}
