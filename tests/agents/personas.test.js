/**
 * tests/agents/personas.test.js
 *
 * Integration tests for the agent persona system.
 * Tests: CEO overlay, library-backed roles, MCP server tools (v3).
 *
 * Run: node --test tests/agents/personas.test.js
 * Requires: Node.js >= 18 (built-in test runner)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT        = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AGENTS_DIR  = resolve(ROOT, ".claude/agents");
const LIBRARY_DIR = resolve(AGENTS_DIR, "library");

// ── MCP helper ────────────────────────────────────────────────
function callMCP(requests) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", ["scripts/agents-mcp-server.js"], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", () => {});
    proc.stdin.write(requests.map((r) => JSON.stringify(r)).join("\n") + "\n");
    proc.stdin.end();
    proc.on("close", () => {
      try {
        const results = out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
        resolve(results);
      } catch (e) {
        reject(new Error(`MCP parse error: ${e.message}\nRaw: ${out}`));
      }
    });
    setTimeout(() => { proc.kill(); reject(new Error("MCP timeout")); }, 8000);
  });
}

const INIT = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } } };
const toolResult = (res) => JSON.parse(res.result?.content?.[0]?.text || "{}");

// ── Overlay files ─────────────────────────────────────────────
describe("Overlay persona files", () => {
  it("ceo.md exists with enterprise identity and Project Factory section", () => {
    const path = resolve(AGENTS_DIR, "ceo.md");
    assert.ok(existsSync(path), "ceo.md not found in .claude/agents/");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("agent-digitals-git-orchestrator"), "missing bot identity");
    assert.ok(content.includes("Project Factory"), "missing Project Factory Workflow section");
    assert.ok(content.includes("projects-registry.json"), "should reference projects-registry.json");
  });

  it("no stale overlay files exist (architect.md / team-lead.md / qa-engineer.md removed)", () => {
    for (const stale of ["architect.md", "team-lead.md", "qa-engineer.md"]) {
      assert.ok(
        !existsSync(resolve(AGENTS_DIR, stale)),
        `${stale} should not exist — roles now loaded directly from library/`
      );
    }
  });
});

// ── Library structure ─────────────────────────────────────────
describe("Agent library", () => {
  it("library/ directory exists", () => {
    assert.ok(existsSync(LIBRARY_DIR), "library/ not found in .claude/agents/");
  });

  it("library has at least 8 categories", () => {
    const categories = readdirSync(LIBRARY_DIR).filter(e =>
      !e.startsWith(".") && !e.endsWith(".md")
    );
    assert.ok(categories.length >= 8, `Expected >= 8 categories, got ${categories.length}: ${categories.join(", ")}`);
  });

  it("core library-backed roles exist in library/engineering/", () => {
    const required = [
      "engineering-software-architect.md",
      "engineering-senior-developer.md",
      "engineering-code-reviewer.md",
      "engineering-git-workflow-master.md",
      "engineering-security-engineer.md",
      "engineering-backend-architect.md",
      "engineering-frontend-developer.md",
    ];
    for (const file of required) {
      const p = resolve(LIBRARY_DIR, "engineering", file);
      assert.ok(existsSync(p), `Missing core library agent: ${file}`);
    }
  });

  it("library has agents in design, testing, marketing, and strategy", () => {
    for (const cat of ["design", "testing", "marketing", "strategy"]) {
      const dir = resolve(LIBRARY_DIR, cat);
      assert.ok(existsSync(dir), `Category missing: ${cat}`);
      const files = readdirSync(dir).filter(f => f.endsWith(".md"));
      assert.ok(files.length > 0, `Category ${cat} is empty`);
    }
  });
});

// ── MCP server init ───────────────────────────────────────────
describe("MCP server — initialize", () => {
  it("responds with correct server name and version 3", async () => {
    const [res] = await callMCP([INIT]);
    assert.equal(res.result.serverInfo.name, "agency-agents-filesystem");
    assert.equal(res.result.serverInfo.version, "3.0.0");
  });

  it("exposes exactly 7 tools", async () => {
    const [, res] = await callMCP([INIT, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }]);
    const names = res.result.tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      "get_library_agent",
      "get_output_prefix",
      "get_persona",
      "list_library",
      "list_personas",
      "resolve_role",
      "search_library",
    ]);
  });
});

// ── MCP — list_personas ───────────────────────────────────────
describe("MCP server — list_personas", () => {
  it("returns CEO overlay + 3 library-backed roles", async () => {
    const [, res] = await callMCP([INIT, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_personas", arguments: {} } }]);
    const data = toolResult(res);
    assert.ok(Array.isArray(data.personas), "personas should be array");
    assert.ok(data.personas.length >= 4, `Expected >= 4 personas, got ${data.personas.length}`);
    const keys = data.personas.map(p => p.key);
    assert.ok(keys.includes("ceo"), "ceo persona missing");
    assert.ok(keys.includes("architect"), "architect persona missing");
    assert.ok(keys.includes("team-lead"), "team-lead persona missing");
    assert.ok(keys.includes("qa"), "qa persona missing");
  });

  it("CEO is overlay source, others are library source", async () => {
    const [, res] = await callMCP([INIT, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_personas", arguments: {} } }]);
    const data = toolResult(res);
    const ceo = data.personas.find(p => p.key === "ceo");
    const arch = data.personas.find(p => p.key === "architect");
    assert.equal(ceo.source, "overlay");
    assert.equal(arch.source, "library");
  });
});

// ── MCP — resolve_role ────────────────────────────────────────
describe("MCP server — resolve_role", () => {
  const cases = [
    { comment: "[CEO] plan the new payments project", expected: "ceo" },
    { comment: "research competitors for this feature", expected: "ceo" },
    { comment: "[ARCHITECT] design the auth service", expected: "architect" },
    { comment: "[LEAD] implement the user dashboard", expected: "team-lead" },
    { comment: "build the API endpoint for profiles", expected: "team-lead" },
    { comment: "[QA] review PR #42", expected: "qa" },
    { comment: "no keywords here", expected: "ceo" }, // default is now CEO
  ];

  for (const { comment, expected } of cases) {
    it(`"${comment.slice(0, 45)}..." → ${expected}`, async () => {
      const [, res] = await callMCP([
        INIT,
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "resolve_role", arguments: { comment_text: comment } } },
      ]);
      const data = toolResult(res);
      assert.equal(data.resolved_key, expected);
    });
  }
});

// ── MCP — get_persona ─────────────────────────────────────────
describe("MCP server — get_persona", () => {
  for (const key of ["ceo", "architect", "team-lead", "qa"]) {
    it(`loads '${key}' with content > 100 chars`, async () => {
      const [, res] = await callMCP([
        INIT,
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_persona", arguments: { key } } },
      ]);
      const data = toolResult(res);
      assert.ok(!data.error, `Error for '${key}': ${data.error}`);
      assert.ok(data.content?.length > 100, `Content too short for '${key}'`);
    });
  }

  it("returns error for unknown key", async () => {
    const [, res] = await callMCP([
      INIT,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_persona", arguments: { key: "nonexistent" } } },
    ]);
    const data = toolResult(res);
    assert.ok(data.error, "Should return error for unknown key");
  });
});

// ── MCP — list_library ────────────────────────────────────────
describe("MCP server — list_library", () => {
  it("returns 100+ agents total", async () => {
    const [, res] = await callMCP([
      INIT,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_library", arguments: {} } },
    ]);
    const data = toolResult(res);
    assert.ok(data.total >= 100, `Expected >= 100 library agents, got ${data.total}`);
  });

  it("filters by category: engineering returns only engineering agents", async () => {
    const [, res] = await callMCP([
      INIT,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_library", arguments: { category: "engineering" } } },
    ]);
    const data = toolResult(res);
    assert.ok(data.total > 0, "Should return engineering agents");
    assert.ok(data.agents.every(a => a.category === "engineering"), "All agents should be in engineering category");
  });
});

// ── MCP — search_library ──────────────────────────────────────
describe("MCP server — search_library", () => {
  it("finds security-related agents", async () => {
    const [, res] = await callMCP([
      INIT,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_library", arguments: { keyword: "security" } } },
    ]);
    const data = toolResult(res);
    assert.ok(data.total >= 1, "Should find at least 1 security agent");
    assert.ok(data.results.some(r => r.file.includes("security")), "Should find security engineer");
  });

  it("finds blockchain agents", async () => {
    const [, res] = await callMCP([
      INIT,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_library", arguments: { keyword: "blockchain" } } },
    ]);
    const data = toolResult(res);
    assert.ok(data.total >= 1, "Should find blockchain agent");
  });

  it("returns tip on no results", async () => {
    const [, res] = await callMCP([
      INIT,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_library", arguments: { keyword: "xyznotexist99" } } },
    ]);
    const data = toolResult(res);
    assert.equal(data.total, 0);
    assert.ok(data.tip, "Should return a tip when no results found");
  });
});

// ── MCP — get_output_prefix ───────────────────────────────────
describe("MCP server — get_output_prefix", () => {
  const expected = {
    "ceo":       "### 🤖 agent-digitals-git-orchestrator — 👔 CEO",
    "architect": "### 🤖 agent-digitals-git-orchestrator — 🏛️ Architect",
    "team-lead": "### 🤖 agent-digitals-git-orchestrator — 🔧 Team Lead",
    "qa":        "### 🤖 agent-digitals-git-orchestrator — 🔍 QA Engineer",
  };

  for (const [key, prefix] of Object.entries(expected)) {
    it(`correct prefix for '${key}'`, async () => {
      const [, res] = await callMCP([
        INIT,
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_output_prefix", arguments: { key } } },
      ]);
      const data = toolResult(res);
      assert.equal(data.prefix, prefix);
    });
  }
});
