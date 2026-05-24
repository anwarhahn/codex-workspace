# LLM Claimed-Tab Runner Plan

## Purpose

Build a reusable Codex-local browser runner on top of
`tools/browser-use-socket/` that can operate inside a manually signed-in Chrome
tab when the official Browser plugin path is unavailable in a CLI session.

The target outcome is a workflow where a future session can take a user prompt
such as:

`add these 3 emails to the airbnb reservation: email1, email2, email3`

and then:

- find the correct signed-in Chrome tab
- claim it
- inspect current page state
- ask an LLM for the next browser action(s)
- execute those actions through the direct socket transport
- verify progress after each step
- stop on success, uncertainty, or guardrail triggers

## Success Criteria

- A future session can use a documented tool path under `tools/` to claim a
  manually signed-in Chrome tab and execute page actions without relying on
  `agent.browsers.*`.
- The tool exposes a stable action API for at least:
  - list or select user tabs
  - claim a user tab
  - evaluate JavaScript in the claimed tab
  - click elements
  - fill fields
  - navigate a claimed tab
  - wait for observable page state changes
- The tool includes an LLM decision loop that consumes sanitized page state and
  emits structured next actions.
- The runner includes guardrails for high-risk actions, unclear page state, and
  mismatched tabs.
- The first narrow workflow target is a manually signed-in web app tab such as
  Airbnb reservation management.
- The runner limits Chrome extension-backed execution to the Chrome profile
  named `Codex` unless a future session explicitly overrides that requirement.

## Scope

- Scope: `browser-use-socket`
- Work ID: `implementation-plan`
- Slug: `llm-claimed-tab-runner`

## Working Context

- Repository root:
  `/Users/anwarhahn/dev/codex-workspace`
- Primary tool directory:
  `tools/browser-use-socket/`
- Relevant durable note:
  `durable/operations/AGENTS.md`
- Relevant session evidence:
  `sessions/20260524T180655Z-browser-backend-investigation/`

## Mutation Model

- This work may edit local Codex tooling under `tools/`.
- This work should not modify product repositories outside this workspace.
- External browser state may be mutated only during explicit interactive use of
  the runner, not while building the tool itself.
- Future execution of the finished runner will interact with signed-in browser
  tabs and may mutate third-party web apps, so guardrails are required.

## Required Guidance To Read Before Execution

- Root `AGENTS.md`
- `tools/AGENTS.md`
- `tools/browser-use-socket/AGENTS.md`
- `durable/operations/AGENTS.md`

## Known Facts

- Verified on 2026-05-24: CLI rollouts may have valid turn metadata but still
  lack the privileged `nodeRepl.nativePipe` bridge required by the official
  browser client.
- Verified on 2026-05-24: live Browser Use sockets can still exist under
  `/tmp/codex-browser-use`.
- Verified on 2026-05-24: the direct socket path can discover the Chrome
  extension backend, list user tabs, claim a user tab, attach to it, and send
  selected CDP commands such as `Runtime.evaluate` and `Page.getNavigationHistory`.
- Verified on 2026-05-24: direct backend RPC was most reliable from the Codex
  `node_repl` context rather than plain shell Node execution.
- Verified on 2026-05-24: the local Chrome profile named `Codex` corresponds to
  profile directory `Profile 1` and was the active `last_used` profile in
  Chrome `Local State`.

## Assumptions

- Future sessions can access `node_repl` and import local ESM modules from the
  workspace.
- The direct socket transport remains stable enough for local fallback use.
- The user is willing to manually sign in to the target site and place the
  desired tab in a usable state before the runner acts.

## Constraints

- Do not capture or persist cookies, passwords, local storage dumps, or other
  secret browser state.
- Do not store raw sensitive browser outputs in durable artifacts.
- Keep usage logs sanitized.
- Avoid site-specific overfitting in the core runner. Site-specific workflows
  should be layered above the generic claimed-tab action loop.
- Chrome extension-backed actions must default to the `Codex` Chrome profile
  only.

## Non-Goals

- Replacing the official Browser plugin path when it is already available.
- Building a general-purpose visual browser agent from scratch.
- Bypassing site security, account controls, approvals, or anti-abuse flows.
- Hardcoding every possible Airbnb workflow variant in the first pass.

## Implementation Sequence

### Phase 1: Finish The Generic Claimed-Tab Action Layer

1. Extend `tools/browser-use-socket/browser-use-socket.mjs` so the exported
   helpers cover the full claimed-tab lifecycle:
   - select socket
   - enforce the allowed Chrome profile for extension-backed operations
   - list user tabs
   - match a user tab by title or URL fragment
   - claim the user tab
   - attach to the claimed tab
   - run CDP commands
   - evaluate JavaScript
   - click elements
   - fill fields
   - navigate
   - wait for text, selector, or URL changes
2. Normalize helper return shapes so future action executors do not need to
   parse ad hoc CDP responses repeatedly.
3. Add explicit timeout controls and error classes or structured errors for:
   - no matching tab
   - attach failure
   - selector not found
   - evaluation failure
   - navigation timeout
4. Add example snippets in the tool README for:
   - claim tab by URL fragment
   - evaluate page title
   - fill a field
   - click a button

### Phase 2: Define A Stable Action Schema

1. Define a small structured action model that an LLM can emit, such as:
   - `find_tab`
   - `claim_tab`
   - `inspect`
   - `evaluate`
   - `click`
   - `fill`
   - `navigate`
   - `wait_for_url`
   - `wait_for_text`
   - `stop`
2. Define the corresponding observation model returned to the LLM, including:
   - current URL
   - current title
   - condensed DOM facts
   - candidate selectors
   - recent action result
   - warning flags
3. Keep the action schema small and explicit so execution remains debuggable.

### Phase 3: Build The LLM Decision Loop

1. Create a runner module under `tools/browser-use-socket/` that:
   - accepts a user task prompt
   - claims a target tab
   - captures the initial observation
   - asks the model for the next action or short plan
   - executes the chosen action
   - captures the next observation
   - repeats until success or stop
2. Limit the loop so it can:
   - stop after a configurable step count
   - request confirmation before high-risk actions
   - stop when the page looks unrelated to the target workflow
3. Separate model prompting from transport so future sessions can improve the
   prompt without rewriting the socket layer.

### Phase 4: Add Guardrails

1. Require explicit confirmation for actions with high mutation risk, such as:
   - final submission buttons
   - payment or account changes
   - deleting or removing data
2. Detect ambiguous state and stop when:
   - multiple possible target tabs match
   - the page appears to be logged out
   - the page presents a CAPTCHA, MFA, or approval wall
   - the model emits unsupported or malformed actions
3. Ensure the runner explains why it stopped and what user intervention is
   required next.

### Phase 5: Build One Narrow Workflow Adapter

1. Add a focused example adapter for a real workflow such as:
   - Airbnb reservation guest addition
2. The adapter should:
   - define how to identify the target tab
   - define success signals
   - define known page landmarks
   - defer generic clicking and filling to the core runner
3. Keep the adapter narrow. It is a proving ground for the generic runner, not
   the final architecture.

### Phase 6: Documentation And Verification

1. Update `tools/browser-use-socket/README.md` with:
   - claimed-tab workflow examples
   - LLM runner invocation examples
   - guardrail expectations
   - known limitations
2. Update `tools/browser-use-socket/AGENTS.md` if new durable operating rules
   are introduced.
3. If user feedback arrives during development, add
   `tools/browser-use-socket/CHANGE_REQUESTS.md`.

## Verification Requirements

- Verify the generic helper layer from `node_repl` against a live Chrome
  extension backend:
  - list sockets
  - probe extension socket
  - list user tabs
  - claim a chosen tab
  - evaluate `document.title`
  - click or fill a harmless test element when available
- Verify the action loop with a low-risk target page before using a production
  workflow page.
- Verify that guardrails trigger correctly on:
  - no matching tab
  - ambiguous tab match
  - missing selector
  - step limit exceeded
- For any site-specific adapter, verify only against user-authorized,
  manually signed-in tabs.

## Expected Commands

Examples to expect during implementation:

```sh
tools/browser-use-socket/browser-use-socket list-sockets --json
```

For `node_repl` validation:

```js
const mod = await import("/Users/anwarhahn/dev/codex-workspace/tools/browser-use-socket/browser-use-socket.mjs");
const socket = await mod.selectSocket("extension", 1500);
const { claimed } = await mod.claimUserTab(
  socket,
  { urlContains: "airbnb" },
  {},
  2000
);
await mod.attachTab(socket, claimed.id, {}, 2000);
const title = await mod.evaluateInTab(socket, claimed.id, "document.title", {}, 2000);
console.log(title);
```

## Abort Conditions

- Abort if the direct socket transport stops working and the session cannot use
  either the official browser client or the fallback socket path.
- Abort if the target website presents a login, MFA, CAPTCHA, or approval flow
  that requires user action.
- Abort if the runner cannot distinguish the correct tab confidently.
- Abort if the model repeatedly emits malformed actions after prompt tightening.

## Rollback

- Tool changes are local workspace edits only.
- If a change degrades the tool, revert only the affected files under
  `tools/browser-use-socket/`.
- Do not delete usage logs or session evidence during rollback.

## Evidence Handling

- Write raw validation outputs, screenshots, experimental scripts, and step-by-
  step test traces under a new `sessions/<session_id>/` directory.
- Keep durable artifacts here limited to the plan and future redacted summaries.

## Final Deliverables

- Updated `tools/browser-use-socket/` implementation
- Updated tool documentation
- Optional `CHANGE_REQUESTS.md` if feedback accumulates
- Session evidence under `sessions/`
- Any final durable operational lesson under `durable/operations/` only if it
  remains broadly useful beyond one run
