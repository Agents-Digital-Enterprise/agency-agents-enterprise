#!/usr/bin/env node
/**
 * agents-mcp-server.js
 *
 * Local filesystem-based MCP server for agent persona management.
 * Reads .claude/agents/*.md (overlays) and .claude/agents/library/**\/*.md (full library).
 *
 * MCP Tools exposed:
 *   list_personas     — List overlay personas
 *   get_persona       — Load an overlay persona by key
 *   resolve_role      — Given last issue comment text, return the correct persona
 *   get_output_prefix — Return the GitHub comment prefix for a role
 *   list_library      — List all agents in the library, optionally filtered by category
 *   get_library_agent — Load a library agent by category/filename path
 *   search_library    — Search library agents by keyword (name or content)
 *
 * Usage (in .mcp.json):
 *   "command": "node",
 *   "args": ["scripts/agents-mcp-server.js"]
 *
 * Runs as a stdio MCP server — no port, no network.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT        = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR  = resolve(ROOT, ".claude/agents");
const LIBRARY_DIR = resolve(AGENTS_DIR, "library");

// ── Overlay Persona index ─────────────────────────────────────
// Only personas with actual overlay files in .claude/agents/
const PERSONA_MAP = {
  ceo: {
    file: "ceo.md",
    symbol: "👔",
    triggers: ["CEO", "research", "strategy", "decide agents", "plan project", "portfolio", "brief"],
  },
};

const PERSONA_LABELS = {
  ceo: "CEO",
};

// Role resolution — falls back to library paths when no overlay exists
const ROLE_ROUTING = {
  architect: {
    symbol: "🏛️",
    label: "Architect",
    library_path: "engineering/engineering-software-architect.md",
    triggers: ["ARCHITECT", "design", "plan", "architecture", "breakdown", "spec"],
  },
  "team-lead": {
    symbol: "🔧",
    label: "Team Lead",
    library_path: "engineering/engineering-senior-developer.md",
    triggers: ["LEAD", "implement", "build", "code", "fix", "develop"],
  },
  qa: {
    symbol: "🔍",
    label: "QA Engineer",
    library_path: "engineering/engineering-code-reviewer.md",
    triggers: ["QA", "review", "test", "validate", "check", "approve"],
  },
};

function loadPersona(key) {
  // Check overlay first
  if (PERSONA_MAP[key]) {
    const path = resolve(AGENTS_DIR, PERSONA_MAP[key].file);
    if (!existsSync(path)) return null;
    return { key, ...PERSONA_MAP[key], content: readFileSync(path, "utf8"), source: "overlay" };
  }
  // Fall back to library
  if (ROLE_ROUTING[key]) {
    const route = ROLE_ROUTING[key];
    const path = resolve(LIBRARY_DIR, route.library_path);
    if (!existsSync(path)) return null;
    return {
      key,
      symbol: route.symbol,
      file: route.library_path,
      content: readFileSync(path, "utf8"),
      source: "library",
    };
  }
  return null;
}

function resolveRole(commentText) {
  const text = (commentText || "").toLowerCase();
  // Check CEO overlay triggers first
  for (const trigger of PERSONA_MAP.ceo.triggers) {
    if (text.includes(trigger.toLowerCase())) return "ceo";
  }
  // Check library-backed role triggers
  for (const [key, route] of Object.entries(ROLE_ROUTING)) {
    for (const trigger of route.triggers) {
      if (text.includes(trigger.toLowerCase())) return key;
    }
  }
  return "ceo"; // default: CEO bootstraps all new work
}

function getOutputPrefix(key) {
  if (PERSONA_MAP[key]) {
    const label = PERSONA_LABELS[key] || key;
    return `### 🤖 agent-digitals-git-orchestrator — ${PERSONA_MAP[key].symbol} ${label}`;
  }
  if (ROLE_ROUTING[key]) {
    const route = ROLE_ROUTING[key];
    return `### 🤖 agent-digitals-git-orchestrator — ${route.symbol} ${route.label}`;
  }
  return "### 🤖 agent-digitals-git-orchestrator";
}

// ── Library scanner ───────────────────────────────────────────
function scanLibrary(categoryFilter) {
  if (!existsSync(LIBRARY_DIR)) return [];
  const results = [];
  const entries = readdirSync(LIBRARY_DIR);
  for (const entry of entries) {
    const full = join(LIBRARY_DIR, entry);
    if (!statSync(full).isDirectory() || entry.startsWith(".")) continue;
    if (categoryFilter && entry !== categoryFilter) continue;
    const files = readdirSync(full).filter(f => f.endsWith(".md"));
    for (const file of files) {
      results.push({ category: entry, file, path: `${entry}/${file}` });
    }
  }
  return results;
}

function loadLibraryAgent(agentPath) {
  const full = join(LIBRARY_DIR, agentPath);
  if (!existsSync(full)) return null;
  return { path: agentPath, content: readFileSync(full, "utf8") };
}

function searchLibrary(keyword) {
  const q = keyword.toLowerCase();
  const all = scanLibrary(null);
  const results = [];
  for (const agent of all) {
    const nameMatch = agent.file.toLowerCase().includes(q) || agent.category.toLowerCase().includes(q);
    if (nameMatch) {
      results.push({ ...agent, match: "name" });
      continue;
    }
    // Content search — first 30 lines only for speed
    try {
      const full = join(LIBRARY_DIR, agent.path);
      const preview = readFileSync(full, "utf8").split("\n").slice(0, 30).join("\n");
      if (preview.toLowerCase().includes(q)) {
        results.push({ ...agent, match: "content_preview" });
      }
    } catch {}
  }
  return results;
}

// ── MCP Tools ─────────────────────────────────────────────────
const TOOLS = [
  {
    name: "list_personas",
    description: "List all active agent personas — overlays (CEO) and library-backed roles (Architect, Team Lead, QA)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_persona",
    description: "Load a persona by key. Overlays: ceo. Library-backed: architect, team-lead, qa",
    inputSchema: {
      type: "object",
      required: ["key"],
      properties: {
        key: { type: "string", description: "ceo | architect | team-lead | qa" },
      },
    },
  },
  {
    name: "resolve_role",
    description: "Given the last GitHub issue comment text, determine which role to assume",
    inputSchema: {
      type: "object",
      required: ["comment_text"],
      properties: {
        comment_text: { type: "string" },
      },
    },
  },
  {
    name: "get_output_prefix",
    description: "Get the GitHub comment prefix string for a given role key",
    inputSchema: {
      type: "object",
      required: ["key"],
      properties: {
        key: { type: "string", description: "ceo | architect | team-lead | qa" },
      },
    },
  },
  {
    name: "list_library",
    description: "List all 100+ agents in .claude/agents/library/, optionally filtered by category",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "engineering | design | testing | marketing | product | strategy | sales | project-management | specialized | spatial-computing | game-development" },
      },
    },
  },
  {
    name: "get_library_agent",
    description: "Load a library agent by its path (e.g. engineering/engineering-backend-architect.md)",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string", description: "Relative path within library/, e.g. engineering/engineering-backend-architect.md" },
      },
    },
  },
  {
    name: "search_library",
    description: "Search library agents by keyword — matches agent name or first 30 lines of content. Use this to find the right specialist for a task.",
    inputSchema: {
      type: "object",
      required: ["keyword"],
      properties: {
        keyword: { type: "string", description: "Search term, e.g. 'security', 'vue', 'seo', 'blockchain', 'postgres'" },
      },
    },
  },
];

function handleTool(name, args) {
  switch (name) {
    case "list_personas": {
      const overlays = Object.entries(PERSONA_MAP).map(([key, meta]) => ({
        key,
        symbol: meta.symbol,
        label: PERSONA_LABELS[key],
        source: "overlay",
        file: meta.file,
        available: existsSync(resolve(AGENTS_DIR, meta.file)),
        triggers: meta.triggers,
      }));
      const libraryBacked = Object.entries(ROLE_ROUTING).map(([key, route]) => ({
        key,
        symbol: route.symbol,
        label: route.label,
        source: "library",
        file: route.library_path,
        available: existsSync(resolve(LIBRARY_DIR, route.library_path)),
        triggers: route.triggers,
      }));
      return { personas: [...overlays, ...libraryBacked] };
    }

    case "get_persona": {
      const persona = loadPersona(args.key);
      if (!persona) {
        const valid = [...Object.keys(PERSONA_MAP), ...Object.keys(ROLE_ROUTING)].join(", ");
        return { error: `Persona '${args.key}' not found. Valid keys: ${valid}` };
      }
      return persona;
    }

    case "resolve_role": {
      const key = resolveRole(args.comment_text);
      const persona = loadPersona(key);
      return {
        resolved_key: key,
        output_prefix: getOutputPrefix(key),
        persona_summary: persona?.content?.split("\n").slice(0, 8).join("\n"),
      };
    }

    case "get_output_prefix":
      return { prefix: getOutputPrefix(args.key) };

    case "list_library": {
      const agents = scanLibrary(args.category || null);
      const categories = [...new Set(agents.map(a => a.category))].sort();
      return { total: agents.length, categories, agents };
    }

    case "get_library_agent": {
      const agent = loadLibraryAgent(args.path);
      if (!agent) return { error: `Library agent not found: ${args.path}` };
      return agent;
    }

    case "search_library": {
      const results = searchLibrary(args.keyword);
      return {
        keyword: args.keyword,
        total: results.length,
        results,
        tip: results.length === 0
          ? "No matches. Try broader terms or use list_library to browse by category."
          : `Found ${results.length} agent(s). Use get_library_agent with the path to load one.`,
      };
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
        serverInfo: { name: "agency-agents-filesystem", version: "3.0.0" },
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
process.stderr.write("[agents-mcp-server v3] overlays: .claude/agents/ | library: .claude/agents/library/ | tools: 7\n");
