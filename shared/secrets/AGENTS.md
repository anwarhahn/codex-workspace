# Secrets Guidance

This directory stores local credentials and auth state for Codex workflows.
Treat every file under this directory as sensitive, even when a filename looks
like a cache, log, or generated config.

## Rules

- Do not print secret values, tokens, connection strings, cookies, API keys, or
  auth cache contents into chat, logs, pull-request text, or durable reports.
- Do not copy files from this directory into source repositories, session
  evidence, durable artifacts, or manifests.
- Do not commit this directory or any file from it, except this guidance file.
  This file should be committed so future agents can rediscover the local
  secret-handling rules.
- Prefer sourcing or reading these files locally when needed.
- When recording commands, include the path used but not the value read from
  it.
- Keep directory permissions at `700` and file permissions at `600` in a real
  workspace.
- If a tool creates new files or subdirectories here, re-run permission
  normalization from the workspace root:

```bash
find shared/secrets -type d -exec chmod 700 {} +
find shared/secrets -type f -exec chmod 600 {} +
```

## Naming

Use strict, descriptive filenames so future agents can identify scope and
handling requirements without opening a secret file.

Rules:

- Use lowercase ASCII letters, digits, and single underscores only.
- Use exactly one extension that describes the file format:
  - `.env` for shell-sourceable `KEY=value` files
  - `.json` for JSON credential or config payloads
  - `.pem`, `.crt`, `.key`, or `.pub` for certificate and key material
  - `.txt` only for opaque one-token or one-value files
- Name files with this pattern:

```text
<system>_<environment>_<access_or_purpose>.<extension>
```

Generic examples:

```text
service_prod_api.env
service_prod_readonly.env
service_dev_write.env
service_global_api_token.txt
local_config_private.json
```

Constraints:

- Do not use spaces, hyphens, uppercase letters, dates, personal names, email
  addresses, hostnames, ticket numbers, or ad hoc suffixes such as `new`,
  `old`, `copy`, `backup`, `final`, or `tmp`.
- Do not include secret values, token prefixes, account IDs, passwords, or
  private hostnames in filenames.
- Encode access level or purpose in the filename when it changes how the file
  may be used, for example `readonly`, `write`, `api`, `oauth`, `ssh`, or
  `cookie`.
- Encode environment when applicable, for example `prod`, `dev`, `staging`, or
  `local`. If a credential is environment-independent, use `global`.
- Prefer replacing an incorrectly named file with a correctly named file and
  updating references in durable guidance. Do not leave compatibility copies
  unless the user explicitly asks for them.

## Location

- Keep credentials under this directory in this workspace.
- Do not recreate legacy secret locations unless the user explicitly asks for a
  compatibility shim.
