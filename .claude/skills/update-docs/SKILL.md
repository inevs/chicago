---
name: update-docs
description: Checks the project documentation against the current code changes and updates every affected document (docs/*.md, docs/architecture/*.md, README.md, CLAUDE.md, AGENTS.md). Use after any change to code, configuration, Docker setup, environment variables, scripts or dependencies, and always before creating a commit. Also use when the user asks to check, sync or update the documentation.
---

# Update documentation

Bring the documentation in line with the code after a change. Only touch documents that the change actually affects, and only state facts that you verified in the code.

## 1. Determine the change set

Find out what changed since the last state the documentation was in sync with:

```bash
git status --short
git diff HEAD --stat          # uncommitted changes
git diff HEAD                 # details
```

If the working tree is clean but the user refers to recent commits, use `git log --oneline -10` and `git diff <base>..HEAD` for the relevant range.

If the change set contains only documentation, tests or pure refactorings without observable behaviour change, say so and stop.

## 2. Map changes to documents

Use this table to find candidate documents. Then search for further mentions, because the table is not exhaustive:

```bash
grep -rn -i "<changed name, variable, port, command, endpoint>" docs README.md CLAUDE.md AGENTS.md
```

| Changed area | Documents to check |
|---|---|
| `docker-compose.yml`, `apps/*/Dockerfile`, `apps/dividends/nginx.conf` | `docs/DOCKER.md`, `README.md` ("Start the database", "Docker Database Management", "Running with Docker", "Project Structure"), `CLAUDE.md` (Docker section) |
| `.env.example`, new or removed environment variables, `process.env` / `ConfigService` usage | `docs/DOCKER.md` (variable table), `README.md` (variable table in "Set up environment variables", required variables in "Running with Docker"), `CLAUDE.md`, `AGENTS.md` |
| `package.json` scripts, `project.json` targets, `nx.json` | `CLAUDE.md` (commands), `README.md` ("Development Commands", "Database Commands"), `AGENTS.md` |
| Test setup, test runners, e2e test configuration (`apps/api-e2e`) | `README.md` ("Testing"), `CLAUDE.md` (Testing, test runners), `AGENTS.md` |
| Node, Angular, NestJS, Prisma, Tailwind versions, `.nvmrc` | `CLAUDE.md`, `README.md` ("Tech Stack", "Prerequisites"), `docs/architecture/02-constraints.md`, `docs/architecture/04-solution-strategy.md` |
| `apps/api/prisma/schema.prisma`, migrations | `docs/architecture/05-building-blocks.md`, `docs/architecture/11-glossary.md`, feature docs in `docs/` |
| Seed (`apps/api/prisma/seed.ts`) or container startup (`CMD` in `apps/api/Dockerfile`) | `README.md` ("Set up the database schema", "Data Management", "Running with Docker"), `docs/DOCKER.md` (startup process) |
| API port, global prefix or Swagger path (`apps/api/src/main.ts`), dev server port or proxy | `README.md` ("Start the application"), `CLAUDE.md`, `docs/DOCKER.md` |
| New or removed API module / controller / endpoint in `apps/api/src/app` | `docs/architecture/05-building-blocks.md`, `docs/architecture/03-context-and-scope.md`, matching feature doc |
| New, renamed or removed document in `docs/` | `README.md` ("Further Documentation"), every document that links to it (`grep -rn "<file name>"`) |
| Currencies, exchange rates | `docs/CURRENCY_FEATURE.md` |
| Security prices, market data sync | `docs/SECURITY_PRICES.md` |
| Toast / notification service in the frontend | `docs/TOAST_NOTIFICATION_SYSTEM.md` |
| Auth, validation, error handling, logging, other cross-cutting code | `docs/architecture/08-cross-cutting-concepts.md` |
| New Angular routes, pages, major components | `docs/architecture/05-building-blocks.md`, `README.md` |
| Project structure, new apps or packages, path aliases | `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/architecture/05-building-blocks.md` |
| Import file formats | `docs/samples/*.csv` and the docs that reference them |
| Something listed in `docs/architecture/12-improvement-recommendations.md` was implemented | Mark it done or remove it there |

## 3. Verify and update

For each candidate document:

1. Read the relevant sections.
2. Compare every concrete statement (ports, variable names, defaults, commands, file paths, endpoints, versions, behaviour) with the current code. Check the code, not your memory of it.
3. Fix statements that are wrong or outdated, add what is missing for the change, and remove what no longer exists.
4. Keep the existing language (the docs are English), structure, tone and formatting of each document. Do not rewrite sections that are still correct.
5. Do not invent facts. If something cannot be verified from the repository, leave it unchanged and mention it in the report.

Also check that file paths and `file:line` references in touched sections still exist.

Some facts are documented in several places and must stay consistent:

- Environment variables: the variable tables in `README.md` and `docs/DOCKER.md` and the comments in `.env.example`.
- Docker services, ports and startup behaviour: `README.md` ("Running with Docker") and `docs/DOCKER.md`.
- Commands: `README.md`, `CLAUDE.md` and `AGENTS.md`.
- Seed behaviour (what it creates, which variables it requires): `README.md` and `docs/DOCKER.md`.

In `README.md`, keep the quick start in "Getting Started" working step by step: `.env` before the database, `docker compose up -d postgres` (not the full stack) for local development, and the seed as a required step.

## 4. Report

End with a short summary for the user:

- which documents were changed and why (one line each)
- which documents were checked and found correct
- open points that could not be verified

Do not commit; the documentation changes go into the same commit as the code change when the user asks for a commit.
