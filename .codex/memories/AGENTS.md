# Memories Guidance

This directory represents Codex memory state. Memory files can contain local
workspace history, session context, and sensitive evidence summaries.

## Tracking

- Track only intentionally curated guidance or summary files.
- Do not track raw memory traces, rollout transcripts, generated indexes,
  caches, scratch files, or memory-extension output.
- Keep raw per-session or per-rollout trace material local and ignored.
- Before committing memory-related changes, verify the staged paths are limited
  to explicit curated exceptions.

## Safety

- Treat memory contents as private local user state.
- Do not copy raw memory traces into durable artifacts or product repositories.
- When durable memory context is useful, summarize and redact it rather than
  preserving raw traces.
