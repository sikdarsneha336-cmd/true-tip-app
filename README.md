# Clearline

Clearline is a student project foundation for documenting unsafe situations without creating an account or providing direct identity details.

## What works today

- Multi-step incident reporting with validation and review before submission
- Explicit location choices: precise GPS, approximate area, or manual-only context
- Lovable Cloud persistence for reports and one-time retrieval codes
- Anonymous report retrieval with a status timeline
- Simulated AI assistance for category classification, structured extraction, similarity signals, and priority suggestions
- Privacy, safety, jurisdiction, retention, and emergency-service warnings

## Important limits

This is not a police reporting service and does not connect to real police or emergency systems. It does not guarantee anonymity, untraceability, legal confidentiality, police follow-up, or emergency response. The prototype does not request or store names, emails, phone numbers, accounts, passwords, or direct identity fields. A production system would additionally need protections against network and metadata-based identification.

AI results are advisory signals only. AI never determines whether a report is true or fake, never labels someone a liar, and never automatically rejects a report.

## Technology

- React and TypeScript
- TanStack Start and TanStack Router
- Tailwind CSS
- Lovable Cloud database through server functions
- Zod validation

## Run locally

```sh
bun install
bun run dev
```

The development server runs at `http://localhost:8080`.

## Architecture

```text
React/TanStack UI
        |
Typed server functions
        |
Validation + privacy boundary
        |
Lovable Cloud reports table
        |
Simulated AI analysis signals
```

The browser never writes directly to the reports table. Server functions validate report input, generate a random retrieval code, store only its hash, and return the code once to the reporter. There is no identity-based recovery mechanism.

## Report fields

The database stores incident category, approximate incident time, user-selected location detail, description, optional supporting details, status, advisory AI signals, submission time, and a retention deadline. Direct identity fields are intentionally absent.

## Future work

- Human reviewer interface and controlled status updates
- Real retention cleanup and audit policy
- Jurisdiction routing with explicit authority agreements
- Security hardening against network and metadata identification
- Evidence handling with metadata stripping and access controls
- Optional real AI service behind the same advisory-only interface

## Student-project warning

Do not use this project as a substitute for local emergency services or an official police reporting channel.