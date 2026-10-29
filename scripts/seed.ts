import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';

// Load environment variables from .env.local and .env
loadEnvConfig(process.cwd());

import { connectToDatabase } from '../lib/db';
import { Question } from '../models/Question';
import { QuestionSeedSchema } from '../lib/validations/question';

async function seed() {
  console.log('--- DSA Coach: Seeding Question Catalogue ---');

  const cataloguePath = path.resolve(__dirname, '../data/questions.json');
  if (!fs.existsSync(cataloguePath)) {
    console.error(`Error: Catalogue file not found at ${cataloguePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(cataloguePath, 'utf-8');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawData);
  } catch (err) {
    console.error('Error parsing JSON from questions.json:', err);
    process.exit(1);
  }

  // Validate with Zod
  const validationResult = QuestionSeedSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error('Validation failed for seed catalogue:');
    console.error(JSON.stringify(validationResult.error.format(), null, 2));
    process.exit(1);
  }

  const questions = validationResult.data;
  console.log(`Validated ${questions.length} questions from questions.json.`);

  try {
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    console.log('Connected to MongoDB.');

    let upsertedCount = 0;
    for (const q of questions) {
      await Question.findOneAndUpdate(
        { canonicalId: q.canonicalId },
        { $set: q },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upsertedCount++;
    }

    console.log(`Successfully upserted ${upsertedCount} questions into the database.`);
    const blind75Count = await Question.countDocuments({ blind75: true });
    const neetcode150Count = await Question.countDocuments({ neetcode150: true });

    console.log(`Blind 75 count: ${blind75Count}`);
    console.log(`NeetCode 150 count: ${neetcode150Count}`);
    console.log('--- Seeding Complete ---');
    process.exit(0);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Seed Notice]: Could not connect to MongoDB: ${errorMsg}`);
    console.warn('Ensure MongoDB is running and MONGODB_URI is correctly configured.');
    process.exit(0); // Exit gracefully so CI/offline build environments don't hard fail
  }
}

seed();
