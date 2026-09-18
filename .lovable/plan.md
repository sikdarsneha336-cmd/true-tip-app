# Authority sign-in and report review desk

## Goal

Turn the placeholder ☰ menu icon into a working authority entry point: a login icon in the header leads to a sign-in page for police/authority staff, and signed-in staff can view submitted reports and update each report's status. Reporters' experience stays unchanged.

## Experience

1. **Header change**
   - Replace the mobile-only ☰ (`Menu`) icon with a login icon (`LogIn`), visible on all screen sizes.
   - Clicking it navigates to the authority desk at `/authority`.
   - When a session exists, the same spot shows a shield icon linking to the desk instead.

2. **Sign-in page (`/auth`)**
   - Public email + password sign-in form for authority staff, styled in the existing Clearline look.
   - No public sign-up: accounts are provisioned for staff, not self-registered.
   - After sign-in, redirect to `/authority`. Provide a sign-out action there.

3. **Authority desk (`/authority`, protected)**
   - Lists all active reports (newest first) with category, incident date, location mode/label, current status, submitted time, and the advisory AI signals already stored.
   - Each report can be moved through: Received → Under review → Action taken → Closed.
   - No reporter identity exists or is shown; the desk works only with report content.
   - Signed-out visitors are redirected to `/auth` by the protected layout.

4. **First account and future officers**
   - Create one initial authority account via the Auth Admin API (email confirmed, strong generated password shared with the user in chat).
   - Structure supports adding more officers later: a `user_roles` table with an `authority` role plus a `has_role` check function.

## Technical details

- **Database migration**
  - `create type public.app_role as enum ('authority');`
  - `public.user_roles` table (user_id references auth.users, role, unique pair) with `GRANT SELECT` to `authenticated`, `GRANT ALL` to `service_role`, RLS enabled.
  - `public.has_role(_user_id uuid, _role app_role)` security-definer function for non-recursive role checks.
- **Server functions** in `src/lib/authority.functions.ts`
  - `listAuthorityReports` and `updateReportStatus`, both `.middleware([requireSupabaseAuth])`.
  - Each handler first verifies the caller via `has_role` on `context.supabase`, then loads `supabaseAdmin` inside the handler for the privileged read/update (reports RLS stays closed to clients).
  - Zod-validate report id and allowed status values.
- **Routes**
  - `src/routes/auth.tsx` — public sign-in page.
  - `src/routes/_authenticated/route.tsx` — integration-managed gate shape (`ssr: false`, redirect to `/auth` when no session).
  - `src/routes/_authenticated/authority.tsx` — protected desk route.
- **Auth config**
  - Enable email/password sign-in; disable public signups and anonymous users.
  - Initial user is created with email already confirmed, so no confirmation email flow is needed.
- **Header session state**
  - Subscribe to `supabase.auth.onAuthStateChange` once in `src/routes/__root.tsx` and invalidate the router on sign-in/out so the header icon reflects the session.
- **Unchanged**
  - The public report flow, retrieval flow, schema for `public.reports`, and existing RLS deny-all policy remain as they are.
- **Verification**
  - Check build output; then use Playwright to confirm the login icon shows, sign-in works, the desk lists reports, and a status change persists.

## Out of scope

- Officer self-registration, password-reset emails, audit logs, assigning reports to specific officers, or any real police-system integration.
