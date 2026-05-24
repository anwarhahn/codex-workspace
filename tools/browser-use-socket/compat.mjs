import {
  attachTab,
  claimUserTab,
  cdpCommand,
  clickSelector,
  createSessionMeta,
  evaluateValueInTab,
  fillSelector,
  finalizeClaimedTab,
  listUserTabs,
  navigateClaimedTab,
  selectSocket,
  snapshotTab,
  waitForSelector,
  waitForText,
  waitForUrlContains
} from "./browser-use-socket.mjs";

export async function getBrowser(options = {}) {
  const backend = options.backend ?? "extension";
  const timeoutMs = options.timeoutMs ?? 2000;
  const sessionMeta = options.sessionMeta ?? createSessionMeta();
  const socketPath = options.socketPath ?? await selectSocket(backend, timeoutMs);

  return {
    backend,
    timeoutMs,
    sessionMeta,
    socketPath,
    user: {
      openTabs: async () => await listUserTabs(socketPath, sessionMeta, timeoutMs),
      claimTab: async (matcher) => {
        const claim = await claimUserTab(socketPath, matcher, sessionMeta, timeoutMs);
        return {
          selected: claim.selected,
          tab: createClaimedTab({
            socketPath,
            timeoutMs,
            sessionMeta,
            info: claim.claimed
          })
        };
      }
    }
  };
}

export async function claimTab(options = {}) {
  const browser = await getBrowser(options);
  return await browser.user.claimTab(options.matcher ?? {});
}

export async function inspectClaimedTab(options = {}) {
  const claim = await claimTab(options);
  await claim.tab.attach();
  const snapshot = await claim.tab.inspect();
  return {
    selected: claim.selected,
    tab: claim.tab,
    snapshot
  };
}

export async function runAction(options = {}) {
  const tab = options.tab;
  const action = options.action;
  if (!tab) {
    throw new Error("runAction requires a claimed tab");
  }
  if (!action || typeof action !== "object") {
    throw new Error("runAction requires an action object");
  }

  switch (action.action) {
    case "inspect":
      return await tab.inspect();
    case "click":
      return await tab.click(action.args);
    case "fill":
      return await tab.fill(action.args);
    case "navigate":
      return await tab.navigate(action.args);
    case "evaluate":
      return await tab.evaluate(action.args);
    case "wait_for_text":
      return await tab.waitForText(action.args);
    case "wait_for_url":
      return await tab.waitForUrl(action.args);
    case "wait_for_selector":
      return await tab.waitForSelector(action.args);
    case "stop":
      return {
        status: "stopped",
        action
      };
    default:
      throw new Error(`Unsupported action: ${action.action}`);
  }
}

export async function runActions(options = {}) {
  const results = [];
  for (const action of options.actions ?? []) {
    results.push(await runAction({ tab: options.tab, action }));
  }
  return results;
}

function createClaimedTab({ socketPath, timeoutMs, sessionMeta, info }) {
  return {
    info,
    async attach() {
      return await attachTab(socketPath, info.id, sessionMeta, timeoutMs);
    },
    async inspect() {
      return await snapshotTab(socketPath, info.id, sessionMeta, timeoutMs);
    },
    async evaluate(args = {}) {
      return await evaluateValueInTab(
        socketPath,
        info.id,
        args.expression,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async click(args = {}) {
      return await clickSelector(
        socketPath,
        info.id,
        args.selector,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async fill(args = {}) {
      return await fillSelector(
        socketPath,
        info.id,
        args.selector,
        args.value,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async navigate(args = {}) {
      return await navigateClaimedTab(
        socketPath,
        info.id,
        args.url,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async waitForText(args = {}) {
      return await waitForText(
        socketPath,
        info.id,
        args.text,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async waitForUrl(args = {}) {
      return await waitForUrlContains(
        socketPath,
        info.id,
        args.text,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async waitForSelector(args = {}) {
      return await waitForSelector(
        socketPath,
        info.id,
        args.selector,
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async cdp(args = {}) {
      return await cdpCommand(
        socketPath,
        info.id,
        args.method,
        args.commandParams ?? {},
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    },
    async finalize(args = {}) {
      return await finalizeClaimedTab(
        socketPath,
        info.id,
        args.status ?? "handoff",
        sessionMeta,
        args.timeoutMs ?? timeoutMs
      );
    }
  };
}
