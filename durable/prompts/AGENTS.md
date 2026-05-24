# Durable Prompts Guidance

This directory stores durable prompt artifacts that future Codex sessions
should be able to find, understand, and execute without reading chat history.

## Scope

- Store reusable or handoff-worthy prompt files here.
- Store raw evidence, logs, screenshots, command output, and downloaded API
  payloads under `sessions/<session_id>/`, not here.
- Store the plan, report, review, or final artifact produced by a prompt under
  the matching durable output location in this workspace, not beside the
  prompt.
- Do not store secrets, credentials, tokens, cookies, raw auth payloads, or
  unredacted user/customer data in prompt files.

## Top-Level Contents

- Do not create loose prompt files directly under `durable/prompts/`.
- Every prompt artifact file must live inside an enclosing top-level prompt
  collection directory.
- The only expected top-level entries are prompt collection directories and
  this `AGENTS.md` guidance file.
- If a prompt would naturally be a single file, create an appropriately named
  collection directory first and put the prompt inside it.
- Do not create generic files named `prompt.txt`, `prompt.md`,
  `instructions.md`, `notes.md`, `draft.md`, or `todo.md`.
- Prefix every prompt collection directory with a UTC timestamp so collections
  sort chronologically, following the same timestamp style as
  `sessions/AGENTS.md`.
- Do not create bare date directories or date-only filenames. The timestamp is
  a sorting prefix on the collection directory and repeated in the primary
  prompt filename.

## Prompt Filename Rule

Name prompt files with this format:

```text
<timestamp>-<scope>-<work_id>-<short_slug>.prompt.md
```

Generic examples:

```text
20260521T120000Z-service-issue-123-cache-staleness-investigation/20260521T120000Z-service-issue-123-cache-staleness-investigation.prompt.md
20260521T123015Z-frontend-incident-456-slow-list-plan/20260521T123015Z-frontend-incident-456-slow-list-plan.prompt.md
20260521T190500Z-pull-requests-pr-123-review-followup/20260521T190500Z-pull-requests-pr-123-review-followup.prompt.md
20260521T210000Z-codex-migration-workspace-reorganization/20260521T210000Z-codex-migration-workspace-reorganization.prompt.md
```

Use `.prompt.md` by default. Use `.prompt.txt` only when a consuming tool
requires plain text and cannot accept Markdown; keep the same basename pattern:

```text
<timestamp>-<scope>-<work_id>-<short_slug>.prompt.txt
```

Do not use extension-only naming such as `prompt.txt`, even inside
collections.

## Collection Directory Rule

Create a prompt collection directory with this format:

```text
<timestamp>-<scope>-<work_id>-<short_slug>/
```

The primary prompt inside the collection must repeat the collection basename:

```text
<timestamp>-<scope>-<work_id>-<short_slug>/<timestamp>-<scope>-<work_id>-<short_slug>.prompt.md
```

Additional prompt files inside the collection must still use the prompt
filename rule. Keep supporting non-prompt files plainly named, for example:

```text
README.md
examples.md
expected-output.md
schema.json
```

## Component Rules

### `timestamp`

The timestamp records when the durable prompt collection was created or
accepted into this repository.

Rules:

- Use UTC.
- Use exactly this format:

```text
YYYYMMDDTHHMMSSZ
```

- Put exactly one hyphen between the timestamp and the normalized slug.
- For migrated existing prompts, prefer the first git commit time when the
  artifact entered this repository. If that is unavailable, use the migration
  time and keep the original purpose in the slug.

### `scope`

The scope identifies the repository, service, subsystem, or durable workflow
the prompt targets.

Preferred values, in order:

1. Repository or worktree basename, normalized.
2. Service or subsystem slug.
3. Durable workflow or artifact family, such as:
   - `pull-requests`
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
  - `review`
  - `investigation`
  - `implementation-plan`
  - `validation`
  - `migration`
  - `prompt-run`
- If there is no stable ID or workflow type, use `adhoc`.

### `short_slug`

The slug describes the prompt's concrete purpose.

Rules:

- Use 3 to 8 meaningful words when possible.
- Prefer nouns and verbs that describe the prompt's requested work:
  - `slow-query-remediation-plan`
  - `runtime-review`
  - `dead-endpoints-usage-investigation`
  - `draft-review-comments`
- Keep it specific enough that two prompts for the same `scope` and `work_id`
  can be distinguished.

Fallbacks:

- If the task is still unclear, use the action type:
  - `investigation`
  - `plan`
  - `review`
  - `handoff`
  - `smoke-test`
- If no useful action is known, stop and clarify before creating a durable
  prompt. Do not create `scratch` prompts in `durable/prompts/`.

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
- Keep prompt file basenames under 180 characters, including the timestamp and
  `.prompt.md` or `.prompt.txt`. If it would be longer, shorten the
  `short_slug` first, then the `scope`; never remove the timestamp or
  `work_id`.

## Collision Handling

If the exact prompt filename or collection directory already exists:

1. Prefer adding a more specific slug word if that would clarify the task.
2. Otherwise append a two-digit sequence suffix before the extension:

```text
20260521T120000Z-service-issue-123-cache-staleness-investigation-02.prompt.md
```

Use `-03`, `-04`, and so on for additional collisions. Do not overwrite,
delete, merge, or rename existing prompt artifacts just to reuse a preferred
name.

## Prompt Content Requirements

Every durable prompt should be self-contained enough for a future agent to run
without hidden chat context. Include:

- Purpose and explicit success criteria.
- Required checkout, working directory, or source paths.
- Whether the prompt is read-only or may edit code.
- Required guidance or skills to read before execution.
- Inputs, URLs, issue IDs, PR numbers, dashboards, or session evidence paths.
- Where raw evidence should be written if the prompt performs investigation.
- Where the final output should be written.
- Verification requirements and stop conditions.
- Redaction and secret-handling requirements.

For time-sensitive facts, include the verification date and tell the executing
agent to refresh live state before relying on stale observations.

## Existing Files

These rules apply to new prompt artifacts and to prompt cleanup or migration
work when the user explicitly asks for it. Do not rename existing files or
directories solely to make them comply unless such cleanup or migration is in
scope.
