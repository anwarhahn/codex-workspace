# Tools Guidance

This directory stores reusable local tools for Codex workflows, including
terminal helpers, browser runners, scripts, examples, and tool documentation.

## Scope

- Put reusable tools here when they are meant to be shared across future Codex
  sessions.
- Keep one-off scripts, raw outputs, screenshots, recordings, logs, copied
  trees, and tool run artifacts under `sessions/<session_id>/`.
- Do not put source-repository changes here unless the user explicitly asks for
  a Codex-local helper rather than a repository tool.
- Before creating a new helper, check whether an existing tool in this
  directory can be reused or extended.

## Tool Layout

- Do not create loose tool files directly under `tools/`.
- Every tool must live in its own top-level tool directory.
- Every tool directory must include a `README.md` when the implementation is
  present.
- Every tool directory should keep user-requested improvements, feedback, and
  requested changes in a tracked `CHANGE_REQUESTS.md` file when such feedback
  exists.
- Every interactive or reusable command-line tool should keep a local usage log
  unless logging would capture secrets or sensitive raw evidence.
- Include a nested `AGENTS.md` when a tool has durable operating rules that
  future agents must follow.
- New tools must bake in self-improvement from the beginning: add a tool-local
  `AGENTS.md` that tells future agents to inspect `CHANGE_REQUESTS.md`, inspect
  the usage log, and let prior invocations guide CLI ergonomics, defaults,
  output shape, option names, confirmation behavior, and documentation updates.
- Keep command entry points executable and named clearly.
- Prefer stable paths in docs and handoffs so future sessions can reuse the
  same command without rediscovery.

## Naming

Name top-level tool directories with lowercase ASCII letters, digits, and
single hyphens only:

```text
<tool-slug>/
```

Example shape:

```text
my-reusable-tool/
```

Constraints:

- Do not use spaces, underscores, uppercase letters, dots, slashes, dates,
  personal names, ticket numbers, hostnames, or ad hoc suffixes such as `new`,
  `old`, `copy`, `backup`, `final`, or `tmp`.
- Keep names descriptive and stable. Prefer the tool's purpose over the
  implementation language or current script filename.
- If a migrated tool already uses underscores, rename it to the hyphenated form
  before adding new files unless the user explicitly asks to preserve the old
  path.

## Generated State

- Do not commit generated dependency directories, browser binaries, caches,
  build output, run output, local state, logs, databases, or temporary files.
- If a tool needs heavyweight reusable runtime state, prefer
  `shared/toolchains/` or another appropriate `shared/` location.
- If a tool produces evidence or reports during a run, write them under the
  active session directory and reference those paths in the handoff.

## Usage Tracking

- Track tool usage so future development is informed by real invocation
  patterns instead of guesses.
- Default usage logs belong under:

```text
shared/tool-usage/<tool-slug>/invocations.jsonl
```

- Usage logs are local generated state. Do not commit them.
- At minimum, each invocation record should include:
  - UTC timestamp
  - tool name and schema version
  - mode or subcommand
  - option flag names or option set
  - output format
  - whether defaults or overridden roots were used when that affects behavior
  - terminal width when output ergonomics are relevant
- Do not record secret values, raw auth payloads, full command output, raw
  evidence, or sensitive path inventories. Prefer booleans, enum-like modes,
  counts, and sanitized option names.
- Logging failures must not break the tool's primary behavior.
- Provide an environment variable to disable usage logging, and document it in
  the tool README or tool-local `AGENTS.md`.
- Provide an environment variable to override the usage log path when useful
  for testing or isolated runs.
- Before changing CLI defaults, output shape, option names, or ergonomics,
  inspect the tool's usage log and let actual usage inform the change.
- For tools whose usage tracking needs special interpretation, add a tool-local
  `AGENTS.md` describing where the log lives, how to summarize it, and what not
  to record.
- Tool-local `AGENTS.md` files should include concrete usage-inspection
  commands, the default usage-log path, any environment variables that override
  or disable logging, and privacy boundaries for what must not be recorded.

## User Feedback And Change Requests

- Record tool-specific user feedback in the matching tool directory, not in the
  top-level `tools/` directory and not in unrelated durable notes.
- Use this exact tracked filename when feedback exists:

```text
tools/<tool-slug>/CHANGE_REQUESTS.md
```

- Use `CHANGE_REQUESTS.md` for:
  - requested improvements
  - user feedback about ergonomics, naming, behavior, docs, or output shape
  - known follow-up work that should remain visible to future maintainers of
    that tool
- Do not use `CHANGE_REQUESTS.md` for raw run evidence, logs, screenshots,
  copied outputs, credentials, or temporary debugging notes. Put those under
  `sessions/<session_id>/`.
- Keep entries concise and actionable. Include the date, the requester context
  if useful, the requested change, current status, and links to relevant
  commits, session paths, or issue references when available.
- Before changing a tool, read its `CHANGE_REQUESTS.md` and reconcile open
  requests with the current task. Update the file when user feedback creates a
  new improvement, when a request is completed, or when invocation history shows
  a durable follow-up worth preserving.
- Prefer this entry shape:

```markdown
## Open

- 2026-05-21 - Improve CLI output grouping.
  Status: open.
  Context: User found the current output hard to scan during cleanup triage.

## Done

- 2026-05-21 - Move generated runtime state out of the tool directory.
  Status: done in <commit>.
```

## Tool-Local Guidance

- If a tool directory has its own `AGENTS.md`, read and follow it before
  changing that tool.
- Do not add a tool-local `AGENTS.md` as a placeholder. Add one only when that
  tool has durable operating rules future agents must follow.
