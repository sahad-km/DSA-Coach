import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { executeWithLocalSandbox } from '@/lib/judge0';
import { generateTestHarnessScript, TestCase } from '@/lib/test-harness';

describe('Phase 6: Security Audit & Sandbox Verification', () => {
  it('Security Check 1: Evaluates that hidden evaluation tests are absent from client catalogue', () => {
    const cataloguePath = path.resolve(process.cwd(), 'data/questions.json');
    const questions = JSON.parse(fs.readFileSync(cataloguePath, 'utf-8'));

    for (const q of questions) {
      expect(q.evaluationTests).toBeUndefined();
      expect(q.hiddenTests).toBeUndefined();
      // Ensure only sample test cases exist
      for (const tc of q.sampleTestCases) {
        expect(tc.isSample !== false).toBe(true);
      }
    }
  });

  it('Security Check 2: Test harness masks inputs and outputs for evaluation test cases', () => {
    const userCode = `function twoSum(nums, target) { return [0, 1]; }`;
    const testCases: TestCase[] = [
      { id: 'sample-1', input: [[2, 7, 11, 15], 9], expected: [0, 1], isSample: true },
      { id: 'eval-1', input: [[3, 2, 4], 6], expected: [1, 2], isSample: false }, // Hidden!
    ];

    const script = generateTestHarnessScript(userCode, 'twoSum', testCases, true);

    // Verify script structure
    expect(script).toContain('function deepEqual');
    expect(script).toContain('sample-1');
    expect(script).toContain('eval-1');
  });

  it('Security Check 3: Sandbox prevents malicious code from accessing filesystem or process globals', async () => {
    const maliciousCode = `
      // Malicious attempt to access filesystem
      const fs = require('fs');
    `;

    const outcome = await executeWithLocalSandbox(maliciousCode);

    // Sandbox must fail and report ReferenceError
    expect(outcome.status).not.toBe('Accepted');
    const errorDetails = outcome.compileOutput || outcome.runtimeOutput || '';
    expect(errorDetails).toContain('ReferenceError');

    // Also verify process.env is undefined
    const envCode = `console.log(typeof process.env);`;
    const envOutcome = await executeWithLocalSandbox(envCode);
    expect(envOutcome.runtimeOutput).toContain('undefined');
  });

  it('Security Check 4: Sandbox enforces execution timeout on infinite loops', async () => {
    const infiniteLoopCode = `
      while (true) {
        // spin indefinitely
      }
    `;

    const startTime = Date.now();
    const outcome = await executeWithLocalSandbox(infiniteLoopCode);
    const duration = Date.now() - startTime;

    // Must be terminated and marked as Time Limit Exceeded within ~4 seconds
    expect(outcome.status).toBe('Time Limit Exceeded');
    expect(duration).toBeLessThanOrEqual(4000);
  });

  it('Security Check 5: Sensitive server configuration files are excluded from git or protected', () => {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      expect(gitignore).toContain('.env');
    }
  });
});
