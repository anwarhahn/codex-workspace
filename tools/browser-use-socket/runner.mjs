import { inspectClaimedTab, runAction } from "./compat.mjs";

const ALLOWED_ACTIONS = new Set([
  "find_tab",
  "claim_tab",
  "inspect",
  "click",
  "fill",
  "navigate",
  "evaluate",
  "wait_for_text",
  "wait_for_url",
  "wait_for_selector",
  "stop"
]);

export function createRunner(options = {}) {
  return {
    async runTaskStep(stepOptions) {
      return await runTaskStep({
        ...options,
        ...stepOptions
      });
    }
  };
}

export async function buildObservation(options = {}) {
  const inspect = await inspectClaimedTab({
    backend: options.backend ?? "extension",
    socketPath: options.socketPath,
    timeoutMs: options.timeoutMs ?? 2000,
    sessionMeta: options.sessionMeta,
    matcher: options.matcher ?? {}
  });

  return {
    task: options.task,
    step_index: options.stepIndex ?? 0,
    max_steps: options.maxSteps ?? 12,
    browser_backend: options.backend ?? "extension",
    profile_name: options.profileName ?? "Codex",
    tab: {
      id: inspect.tab.info.id,
      title: inspect.tab.info.title ?? inspect.snapshot.title ?? "",
      url: inspect.tab.info.url ?? inspect.snapshot.url ?? ""
    },
    page: {
      title: inspect.snapshot.title ?? "",
      url: inspect.snapshot.url ?? "",
      ready_state: inspect.snapshot.readyState ?? "",
      text_excerpt: inspect.snapshot.textExcerpt ?? "",
      forms: inspect.snapshot.forms ?? [],
      candidate_targets: inspect.snapshot.candidateTargets ?? []
    },
    last_action: options.lastAction ?? {
      type: null,
      input: {},
      result_summary: null,
      error: null
    },
    warnings: options.warnings ?? [],
    claimed: inspect
  };
}

export function validateAction(action) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new Error("Action must be an object");
  }
  if (!ALLOWED_ACTIONS.has(action.action)) {
    throw new Error(`Unsupported action: ${action.action}`);
  }
  if (typeof action.reason !== "string" || action.reason.length === 0) {
    throw new Error("Action requires a non-empty reason");
  }
  if (typeof action.expect !== "string" || action.expect.length === 0) {
    throw new Error("Action requires a non-empty expect string");
  }
  if (action.args === null || action.args === undefined) {
    action.args = {};
  }
  if (typeof action.args !== "object" || Array.isArray(action.args)) {
    throw new Error("Action args must be an object");
  }
  return action;
}

export async function executeAction(options = {}) {
  const action = validateAction(structuredClone(options.action));
  const observation = options.observation;
  const tab = observation.claimed.tab;

  if (isRiskyAction(action, observation) && action.confirmed !== true) {
    return {
      status: "needs_confirmation",
      message: describeRisk(action),
      proposed_action: action
    };
  }

  if (action.action === "stop") {
    return {
      status: action.args.status ?? "stopped",
      message: action.args.message ?? action.reason,
      proposed_action: action
    };
  }

  if (action.action === "find_tab" || action.action === "claim_tab") {
    return {
      status: "noop",
      message: "Tab is already claimed for this step executor",
      proposed_action: action
    };
  }

  const result = await runAction({
    tab,
    action
  });

  return {
    status: "ok",
    action,
    result
  };
}

export async function runTaskStep(options = {}) {
  const observation = await buildObservation(options);
  const execution = await executeAction({
    observation,
    action: options.action
  });

  if (execution.status === "needs_confirmation" || execution.status === "stopped") {
    return {
      status: execution.status,
      task: options.task,
      proposed_action: execution.proposed_action ?? null,
      message: execution.message ?? null,
      observation: stripClaimed(observation)
    };
  }

  const nextObservation = await buildObservation({
    ...options,
    lastAction: summarizeActionExecution(options.action, execution),
    warnings: deriveWarnings(observation, execution)
  });

  return {
    status: execution.status,
    task: options.task,
    action: options.action,
    action_result: execution.result ?? null,
    observation: stripClaimed(nextObservation)
  };
}

function summarizeActionExecution(action, execution) {
  return {
    type: action.action,
    input: action.args,
    result_summary: summarizeResult(execution.result),
    error: execution.status === "ok" ? null : execution.message ?? null
  };
}

function summarizeResult(result) {
  if (result === null || result === undefined) {
    return null;
  }
  if (typeof result === "string") {
    return result.slice(0, 400);
  }
  return JSON.stringify(result).slice(0, 400);
}

function deriveWarnings(observation, execution) {
  const warnings = [];
  const url = observation.page?.url ?? "";
  const title = observation.page?.title?.toLowerCase() ?? "";
  const text = observation.page?.text_excerpt?.toLowerCase() ?? "";
  if (title.includes("sign in") || text.includes("sign in")) {
    warnings.push("page-may-be-logged-out");
  }
  if (text.includes("captcha") || text.includes("two-factor") || text.includes("verification code")) {
    warnings.push("page-requires-human-auth-step");
  }
  if (execution.status !== "ok") {
    warnings.push("last-step-did-not-complete-cleanly");
  }
  if (url.length === 0) {
    warnings.push("page-url-unavailable");
  }
  return warnings;
}

function stripClaimed(observation) {
  const { claimed, ...rest } = observation;
  return rest;
}

function isRiskyAction(action, observation) {
  if (action.action === "evaluate") {
    const expr = String(action.args.expression ?? "").toLowerCase();
    if (
      expr.includes(".click(") ||
      expr.includes("dispatchEvent".toLowerCase()) ||
      expr.includes(".submit(") ||
      expr.includes("window.location")
    ) {
      return true;
    }
  }

  if (action.action !== "click") {
    return false;
  }

  const selector = String(action.args.selector ?? "").toLowerCase();
  const riskyWords = ["submit", "save", "confirm", "remove", "delete", "pay", "book", "send"];
  if (riskyWords.some((word) => selector.includes(word))) {
    return true;
  }

  const candidates = observation.page?.candidate_targets ?? [];
  const matched = candidates.find((item) => item.selector === action.args.selector);
  return riskyWords.some((word) => String(matched?.reason ?? "").toLowerCase().includes(word));
}

function describeRisk(action) {
  return `Confirmation required before executing risky action: ${action.action}`;
}
