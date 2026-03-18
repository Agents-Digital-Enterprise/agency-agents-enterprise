#!/usr/bin/env node
/**
 * agents-mcp-server.js
 *
 * Local filesystem-based MCP server for agent persona management.
 * Reads .claude/agents/*.md (overlays) and .claude/agents/library/**\/*.md (full library).
 *
 * MCP Tools exposed:
 *   list_personas     — List overlay personas + library categories/agents
 *   get_persona       — Load a persona by key (overlay) or library path
 *   resolve_role      — Given last issue comment text, return the correct persona
 *   get_output_prefix — Return the GitHub comment prefix for a role
 *   list_library      — List all agents in the library, optionally filtered by category
 *   get_library_agent — Load a library agent by category/filename
 *
 * Usage (in mcp-config.json):
 *   "command": "node",
 *   "args": ["scripts/agents-mcp-server.js"]
 *
 * Runs as a stdio MCP server — no port, no network.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT        = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR  = resolve(ROOT, ".claude/agents");
const LIBRARY_DIR = resolve(AGENTS_DIR, "library");

// ── Overlay Persona index ─────────────────────────────────────
const PERSONA_MAP = {
  ceo:        { file: "ceo.md",         symbol: "👔", triggers: ["CEO","research","strategy","decide agents","plan project","portfolio","brief"] },
  architect:  { file: "architect.md",   symbol: "🏛️", triggers: ["ARCHITECT","design","plan","architecture","breakdown","spec"] },
  "team-lead":{ file: "team-lead.md",   symbol: "🔧", triggers: ["LEAD","implement","build","code","fix","develop"] },
  qa:         { file: "qa-engineer.md", symbol: "🔍", triggers: ["QA","review","test","validate","check","approve"] },
};

const PERSONA_LABELS = {
  "ceo":       "CEO",
  "architect": "Architect",
  "team-lead": "Team Lead",
  "qa":        "QA Engineer",
};

function loadPersona(key) {
  const meta = PERSONA_MAP[key];
  if (!meta) return null;
  const path = resolve(AGENTS_DIR, meta.file);
  if (!existsSync(path)) return null;
  return { key, ...meta, content: readFileSync(path, "utf8") };
}

function resolveRole(commentText) {
  const text = (commentText || "").toLowerCase();
  for (const [key, meta] of Object.entries(PERSONA_MAP)) {
    for (const trigger of meta.triggers) {
      if (text.includes(trigger.toLowerCase())) return key;
    }
  }
  return "architect"; // default bootstrap role
}

function getOutputPrefix(key) {
  const meta = PERSONA_MAP[key];
  if (!meta) return "### 🤖 agent-digitals-git-orchestrator";
  const label = PERSONA_LABELS[key] || key;
  return `### 🤖 agent-digitals-git-orchestrator — ${meta.symbol} ${label}`;
}

// ── Library scanner ───────────────────────────────────────────
function scanLibrary(categoryFilter) {
  if (!existsSync(LIBRARY_DIR)) return [];
  const results = [];
  const categories = readdirSync(LIBRARY_DIR).filter(entry => {
    const full = join(LIBRARY_DIR, entry);
    return statSync(full).isDirectory() && !entry.startsWith(".");
  });
  for (const cat of categories) {
    if (categoryFilter && cat !== categoryFilter) continue;
    const catDir = join(LIBRARY_DIR, cat);
    const files = readdirSync(catDir).filter(f => f.endsWith(".md"));
    for (const file of files) {
      results.push({ category: cat, file, path: `${cat}/${file}` });
    }
  }
  return results;
}

function loadLibraryAgent(agentPath) {
  const full = join(LIBRARY_DIR, agentPath);
  if (!existsSync(full)) return null;
  return { path: agentPath, content: readFileSync(full, "utf8") };
}

// ── MCP Tools definition ──────────────────────────────────────
const TOOLS = [
  {
    name: "list_personas",
    description: "List all overlay agent personas (CEO, Architect, Team Lead, QA) with their triggers",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_persona",
    description: "Load an overlay persona definition by key (ceo | architect | team-lead | qa)",
    inputSchema: {
      type: "object",
      required: ["key"],
      properties: {
        key: { type: "string", description: "Persona key: ceo | architect | team-lead | qa" },
      },
    },
  },
  {
    name: "resolve_role",
    description: "Given the last GitHub issue comment text, determine which persona/role to assume",
    inputSchema: {
      type: "object",
      required: ["comment_text"],
      properties: {
        comment_text: { type: "string", description: "Raw text of the last issue comment" },
      },
    },
  },
  {
    name: "get_output_prefix",
    description: "Get the required GitHub comment prefix string for a given role",
    inputSchema: {
      type: "object",
      required: ["key"],
      properties: {
        key: { type: "string", description: "Persona key: ceo | architect | team-lead | qa" },
      },
    },
  },
  {
    name: "list_library",
    description: "List all agents available in .claude/agents/library/, optionally filtered by category",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter (e.g. engineering, design, testing)" },
      },
    },
  },
  {
    name: "get_library_agent",
    description: "Load a library agent by its path relative to library/ (e.g. engineering/engineering-backend-architect.md)",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string", description: "Relative path within library/, e.g. engineering/engineering-backend-architect.md" },
      },
    },
  },
];

function handleTool(name, args) {
  switch (name) {
    case "list_personas": {
      const list = Object.entries(PERSONA_MAP).map(([key, meta]) => ({
        key,
        file: meta.file,
        symbol: meta.symbol,
        triggers: meta.triggers,
        available: existsSync(resolve(AGENTS_DIR, meta.file)),
      }));
      return { personas: list };
    }

    case "get_persona": {
      const persona = loadPersona(args.key);
      if (!persona) return { error: `Persona '${args.key}' not found or file missing. Available keys: ${Object.keys(PERSONA_MAP).join(", ")}` };
      return persona;
    }

    case "resolve_role": {
      const key = resolveRole(args.comment_text);
      const persona = loadPersona(key);
      return {
        resolved_key: key,
        symbol: PERSONA_MAP[key]?.symbol,
        output_prefix: getOutputPrefix(key),
        reason: "Matched trigger in comment text",
        persona_summary: persona?.content?.split("\n").slice(0, 8).join("\n"),
      };
    }

    case "get_output_prefix": {
      return { prefix: getOutputPrefix(args.key) };
    }

    case "list_library": {
      const agents = scanLibrary(args.category || null);
      const categories = [...new Set(agents.map(a => a.category))];
      return { total: agents.length, categories, agents };
    }

    case "get_library_agent": {
      const agent = loadLibraryAgent(args.path);
      if (!agent) return { error: `Library agent not found: ${args.path}` };
      return agent;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── JSON-RPC handler ──────────────────────────────────────────
function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    let req;
    try { req = JSON.parse(line); } catch { continue; }

    const { id, method, params } = req;

    if (method === "initialize") {
      respond(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "agency-agents-filesystem", version: "2.0.0" },
      });
    } else if (method === "tools/list") {
      respond(id, { tools: TOOLS });
    } else if (method === "tools/call") {
      const result = handleTool(params?.name, params?.arguments || {});
      respond(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
    } else if (method === "notifications/initialized") {
      // no-op
    } else {
      respondError(id, -32601, `Method not found: ${method}`);
    }
  }
});

process.stdin.on("end", () => process.exit(0));
process.stderr.write("[agents-mcp-server] started — overlays: .claude/agents/ | library: .claude/agents/library/\n");
