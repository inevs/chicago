# Repository Guidelines

## Project Structure & Module Organization
- `apps/api`: NestJS backend with Prisma (schema in `apps/api/prisma/schema.prisma`, generated client in `apps/api/generated/prisma`). Services access the database only through repositories (`*.repository.ts`), provided by the global `DatabaseModule` (`apps/api/src/app/database`).
- `apps/dividends`: Angular 22 frontend (standalone components, SCSS, API proxy in `apps/dividends/proxy.conf.json`).
- `apps/api-e2e`: API end-to-end tests (Jest).
- `packages/shared`: Shared types/utilities, imported via `@dividends/shared`.
- `docs`, `scripts`, `mock`, `dist`: documentation, tooling scripts, fixtures, and build outputs.

## Build, Test, and Development Commands
- `nx serve dividends`: Run full stack (API + frontend dev server).
- `nx serve api`: Run API only.
- `nx build api|dividends`: Build a single project.
- `nx test api|dividends|shared`: Run unit tests (Jest for `api` and `shared`, Vitest for `dividends`).
- `nx e2e api-e2e`: Run API e2e tests.
- `nx lint <project>` or `nx run-many -t lint`: Run linting.
- `nx run-many -t build|test` or `nx affected -t build|test|lint`: Batch or affected-only targets.
- `npm run db:generate`, `npm run db:migrate`: Prisma client generation and migrations.
- `docker compose up -d postgres`: Start local PostgreSQL (required before migrations); `docker compose up -d` starts the full stack.
- `scripts/redeploy.sh` (`npm run docker:redeploy`): Rebuild all Docker images and restart the stack after a change (runs tests first; `--skip-tests`, `--no-cache`).

## Coding Style & Naming Conventions
- TypeScript and SCSS are the defaults; format with Prettier (single quotes, 2-space indentation).
- ESLint uses Nx module boundaries; keep cross-project imports via `@dividends/shared`.
- Test files live under `src/` and use `*.spec.ts` or `*.test.ts`.

## Testing Guidelines
- The API (`apps/api`), the e2e tests (`apps/api-e2e`) and the shared package (`packages/shared`) use Jest; the Angular frontend (`apps/dividends`) uses Vitest via the `@angular/build:unit-test` builder (use `vi.fn()`, `vi.spyOn()` and Vitest fake timers instead of `fakeAsync`).
- Run relevant unit tests with `nx test <project>` and e2e with `nx e2e api-e2e`.
- When changing API endpoints, shared types, or UI flows, update or add tests to match.
- Work test-first (`.claude/skills/test-first-development/SKILL.md`): write a test describing the change and show that it fails, get the test reviewed by the user (who stages the approved tests with `git add`), then implement without changing the approved test until all tests pass and lint succeeds. Refactorings go into their own commit before the functional change, start and end with all tests green and must not change tests without the user's review.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and usually lowercase (e.g., "fix memory leak").
- Call out Prisma schema or migration changes explicitly in commits/PRs.
- PRs should include a brief summary, tests run, and screenshots for UI changes; link related issues when available.

## Environment & Configuration
- Use Node `v24.22.3` from `.nvmrc`.
- Copy `.env.example` to `.env` for local configuration.
