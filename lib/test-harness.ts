import { Difficulty, SubmissionResult } from './types';

export interface TestCase {
  id: string;
  input: unknown[];
  expected: unknown;
  rawInputStr?: string;
  isSample?: boolean;
}

export interface TestCaseResult {
  id: string;
  passed: boolean;
  isSample: boolean;
  input?: unknown[];
  expected?: unknown;
  actual?: unknown;
  rawInputStr?: string;
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface ExecutionOutcome {
  status: SubmissionResult;
  totalTests: number;
  passedTests: number;
  results: TestCaseResult[];
  compileOutput?: string;
  runtimeOutput?: string;
  executionTimeMs?: number;
  memoryKb?: number;
  provider: 'judge0' | 'local_sandbox';
}

/**
 * Extracts the primary function name from starter code or user code
 */
export function extractFunctionName(code: string): string | null {
  // Matches "function functionName(" or "const functionName = function(" or "var functionName = ("
  const funcMatch = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (funcMatch) return funcMatch[1];

  const arrowMatch = code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
  if (arrowMatch) return arrowMatch[1];

  return null;
}

/**
 * Generates an executable JavaScript script combining user code,
 * deep equality checker, and test case execution.
 */
export function generateTestHarnessScript(
  userCode: string,
  functionName: string,
  testCases: TestCase[],
  isEvaluation: boolean = false
): string {
  const serializedTestCases = JSON.stringify(testCases);

  return `
"use strict";

// User Solution
${userCode}

// Deep Equality Comparator
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  // Numbers (handle NaN)
  if (typeof a === 'number') {
    return Number.isNaN(a) && Number.isNaN(b) ? true : a === b;
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

// Clone helper to prevent mutation across tests
function deepClone(val) {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(deepClone);
  const copy = {};
  for (const k of Object.keys(val)) {
    copy[k] = deepClone(val[k]);
  }
  return copy;
}

// Execution Harness
const testCases = ${serializedTestCases};
const results = [];
let allPassed = true;
let hasRuntimeError = false;

const isEval = ${isEvaluation};

if (typeof ${functionName} !== 'function') {
  console.log("/*__TEST_RESULTS_START__*/" + JSON.stringify({
    status: 'Compilation Error',
    totalTests: testCases.length,
    passedTests: 0,
    results: [],
    compileOutput: "Function '${functionName}' is not defined. Ensure your function is named '${functionName}'.",
    executionTimeMs: 0
  }) + "/*__TEST_RESULTS_END__*/");
  process.exit(0);
}

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const startTime = Date.now();
  let actual;
  let passed = false;
  let errorMsg = null;

  try {
    const clonedInputs = deepClone(tc.input);
    actual = ${functionName}.apply(null, clonedInputs);
    passed = deepEqual(actual, tc.expected);
  } catch (err) {
    hasRuntimeError = true;
    errorMsg = err instanceof Error ? err.stack || err.message : String(err);
    passed = false;
  }
  const duration = Date.now() - startTime;

  if (!passed) allPassed = false;

  results.push({
    id: tc.id,
    passed,
    isSample: !!tc.isSample,
    rawInputStr: tc.rawInputStr,
    // For evaluation tests that are not samples, mask input/expected to prevent leaking
    input: (tc.isSample || !isEval) ? tc.input : undefined,
    expected: (tc.isSample || !isEval) ? tc.expected : undefined,
    actual: (tc.isSample || !isEval) ? actual : undefined,
    errorMessage: errorMsg,
    executionTimeMs: duration
  });
}

const finalStatus = hasRuntimeError
  ? 'Runtime Error'
  : allPassed
  ? 'Accepted'
  : 'Wrong Answer';

const passedCount = results.filter(r => r.passed).length;

const payload = {
  status: finalStatus,
  totalTests: testCases.length,
  passedTests: passedCount,
  results: results,
  executionTimeMs: results.reduce((acc, r) => acc + (r.executionTimeMs || 0), 0)
};

console.log("/*__TEST_RESULTS_START__*/" + JSON.stringify(payload) + "/*__TEST_RESULTS_END__*/");
`;
}

/**
 * Parses the stdout produced by the test harness script
 */
export function parseHarnessOutput(
  stdout: string,
  stderr: string,
  fallbackProvider: 'judge0' | 'local_sandbox' = 'judge0'
): ExecutionOutcome {
  const startMarker = '/*__TEST_RESULTS_START__*/';
  const endMarker = '/*__TEST_RESULTS_END__*/';

  const startIndex = stdout.indexOf(startMarker);
  const endIndex = stdout.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const jsonStr = stdout.substring(startIndex + startMarker.length, endIndex);
    try {
      const parsed = JSON.parse(jsonStr);
      return {
        ...parsed,
        runtimeOutput: stdout.substring(0, startIndex).trim() || undefined,
        provider: fallbackProvider,
      };
    } catch (e) {
      console.error('Failed to parse harness JSON:', e);
    }
  }

  // If stderr contains syntax errors or fatal crashes
  if (stderr && stderr.trim().length > 0) {
    const isSyntax = stderr.includes('SyntaxError') || stderr.includes('Unexpected');
    return {
      status: isSyntax ? 'Compilation Error' : 'Runtime Error',
      totalTests: 0,
      passedTests: 0,
      results: [],
      compileOutput: stderr.trim(),
      runtimeOutput: stdout.trim(),
      provider: fallbackProvider,
    };
  }

  return {
    status: 'Runtime Error',
    totalTests: 0,
    passedTests: 0,
    results: [],
    compileOutput: 'No output or test markers detected during execution.',
    runtimeOutput: stdout.trim(),
    provider: fallbackProvider,
  };
}
