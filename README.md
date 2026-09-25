# Clearline

Clearline is a student project for documenting unsafe situations without creating an account or providing direct identity details. Reporters stay anonymous; authority staff review submissions on a separate, sign-in-protected desk. It is a reporting-flow foundation, not an official police or emergency service.

## Features

### Public reporting

- Four-step report flow for category, incident timing, location, description, and review
- Explicit precise GPS, approximate-area, or manual-only location choices
- Server-side validation before a report is stored
- One-time retrieval code, returned once and stored only as a hash
- Private report retrieval with a redacted status timeline
- AI-assisted advisory analysis: suggested classification, structured extraction, similarity/duplicate signals, and review-priority suggestions
- Privacy, retention, jurisdiction, human-review, and emergency-service notices
- No name, email, phone number, account, password, or direct identity fields

### Authority desk (sign-in protected)

- Email/password staff sign-in with no public self-registration
- Active reports listed newest first with category, status, location, and story — reporter identity is never shown or stored
- Linear workflow: Received → Under review → Action taken → Closed
- Per-report working notes and an automatic activity history (who changed what, and when)
- AI advisory signals shown alongside each report, clearly labelled as suggestions
- Administrator staff management: create officers, reset passwords, remove access (at least one administrator always remains)
- Each staff member can change their own password
- A staff guide page covering workflow, AI limits, and privacy rules

## Limits and safety

This project does not connect to police, emergency, or other authority systems. It does not guarantee anonymity, untraceability, legal confidentiality, police follow-up, or emergency response. Production use would require additional protections against network and metadata-based identification, access controls, operational policies, and jurisdiction agreements.

AI output is advisory only. It never decides whether a report is true or fake, labels anyone a liar, or automatically rejects a report. If AI analysis cannot be prepared, the report is still saved and the desk shows an "unavailable" marker. The retrieval code is not authentication and has no identity-based recovery if lost.

## Technology stack

- React 19 and TypeScript
- TanStack Start (server functions) and TanStack Router
- Vite
- Tailwind CSS v4
- TanStack Query
- Zod for server-input validation
- AI SDK (`ai` + `@ai-sdk/openai`) calling the Lovable AI Gateway (`openai/gpt-6-astra`, Responses API, streamed)
- Lucide React for interface icons
- Lovable Cloud (PostgreSQL) database, accessed by TanStack server functions with service-role privileged helpers

The application uses the browser Geolocation API only after the reporter explicitly chooses precise GPS. There are no evidence uploads and no police API integration.

## Requirements

- Bun
- A Lovable Cloud-connected project environment with the generated database environment variables available

## Configuration

The generated environment file supplies the browser and server database connection values. The expected variable names are:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY
```

Do not commit `.env` or place real secrets in this README. Server functions use the service-role database access only after verifying the signed-in caller's role; `LOVABLE_API_KEY` stays server-side.

## Installation and local development

Install dependencies:

```sh
bun install
```

Start the development server:

```sh
bun run dev
```

Open `http://localhost:8080`.

Create a production build:

```sh
bun run build
```

The database migrations live in `supabase/migrations/`. Apply them before testing. They create the `reports` table (hashed retrieval codes, location choices, status, AI analysis JSON, 90-day retention window), the `user_roles` table with an `authority`/`admin` role enum and a `has_role` security-definer helper, and the `report_updates` audit table. All client-facing policies deny direct access; data flows exclusively through server functions. Staff accounts are created by an administrator (or seeded manually against the auth admin API) — no seed data ships with the repo.

## Basic usage

### Reporting (public)

1. Choose **Begin a report**.
2. Select a category, provide when it happened, and choose a location-sharing option.
3. Describe observable details, then review the information.
4. Submit and save the generated access code privately.
5. Use **Access my report** and enter the code to view the status timeline.

### Reviewing (staff)

1. Choose the shield icon in the header and sign in.
2. Work reports on the desk: read the story, check the AI signals, move the stage forward, add notes.
3. Administrators can manage staff accounts at the bottom of the desk.
4. The **Staff guide** link explains workflow and AI limits in detail.

If someone is in immediate danger, contact local emergency services instead. Clearline does not provide emergency response.

## Project structure

```text
src/routes/index.tsx                        Main reporting and retrieval experience
src/routes/auth.tsx                         Staff sign-in
src/routes/_authenticated/authority.tsx     Authority review desk (workflow, notes, staff management)
src/routes/_authenticated/authority_.guide.tsx  Staff guide
src/routes/__root.tsx                       Shared document shell and metadata
src/lib/reports.functions.ts                Validated anonymous submission/retrieval + advisory AI
src/lib/analysis.server.ts                  AI Gateway advisory-analysis helper (server-only)
src/lib/ai-gateway.server.ts                Gateway provider factory (server-only)
src/lib/authority.functions.ts              Desk listing, status changes, notes, history
src/lib/staff.functions.ts                  Staff management (admin-only) and own-password change
src/integrations/supabase/                  Generated database clients and types
src/styles.css                              Tailwind theme and global styles
supabase/migrations/                        Database schema, policies, audit table
public/favicon.ico                          Project favicon
roadmap.md                                  Development checklist
```

## Troubleshooting

- If the page cannot load database-backed actions, confirm the generated environment variables are present and all migrations have been applied.
- If precise location is unavailable or denied, choose approximate area or manual-only location instead.
- If a retrieval code is lost, it cannot be recovered through identity information.
- If AI signals show as unavailable, the report is unaffected — analysis can be re-run later.
- Run `bun run build` to check for production build issues before deployment.

## Deployment

The repository is configured for TanStack Start and can be deployed to a compatible hosting environment after `bun run build`. Configure the same database environment values in the deployment environment and apply the migrations before enabling report actions. No official police integration is configured.

## Future improvements

- Retention cleanup and auditable access policy
- Explicit jurisdiction routing and authority agreements
- Stronger defenses against network and metadata identification
- Carefully designed evidence handling with metadata stripping
- Officer assignment and password-reset emails

## Credits

The project uses open-source React, TanStack, Vite, Tailwind CSS, Zod, the AI SDK, Lucide React, and database client libraries listed in `package.json`. No external datasets or user-uploaded media are used.
