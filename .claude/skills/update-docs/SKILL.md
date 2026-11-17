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
| `docker-compose.yml`, `apps/*/Dockerfile`, `apps/dividends/nginx.conf` | `docs/DOCKER.md`, `README.md`, `CLAUDE.md` (Docker section) |
| `.env.example`, new or removed environment variables, `process.env` / `ConfigService` usage | `docs/DOCKER.md` (variable table), `README.md`, `CLAUDE.md`, `AGENTS.md` |
| `package.json` scripts, `project.json` targets, `nx.json` | `CLAUDE.md` (commands), `README.md`, `AGENTS.md` |
| Node, Angular, NestJS, Prisma, Tailwind versions, `.nvmrc` | `CLAUDE.md`, `README.md`, `docs/architecture/02-constraints.md`, `docs/architecture/04-solution-strategy.md` |
| `apps/api/prisma/schema.prisma`, migrations, seed | `docs/architecture/05-building-blocks.md`, `docs/architecture/11-glossary.md`, feature docs in `docs/` |
| New or removed API module / controller / endpoint in `apps/api/src/app` | `docs/architecture/05-building-blocks.md`, `docs/architecture/03-context-and-scope.md`, matching feature doc |
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

## 4. Report

End with a short summary for the user:

- which documents were changed and why (one line each)
- which documents were checked and found correct
- open points that could not be verified

Do not commit; the documentation changes go into the same commit as the code change when the user asks for a commit.
