import { describe, it, expect } from 'vitest';
import {
  extractFunctionName,
  generateTestHarnessScript,
  parseHarnessOutput,
  TestCase,
} from '@/lib/test-harness';

describe('Test Harness & Comparator Engine', () => {
  it('extracts function names accurately from varied JS declarations', () => {
    expect(extractFunctionName('function twoSum(nums, target) { return []; }')).toBe('twoSum');
    expect(extractFunctionName('const isAnagram = (s, t) => true;')).toBe('isAnagram');
    expect(extractFunctionName('function   containsDuplicate  (nums) {}')).toBe('containsDuplicate');
  });

  it('generates a valid test harness script', () => {
    const userCode = 'function twoSum(nums, target) { return [0, 1]; }';
    const testCases: TestCase[] = [
      { id: '1', input: [[2, 7], 9], expected: [0, 1], isSample: true },
    ];

    const script = generateTestHarnessScript(userCode, 'twoSum', testCases, false);
    expect(script).toContain('function deepEqual');
    expect(script).toContain('twoSum.apply(null, clonedInputs)');
    expect(script).toContain('/*__TEST_RESULTS_START__*/');
    expect(script).toContain('/*__TEST_RESULTS_END__*/');
  });

  it('parses valid accepted harness JSON output', () => {
    const mockStdout = `
Some user log
/*__TEST_RESULTS_START__*/{
  "status": "Accepted",
  "totalTests": 2,
  "passedTests": 2,
  "results": [
    { "id": "1", "passed": true, "isSample": true },
    { "id": "2", "passed": true, "isSample": true }
  ],
  "executionTimeMs": 15
}/*__TEST_RESULTS_END__*/
`;
    const outcome = parseHarnessOutput(mockStdout, '');
    expect(outcome.status).toBe('Accepted');
    expect(outcome.totalTests).toBe(2);
    expect(outcome.passedTests).toBe(2);
    expect(outcome.results[0].passed).toBe(true);
    expect(outcome.runtimeOutput).toContain('Some user log');
  });

  it('parses wrong answer harness output', () => {
    const mockStdout = `
/*__TEST_RESULTS_START__*/{
  "status": "Wrong Answer",
  "totalTests": 2,
  "passedTests": 1,
  "results": [
    { "id": "1", "passed": true, "isSample": true },
    { "id": "2", "passed": false, "isSample": true, "expected": [0, 1], "actual": [1, 2] }
  ]
}/*__TEST_RESULTS_END__*/
`;
    const outcome = parseHarnessOutput(mockStdout, '');
    expect(outcome.status).toBe('Wrong Answer');
    expect(outcome.totalTests).toBe(2);
    expect(outcome.passedTests).toBe(1);
    expect(outcome.results[1].passed).toBe(false);
  });

  it('parses compilation / syntax errors from stderr', () => {
    const stderr = 'SyntaxError: Unexpected token "}" at line 4';
    const outcome = parseHarnessOutput('', stderr);
    expect(outcome.status).toBe('Compilation Error');
    expect(outcome.compileOutput).toContain('SyntaxError');
    expect(outcome.passedTests).toBe(0);
  });

  it('masks evaluation test inputs and expected outputs in evaluation mode', () => {
    const userCode = 'function twoSum(nums, target) { return [0, 1]; }';
    const testCases: TestCase[] = [
      { id: 'sample-1', input: [[2, 7], 9], expected: [0, 1], isSample: true },
      { id: 'eval-hidden-1', input: [[100, 200], 300], expected: [0, 1], isSample: false },
    ];

    const script = generateTestHarnessScript(userCode, 'twoSum', testCases, true);
    // In the generated script, for isSample === false && isEval === true, input and expected are set to undefined
    expect(script).toContain('(tc.isSample || !isEval) ? tc.input : undefined');
    expect(script).toContain('(tc.isSample || !isEval) ? tc.expected : undefined');
  });
});
