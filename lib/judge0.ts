import { ExecutionOutcome, parseHarnessOutput } from './test-harness';
import vm from 'vm';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

// Judge0 Language ID: 93 is Node.js 18.15.0, 63 is Node.js 12.14.0
const JAVASCRIPT_LANGUAGE_ID = 93;

interface Judge0SubmissionResponse {
  token: string;
}

interface Judge0PollResponse {
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
}

/**
 * Executes the generated test harness script via Judge0 asynchronous workflow,
 * or falls back to an isolated local Node.js sandbox if Judge0 credentials are not configured.
 */
export async function executeHarness(script: string): Promise<ExecutionOutcome> {
  // Check if Judge0 credentials are configured
  if (JUDGE0_API_KEY && JUDGE0_API_KEY.trim().length > 0) {
    try {
      return await executeWithJudge0(script);
    } catch (err) {
      console.warn('Judge0 execution failed or was rate-limited. Falling back to isolated sandbox:', err);
      return executeWithLocalSandbox(script, 'judge0_fallback');
    }
  }

  // Clearly documented boundary when external credentials are not set
  return executeWithLocalSandbox(script, 'local_sandbox');
}

/**
 * Submits and polls code on Judge0 API asynchronously
 */
async function executeWithJudge0(script: string): Promise<ExecutionOutcome> {
  // Step 1: Submit code to Judge0
  const submitUrl = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;

  const submitHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (JUDGE0_API_KEY) {
    submitHeaders['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    submitHeaders['X-RapidAPI-Host'] = JUDGE0_API_HOST;
  }

  const submitRes = await fetch(submitUrl, {
    method: 'POST',
    headers: submitHeaders,
    body: JSON.stringify({
      source_code: script,
      language_id: JAVASCRIPT_LANGUAGE_ID,
      cpu_time_limit: 5,
      wall_time_limit: 10,
      memory_limit: 128000,
    }),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    throw new Error(`Judge0 submission failed [${submitRes.status}]: ${errorText}`);
  }

  const submitData = (await submitRes.json()) as Judge0SubmissionResponse;
  const token = submitData.token;

  if (!token) {
    throw new Error('Judge0 did not return a valid submission token');
  }

  // Step 2: Poll Judge0 for result (max 20 attempts with 500ms delay = 10s max)
  const pollUrl = `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 500));
    attempts++;

    const pollRes = await fetch(pollUrl, {
      method: 'GET',
      headers: submitHeaders,
    });

    if (!pollRes.ok) {
      continue;
    }

    const pollData = (await pollRes.json()) as Judge0PollResponse;
    const statusId = pollData.status?.id;

    // 1: In Queue, 2: Processing -> continue polling
    if (statusId === 1 || statusId === 2) {
      continue;
    }

    // Finished processing
    const stdout = pollData.stdout || '';
    const stderr = pollData.stderr || pollData.compile_output || pollData.message || '';
    const timeMs = pollData.time ? Math.round(parseFloat(pollData.time) * 1000) : undefined;
    const memoryKb = pollData.memory || undefined;

    // Time Limit Exceeded (status 5)
    if (statusId === 5) {
      return {
        status: 'Time Limit Exceeded',
        totalTests: 0,
        passedTests: 0,
        results: [],
        runtimeOutput: 'Execution exceeded the 5-second time limit.',
        executionTimeMs: timeMs,
        provider: 'judge0',
      };
    }

    // Compilation Error (status 6)
    if (statusId === 6) {
      return {
        status: 'Compilation Error',
        totalTests: 0,
        passedTests: 0,
        results: [],
        compileOutput: stderr || 'Compilation / Syntax error',
        executionTimeMs: timeMs,
        provider: 'judge0',
      };
    }

    // Runtime Error (status 7-12)
    if (statusId >= 7 && statusId <= 12) {
      // If our harness partially output results before crashing
      const outcome = parseHarnessOutput(stdout, stderr, 'judge0');
      if (outcome.results.length === 0) {
        outcome.status = 'Runtime Error';
        outcome.runtimeOutput = stderr;
      }
      outcome.executionTimeMs = timeMs;
      outcome.memoryKb = memoryKb;
      return outcome;
    }

    // Status 3: Accepted (by Judge0 execution) or Status 4: Wrong Answer
    const outcome = parseHarnessOutput(stdout, stderr, 'judge0');
    outcome.executionTimeMs = timeMs || outcome.executionTimeMs;
    outcome.memoryKb = memoryKb;
    return outcome;
  }

  return {
    status: 'Time Limit Exceeded',
    totalTests: 0,
    passedTests: 0,
    results: [],
    runtimeOutput: 'Judge0 polling timed out before execution completed.',
    provider: 'judge0',
  };
}

/**
 * Isolated VM sandbox runner used when JUDGE0_API_KEY is not configured or offline.
 * Executes code within an isolated Node.js context with strict 3-second timeout.
 */
export function executeWithLocalSandbox(
  script: string,
  mode: 'local_sandbox' | 'judge0_fallback' = 'local_sandbox'
): Promise<ExecutionOutcome> {
  return new Promise((resolve) => {
    let capturedStdout = '';
    let capturedStderr = '';

    const sandbox = {
      console: {
        log: (...args: unknown[]) => {
          capturedStdout += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
        },
        error: (...args: unknown[]) => {
          capturedStderr += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
        },
        warn: (...args: unknown[]) => {
          capturedStderr += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
        },
      },
      process: {
        exit: () => {},
      },
      Date: Date,
      Math: Math,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Set: Set,
      Map: Map,
    };

    try {
      const context = vm.createContext(sandbox);
      const vmScript = new vm.Script(script);

      // Execute with a strict 3000ms CPU timeout
      vmScript.runInContext(context, { timeout: 3000 });

      const outcome = parseHarnessOutput(capturedStdout, capturedStderr, 'local_sandbox');
      resolve(outcome);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.stack || err.message : String(err);
      const isTimeout = errorMsg.includes('timed out') || errorMsg.includes('Script execution timed out');

      if (isTimeout) {
        resolve({
          status: 'Time Limit Exceeded',
          totalTests: 0,
          passedTests: 0,
          results: [],
          runtimeOutput: 'Execution timed out after 3000ms. Check for infinite loops or inefficient algorithms.',
          provider: 'local_sandbox',
        });
      } else {
        const outcome = parseHarnessOutput(capturedStdout, errorMsg, 'local_sandbox');
        resolve(outcome);
      }
    }
  });
}
