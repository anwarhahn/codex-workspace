# Manifest Guidance

Manifest files in this directory record structural moves, migrations, and
workspace-wide reorganizations.

## Naming

- Prefix every manifest filename with the ISO date of the change:
  `YYYY-MM-DD-<short-description>.md`.
- Use lowercase, hyphen-separated descriptions after the date.
- Keep the date in the filename aligned with the date stated inside the
  manifest.
- Do not use date suffixes such as `<description>-YYYY-MM-DD.md`.

## Contents

- Start with a short H1 title.
- Include the change date.
- List source and destination paths precisely.
- State whether compatibility links or shims were left behind.
- Keep manifests factual.
- Do not include raw logs, credentials, bulky evidence, or unredacted private
  data.
