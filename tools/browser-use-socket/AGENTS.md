# browser-use-socket Guidance

This tool provides a direct-socket fallback for Browser Use backends.

## Before Changing This Tool

- Read `README.md`.
- Check whether `CHANGE_REQUESTS.md` exists and reconcile any open requests.
- Inspect recent usage patterns before changing CLI defaults, option names, or
  output shape.

## Usage Log

- Default log path:
  `shared/tool-usage/browser-use-socket/invocations.jsonl`
- Disable logging with:
  `BROWSER_USE_SOCKET_DISABLE_USAGE_LOG=1`
- Override the log path with:
  `BROWSER_USE_SOCKET_USAGE_LOG_PATH=/custom/path.jsonl`

Useful inspection commands:

```sh
tail -n 20 shared/tool-usage/browser-use-socket/invocations.jsonl
```

```sh
rg -n '"subcommand":"list-tabs"|\"subcommand\":\"probe-sockets\"' \
  shared/tool-usage/browser-use-socket/invocations.jsonl
```

## Privacy Boundaries

- Do not add logging for raw tab titles, raw URLs, raw RPC responses, or
  browser payloads.
- Do not log secrets, cookies, storage state, or full command output.
- Keep logs to option names, booleans, counts, output mode, and timestamped
  invocation metadata.

## Maintenance Notes

- Prefer extending the existing subcommands over creating parallel scripts.
- Keep the wrapper executable path stable:
  `tools/browser-use-socket/browser-use-socket`
- If user feedback creates follow-up work, add `CHANGE_REQUESTS.md`.
