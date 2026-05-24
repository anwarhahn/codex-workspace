# Durable Plans Guidance

This directory stores durable implementation, investigation, migration, and
validation plans that future Codex sessions should be able to execute or
continue without reading chat history.

## Scope

- Store handoff-worthy plans here when the plan itself is the durable artifact.
- Store reusable prompts that create plans under `durable/prompts/`, not beside
  the resulting plan.
- Store raw evidence, logs, screenshots, command output, downloaded API
  payloads, and scratch scripts under `sessions/<session_id>/`, not here.
- Store final reports, review artifacts, or summarized evidence under the
  matching durable output location in this workspace, not beside the plan.
- Do not store secrets, credentials, tokens, cookies, raw auth payloads, or
  unredacted user/customer data in plan files.

## Top-Level Contents

- Do not create loose plan files directly under `durable/plans/`.
- Every plan artifact file must live inside an enclosing top-level plan
  collection directory.
- The only expected top-level entries are plan collection directories and this
  `AGENTS.md` guidance file.
- If a plan would naturally be a single file, create an appropriately named
  collection directory first and put the plan inside it.
- Do not create generic new files named `PLAN.md`, `TODO.md`, `STATUS.md`,
  `draft.md`, `notes.md`, or `implementation.md`.
- Prefix every plan collection directory with a UTC timestamp so collections
  sort chronologically, following the same timestamp style as
  `sessions/AGENTS.md`.
- Do not create bare date directories or date-only filenames. The timestamp is
  a sorting prefix on the collection directory and repeated in the primary plan
  filename.

## Plan Filename Rule

Name plan files with this format:

```text
<timestamp>-<scope>-<work_id>-<short_slug>.plan.md
```

Generic examples:

```text
20260521T120000Z-service-issue-123-cache-staleness-remediation/20260521T120000Z-service-issue-123-cache-staleness-remediation.plan.md
20260521T123015Z-frontend-incident-456-dynamic-import-recovery/20260521T123015Z-frontend-incident-456-dynamic-import-recovery.plan.md
20260521T210000Z-codex-migration-workspace-reorganization/20260521T210000Z-codex-migration-workspace-reorganization.plan.md
```

Use `.plan.md` for durable plans. Do not use extension-only naming such as
`PLAN.md`, even inside collections, for new artifacts.

## Collection Directory Rule

Create a plan collection directory with this format:

```text
<timestamp>-<scope>-<work_id>-<short_slug>/
```

The primary plan inside the collection must repeat the collection basename:

```text
<timestamp>-<scope>-<work_id>-<short_slug>/<timestamp>-<scope>-<work_id>-<short_slug>.plan.md
```

Additional plan files inside the collection must still use the plan filename
rule. Keep supporting files plainly named when they are not plans, for example:

```text
README.md
status.md
validation.md
decision-log.md
```

## Component Rules

### `timestamp`

The timestamp records when the durable plan collection was created or accepted
into this repository.

Rules:

- Use UTC.
- Use exactly this format:

```text
YYYYMMDDTHHMMSSZ
```

- Put exactly one hyphen between the timestamp and the normalized slug.
- For migrated existing plans, prefer the first git commit time when the
  artifact entered this repository. If that is unavailable, use the migration
  time and keep the original purpose in the slug.

### `scope`

The scope identifies the repository, service, subsystem, or durable workflow
the plan targets.

Preferred values, in order:

1. Repository or worktree basename, normalized.
2. Service or subsystem slug.
3. Durable workflow or artifact family, such as:
   - `local-cleanup`
   - `agent-orchestration`
   - `dashboard-panel-descriptions`

Fallbacks:

- If the checkout is unknown but a pull-request URL is known, use the
  repository name.
- If only an external system is known, use that system name.
- If no meaningful scope is available, use `codex`.

### `work_id`

The work ID is the most stable identifier for the task. It is always required;
use a fallback rather than omitting it.

Preferred values, in order:

1. Issue or ticket identifier, normalized to lowercase.
2. Pull-request identifier, for example `pr-123`.
3. Build, issue, dashboard, job, notebook, or incident identifier.
4. Branch name slug if it is the only stable identifier.

Fallbacks:

- If there is no external ID but there is a clear workflow type, use that type:
  - `investigation`
  - `implementation-plan`
  - `migration`
  - `validation`
  - `rollback`
- If there is no stable ID or workflow type, use `adhoc`.

### `short_slug`

The slug describes the plan's concrete purpose.

Rules:

- Use 3 to 8 meaningful words when possible.
- Prefer nouns and verbs that describe the planned work:
  - `slow-query-remediation`
  - `runtime-validation`
  - `dead-endpoints-cleanup`
  - `workspace-reorganization`
- Keep it specific enough that two plans for the same `scope` and `work_id`
  can be distinguished.

Fallbacks:

- If the task is still unclear, use the action type:
  - `investigation`
  - `implementation`
  - `validation`
  - `handoff`
  - `rollback`
- If no useful action is known, stop and clarify before creating a durable
  plan. Do not create `scratch` plans in `durable/plans/`.

## Normalization

Normalize every filename and directory component before using it:

- Use lowercase ASCII letters, digits, and single hyphens only: `a-z`, `0-9`,
  and `-`, except for the required uppercase `T` and `Z` in the timestamp
  prefix.
- Replace spaces, underscores, slashes, colons, dots, and other separators with
  hyphens.
- Collapse repeated hyphens.
- Trim leading and trailing hyphens.
- Remove quotes, shell metacharacters, emojis, and non-ASCII characters.
- Do not include usernames, email addresses, credential names, tokens,
  hostnames containing secrets, or raw customer/user data.
- Keep plan file basenames under 180 characters, including the timestamp and
  `.plan.md`. If it would be longer, shorten the `short_slug` first, then the
  `scope`; never remove the timestamp or `work_id`.

## Collision Handling

If the exact plan filename or collection directory already exists:

1. Prefer adding a more specific slug word if that would clarify the task.
2. Otherwise append a two-digit sequence suffix before the extension:

```text
20260521T120000Z-service-issue-123-cache-staleness-remediation-02.plan.md
```

Use `-03`, `-04`, and so on for additional collisions. Do not overwrite,
delete, merge, or rename existing plan artifacts just to reuse a preferred
name.

## Plan Content Requirements

Every durable plan should be self-contained enough for a future agent to
execute without hidden chat context. Include:

- Purpose and explicit success criteria.
- Required checkout, working directory, source paths, branches, or PRs.
- Whether execution is read-only or may edit code, push branches, or mutate
  external systems.
- Required guidance or skills to read before execution.
- Inputs, URLs, issue IDs, PR numbers, dashboards, or session evidence paths.
- Current known facts, with verification dates for time-sensitive state.
- Assumptions, constraints, and non-goals.
- Step-by-step implementation or investigation sequence.
- Verification requirements and expected commands.
- Rollback or abort conditions when execution can change production, data, or
  shared state.
- Where raw evidence should be written during execution.
- Where final reports, reviews, or artifacts should be written.
- Redaction and secret-handling requirements.

For time-sensitive facts, include the verification date and tell the executing
agent to refresh live state before relying on stale observations.

## Existing Files

These rules apply to new plan artifacts and to plan cleanup or migration work
when the user explicitly asks for it. Do not rename existing files or
directories solely to make them comply unless such cleanup or migration is in
scope.
