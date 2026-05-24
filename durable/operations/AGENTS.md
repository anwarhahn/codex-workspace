# Durable Guidance

This directory stores long-lived operational knowledge for future sessions that
is not primarily about repository structure.

## Scope

- Put service access notes, environment-specific procedures, external system
  runbooks, recurring troubleshooting guidance, integration constraints, and
  verified operational facts here when they should survive across sessions.
- Keep guidance broad enough to remain useful after one-off task details age
  out.
- When adding operational facts, include a concrete verification date if the
  fact may drift.
- Do not use this directory for raw evidence, logs, transcripts, credentials,
  generated outputs, or bulky session artifacts.
- Store raw evidence under `sessions/<session_id>/` and summarize only the
  durable, redacted lesson here when needed.
- Do not use this directory to restate repository layout, artifact placement
  rules, subtree ownership, tracking policy, or other structure guidance that
  belongs in root or subtree `AGENTS.md` files.

## What Belongs Here

- Access instructions for internal or external services.
- Environment-specific setup or authentication workflows, without exposing
  secrets.
- Operational runbooks for recurring maintenance or debugging tasks.
- Known integration caveats, rate limits, quotas, or protocol details.
- Verified facts about systems that future sessions will likely need again.

## What Does Not Belong Here

- Rules about where files should be stored in this repository.
- Naming schemes for session directories, plans, prompts, manifests, or tools.
- Tracking policy, `.gitignore` policy, or subtree ownership rules.
- Raw session evidence, logs, copied command output, or transient notes.
- Secrets, credential values, cookies, tokens, or private key material.

## Authoring Rules

- Keep each guidance file self-contained enough that a future session can use
  it without hidden chat context.
- Prefer one topic per file or per small collection of related files.
- Include a concrete verification date for facts that can drift.
- Include prerequisites, required paths, commands, URLs, or identifiers when
  they are needed to execute the guidance safely.
- Describe credential locations or access methods without exposing secret
  values.
- Update or replace stale guidance when the source of truth changes instead of
  layering contradictory notes on top.
- If a note only matters for one investigation or one run, keep it in
  `sessions/` or convert it into a redacted durable artifact elsewhere.

## Verified Environment Notes

- Node runtime discovery for Codex plugin diagnostics was verified on
  2026-05-24.
- A future session should not assume `node` is available on shell `PATH`.
- If `node --version` fails, use the app-bundled runtime at:
  `/Applications/Codex.app/Contents/Resources/node`
- The bundled `node_repl` host used by this workspace also points at that
  app-bundled Node runtime.
- For browser-plugin scripts and other Codex-bundled helper scripts, prefer the
  app-bundled Node path over a system or Homebrew Node installation to reduce
  environment drift.

Example:

```sh
/Applications/Codex.app/Contents/Resources/node /absolute/path/to/script.js
```

## Safety

- Do not promote raw sensitive evidence into durable guidance.
- Redact credentials, private hostnames, account identifiers, and user-specific
  values unless the user explicitly asks for a private local note.
