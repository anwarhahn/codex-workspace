# LLM Claimed-Tab Runner Plan

## Status

Implemented on 2026-05-24 for the generic claimed-tab runner scope.

Deferred on purpose:

- site-specific adapters, including Airbnb-specific workflow commands
- internal model invocation from the tool itself

This plan is now a durable execution and handoff record for the implemented
generic runner that future Codex sessions should use directly.

## Purpose

Provide a reusable Codex-local browser runner on top of
`tools/browser-use-socket/` that can operate inside a manually signed-in Chrome
tab when the official Browser plugin path is unavailable in a CLI session.

The implementation mirrors the in-app browser workflow as closely as practical
without relying on the privileged `nodeRepl.nativePipe` bridge:

- discover a backend socket
- list user tabs
- claim a user tab
- attach to the claimed tab
- inspect page state
- execute constrained actions
- rebuild observation after each step
- finalize the claimed tab without closing the underlying user tab

## Success Criteria

The implemented scope is successful when a future Codex session can:

- claim a manually signed-in Chrome tab in the `Codex` Chrome profile
- inspect the current page through a sanitized observation
- choose one structured action JSON object in the Codex session
- execute that action through the local direct-socket runner
- repeat with the same `session_id` and `turn_id`
- stop on block, ambiguity, or confirmation requirement

## Working Context

- Repository root:
  `/Users/anwarhahn/dev/codex-workspace`
- Primary tool directory:
  `tools/browser-use-socket/`
- Relevant session evidence:
  `sessions/20260524T180655Z-browser-backend-investigation/`

Read before making further changes:

- root `AGENTS.md`
- `tools/AGENTS.md`
- `tools/browser-use-socket/AGENTS.md`
- `durable/operations/AGENTS.md`

## Known Facts

- Verified on 2026-05-24: this CLI environment can lack
  `nodeRepl.nativePipe` even when live browser sockets exist.
- Verified on 2026-05-24: live Browser Use sockets can still exist under
  `/tmp/codex-browser-use`.
- Verified on 2026-05-24: the direct socket path can discover the Chrome
  extension backend, list user tabs, claim a user tab, attach to it, and run
  selected CDP commands.
- Verified on 2026-05-24: direct backend RPC was most reliable from the Codex
  `node_repl` context rather than plain shell Node execution.
- Verified on 2026-05-24: Chrome extension-backed execution is intentionally
  restricted to the Chrome profile named `Codex` by default.

## Implemented File Inventory

```text
tools/browser-use-socket/
  AGENTS.md
  CHANGE_REQUESTS.md
  README.md
  browser-use-socket
  browser-use-socket.mjs
  compat.mjs
  runner.mjs
  prompts/
    system-prompt.md
    action-contract.md
  schemas/
    action-schema.json
    observation-schema.json
```

## Implemented Command Surface

The wrapper command is:

```sh
tools/browser-use-socket/browser-use-socket <subcommand> [options]
```

Implemented subcommands:

- `list-sockets`
- `probe-sockets`
- `list-tabs`
- `claim-tab`
- `inspect-tab`
- `run-task`
- `rpc`

Explicitly not implemented in this scope:

- `run-airbnb-add-guests`
- any other site-specific adapter command

## Implemented Module Surface

`browser-use-socket.mjs` exports the low-level transport and claimed-tab
helpers:

```js
listSockets()
probeSocket(socketPath, timeoutMs)
selectSocket(browserType, timeoutMs)
readChromeLocalProfiles()
getActiveChromeProfile()
getAllowedChromeProfileName()
assertAllowedChromeProfileContext()
assertSocketAllowed(socketPath, timeoutMs)
listUserTabs(socketPath, sessionMeta, timeoutMs)
listClaimedTabs(socketPath, sessionMeta, timeoutMs)
findMatchingUserTabs(tabs, matcher)
findUserTab(tabs, matcher)
claimUserTab(socketPath, matcher, sessionMeta, timeoutMs)
attachTab(socketPath, tabId, sessionMeta, timeoutMs)
detachTab(socketPath, tabId, sessionMeta, timeoutMs)
cdpCommand(socketPath, tabId, method, commandParams, sessionMeta, timeoutMs)
evaluateInTab(socketPath, tabId, expression, sessionMeta, timeoutMs)
evaluateValueInTab(socketPath, tabId, expression, sessionMeta, timeoutMs)
clickSelector(socketPath, tabId, selector, sessionMeta, timeoutMs)
fillSelector(socketPath, tabId, selector, value, sessionMeta, timeoutMs)
navigateClaimedTab(socketPath, tabId, url, sessionMeta, timeoutMs)
waitForUrlContains(socketPath, tabId, needle, sessionMeta, timeoutMs)
waitForText(socketPath, tabId, needle, sessionMeta, timeoutMs)
waitForSelector(socketPath, tabId, selector, sessionMeta, timeoutMs)
snapshotTab(socketPath, tabId, sessionMeta, timeoutMs)
finalizeClaimedTab(socketPath, tabId, disposition, sessionMeta, timeoutMs)
rpc(socketPath, method, params, timeoutMs)
withProbeSessionMeta(params)
withSessionMeta(params, parsed)
createSessionMeta(sessionId, turnId)
```

`compat.mjs` exposes a browser-like compatibility layer:

```js
getBrowser(options)
claimTab(options)
inspectClaimedTab(options)
runAction(options)
runActions(options)
```

The claimed-tab object supports:

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

`runner.mjs` exposes the Codex-session step runner:

```js
createRunner(options)
buildObservation(options)
validateAction(action)
executeAction(options)
runTaskStep(options)
```

## Observation Contract

`runTaskStep(...)` builds and returns this observation shape:

```json
{
  "task": "string",
  "step_index": 0,
  "max_steps": 12,
  "browser_backend": "extension",
  "profile_name": "Codex",
  "tab": {
    "id": "string | number",
    "title": "string",
    "url": "string"
  },
  "page": {
    "title": "string",
    "url": "string",
    "ready_state": "string",
    "text_excerpt": "string",
    "forms": [],
    "candidate_targets": []
  },
  "last_action": {
    "type": "string | null",
    "input": {},
    "result_summary": "string | null",
    "error": "string | null"
  },
  "warnings": []
}
```

Notes:

- `text_excerpt` is intentionally capped and sanitized.
- `forms` and `candidate_targets` are derived from visible interactive
  elements, not from a full DOM dump.
- the internal claimed-tab handle is removed from the returned observation.

## Action Contract

The Codex session must supply exactly one action object per step. The accepted
action names are:

- `find_tab`
- `claim_tab`
- `inspect`
- `click`
- `fill`
- `navigate`
- `evaluate`
- `wait_for_text`
- `wait_for_url`
- `wait_for_selector`
- `stop`

The action object shape is:

```json
{
  "action": "inspect",
  "args": {},
  "reason": "string",
  "expect": "string",
  "confirmed": false
}
```

`schemas/action-schema.json` and `prompts/action-contract.md` are the durable
artifacts that future sessions should reuse instead of restating the contract.

## Guardrails

Risky actions are blocked unless `confirmed: true`.

Current risky classifications:

- `click` selectors or candidate reasons that suggest:
  - submit
  - save
  - confirm
  - remove
  - delete
  - pay
  - book
  - send
- `evaluate` expressions that appear to mutate page state directly, such as:
  - `.click(`
  - `dispatchEvent`
  - `.submit(`
  - `window.location`

When blocked, the runner returns:

```json
{
  "status": "needs_confirmation",
  "message": "Confirmation required before executing risky action: click",
  "proposed_action": {}
}
```

## Matching Rules

The matcher shape is:

```json
{
  "tabId": null,
  "titleContains": null,
  "urlContains": null
}
```

Implemented behavior:

- if `tabId` is present, it takes precedence
- otherwise all non-null text predicates must match case-insensitively
- a required single-tab operation fails if zero matches are found
- a required single-tab operation fails if multiple matches are found

This ambiguity check is important. The implementation no longer silently takes
the first fuzzy match.

## Finalize Semantics

`finalizeClaimedTab(...)` and `claimedTab.finalize(...)` are best-effort detach
operations.

Implemented behavior:

- detach the claimed tab from the current session when possible
- never close the underlying user tab by default
- return a structured result with:
  - `status`
  - `disposition`
  - `tabId`
  - `closed`
  - `detached`

## How Future Codex Sessions Should Use It

Preferred path: use the tool inside a Codex session that has `node_repl`
available.

Typical loop:

1. Open or manually prepare the desired signed-in tab in the `Codex` Chrome
   profile.
2. Choose stable session metadata and keep reusing it:

```js
const sessionMeta = {
  session_id: "my-browser-task",
  turn_id: "step-1"
};
```

3. Import the runner:

```js
const runner = await import("/Users/anwarhahn/dev/codex-workspace/tools/browser-use-socket/runner.mjs");
```

4. Run an initial inspect step:

```js
const step1 = await runner.runTaskStep({
  backend: "extension",
  sessionMeta,
  matcher: { urlContains: "example.com" },
  task: "complete the current web task",
  action: {
    action: "inspect",
    args: {},
    reason: "capture current page state",
    expect: "sanitized snapshot",
    confirmed: false
  },
  stepIndex: 1,
  maxSteps: 12,
  timeoutMs: 2000
});
```

5. Read `step1.observation`.
6. Use the current Codex session model to choose the next action JSON object.
7. Call `runTaskStep(...)` again with the same `session_id` and `turn_id` if
   you want to reuse the same claimed tab.
8. Stop when the task is complete, the page is ambiguous, or the runner
   returns `needs_confirmation`.

Shell wrapper form:

```sh
tools/browser-use-socket/browser-use-socket run-task \
  --browser extension \
  --session-id my-browser-task \
  --turn-id shared-turn \
  --url-contains example.com \
  --task "complete the current web task" \
  --action-json '{"action":"inspect","args":{},"reason":"capture current page state","expect":"sanitized snapshot","confirmed":false}' \
  --json
```

## Validation Completed

Verified on 2026-05-24:

- the wrapper `--help` output includes the generic runner surface
- the modules import successfully from Codex `node_repl`
- `runTaskStep(...)` executes an `inspect` action successfully against a
  claimed Chrome extension tab
- risky actions return `needs_confirmation` with a proposed action payload
- already-claimed tabs for the same session are reused instead of causing a
  second claim failure

## Remaining Optional Work

These are future enhancements, not blockers for the implemented generic scope:

- add more precise action-argument validation
- add richer page snapshots when needed
- add optional higher-level helper examples under `tools/browser-use-socket/`
- add site-specific adapters in separate follow-up work if the user explicitly
  requests them

## Non-Goals

- calling a model API directly from the tool
- bypassing browser auth or anti-abuse controls
- dumping cookies, storage state, or other secret browser data
- replacing the official Browser plugin path when it is available
- introducing a separate browser abstraction unrelated to the in-app workflow
