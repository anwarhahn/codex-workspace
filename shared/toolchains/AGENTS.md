# Toolchains Guidance

This directory stores reusable local toolchains for Codex workflows, such as
frontend runtimes, Python runtimes, package stores, browser binaries, and named
virtual environments.

## Tracking

- The `shared/toolchains/` tree is ignored by default because it contains
  generated environments, caches, binaries, symlinks, and installed packages.
- Tracked exceptions are this guidance file, `README.md`, `recipes/**`, and
  `scripts/**`.
- Do not commit toolchain contents, dependency stores, virtual environments,
  browser downloads, build outputs, logs, or cache files from this directory.

## Use

- Reuse existing toolchains here before creating new ad hoc installs elsewhere.
- Keep reusable toolchains under stable, descriptive directory names.
- Put one-off run outputs and evidence under `sessions/`, not under
  `shared/toolchains/`.
- Do not store secrets in toolchain directories. Use `shared/secrets/` for
  local credentials.

## Changes

- Prefer updating or extending an existing toolchain in place when that keeps
  future sessions on a stable path.
- If a new toolchain is needed, keep generated state inside its own
  subdirectory and document the activation command in a durable guidance file
  or handoff.
- Before committing, verify the staged paths from this subtree are limited to
  the tracked exceptions above.
