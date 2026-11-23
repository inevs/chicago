---
name: test-first-development
description: Test-first workflow for every code change in this repository (API, frontend, shared package). Write a test that describes the intended behaviour, show that it fails, get the user's review of the test, then implement without touching the test until it passes and the linter succeeds. Use before changing any production code, e.g. when implementing a GitHub issue, fixing a bug or adding a feature.
---

# Test-first development

Every change to production code starts with a test that describes the intended behaviour. The user reviews that test before any production code is written. After the review, the test is fixed: the implementation has to satisfy it, not the other way round.

## 1. Understand the change

- Read the issue or request and the affected code.
- If the change needs a refactoring first, do it now as described in "Refactorings" below, in its own commit.
- Decide which behaviour changes and in which project (`api`, `dividends`, `shared`). Choose the test level that describes the behaviour most directly (unit spec next to the code; `apps/api-e2e` only if the behaviour depends on the real database or HTTP layer).
- If the expected behaviour is ambiguous, ask the user before writing the test.

## 2. Write the test

- Add new test cases or adapt existing ones in the matching `*.spec.ts` file. Follow the conventions in `CLAUDE.md` (Jest for `api`/`api-e2e`, Vitest with `vi.*` APIs for `dividends`; service specs mock repositories, repository specs mock `PrismaService`).
- The test describes the **desired** behaviour in its name and assertions. Keep it as small as possible while still covering the change, including relevant edge cases.
- Do not change production code in this step. Exception: if the test cannot compile because a new function, method or type does not exist yet, add a minimal stub (e.g. a method that throws `new Error('Not implemented')`) so that the test fails on its assertion instead of a compile error. Mention every stub in the review request.
- Existing tests that contradict the new behaviour are adapted in this step, never later.

## 3. Show that the test fails (red)

Run the affected tests through Nx, for example:

```bash
# API (Jest 30): regex on the spec path
nx test api --testPathPatterns=<spec file name, e.g. data-import.repository>
# Frontend (Vitest): path relative to the workspace root, or a glob
nx test dividends --include=apps/dividends/src/app/<path>.spec.ts
```

- The new or changed tests must fail, and they must fail **for the expected reason** (the assertion about the new behaviour), not because of a syntax error, a missing import or an unrelated failure.
- If a test passes already, the behaviour exists or the test does not describe the change. Fix the test before continuing.
- All other tests should still pass. Report unrelated failures to the user instead of hiding them.

## 4. Ask the user to review the test

Stop and ask the user for a review. Do not write production code before the user has explicitly approved the test. The request contains:

- the spec file(s) and the names of the new or changed test cases
- the test code (or the diff) of those cases
- the failing test output (the relevant lines) showing that the tests fail for the expected reason
- any stubs added in step 2

If the user requests changes, adapt the test, run it again (step 3) and ask for a new review.

## 5. Implement

After the approval, implement the production code until the approved tests pass.

- **Do not change the approved tests afterwards** — no edits to their names, setup, mocks, inputs or assertions, no `skip`/`only`, no deleting them. This also applies to shared setup code (e.g. `beforeEach`, mock factories) that the approved tests rely on.
- If it turns out that an approved test is wrong or cannot be satisfied, stop, explain why and ask the user. A changed test needs a new review (step 4).
- Additional tests (e.g. for an edge case discovered during the implementation) may be added, but must be shown to the user in the final report.

## 6. Verify (green)

Run, through Nx:

```bash
nx run-many -t test
nx run-many -t lint
```

- All tests must pass, including the approved ones.
- The linter must finish without errors. Do not introduce new warnings in the changed files (check with `npx eslint <changed files>`).
- For API changes, also run `nx build api`; for frontend changes `nx build dividends`.
- Confirm that the approved tests are unchanged since the review, e.g. with `git diff` on the spec file compared to the reviewed version.

## 7. Finish

- Run the `update-docs` skill (`.claude/skills/update-docs/SKILL.md`).
- Report to the user: what was implemented, test and lint results (with output if something failed), and any additional tests added after the review.

## Refactorings

Refactorings (changes of structure without change of observable behaviour) are never mixed with functional changes.

- If a functional change requires a refactoring, do the refactoring **first, in its own commit**, before starting step 2 for the functional change.
- Before the refactoring, all tests must be green (`nx run-many -t test`). If they are not, stop and report to the user.
- A refactoring must not change any test. If changing a test is unavoidable (e.g. a renamed method that a spec calls directly), stop, show the user the intended test change and wait for the review before continuing.
- After the refactoring, all tests must be green again and the linter must succeed (step 6). Then commit the refactoring on its own and continue with the functional change.

## Scope

This workflow applies to every change of observable behaviour in `apps/` and `packages/`. Refactorings follow the section above. For changes that only touch documentation, configuration or dependencies, ask the user whether the workflow applies.
