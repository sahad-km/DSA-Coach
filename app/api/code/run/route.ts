import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Question } from '@/models/Question';
import { IQuestion } from '@/lib/types';
import {
  extractFunctionName,
  generateTestHarnessScript,
  TestCase,
} from '@/lib/test-harness';
import { executeHarness } from '@/lib/judge0';

const RunCodeSchema = z.object({
  slug: z.string().min(1),
  code: z.string().min(1, 'Code cannot be empty'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RunCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { slug, code } = parsed.data;

    let question: IQuestion | null = null;
    try {
      await connectToDatabase();
      const dbQ = await Question.findOne({ slug }).lean();
      if (dbQ) question = dbQ as unknown as IQuestion;
    } catch (e) {
      console.warn('MongoDB query failed, using local catalogue fallback:', e);
    }

    if (!question) {
      const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
      if (fs.existsSync(cataloguePath)) {
        const raw = fs.readFileSync(cataloguePath, 'utf-8');
        const questions: IQuestion[] = JSON.parse(raw);
        question = questions.find((q) => q.slug === slug) || null;
      }
    }

    if (!question) {
      return NextResponse.json({ success: false, error: 'Problem not found' }, { status: 404 });
    }

    // Extract function name from starter code or user code
    const functionName =
      extractFunctionName(question.starterCode) || extractFunctionName(code) || 'solution';

    // Format sample test cases
    const sampleTests: TestCase[] = question.sampleTestCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expected: tc.expected,
      rawInputStr: tc.rawInputStr,
      isSample: true,
    }));

    if (sampleTests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sample test cases configured for this problem' },
        { status: 400 }
      );
    }

    // Build and execute harness
    const harnessScript = generateTestHarnessScript(code, functionName, sampleTests, false);
    const outcome = await executeHarness(harnessScript);

    return NextResponse.json({
      success: true,
      outcome,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/code/run:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Execution failed', message: errorMsg },
      { status: 500 }
    );
  }
}
