# Codex Home Guidance

This directory is the private Codex runtime home for this workspace.

## Safety

- Treat auth, credentials, history, logs, sessions, sqlite databases, memories,
  installed skills, configuration, and runtime caches as private local state.
- Do not print credential values, auth tokens, cookies, or private config
  values.
- Do not copy this directory into product repositories or durable artifacts.
- Do not commit generated files from this directory.
- Keep the directory private in a real workspace, typically mode `700`.
- Keep auth and config files private in a real workspace, typically mode `600`.

## Tracking

- Track only intentionally curated guidance files, not runtime state.
- Keep auth state, config, logs, sessions, databases, caches, imported
  plugins, generated skills, and other runtime files ignored unless the user
  explicitly asks to curate a sanitized guidance or summary file.
- If a child directory has its own `AGENTS.md`, read it before changing files in
  that child subtree.
