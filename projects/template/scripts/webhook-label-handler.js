#!/usr/bin/env node
/**
 * scripts/webhook-label-handler.js
 *
 * Resolves a GitHub "label added" webhook event to an agent identity.
 * Called when Cloudflare Worker receives a GitHub webhook with action: "labeled".
 *
 * Label convention (set by CEO when creating the project):
 *   name:        "agent:<key>"         e.g. "agent:security-engineer"
 *   description: "<library-path>"      e.g. "engineering/engineering-security-engineer.md"
 *
 * The description field carries the exact library path so the spawned agent
 * knows precisely which persona file to load from the master OS library —
 * no guessing, no fuzzy matching.
 *
 * Usage:
 *   node scripts/webhook-label-handler.js '<webhook-json>'
 *   node scripts/webhook-label-handler.js --file webhook.json
 *   echo '<json>' | node scripts/webhook-label-handler.js
 *
 * Output (stdout JSON — Cloudflare Worker / Claude Code reads this):
 *   {
 *     "agent_key":    "security-engineer",
 *     "library_path": "engineering/engineering-security-engineer.md",
 *     "skills_file":  ".claude/agents/skills/security-engineer.md",
 *     "issue_number": 42,
 *     "repo":         "Agents-Digital-Enterprise/my-project",
 *     "session_cmd":  "..."   <- copy-paste bootstrap for the agent session
 *   }
 *
 * Exit codes:
 *   0 — resolved successfully (or non-agent label — just ignored)
 *   1 — bad payload or unrecoverable error
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT       = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = resolve(ROOT, ".claude/agents/skills");
const LABEL_PREFIX = "agent:";

// ── Payload parsing ────────────────────────────────────────────
function parsePayload(raw) {
  try {
    return JSON.parse(raw.trim());
  } catch {
    console.error("[!] webhook-label-handler: invalid JSON payload");
    process.exit(1);
  }
}

function readInput() {
  const args = process.argv.slice(2);
  if (args[0] === "--file" && args[1]) return readFileSync(args[1], "utf8");
  if (args[0]) return args[0];
  return readFileSync("/dev/stdin", "utf8");
}

// ── Label resolution ───────────────────────────────────────────
function resolveLabel(label) {
  if (!label?.name?.startsWith(LABEL_PREFIX)) return null;

  const key = label.name.slice(LABEL_PREFIX.length);
  // CEO stores the library path in the label description when creating the project.
  // Format: "<category>/<filename>.md"  e.g. "engineering/engineering-security-engineer.md"
  const libraryPath = label.description?.trim() || null;

  return { key, libraryPath };
}

// ── Skills file resolution ─────────────────────────────────────
function skillsFileExists(key) {
  return existsSync(resolve(SKILLS_DIR, `${key}.md`));
}

// ── Session bootstrap command ──────────────────────────────────
function buildSessionCommand(key, libraryPath, issueNumber) {
  const persona = libraryPath
    ? `master OS library: ${libraryPath}`
    : `.claude/agents/skills/${key}.md`;

  return [
    "node scripts/github-app-token.js && source .secrets/.env",
    `# Persona: ${persona}`,
    `node scripts/github-logger.js comment ${issueNumber} ${key} "Assuming role from webhook label trigger. Reading context..."`,
  ].join("\n");
}

// ── Main ───────────────────────────────────────────────────────
function main() {
  const payload = parsePayload(readInput());

  if (payload.action !== "labeled") {
    // Not our event — exit silently
    process.exit(0);
  }

  const resolved = resolveLabel(payload.label);
  if (!resolved) {
    // Label doesn't follow agent: convention — ignore
    process.exit(0);
  }

  const { key, libraryPath } = resolved;
  const issueNumber = payload.issue?.number;
  const repo = payload.repository
    ? `${payload.repository.owner.login}/${payload.repository.name}`
    : "[unknown]";

  const result = {
    agent_key:    key,
    library_path: libraryPath,
    skills_file:  skillsFileExists(key) ? `.claude/agents/skills/${key}.md` : null,
    issue_number: issueNumber,
    repo,
    session_cmd:  buildSessionCommand(key, libraryPath, issueNumber),
  };

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main();
