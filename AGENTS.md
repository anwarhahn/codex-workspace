# Codex Workspace Guidance

This repository is the real private Codex workspace for this machine. It keeps
long-lived local guidance, durable artifacts, reusable helpers, and selected
workspace metadata under version control while leaving secrets, runtime state,
logs, caches, and raw evidence untracked by default.

This root file defines how the workspace is structured and how guidance should
be delegated. Nested `AGENTS.md` files own the detailed operating rules for
their subtrees.

## Operating Model

- Read this file first for any task in this repository.
- Before touching a path, read every `AGENTS.md` from the repository root down
  to that path.
- Let the closest applicable `AGENTS.md` own subtree-specific rules when it
  conflicts with broader guidance.
- Keep structural rules in the root or subtree `AGENTS.md` that governs the
  affected path.
- Keep service-specific, environment-specific, or workflow-specific operating
  knowledge in `durable/operations/`, not in this root file.
- When adding a new subtree with durable rules, add an `AGENTS.md` there and
  make the root or parent guidance point to it.

## Layout

- `sessions/`: per-session outputs and raw evidence.
- `.codex/`: private Codex runtime home and guidance.
- `.codex/memories/`: memory-state handling rules.
- `durable/`: curated artifacts intended to outlive a session.
- `durable/prompts/`: durable prompt files.
- `durable/plans/`: durable implementation or investigation plans.
- `durable/operations/`: long-lived operating guidance.
- `tools/`: reusable terminal/browser tool guidance.
- `shared/`: reusable local state such as toolchains, caches, and secrets.
- `shared/secrets/`: local secret-handling rules.
- `shared/toolchains/`: reusable local toolchain rules.
- `manifests/`: structural change and migration manifest rules.

## Subdirectory Guidance

Before touching a path with its own `AGENTS.md`, read that file and let it own
the detailed rules for that subtree:

- `sessions/AGENTS.md`: session directory naming, README requirements, ignored
  evidence handling, and empty-directory cleanup.
- `shared/secrets/AGENTS.md`: local secret handling, permissions, tracked-file
  exception, and strict secret filename rules.
- `shared/toolchains/AGENTS.md`: shared toolchain ownership, tracked-file
  exceptions, and generated environment handling.
- `durable/prompts/AGENTS.md`: durable prompt collection layout and prompt file
  naming.
- `durable/plans/AGENTS.md`: durable plan collection layout and plan file
  naming.
- `manifests/AGENTS.md`: migration manifest naming and contents.
- `tools/AGENTS.md`: reusable tool layout, generated-state boundaries, usage
  tracking, and feedback rules.
- `durable/operations/AGENTS.md`: expanded durable operating guidance for future
  sessions that is not about repository structure.

## Session Outputs

Put per-session evidence and scratch outputs under:

```text
sessions/<session_id>/
```

The `sessions/` tree is ignored by default because it stores raw evidence and
scratch output. Only `sessions/AGENTS.md` is intended to be a tracked guidance
exception unless the user explicitly asks to commit redacted session material.

## Durable Outputs

Use `durable/` for curated artifacts that future sessions should read directly:

- final investigation reports
- implementation plans
- reusable prompts
- review outputs
- redacted or summarized evidence
- handoff documents
- workspace operating notes that should survive across sessions

Do not store unredacted secrets, raw sensitive API payloads, or bulky transient
logs in `durable/`. Keep those in `sessions/<session_id>/` and reference them
from the durable summary only when needed.

`durable/operations/` is specifically for non-structural operational knowledge,
for example service access steps, environment quirks, recurring runbooks,
integration notes, and verified facts that future sessions may need. Do not
use that directory to restate where artifacts belong or how this repository is
organized; that belongs in the governing `AGENTS.md`.

## Skills And Tools

- Use `tools/` for reusable executable helpers, browser runners, scripts, and
  tool documentation.
- Tool run outputs belong under session directories.
- See `tools/AGENTS.md` before adding or changing tools.
- If this workspace adds reusable skills, each skill should be self-contained
  and include its own entrypoint guidance.

## Shared Local State

Use `shared/` for reusable heavyweight state that should survive across
sessions but is not a durable report or source artifact, for example:

- `shared/toolchains/`
- `shared/secrets/`
- reusable caches created inside an appropriate documented shared subtree
- browser binaries
- package stores
- named virtual environments

Do not put one-off session evidence in `shared/`. Before touching
`shared/secrets/` or `shared/toolchains/`, read the local `AGENTS.md` file in
that subtree.

## Tracking Policy

- Track guidance, curated durable artifacts, reusable tool source, and small
  repository metadata that help future sessions operate this workspace.
- Keep private runtime state, secrets, caches, logs, downloaded artifacts,
  sqlite databases, tool usage logs, and raw session evidence ignored by
  default.
- Do not add placeholder-only directories. Create a directory when it has real
  contents or an `AGENTS.md` file that defines durable rules for that subtree.
- When a new guidance directory is added, add its `AGENTS.md` and update any
  nearby durable index or manifest files when they exist.
- Keep `.gitignore` deny-by-default for sensitive and generated workspace
  state. Loosen it only when the user explicitly wants a class of artifacts
  tracked.

## Guidance Ownership

- Root `AGENTS.md`: workspace structure, default operating model, delegation to
  nested guidance, and repository-wide safety boundaries.
- Nested `AGENTS.md` files: subtree-specific ownership, naming, placement,
  tracking, and workflow rules for that subtree.
- `durable/operations/AGENTS.md`: what kind of operational knowledge belongs in
  durable guidance and what should stay out.
- Files inside `durable/operations/`: the actual durable operational knowledge.

## Safety

- Do not delete, move, or archive existing artifacts unless the user explicitly
  asks for cleanup.
- Treat runtime-home state, secrets, sessions, raw evidence, logs, memories,
  and databases as private local state.
- Do not print secrets or credential values.
- Do not copy private runtime state into source repositories or durable
  artifacts.
