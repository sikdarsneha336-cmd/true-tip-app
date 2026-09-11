# Clearline

Clearline is a student project for documenting unsafe situations without creating an account or providing direct identity details. It is a reporting-flow foundation, not an official police or emergency service.

## Features

- Four-step report flow for category, incident timing, location, description, and review
- Explicit precise GPS, approximate-area, or manual-only location choices
- Server-side validation before a report is stored
- One-time retrieval code, returned once and stored only as a hash
- Private report retrieval with a redacted status timeline
- Simulated AI assistance for classification, structured extraction, similarity signals, and review-priority suggestions
- Privacy, retention, jurisdiction, human-review, and emergency-service notices
- No name, email, phone number, account, password, or direct identity fields

## Limits and safety

This project does not connect to police, emergency, or other authority systems. It does not guarantee anonymity, untraceability, legal confidentiality, police follow-up, or emergency response. Production use would require additional protections against network and metadata-based identification, access controls, operational policies, and jurisdiction agreements.

AI output is advisory only. It never decides whether a report is true or fake, labels anyone a liar, or automatically rejects a report. The retrieval code is not authentication and has no identity-based recovery if lost.

## Technology stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite
- Tailwind CSS v4
- TanStack Query
- Zod for server-input validation
- Lucide React for interface icons
- Lovable Cloud database, accessed by TanStack server functions

The application uses the browser Geolocation API only after the reporter explicitly chooses precise GPS. It has no evidence uploads, external AI API, police API, or separate Python/FastAPI service.

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
```

Do not commit `.env` or place real secrets in this README. The server-side report functions also require the project’s configured service-role database access; that value is supplied by the connected environment and is never exposed to the browser.

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

The database migration is stored at `supabase/migrations/20260910150201_21735335-c56f-42f5-9a77-7697a651572f.sql`. In the connected project environment, apply that migration before testing report submission or retrieval. It creates the reports table, access policies, indexes, and timestamp trigger. No seed data is required.

## Basic usage

1. Choose **Begin a report**.
2. Select a category, provide when it happened, and choose a location-sharing option.
3. Describe observable details, then review the information.
4. Submit and save the generated access code privately.
5. Use **Access my report** and enter the code to view the status timeline.

If someone is in immediate danger, contact local emergency services instead. Clearline does not provide emergency response.

## Project structure

```text
src/routes/index.tsx                 Main reporting and retrieval experience
src/routes/__root.tsx                Shared document shell and metadata
src/lib/reports.functions.ts         Validated submission and retrieval functions
src/integrations/supabase/           Generated database clients and types
src/styles.css                       Tailwind theme and global styles
supabase/migrations/                 Database schema and policy migration
public/favicon.ico                   Project favicon
roadmap.md                            Development checklist
.lovable/plan.md                      Separate development plan
```

## Troubleshooting

- If the page cannot load database-backed actions, confirm the generated environment variables are present and the reports migration has been applied.
- If precise location is unavailable or denied, choose approximate area or manual-only location instead.
- If a retrieval code is lost, it cannot be recovered through identity information.
- Run `bun run build` to check for production build issues before deployment.

## Deployment

The repository is configured for TanStack Start and can be deployed to a compatible hosting environment after `bun run build`. Configure the same database environment values in the deployment environment and apply the migration before enabling report actions. No official police integration is configured.

## Future improvements

- Controlled human reviewer workflow and status updates
- Retention cleanup and auditable access policy
- Explicit jurisdiction routing and authority agreements
- Stronger defenses against network and metadata identification
- Carefully designed evidence handling with metadata stripping
- An optional real AI service behind the same advisory-only interface

## Credits

The project uses open-source React, TanStack, Vite, Tailwind CSS, Zod, Lucide React, and database client libraries listed in `package.json`. No external datasets or user-uploaded media are used.