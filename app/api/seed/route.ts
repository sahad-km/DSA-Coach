import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { QuestionSeedSchema } from '@/lib/validations/question';

export async function POST() {
  try {
    const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
    if (!fs.existsSync(cataloguePath)) {
      return NextResponse.json(
        { success: false, error: 'Catalogue file not found at data/questions.json' },
        { status: 404 }
      );
    }

    const rawData = fs.readFileSync(cataloguePath, 'utf-8');
    const parsedJson = JSON.parse(rawData);

    const validationResult = QuestionSeedSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Catalogue validation failed', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const questions = validationResult.data;
    await connectToDatabase();

    let upsertedCount = 0;
    for (const q of questions) {
      await Question.findOneAndUpdate(
        { canonicalId: q.canonicalId },
        { $set: q },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedCount++;
    }

    const blind75Count = await Question.countDocuments({ blind75: true });
    const neetcode150Count = await Question.countDocuments({ neetcode150: true });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${upsertedCount} questions.`,
      stats: {
        total: upsertedCount,
        blind75: blind75Count,
        neetcode150: neetcode150Count,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'Seeding failed', message: errorMsg },
      { status: 500 }
    );
  }
}
