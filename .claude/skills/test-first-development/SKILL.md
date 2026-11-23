---
name: test-first-development
description: Test-first workflow for every code change in this repository (API, frontend, shared package), including refactorings. Write a test that describes the intended behaviour, show that it fails, get the user's review of the test, then implement without touching the approved test until all tests pass and the linter succeeds. Use this skill before changing any production code in apps/ or packages/, even if the user does not mention tests, e.g. "implement issue #42", "fix the import bug", "add a field to the modal", "rename this service", "change how X is calculated".
---

# Test-first development

Every change to production code starts with a test that describes the intended behaviour. The user reviews that test before any production code is written. After the review, the test is frozen: the implementation has to satisfy the test, not the other way round.

Why: the test is the specification the user agreed to. If it could still change during the implementation, it would silently adapt to whatever the code does, and the review would be worthless.

## 1. Understand the change

- Read the issue or request and the affected code.
- If the change needs a refactoring first, do it now as described in "Refactorings" below, in its own commit.
- Decide which behaviour changes and in which project (`api`, `dividends`, `shared`). Choose the test level that describes the behaviour most directly (unit spec next to the code; `apps/api-e2e` only if the behaviour depends on the real database or HTTP layer).
- If the expected behaviour is ambiguous, ask the user before writing the test.
- If the change cannot reasonably be expressed as an automated test (e.g. pure styling or layout), say so before starting and ask the user how the change should be verified instead. Do not write an artificial test that only mirrors the implementation.

## 2. Write the test

- Add new test cases or adapt existing ones in the matching `*.spec.ts` file. Follow the conventions in `CLAUDE.md` (Jest for `api`/`api-e2e`, Vitest with `vi.*` APIs for `dividends`; service specs mock repositories, repository specs mock `PrismaService`).
- The test describes the **desired** behaviour in its name and assertions. For a bug, the test reproduces the bug. Keep it as small as possible while still covering the change, including relevant edge cases.
- Do not change production code in this step. Exception: if the test cannot compile because a new function, method or type does not exist yet, add a minimal stub (e.g. a method that throws `new Error('Not implemented')`) so that the test fails on its assertion instead of a compile error. Mention every stub in the review request.
- Existing tests that contradict the new behaviour are adapted in this step, never later, so that the user reviews them together with the new tests.

## 3. Show that the test fails (red)

First run the affected spec file through Nx:

```bash
# API (Jest 30): regex on the spec path
nx test api --testPathPatterns=<spec file name, e.g. data-import.repository>
# Frontend (Vitest): path relative to the workspace root, or a glob
nx test dividends --include=apps/dividends/src/app/<path>.spec.ts
```

Then run the whole suite with `nx run-many -t test`.

- The new or changed tests must fail **for the expected reason**: the assertion about the new behaviour, not a syntax error, a missing import or an unrelated failure. Only a failure for the right reason proves that the test actually checks the change; a test that fails for another reason may still pass with a wrong implementation.
- If a test passes already, the behaviour exists or the test does not describe the change. Fix the test before continuing.
- In the full suite, only the new or changed tests may fail. Report unrelated failures to the user instead of hiding them, because they would otherwise be mistaken for effects of the change later.

## 4. Ask the user to review the test

Stop and ask the user for a review. Do not write production code before the user has explicitly approved the test. Write the request in the user's language and use this structure:

1. **Intended behaviour**: one or two sentences on what the change does.
2. **Tests**: the spec file(s), the names of the new or changed test cases and their code (or the diff). For adapted existing tests, say why they had to change.
3. **Red output**: the relevant lines of the failing test output, showing that the tests fail for the expected reason, plus the totals of the full suite.
4. **Stubs**: any stubs added in step 2, or "none".
5. **Consequences** the user should consciously approve, if any (e.g. changed data, changed API responses).
6. **Staging hint**: ask the user to put the approved spec files into the Git index with `git add <spec files>` when approving. The staged version is the reference for checking later that the approved tests stayed unchanged.
7. An explicit question whether the test is approved.

If the user requests changes, adapt the test, run it again (step 3) and ask for a new review.

After the approval, check with `git diff --cached --name-only` that the approved spec files are staged. If they are not, remind the user once more; if the user asks you to do it, run the `git add` yourself.

## 5. Implement

After the approval, implement the production code until the approved tests pass.

- **Do not change the approved tests afterwards**: no edits to their names, setup, mocks, inputs or assertions, no `skip`/`only`, no deleting them. This also applies to shared setup code (e.g. `beforeEach`, mock factories) that the approved tests rely on, because changing the setup changes what the tests check.
- If it turns out that an approved test is wrong or cannot be satisfied, stop, explain why and ask the user. A changed test needs a new review (step 4), including staging the new version.
- Additional tests (e.g. for an edge case discovered during the implementation) go through the same review as in step 4 before they are added to an approved spec file, so that the staged version stays the approved reference. List them in the final report.

## 6. Verify (green)

Run, through Nx:

```bash
nx run-many -t test
nx run-many -t lint
```

- All tests must pass, including the approved ones.
- The linter must finish without errors, and the changed files must not get new warnings (check with `npx eslint <changed files>`). Fix warnings in the code; do not silence them with `eslint-disable` comments or by changing the lint configuration, because that only hides the problem.
- For API changes, also run `nx build api`; for frontend changes `nx build dividends`.
- Confirm that the approved tests are unchanged since the review: `git diff --exit-code -- <approved spec files>` must report no differences between the working tree and the staged, approved version.

## 7. Finish

- Run the `update-docs` skill (`.claude/skills/update-docs/SKILL.md`).
- Report to the user: what was implemented, test, lint and build results (with output if something failed), the result of the unchanged-test check, and any additional tests added after the review.

## Refactorings

Refactorings (changes of structure without change of observable behaviour) are never mixed with functional changes. Kept apart, each commit can be reviewed on its own terms: the refactoring must not change behaviour, the functional change must not hide structural changes.

- If a functional change requires a refactoring, do the refactoring **first, in its own commit**, before starting step 2 for the functional change.
- Before the refactoring, all tests must be green (`nx run-many -t test`). If they are not, stop and report to the user, because a failing test can no longer show whether the refactoring broke something.
- A refactoring must not change any test; the existing tests are the proof that the behaviour stayed the same. If changing a test is unavoidable (e.g. a renamed method that a spec calls directly), stop, show the user the intended test change and wait for the review before continuing.
- After the refactoring, all tests must be green again and the linter must succeed (step 6). Run the `update-docs` skill, then commit the refactoring on its own and continue with the functional change.

## Scope

This workflow applies to every change of behaviour in `apps/` and `packages/`. Refactorings follow the section above. For changes that only touch documentation, configuration or dependencies, ask the user whether the workflow applies.
