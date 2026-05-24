# browser-use-socket

Reusable helper for talking directly to live Browser Use sockets under
`/tmp/codex-browser-use` when the standard `agent.browsers.*` path is
unavailable in a CLI session.

## Purpose

Use this tool when:

- Chrome or IAB backends appear to be running on the machine
- the official browser client cannot discover any backends
- a future session needs a stable direct-socket fallback

## Chrome Profile Restriction

For Chrome extension backend operations, this tool is intended to operate only
against the Chrome profile named `Codex`.

Verified locally on 2026-05-24:

- Chrome profile directory: `Profile 1`
- Chrome profile name: `Codex`

By default, extension-backed operations refuse to run unless the active Chrome
profile in Chrome `Local State` is named `Codex`.

Override only when explicitly intended:

```sh
BROWSER_USE_SOCKET_ALLOWED_CHROME_PROFILE=SomeOtherProfile \
  tools/browser-use-socket/browser-use-socket list-tabs --json
```

## Entry Point

Run:

```sh
tools/browser-use-socket/browser-use-socket <subcommand> [options]
```

The wrapper prefers `node` from `PATH` when available. If not, it falls back to
the app-bundled runtime at:

```text
/Applications/Codex.app/Contents/Resources/node
```

For Codex sessions that already have access to the `node_repl` tool, this
module can also be imported directly from JavaScript:

```js
const mod = await import("/Users/anwarhahn/dev/codex-workspace/tools/browser-use-socket/browser-use-socket.mjs");
const sockets = await mod.listSockets();
```

## Subcommands

### `list-sockets`

List socket files found under `/tmp/codex-browser-use`.

Examples:

```sh
tools/browser-use-socket/browser-use-socket list-sockets
tools/browser-use-socket/browser-use-socket list-sockets --json
```

### `probe-sockets`

Connect to each socket and call `getInfo` with probe session metadata.

Examples:

```sh
tools/browser-use-socket/browser-use-socket probe-sockets
tools/browser-use-socket/browser-use-socket probe-sockets --json
```

If shell execution does not return backend info, import the module from
`node_repl` and call `probeSocket()` there instead.

### `list-tabs`

Find a compatible socket and call `getUserTabs`.

Examples:

```sh
tools/browser-use-socket/browser-use-socket list-tabs
tools/browser-use-socket/browser-use-socket list-tabs --browser extension --json
tools/browser-use-socket/browser-use-socket list-tabs --socket /tmp/codex-browser-use/example.sock
```

For the most reliable backend RPC path in Codex sessions, prefer the direct
module import pattern:

```js
const mod = await import("/Users/anwarhahn/dev/codex-workspace/tools/browser-use-socket/browser-use-socket.mjs");
const socket = await mod.selectSocket("extension", 1500);
const tabs = await mod.rpc(socket, "getUserTabs", mod.withProbeSessionMeta({}), 2000);
console.log(tabs);
```

### `rpc`

Make an arbitrary JSON-RPC request against a chosen socket.

Examples:

```sh
tools/browser-use-socket/browser-use-socket rpc \
  --socket /tmp/codex-browser-use/example.sock \
  --method getInfo

tools/browser-use-socket/browser-use-socket rpc \
  --socket /tmp/codex-browser-use/example.sock \
  --method getUserTabs \
  --params '{}'
```

## Options

- `--json`: emit JSON output when supported
- `--socket <path>`: use one explicit socket
- `--browser <extension|iab|cdp>`: pick the first probed socket matching that
  backend type
- `--method <name>`: RPC method for the `rpc` subcommand
- `--params <json>`: JSON object payload for the `rpc` subcommand
- `--session-id <value>`: override session id for direct RPC
- `--turn-id <value>`: override turn id for direct RPC
- `--timeout-ms <n>`: socket timeout in milliseconds

If `--session-id` and `--turn-id` are not provided, the tool uses generated
probe values. That is sufficient for probing and was sufficient for direct tab
listing in local testing.

## Usage Logging

The tool writes sanitized invocation records by default to:

```text
shared/tool-usage/browser-use-socket/invocations.jsonl
```

Controls:

- `BROWSER_USE_SOCKET_DISABLE_USAGE_LOG=1` disables logging
- `BROWSER_USE_SOCKET_USAGE_LOG_PATH=/custom/path.jsonl` overrides the log path
- `BROWSER_USE_SOCKET_ALLOWED_CHROME_PROFILE=<name>` overrides the allowed
  Chrome profile name for extension-backed operations

The log records metadata such as subcommand, output mode, timeout choice, and
whether a socket path or browser filter was supplied. It does not record raw
tab data, raw RPC responses, or secret values.

## Runtime Notes

- Socket listing is expected to work from plain shell execution.
- In local testing, direct backend RPC was most reliable from the Codex
  `node_repl` context.
- If a plain shell invocation cannot drive a backend but `node_repl` can,
  import this module there and use `listSockets()`, `probeSocket()`,
  `selectSocket()`, and `rpc()` directly.
- Extension-backed operations additionally require that the active Chrome
  profile name match the allowed profile, which defaults to `Codex`.

## Safety

- This tool is for local operational debugging and browser automation fallback.
- Do not use it to inspect cookies, local storage, passwords, or other secret
  browser state.
- Prefer the official browser client when it is available.
