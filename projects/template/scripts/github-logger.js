#!/usr/bin/env node
/**
 * github-logger.js
 *
 * Formats and posts structured GitHub comments from agent sessions.
 * All agent output is signed with the bot identity for full transparency.
 *
 * Usage:
 *   node scripts/github-logger.js comment <issue_number> <role> "<summary>"
 *   node scripts/github-logger.js handoff <issue_number> <role> <next_role> "<summary>"
 *   node scripts/github-logger.js status  <issue_number> <role>
 *
 * Commands:
 *   comment   Post a general structured comment
 *   handoff   Post a formal role-handoff comment with next-agent instructions
 *   status    Post a progress status update
 *
 * Environment:
 *   GITHUB_TOKEN must be set (source .secrets/.env first)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT       = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH   = resolve(ROOT, ".secrets/.env");
const CONFIG_PATH = resolve(ROOT, ".secrets/github-app.json");
const REPO       = process.env.GITHUB_REPO || "Agents-Digital-Enterprise/agency-agents-enterprise";

const ROLE_ICONS = {
  "Architect":  "🏛️",
  "TeamLead":   "🔧",
  "QA":         "🔍",
  "System":     "⚙️",
};

const AGENT_NAME = "agent-digitals-git-orchestrator";

// ── Load token ───────────────────────────────────────────────
function loadToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  if (existsSync(ENV_PATH)) {
    const raw = readFileSync(ENV_PATH, "utf8");
    const match = raw.match(/^GITHUB_TOKEN=(.+)$/m);
    if (match) return match[1].trim();
  }

  console.error("[!] GITHUB_TOKEN not found. Run: node scripts/github-app-token.js");
  process.exit(1);
}

// ── GitHub API ───────────────────────────────────────────────
async function ghPost(path, token, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `${AGENT_NAME}/1.0`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API POST ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Comment builders ─────────────────────────────────────────
function buildCommentBody(role, summary, extra = "") {
  const icon = ROLE_ICONS[role] || "🤖";
  const ts   = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return [
    `### 🤖 ${AGENT_NAME} — ${icon} ${role}`,
    "",
    `**Summary:** ${summary}`,
    "",
    extra,
    "---",
    `<sub>🕐 ${ts} · 🔑 App ID: \`${loadAppId()}\` · Repo: \`${REPO}\`</sub>`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

function buildHandoffBody(role, nextRole, summary, vikingKey) {
  const icon     = ROLE_ICONS[role]     || "🤖";
  const nextIcon = ROLE_ICONS[nextRole] || "🤖";
  const ts       = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return [
    `### 🤖 ${AGENT_NAME} — ${icon} ${role} → Handoff`,
    "",
    `**Summary:** ${summary}`,
    "",
    "#### Progress",
    "| Task | Status |",
    "|---|---|",
    "| Role completed | ✅ Done |",
    "| Memory indexed | ✅ Indexed |",
    "",
    "#### Memory",
    `- **Viking ID:** \`${vikingKey}\``,
    `- **Snapshot:** ${ts}`,
    "",
    "#### Next Step",
    `**Role needed:** ${nextIcon} ${nextRole}`,
    `**Action:** Read memory at \`${vikingKey}\` then pick up from pending steps.`,
    "",
    "---",
    `<sub>🕐 ${ts} · 🔑 App ID: \`${loadAppId()}\` · Repo: \`${REPO}\`</sub>`,
  ].join("\n");
}

function buildStatusBody(role, tasks) {
  const icon = ROLE_ICONS[role] || "🤖";
  const ts   = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const rows = tasks
    .map(([label, done]) => `| ${label} | ${done ? "✅ Done" : "🔄 In Progress"} |`)
    .join("\n");

  return [
    `### 🤖 ${AGENT_NAME} — ${icon} ${role} · Status Update`,
    "",
    "#### Progress",
    "| Task | Status |",
    "|---|---|",
    rows,
    "",
    "---",
    `<sub>🕐 ${ts} · 🔑 App ID: \`${loadAppId()}\`</sub>`,
  ].join("\n");
}

function loadAppId() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")).app_id;
  } catch {
    return "unknown";
  }
}

// ── CLI ──────────────────────────────────────────────────────
async function main() {
  const [, , cmd, issueArg, ...rest] = process.argv;
  const issue = parseInt(issueArg);

  if (!cmd || !issue) {
    console.error("Usage: node scripts/github-logger.js <comment|handoff|status> <issue_number> ...");
    process.exit(1);
  }

  const token = loadToken();
  const apiPath = `/repos/${REPO}/issues/${issue}/comments`;

  let body;

  if (cmd === "comment") {
    const [role, ...summaryParts] = rest;
    body = buildCommentBody(role, summaryParts.join(" "));
  } else if (cmd === "handoff") {
    const [role, nextRole, ...summaryParts] = rest;
    const vikingKey = `viking://memories/${issue}`;
    body = buildHandoffBody(role, nextRole, summaryParts.join(" "), vikingKey);
  } else if (cmd === "status") {
    const [role] = rest;
    // Default demo tasks — in real use, pass as JSON via stdin or a file
    const tasks = [["Task 1", true], ["Task 2", false]];
    body = buildStatusBody(role, tasks);
  } else {
    console.error(`[!] Unknown command: ${cmd}. Use: comment | handoff | status`);
    process.exit(1);
  }

  console.log("[•] Posting to GitHub...");
  const result = await ghPost(apiPath, token, { body });
  console.log(`[✓] Comment posted: ${result.html_url}`);
}

main().catch((err) => {
  console.error(`[!] Fatal: ${err.message}`);
  process.exit(1);
});
