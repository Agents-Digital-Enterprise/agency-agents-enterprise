/**
 * tests/agents/personas.test.js
 *
 * Integration tests for the filesystem-based agent persona system.
 * Tests: overlay files load, upstream references exist, MCP server tools respond correctly.
 *
 * Run: node --test tests/agents/personas.test.js
 * Requires: Node.js >= 18 (built-in test runner)
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT       = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AGENTS_DIR = resolve(ROOT, ".claude/agents");

// ── Helper: send JSON-RPC lines to the local MCP server ──────
function callMCP(requests) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", ["scripts/agents-mcp-server.js"], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", () => {}); // suppress startup log

    const input = requests.map((r) => JSON.stringify(r)).join("\n") + "\n";
    proc.stdin.write(input);
    proc.stdin.end();

    proc.on("close", () => {
      try {
        const lines = out.trim().split("\n").filter(Boolean);
        const results = lines.map((l) => JSON.parse(l));
        resolve(results);
      } catch (e) {
        reject(new Error(`MCP parse error: ${e.message}\nRaw: ${out}`));
      }
    });

    setTimeout(() => { proc.kill(); reject(new Error("MCP server timeout")); }, 5000);
  });
}

function toolResult(response) {
  return JSON.parse(response.result?.content?.[0]?.text || "{}");
}

// ── Tests ─────────────────────────────────────────────────────

describe("Persona overlay files", () => {
  it("architect.md exists and has enterprise identity fields", () => {
    const path = resolve(AGENTS_DIR, "architect.md");
    assert.ok(existsSync(path), "architect.md not found");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("agent-digitals-git-orchestrator"), "missing bot identity");
    assert.ok(content.includes("extends:"), "missing extends reference to upstream");
    assert.ok(content.includes("upstream/engineering/"), "extends must point to upstream dir");
  });

  it("team-lead.md exists and extends multiple upstream personas", () => {
    const path = resolve(AGENTS_DIR, "team-lead.md");
    assert.ok(existsSync(path), "team-lead.md not found");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("extends:"), "missing extends");
    assert.ok(content.includes("engineering-senior-developer"), "should extend senior-developer");
    assert.ok(content.includes("engineering-git-workflow-master"), "should extend git-workflow-master");
  });

  it("qa-engineer.md exists and extends code-reviewer and security-engineer", () => {
    const path = resolve(AGENTS_DIR, "qa-engineer.md");
    assert.ok(existsSync(path), "qa-engineer.md not found");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("engineering-code-reviewer"), "should extend code-reviewer");
    assert.ok(content.includes("engineering-security-engineer"), "should extend security-engineer");
  });
});

describe("Upstream submodule", () => {
  it("upstream directory exists (submodule cloned)", () => {
    assert.ok(existsSync(resolve(AGENTS_DIR, "upstream")), "upstream submodule not cloned");
  });

  it("upstream engineering agents are available", () => {
    const required = [
      "engineering-software-architect.md",
      "engineering-code-reviewer.md",
      "engineering-senior-developer.md",
      "engineering-git-workflow-master.md",
      "engineering-security-engineer.md",
    ];
    for (const file of required) {
      const p = resolve(AGENTS_DIR, "upstream/engineering", file);
      assert.ok(existsSync(p), `Missing upstream agent: ${file}`);
    }
  });

  it("upstream extended by architect overlay actually exists", () => {
    // Parse extends field from architect.md frontmatter
    const content = readFileSync(resolve(AGENTS_DIR, "architect.md"), "utf8");
    const match = content.match(/extends:\s*(.+)/);
    assert.ok(match, "No extends field in architect.md");
    const ref = match[1].trim();
    const refPath = resolve(AGENTS_DIR, ref);
    assert.ok(existsSync(refPath), `Upstream file referenced in extends not found: ${ref}`);
  });
});

describe("MCP server — initialize", () => {
  it("responds to initialize with correct server name", async () => {
    const [res] = await callMCP([{
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } },
    }]);
    assert.equal(res.result.serverInfo.name, "agency-agents-filesystem");
  });

  it("lists exactly 4 tools", async () => {
    const [, res] = await callMCP([
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    ]);

    assert.equal(res.result.tools.length, 4);
    const names = res.result.tools.map((t) => t.name);
    assert.deepEqual(names.sort(), ["get_output_prefix", "get_persona", "list_personas", "resolve_role"]);
  });
});

describe("MCP server — resolve_role", () => {
  const cases = [
    { comment: "Role needed: Team Lead — implement auth", expected: "team-lead" },
    { comment: "[ARCHITECT] design the new payment service", expected: "architect" },
    { comment: "[QA] review PR #12 and validate tests", expected: "qa" },
    { comment: "build the user dashboard component", expected: "team-lead" },
    { comment: "no keywords here at all", expected: "architect" }, // default
  ];

  for (const { comment, expected } of cases) {
    it(`resolves "${comment.slice(0, 40)}..." → ${expected}`, async () => {
      const [, res] = await callMCP([
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "resolve_role", arguments: { comment_text: comment } } },
      ]);
      const data = toolResult(res);
      assert.equal(data.resolved_key, expected, `Expected ${expected}, got ${data.resolved_key}`);
    });
  }
});

describe("MCP server — get_persona", () => {
  for (const key of ["architect", "team-lead", "qa"]) {
    it(`loads persona '${key}' with content`, async () => {
      const [, res] = await callMCP([
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_persona", arguments: { key } } },
      ]);
      const data = toolResult(res);
      assert.ok(data.content, `No content returned for persona '${key}'`);
      assert.ok(data.content.length > 100, "Content too short — file may be empty");
    });
  }

  it("returns error for unknown persona key", async () => {
    const [, res] = await callMCP([
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_persona", arguments: { key: "nonexistent" } } },
    ]);
    const data = toolResult(res);
    assert.ok(data.error, "Should return error for unknown key");
  });
});

describe("MCP server — get_output_prefix", () => {
  const expected = {
    "architect":  "### 🤖 agent-digitals-git-orchestrator — 🏛️ Architect",
    "team-lead":  "### 🤖 agent-digitals-git-orchestrator — 🔧 Team Lead",
    "qa":         "### 🤖 agent-digitals-git-orchestrator — 🔍 QA Engineer",
  };

  for (const [key, prefix] of Object.entries(expected)) {
    it(`returns correct prefix for '${key}'`, async () => {
      const [, res] = await callMCP([
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_output_prefix", arguments: { key } } },
      ]);
      const data = toolResult(res);
      assert.equal(data.prefix, prefix);
    });
  }
});
