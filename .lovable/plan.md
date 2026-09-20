# Fix the "Missing Supabase environment variables" error

## Diagnosis (confirmed)

- The error is **not** caused by a missing `.env` file. The project's `.env` exists and contains all six Supabase variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` and their `VITE_` counterparts).
- Local builds pass (latest two builds: OK) and the local preview at `localhost:8080` renders the home page with no such error.
- The error's stack trace points to a deployed bundle on a `lovable.app` URL — a **published deployment** built before the Supabase environment binding was in place. The deployed site is stale, not the project.

## Fix

1. **Re-bind the Supabase runtime environment** using the platform's rebind action (idempotent; refreshes the runtime env vars without rotating keys).
2. **Verify** the local preview still renders cleanly (home page loads, no console error).
3. **Re-publish the site** so the deployed bundle picks up the environment variables and the error disappears on the live URL.

## Unchanged

- No database, code, or schema changes.
