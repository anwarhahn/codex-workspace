# Sessions Guidance

This directory stores per-session evidence and scratch outputs for Codex work.

## Scope

- Keep top-level files in this directory to durable guidance only. This
  `sessions/AGENTS.md` file is the committed exception.
- The `sessions/` tree is ignored by default because it stores raw evidence and
  scratch output. Only this guidance file is intended to be tracked.
- Put all new session artifacts under a named session directory:

```text
sessions/<session_id>/
```

- Name session directories strictly so they sort chronologically and remain
  safe to reference in shell commands. New session directory names must match:

```text
YYYYMMDDTHHMMSSZ-<task-slug>
```

The timestamp must be UTC. The slug must use lowercase ASCII letters, digits,
and single hyphens only.

Valid examples:

```text
20260521T120000Z-cache-investigation
20260521T143015Z-pr-review
20260521T190500Z-dashboard-update
```

Constraints:

- Use exactly one timestamp prefix in `YYYYMMDDTHHMMSSZ` form.
- Put exactly one hyphen between the timestamp and slug.
- Keep slugs descriptive, task-scoped, and normally 3 to 8 words.
- Do not use spaces, underscores, uppercase letters, colons, dots, slashes,
  personal names, email addresses, secret names, token fragments, hostnames,
  branch names with slashes, or ad hoc suffixes such as `new`, `old`, `copy`,
  `backup`, `final`, or `tmp`.
- Do not create bare date directories, top-level topic buckets, or tool-name
  buckets for new work. Put topic or tool grouping inside the session
  directory instead.
- If a tool needs many run directories, create them below the session root, for
  example `tool-runs/<tool_name>/<run_id>/`.
- Do not scatter raw outputs directly under `sessions/`.
- Delete empty session directories when you find them. Empty directories do not
  carry useful evidence and should not be kept as placeholders.

## Contents

Use session directories for raw or bulky evidence, including API payloads, logs,
screenshots, recordings, rendered manifests, command outputs, temporary
scripts, downloaded files, copied trees, and tool run outputs.

Every session directory must include:

- `README.md` for a human-readable inventory and summary.

For non-trivial sessions, also include:

- `manifest.json` for machine-readable metadata and important paths.
- `progress.jsonl` for append-only progress events during long-running work.

Small sessions with only a few files may keep those files directly in the
session root next to `README.md`. As the number of files grows, proactively add
named subdirectories so the evidence stays easy to scan. Common names include:

```text
evidence/
logs/
raw-api/
reports/
screenshots/
recordings/
rendered/
stdout/
stderr/
tool-runs/<tool_name>/<run_id>/
work/
```

## Safety

- Treat session contents as potentially sensitive local evidence.
- Do not print secrets, auth tokens, cookies, CSRF values, credential payloads,
  private raw logs, or unredacted API responses into chat.
- Do not copy raw sensitive session evidence into `durable/`; summarize and
  redact when a durable artifact is needed.
- Before committing session evidence, confirm it is intentional, redacted where
  needed, and not covered by `.gitignore` sensitivity rules.
- If evidence is only needed temporarily, leave it untracked in the session
  directory unless the user explicitly asks for it to be committed.
