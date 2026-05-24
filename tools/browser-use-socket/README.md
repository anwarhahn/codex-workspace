# browser-use-socket

Reusable helper for talking directly to live Browser Use sockets under
`/tmp/codex-browser-use` when the standard `agent.browsers.*` path is
unavailable in a CLI session.

## Purpose

Use this tool when:

- Chrome or IAB backends appear to be running on the machine
- the official browser client cannot discover any backends
- a future Codex session needs a stable direct-socket fallback that mirrors the
  in-app browser workflow as closely as practical

## What This Ships

This tool provides three layers:

- low-level socket transport and claimed-tab primitives in
  `browser-use-socket.mjs`
- a browser-like compatibility layer in `compat.mjs`
- a one-step Codex-session runner in `runner.mjs`

The intended execution model is:

1. a future Codex session claims or selects a manually signed-in tab
2. the session asks this tool for a sanitized observation
3. the session model chooses one action JSON object
4. the tool validates and executes that action
5. the session repeats until success, block, or confirmation is required

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

For Codex sessions that already have access to the `node_repl` tool, the
modules can also be imported directly from JavaScript:

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

### `claim-tab`

Claim one matching user tab for the current `session_id` and `turn_id`.

Examples:

```sh
tools/browser-use-socket/browser-use-socket claim-tab \
  --browser extension \
  --url-contains airbnb \
  --json
```

```sh
tools/browser-use-socket/browser-use-socket claim-tab \
  --tab-id 427550523 \
  --json
```

### `inspect-tab`

Claim a matching tab if needed, attach to it, and return a sanitized snapshot.

Examples:

```sh
tools/browser-use-socket/browser-use-socket inspect-tab \
  --browser extension \
  --url-contains airbnb \
  --json
```

### `run-task`

Execute exactly one validated action step for a future Codex session. This
command does not call a model internally. The caller must supply the next
action as JSON.

Examples:

```sh
tools/browser-use-socket/browser-use-socket run-task \
  --browser extension \
  --url-contains airbnb \
  --task "add these 3 emails to the reservation" \
  --action-json '{"action":"inspect","args":{},"reason":"start from current page state","expect":"sanitized snapshot","confirmed":false}' \
  --json
```

```sh
tools/browser-use-socket/browser-use-socket run-task \
  --tab-id 427550523 \
  --task "continue the current workflow" \
  --action-json '{"action":"click","args":{"selector":"button[type=submit]"},"reason":"submit the visible form","expect":"confirmation UI or validation result","confirmed":true}' \
  --step-index 4 \
  --max-steps 12 \
  --json
```

`run-task` returns one of these statuses:

- `ok`: the action executed and a fresh observation is included
- `needs_confirmation`: the action was classified as risky and was not run
- `stopped`: the supplied action intentionally stopped the workflow
- `noop`: a no-op action such as `find_tab` or `claim_tab` was supplied after a
  tab was already claimed for the step executor

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
- `--url-contains <text>`: tab URL matcher
- `--title-contains <text>`: tab title matcher
- `--tab-id <id>`: exact tab matcher
- `--task <text>`: task description for `run-task`
- `--action-json <json>`: one action object for `run-task`
- `--step-index <n>`: current step index supplied by the caller
- `--max-steps <n>`: total step budget supplied by the caller

If `--session-id` and `--turn-id` are not provided, the tool uses generated
probe values. That is sufficient for probing and was sufficient for direct tab
listing in local testing.

For multi-step workflows, reuse the same `--session-id` and `--turn-id` across
steps if you want to operate on the same already-claimed tab.

## Compatibility Layer

Future Codex sessions can import `compat.mjs` for a browser-like interface:

```js
const compat = await import("/Users/anwarhahn/dev/codex-workspace/tools/browser-use-socket/compat.mjs");

const browser = await compat.getBrowser({
  backend: "extension",
  sessionMeta: { session_id: "demo-session", turn_id: "demo-turn" }
});

const claim = await browser.user.claimTab({ urlContains: "airbnb" });
await claim.tab.attach();
const snapshot = await claim.tab.inspect();
```

Claimed tab methods currently include:

- `attach()`
- `inspect()`
- `evaluate({ expression })`
- `click({ selector })`
- `fill({ selector, value })`
- `navigate({ url })`
- `waitForText({ text, timeoutMs })`
- `waitForUrl({ text, timeoutMs })`
- `waitForSelector({ selector, timeoutMs })`
- `cdp({ method, commandParams, timeoutMs })`
- `finalize({ status, timeoutMs })`

## Runner Contracts

The one-step runner is meant to be driven by a Codex session, not by an
internal model call. The relevant artifacts are:

- prompt guidance: `prompts/system-prompt.md`
- action contract: `prompts/action-contract.md`
- action schema: `schemas/action-schema.json`
- observation schema: `schemas/observation-schema.json`

The basic loop is:

1. call `run-task` or `runTaskStep(...)` with an `inspect` action
2. read the returned observation
3. have the Codex session choose the next action JSON object
4. call `run-task` again with the same session meta
5. stop on `needs_confirmation`, `stopped`, or success conditions defined by
   the caller

## Confirmation Guardrails

Risky actions are blocked unless the action object includes `confirmed: true`.

Current default risky classifications:

- `click` actions that look like submit/save/confirm/remove/delete/pay/book/send
- `evaluate` actions whose expression appears to mutate page state directly

When blocked, the runner returns `needs_confirmation` and echoes the proposed
action so the calling Codex session can decide whether to retry with
`confirmed: true`.

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
  `node_repl` context rather than plain shell Node execution.
- The most reliable way to use the step runner is to import the module or run
  the wrapper from inside a Codex session that already has `node_repl`
  available.
- If a plain shell invocation cannot drive a backend but `node_repl` can,
  import this module there and use `listSockets()`, `probeSocket()`,
  `selectSocket()`, `rpc()`, `getBrowser()`, and `runTaskStep()` directly.
- Extension-backed operations additionally require that the active Chrome
  profile name match the allowed profile, which defaults to `Codex`.

## Safety

- This tool is for local operational debugging and browser automation fallback.
- Do not use it to inspect cookies, local storage, passwords, or other secret
  browser state.
- Prefer the official browser client when it is available.
