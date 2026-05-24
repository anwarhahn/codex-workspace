#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const TOOL_NAME = "browser-use-socket";
const TOOL_VERSION = 1;
const DEFAULT_SOCKET_DIR = "/tmp/codex-browser-use";
const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_ALLOWED_CHROME_PROFILE_NAME = "Codex";
const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(TOOL_DIR, "../..");
const DEFAULT_USAGE_LOG_PATH = path.join(
  WORKSPACE_ROOT,
  "shared/tool-usage/browser-use-socket/invocations.jsonl"
);

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  await logInvocation(parsed).catch(() => {});

  switch (parsed.subcommand) {
    case "list-sockets":
      await runListSockets(parsed);
      return;
    case "probe-sockets":
      await runProbeSockets(parsed);
      return;
    case "list-tabs":
      await runListTabs(parsed);
      return;
    case "rpc":
      await runRpc(parsed);
      return;
    case "help":
    case undefined:
      printHelp();
      process.exit(parsed.subcommand ? 0 : 2);
      return;
    default:
      throw new Error(`Unknown subcommand: ${parsed.subcommand}`);
  }
}

function parseArgs(argv) {
  const out = {
    subcommand: argv[0],
    json: false,
    socket: null,
    browser: "extension",
    method: null,
    params: "{}",
    sessionId: null,
    turnId: null,
    timeoutMs: DEFAULT_TIMEOUT_MS
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--json") {
      out.json = true;
      continue;
    }
    if (arg === "--socket") {
      out.socket = requireValue(arg, next);
      i += 1;
      continue;
    }
    if (arg === "--browser") {
      out.browser = requireValue(arg, next);
      i += 1;
      continue;
    }
    if (arg === "--method") {
      out.method = requireValue(arg, next);
      i += 1;
      continue;
    }
    if (arg === "--params") {
      out.params = requireValue(arg, next);
      i += 1;
      continue;
    }
    if (arg === "--session-id") {
      out.sessionId = requireValue(arg, next);
      i += 1;
      continue;
    }
    if (arg === "--turn-id") {
      out.turnId = requireValue(arg, next);
      i += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      out.timeoutMs = Number(requireValue(arg, next));
      if (!Number.isInteger(out.timeoutMs) || out.timeoutMs <= 0) {
        throw new Error("--timeout-ms must be a positive integer");
      }
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      out.subcommand = "help";
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return out;
}

function requireValue(flag, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

async function runListSockets(parsed) {
  const sockets = await listSockets();
  emit(parsed, sockets);
}

async function runProbeSockets(parsed) {
  const sockets = await listSockets();
  const results = [];
  for (const socketPath of sockets) {
    results.push(await probeSocket(socketPath, parsed.timeoutMs));
  }
  emit(parsed, results);
}

async function runListTabs(parsed) {
  const socketPath = parsed.socket ?? await selectSocket(parsed.browser, parsed.timeoutMs);
  const params = withSessionMeta({}, parsed);
  const result = await rpc(socketPath, "getUserTabs", params, parsed.timeoutMs);
  emit(parsed, { socket: socketPath, browser: parsed.browser, tabs: result });
}

async function runRpc(parsed) {
  if (!parsed.method) {
    throw new Error("rpc requires --method");
  }
  const socketPath = parsed.socket ?? await selectSocket(parsed.browser, parsed.timeoutMs);
  const userParams = parseJsonObject(parsed.params, "--params");
  const params = withSessionMeta(userParams, parsed);
  const result = await rpc(socketPath, parsed.method, params, parsed.timeoutMs);
  emit(parsed, { socket: socketPath, method: parsed.method, result });
}

export async function listSockets() {
  let entries;
  try {
    entries = await fs.readdir(DEFAULT_SOCKET_DIR, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.isSocket?.() || entry.name.endsWith(".sock"))
    .map((entry) => path.join(DEFAULT_SOCKET_DIR, entry.name))
    .sort();
}

export async function selectSocket(browserType, timeoutMs) {
  if (browserType === "extension") {
    await assertAllowedChromeProfileContext();
  }
  const sockets = await listSockets();
  if (sockets.length === 0) {
    throw new Error(`No sockets found under ${DEFAULT_SOCKET_DIR}`);
  }

  for (const socketPath of sockets) {
    const probe = await probeSocket(socketPath, timeoutMs);
    if (probe.ok && probe.info?.type === browserType) {
      return socketPath;
    }
  }

  throw new Error(`No socket matched browser type: ${browserType}`);
}

export async function probeSocket(socketPath, timeoutMs) {
  try {
    const info = await rpc(
      socketPath,
      "getInfo",
      withProbeSessionMeta({}),
      timeoutMs
    );
    return { ok: true, socket: socketPath, info };
  } catch (error) {
    return {
      ok: false,
      socket: socketPath,
      error: String(error)
    };
  }
}

export async function listUserTabs(socketPath, parsedOrSession = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  await assertSocketAllowed(socketPath, timeoutMs);
  const params = normalizeSessionMeta(parsedOrSession);
  return await rpc(socketPath, "getUserTabs", params, timeoutMs);
}

export function findUserTab(tabs, matcher = {}) {
  if (matcher.tabId !== undefined && matcher.tabId !== null) {
    return tabs.find((tab) => String(tab.id) === String(matcher.tabId)) ?? null;
  }

  const titleContains = matcher.titleContains?.toLowerCase();
  const urlContains = matcher.urlContains?.toLowerCase();

  return tabs.find((tab) => {
    const title = String(tab.title ?? "").toLowerCase();
    const url = String(tab.url ?? "").toLowerCase();
    if (titleContains && !title.includes(titleContains)) return false;
    if (urlContains && !url.includes(urlContains)) return false;
    return Boolean(titleContains || urlContains);
  }) ?? null;
}

export async function claimUserTab(socketPath, matcher = {}, parsedOrSession = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  await assertSocketAllowed(socketPath, timeoutMs);
  const params = normalizeSessionMeta(parsedOrSession);
  const tabs = await listUserTabs(socketPath, params, timeoutMs);
  const selected = findUserTab(tabs, matcher);
  if (!selected) {
    throw new Error("No matching user tab found");
  }
  const claimed = await rpc(
    socketPath,
    "claimUserTab",
    { ...params, tabId: selected.id },
    timeoutMs
  );
  return { selected, claimed };
}

export async function attachTab(socketPath, tabId, parsedOrSession = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  await assertSocketAllowed(socketPath, timeoutMs);
  const params = normalizeSessionMeta(parsedOrSession);
  await rpc(socketPath, "attach", { ...params, tabId }, timeoutMs);
}

export async function cdpCommand(
  socketPath,
  tabId,
  method,
  commandParams = {},
  parsedOrSession = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  await assertSocketAllowed(socketPath, timeoutMs);
  const params = normalizeSessionMeta(parsedOrSession);
  return await rpc(
    socketPath,
    "executeCdp",
    {
      ...params,
      target: { tabId },
      method,
      commandParams
    },
    timeoutMs
  );
}

export async function evaluateInTab(
  socketPath,
  tabId,
  expression,
  parsedOrSession = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  if (typeof expression !== "string" || expression.length === 0) {
    throw new Error("evaluateInTab requires a non-empty expression");
  }
  return await cdpCommand(
    socketPath,
    tabId,
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    parsedOrSession,
    timeoutMs
  );
}

export async function clickSelector(
  socketPath,
  tabId,
  selector,
  parsedOrSession = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const expression = `
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, error: "not-found" };
      el.scrollIntoView({ block: "center", inline: "center" });
      el.click();
      return { ok: true };
    })()
  `;
  return await evaluateInTab(socketPath, tabId, expression, parsedOrSession, timeoutMs);
}

export async function fillSelector(
  socketPath,
  tabId,
  selector,
  value,
  parsedOrSession = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const expression = `
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, error: "not-found" };
      el.scrollIntoView({ block: "center", inline: "center" });
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
        || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(el, ${JSON.stringify(value)});
      else el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, value: el.value ?? null };
    })()
  `;
  return await evaluateInTab(socketPath, tabId, expression, parsedOrSession, timeoutMs);
}

export async function navigateClaimedTab(
  socketPath,
  tabId,
  url,
  parsedOrSession = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  return await cdpCommand(
    socketPath,
    tabId,
    "Page.navigate",
    { url },
    parsedOrSession,
    timeoutMs
  );
}

export async function rpc(socketPath, method, params, timeoutMs) {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let settled = false;
    let buffers = [];

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {}
      fn(value);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.on("connect", () => {
      socket.write(encodeFrame({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      }));
    });

    socket.on("data", (chunk) => {
      buffers.push(chunk);
      const message = tryDecodeFirstFrame(Buffer.concat(buffers));
      if (!message) return;
      if (message.error) {
        finish(reject, new Error(message.error.message || "RPC error"));
        return;
      }
      finish(resolve, message.result);
    });

    socket.on("error", (error) => {
      finish(reject, error);
    });

    socket.on("close", () => {
      if (!settled) {
        finish(reject, new Error("Socket closed before response"));
      }
    });
  });
}

export async function readChromeLocalProfiles() {
  const localStatePath = path.join(
    os.homedir(),
    "Library/Application Support/Google/Chrome/Local State"
  );
  const raw = await fs.readFile(localStatePath, "utf8");
  const data = JSON.parse(raw);
  const order = data.profile?.profiles_order ?? [];
  const info = data.profile?.info_cache ?? {};
  const lastUsed = data.profile?.last_used ?? null;

  return order.map((id) => ({
    id,
    name: info[id]?.name ?? null,
    lastUsed: id === lastUsed
  }));
}

export function getAllowedChromeProfileName() {
  const envValue = typeof process !== "undefined"
    ? process.env.BROWSER_USE_SOCKET_ALLOWED_CHROME_PROFILE
    : undefined;
  return envValue && envValue.trim().length > 0
    ? envValue.trim()
    : DEFAULT_ALLOWED_CHROME_PROFILE_NAME;
}

export async function getActiveChromeProfile() {
  const profiles = await readChromeLocalProfiles();
  return profiles.find((profile) => profile.lastUsed) ?? null;
}

export async function assertAllowedChromeProfileContext() {
  const allowedName = getAllowedChromeProfileName();
  const active = await getActiveChromeProfile();
  if (!active) {
    throw new Error("Could not determine the active Chrome profile");
  }
  if (active.name !== allowedName) {
    throw new Error(
      `Refusing Chrome backend operation because the active Chrome profile is "${active.name ?? active.id}" and the allowed profile is "${allowedName}"`
    );
  }
  return active;
}

export async function assertSocketAllowed(socketPath, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const probe = await probeSocket(socketPath, timeoutMs);
  if (!probe.ok) {
    throw new Error(`Could not probe socket: ${socketPath}`);
  }
  if (probe.info?.type === "extension") {
    await assertAllowedChromeProfileContext();
  }
  return probe;
}

function encodeFrame(message) {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

function tryDecodeFirstFrame(buffer) {
  if (buffer.length < 4) return null;
  const size = buffer.readUInt32LE(0);
  if (buffer.length < 4 + size) return null;
  return JSON.parse(buffer.subarray(4, 4 + size).toString("utf8"));
}

export function withProbeSessionMeta(params) {
  return {
    ...params,
    session_id: "probe-session",
    turn_id: "probe-turn"
  };
}

export function withSessionMeta(params, parsed) {
  return {
    ...params,
    session_id: parsed.sessionId ?? generatedSessionId(),
    turn_id: parsed.turnId ?? generatedTurnId()
  };
}

function normalizeSessionMeta(parsedOrSession) {
  if (parsedOrSession.session_id && parsedOrSession.turn_id) {
    return parsedOrSession;
  }
  return withSessionMeta({}, parsedOrSession);
}

function generatedSessionId() {
  return `socket-tool-${crypto.randomUUID()}`;
}

function generatedTurnId() {
  return `turn-${crypto.randomUUID()}`;
}

function parseJsonObject(raw, flag) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${flag} must be valid JSON`);
  }
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${flag} must decode to a JSON object`);
  }
  return value;
}

function emit(parsed, value) {
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      process.stdout.write(`${formatLine(item)}\n`);
    }
    if (value.length === 0) {
      process.stdout.write("(no results)\n");
    }
    return;
  }

  if (value && typeof value === "object") {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${String(value)}\n`);
}

function formatLine(item) {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    if (item.socket && item.info?.type) {
      return `${item.socket} ${item.info.type} ${item.info.name ?? ""}`.trim();
    }
    if (item.socket && item.error) {
      return `${item.socket} ERROR ${item.error}`;
    }
  }
  return JSON.stringify(item);
}

async function logInvocation(parsed) {
  if (process.env.BROWSER_USE_SOCKET_DISABLE_USAGE_LOG === "1") {
    return;
  }

  const logPath = process.env.BROWSER_USE_SOCKET_USAGE_LOG_PATH || DEFAULT_USAGE_LOG_PATH;
  const record = {
    ts_utc: new Date().toISOString(),
    tool: TOOL_NAME,
    schema_version: TOOL_VERSION,
    subcommand: parsed.subcommand ?? null,
    output_format: parsed.json ? "json" : "text",
    browser_filter: parsed.browser ?? null,
    used_explicit_socket: Boolean(parsed.socket),
    used_explicit_method: Boolean(parsed.method),
    used_explicit_params: parsed.params !== "{}",
    used_explicit_session_id: Boolean(parsed.sessionId),
    used_explicit_turn_id: Boolean(parsed.turnId),
    allowed_chrome_profile: getAllowedChromeProfileName(),
    timeout_ms: parsed.timeoutMs,
    terminal_columns: process.stdout.columns ?? null,
    cwd_default_root: process.cwd()
  };

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: browser-use-socket <subcommand> [options]",
      "",
      "Subcommands:",
      "  list-sockets",
      "  probe-sockets",
      "  list-tabs",
      "  rpc --method <name>",
      "",
      "Common options:",
      "  --json",
      "  --socket <path>",
      "  --browser <extension|iab|cdp>",
      "  --session-id <value>",
      "  --turn-id <value>",
      "  --timeout-ms <n>"
    ].join("\n") + "\n"
  );
}

const executedPath = typeof process !== "undefined" && process.argv?.[1]
  ? path.resolve(process.argv[1])
  : null;
if (executedPath && executedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${TOOL_NAME}: ${error.message}\n`);
    process.exit(1);
  });
}
