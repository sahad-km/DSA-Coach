import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { QuestionSeedSchema, QuestionSchema } from '@/lib/validations/question';

describe('Question Seed Data Validation', () => {
  const cataloguePath = path.resolve(__dirname, '../../data/questions.json');

  it('questions.json file exists and is valid JSON', () => {
    expect(fs.existsSync(cataloguePath)).toBe(true);
    const rawData = fs.readFileSync(cataloguePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('all questions strictly comply with QuestionSeedSchema', () => {
    const rawData = fs.readFileSync(cataloguePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    const result = QuestionSeedSchema.safeParse(parsed);
    if (!result.success) {
      console.error(result.error.format());
    }
    expect(result.success).toBe(true);
  });

  it('has unique canonicalId and slug for every question', () => {
    const rawData = fs.readFileSync(cataloguePath, 'utf-8');
    const questions = JSON.parse(rawData);

    const canonicalIds = new Set<string>();
    const slugs = new Set<string>();

    for (const q of questions) {
      expect(canonicalIds.has(q.canonicalId)).toBe(false);
      expect(slugs.has(q.slug)).toBe(false);
      canonicalIds.add(q.canonicalId);
      slugs.add(q.slug);
    }
  });

  it('every question belongs to at least one valid list', () => {
    const rawData = fs.readFileSync(cataloguePath, 'utf-8');
    const questions = JSON.parse(rawData);

    for (const q of questions) {
      expect(q.blind75 || q.neetcode150).toBe(true);
    }
  });

  it('contains valid starterCode and test cases for each question', () => {
    const rawData = fs.readFileSync(cataloguePath, 'utf-8');
    const questions = JSON.parse(rawData);

    for (const q of questions) {
      expect(q.starterCode.length).toBeGreaterThan(10);
      expect(q.sampleTestCases.length).toBeGreaterThan(0);
      expect(q.expectedSolvingTimeSeconds).toBeGreaterThan(0);
      expect(q.officialUrl.startsWith('http')).toBe(true);
    }
  });
});
