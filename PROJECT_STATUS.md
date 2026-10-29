# DSA Coach — Project Status & Architecture Guide

## 1. Project Overview
DSA Coach is a personal adaptive Data Structures and Algorithms learning platform built with Next.js 15 (App Router), TypeScript (strict mode), Tailwind CSS, shadcn/ui, MongoDB (Mongoose), Monaco Editor, and Judge0.
The platform intelligently tracks problem-solving metrics and uses deterministic adaptive algorithms (no LLMs) to estimate personal difficulty, assess topic mastery, schedule revisions, and recommend the optimal next question.

---

## 2. Current Status: Production Release Complete — All 6 Phases COMPLETED ✅

### Summary of Completed Phases
- [x] **Phase 1: Project Setup, MongoDB Models, Seed Catalogue & Adaptive Question Selector**:
  - Next.js 15 App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui.
  - Zod schemas, Mongoose models (`Question`, `QuestionProgress`, `Attempt`).
  - Idempotent seed script (`npm run seed`) with canonical catalogue (`data/questions.json`).
  - 5-tier deterministic adaptive selector (`lib/adaptive/select-next-question.ts`).
- [x] **Phase 2: Monaco Editor, JavaScript Starter Code & Judge0 Integration**:
  - Full two-panel workspace (`app/problems/[slug]/page.tsx`).
  - Monaco editor with localStorage draft persistence and reset action.
  - Active solving timer with pause/resume logic.
  - Test harness (`lib/test-harness.ts`) and sandboxed execution (`lib/judge0.ts`) with VM fallback.
  - Server-side hidden evaluation test suite (`data/evaluation-tests.json`).
- [x] **Phase 3: Attempt Tracking & Reliable Submission Results**:
  - Error classification heuristic (`implementation_mistake` vs `algorithmic_misunderstanding`).
  - Automatic attempt tracking and persistence on submission.
  - Submissions tab in workspace with snapshot code restoration.
- [x] **Phase 4: Personal Mastery Scoring, Topic Progression & Revision Scheduling**:
  - 0–100 personal mastery scoring combining 4 normalized signals (Time 30%, Independence 30%, Accuracy 20%, Retention 20%).
  - Cold-start weight redistribution (proportional allocation across available signals).
  - Independence guarantee (revealing solution or using hints caps mastery at 45).
  - Spaced revision scheduler with 5 retention tiers (1, 2, 4, 7, 14–30 days).
  - Outlier-trimmed topic mastery calculation.
  - Live **ADAPTIVE MASTERY** feedback banner in workspace.
- [x] **Phase 5: Dashboard Analytics, Topic Mastery Breakdown & Settings**:
  - Daily solving streak calculator with yesterday grace period and 7-day mini momentum tracker.
  - Spaced revision queue with overdue alert badges and weak topic priority banner.
  - Topic mastery breakdown with 0–100% visual bars and Easy/Medium/Hard difficulty unlock gates.
  - Settings page (`/settings`) allowing customization of scoring weights, revision intervals, and progression gates.
- [x] **Phase 6: Automated Integration Tests, Security Audit & Final Release**:
  - Comprehensive integration test suite (`tests/integration/scenarios.test.ts`) covering all 16 required user journey scenarios from Section 14.
  - Dedicated security audit (`tests/integration/security.test.ts`) verifying hidden test isolation, sandboxed execution timeouts, and environment variable protection.
  - All 57 automated tests passing across 8 test suites (`npm test`).
  - Production build passing with 0 errors across all 12 routes (`npm run build`).
  - Full browser end-to-end verification recorded and verified.

---

## 3. Architecture Decisions

### A. Shared Canonical Questions, Isolated Progress
- Questions shared between Blind 75 and NeetCode 150 (e.g. *Two Sum*) are stored once in the `Question` collection with membership flags (`blind75: true`, `neetcode150: true`).
- User progress is tracked in `QuestionProgress` keyed by `(questionId, selectedList)`. Progress made while solving in Blind 75 remains strictly segregated from NeetCode 150.

### B. Pure Deterministic Adaptive Selection
- The recommendation engine in `lib/adaptive/select-next-question.ts` is implemented as pure, framework-agnostic TypeScript functions without any external AI/LLM dependency.
- Deterministic priority hierarchy: Overdue reviews > Weak topics > Unseen active topic problems > New difficulty unlocks > Proactive reviews.

### C. Error Classification Heuristic
- Syntax and runtime crashes indicate syntax typos or undefined references (`implementation_mistake`), preventing false negative penalties against algorithmic aptitude.
- Wrong answers or timeouts represent logic failures or suboptimal complexity (`algorithmic_misunderstanding`).

### D. Cold Start & Outlier Trimming
- First-time solves do not suffer a 20% penalty for missing historical retention; the 20% weight is proportionally redistributed to the 3 active signals.
- In topics with $\ge 4$ attempted problems, the single lowest outlier is trimmed when evaluating average topic mastery, preventing an unusually punishing question from locking progression.

### E. Security & Sandbox Boundary
- Hidden evaluation tests are never bundled in client distributions and are strictly loaded server-side.
- User code is evaluated either via Judge0 or in an isolated Node.js VM context with restricted global access and a hard CPU timeout.

---

## 4. Commands to Run

```bash
# Install dependencies
npm install

# Run database seed
npm run seed

# Run unit & integration tests (57 tests)
npm test

# Run development server
npm run dev

# Run production build
npm run build
```

---

## 5. Verification Results

| Check | Tool / Runner | Result |
|---|---|---|
| Complete Test Suite (57/57) | `vitest run` | Passed (0 failures across 8 test suites) |
| Type Check & Bundling | `next build` | Passed (exit code 0, 12 static/dynamic routes) |
| Dashboard UI & List Selector | Browser Subagent | Verified (`dashboard_ui_verification`) |
| Workspace & Code Execution | Browser Subagent | Verified (`workspace_execution_verification`) |
| Attempt Tracking & Submissions Tab | Browser Subagent | Verified (`submission_attempt_tracking`) |
| Adaptive Mastery Feedback Banner | Browser Subagent | Verified (`adaptive_feedback_banner_verified`) |
| Dashboard Analytics & Settings Page | Browser Subagent | Verified (`phase5_dashboard_analytics_verification`) |
| Full End-to-End User Journey | Browser Subagent | Verified (`phase6_final_e2e_verification`) |
