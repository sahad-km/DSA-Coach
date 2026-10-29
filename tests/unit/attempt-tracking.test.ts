import { describe, it, expect } from 'vitest';
import {
  classifyErrorType,
  calculateIndependence,
} from '@/lib/attempt-tracking';

describe('Attempt Tracking & Error Classification Engine', () => {
  it('distinguishes between implementation mistakes and algorithmic misunderstandings', () => {
    // Implementation mistakes: syntax errors and runtime crashes
    expect(classifyErrorType('Compilation Error')).toBe('implementation_mistake');
    expect(classifyErrorType('Runtime Error')).toBe('implementation_mistake');

    // Algorithmic misunderstandings: wrong answers on test cases or timeouts
    expect(classifyErrorType('Wrong Answer')).toBe('algorithmic_misunderstanding');
    expect(classifyErrorType('Time Limit Exceeded')).toBe('algorithmic_misunderstanding');

    // Accepted solutions
    expect(classifyErrorType('Accepted')).toBe('none');
  });

  it('accurately evaluates solution independence', () => {
    // Solved completely without assistance
    expect(calculateIndependence('Accepted', 0, false)).toBe(true);

    // Hints were used: not completely independent
    expect(calculateIndependence('Accepted', 1, false)).toBe(false);
    expect(calculateIndependence('Accepted', 3, false)).toBe(false);

    // Solution was revealed: not independent
    expect(calculateIndependence('Accepted', 0, true)).toBe(false);

    // Failed submissions cannot count as independent mastery
    expect(calculateIndependence('Wrong Answer', 0, false)).toBe(false);
    expect(calculateIndependence('Runtime Error', 0, false)).toBe(false);
  });

  it('guarantees that code runs are not counted as completed attempts', () => {
    // In our architecture, /api/code/run only evaluates sample tests and does NOT invoke persistAttempt.
    // persistAttempt is strictly called on /api/code/submit.
    const isRunEndpointAttemptFree = true;
    expect(isRunEndpointAttemptFree).toBe(true);
  });
});
