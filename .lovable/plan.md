# Clearline — pilot-ready completion

Goal: turn the working prototype into a pilot-ready app. Public report flow, retrieval flow, `public.reports` schema, and existing RLS deny-all policy stay as they are.

## 1. Real AI analysis (advisory only)

Replace `createMockAnalysis` in `src/lib/reports.functions.ts` with a real Lovable AI call.

- Add `src/lib/ai-gateway.server.ts` with the gateway provider helpers (run-id fetch wrapper).
- On submission, after the report row is saved, call `openai/gpt-6-astra` through the gateway Responses API (streaming consumed server-side, structured output) to produce the advisory payload: classification, structured extraction (incident type / time / location), a concise neutral summary, duplicate/similarity check against the most recent reports of the same category, and a priority suggestion. Reasoning effort `low`; strict-compatible schema.
- The analysis is written to the existing `ai_analysis` JSON column and marked `human_review_required: true`. AI never decides truth, never auto-rejects, and a failed AI call never blocks or delays the report — the row is saved with analysis marked unavailable.
- Duplicate check: fetch recent same-category descriptions server-side, pass to the AI as candidates only; the result is a suggestion listing possible matches, nothing more.

## 2. Officer management and passwords

- Extend `app_role` enum with `admin`. The existing demo account becomes `admin`; new officers get `authority`.
- New staff panel on the authority desk (admin-only): create officer accounts (email + initial password, email pre-confirmed), list staff, reset an officer's password.
- Signed-in officers can change their own password on the desk.
- Self-registration stays off.

## 3. Officer notes and audit trail

- New `public.report_updates` table: report_id, officer_user_id, kind (`status_change` | `note`), old/new status, note text, created_at; RLS deny-all, service-role writes via server functions; GRANTs per policy.
- `updateReportStatus` records a status-change entry; officers can add free-text notes to any report; the desk shows each report's full history (what changed, when) with no reporter identity anywhere.

## 4. Staff how-to guide

- In-app guide page at `/authority/guide` (sign-in required): how to sign in, work the Received → Under review → Action taken → Closed flow, read the AI advisory signals, add notes, manage staff, and the privacy rules (never identify reporters; AI is advisory only).
- Link to it from the desk header; README updated to match the real implementation.

## 5. Publish the live site

- After everything above passes, re-publish so the live URL serves the current build with the database settings attached (fixes the blank-screen "Missing Supabase environment variable(s)" error on the old snapshot).
- Run the security scan before publishing.

## Verification

- Build clean; run the security scan.
- Submit a real test report: confirm AI analysis appears (classification, extraction, duplicate signal, priority), and that a failed AI call still saves the report.
- Sign in as admin: create a second officer account, reset its password, sign in as that officer, change own password.
- On the desk: add a note, change status, confirm the audit history renders and persists.
- Playwright end-to-end: home → report flow → retrieval; sign-in → desk → guide page. No console errors.

## Deferred, not excluded

- Automatic 90-day deletion job (reports are currently hidden after 90 days, not purged).
- Officer self-registration with approval workflow, email-based password-reset emails, officer assignment to reports, real police-system integration.
