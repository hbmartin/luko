# Repository Guidelines

## Project Structure & Module Organization

The Next.js `app/` folder hosts public (`login/`, `auth/`) and protected (`app/(protected)/`) routes. Shared UI sits in `components/`, server helpers and Supabase bindings live in `lib/` and `supabase/`, and styling/fonts reside in `styles/` and `assets/`. Static assets belong in `public/`, longer-form docs in `docs/`, and browser specs in `e2e/`. Keep unit tests next to their feature; reserve `e2e/` for cross-page flows.

## Build, Test, and Development Commands

`pnpm dev` starts the Turbopack dev server on :3000. `pnpm build` creates the production bundle and `pnpm start` runs it locally. `pnpm lint` / `pnpm lint:fix` apply the ESLint stack (Next, Unicorn, security, Tailwind) and `pnpm format` applies Prettier. `pnpm test`, `pnpm test:watch`, and `pnpm test:coverage` run Vitest suites. Use `pnpm e2e:headless` (or `pnpm e2e:ui`) for Playwright debugging.

## Coding Style & Naming Conventions

Write strict TypeScript with named exports so the `@/` alias tree-shakes cleanly. Use PascalCase for components (`NotebookGrid`), camelCase for hooks/utilities (`useNotebookQuery`), and SCREAMING_SNAKE_CASE only for env constants enforced in `env.mjs`. Compose UI with Tailwind plus the `class-variance-authority` helpers under `components/ui`. Run Prettier (two-space indent, double quotes in TSX) and ensure ESLint is clean before pushing. Always import validated env values instead of reading `process.env` inline.

## Testing Guidelines

Vitest loads via `vitest.config.ts` and `vitest.setup.ts`; keep `*.test.ts(x)` files next to the modules they cover. Focus on Supabase auth helpers, notebook reducers, and math utilities in `lib/`, and prefer lightweight fixtures for faster CI. `pnpm test:coverage` should hold existing percentages, and any snapshot churn must be intentional. Playwright specs live in `e2e/` (`example.spec.ts` is the template); target `data-testid` attributes and run `pnpm e2e:headless` before opening a PR.

## Commit & Pull Request Guidelines

Commits use short imperative subjects (“cache loadNotebook”), so match that tone and scope. Note Supabase schema or Drizzle migration impacts in the body. PRs must state the problem, summarize the fix, link issues, and attach screenshots/Looms for UI changes in `app/(protected)`. Confirm lint, Vitest, and Playwright locally, list any new env vars, and wait for CI to finish before assigning reviewers.

## Configuration & Security Tips

Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_VERCEL_URL`. Update `env.mjs` whenever a new variable is introduced so missing configs fail fast. Never commit Supabase service keys or DB creds—lean on the `supabase/` templates and the shared secret manager. Keep observability hooks (`instrumentation.ts`, OTEL setup) behind environment guards so dev data stays local.
