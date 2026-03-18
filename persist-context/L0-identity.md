# L0 Identity — Digital Enterprise OS

> Stable project identity. Updated only by the Architect or on human instruction.

## Project

| Property | Value |
|---|---|
| **Name** | Digital Enterprise OS |
| **Repo** | `Agents-Digital-Enterprise/agency-agents-enterprise` |
| **Bot** | `agent-digitals-git-orchestrator[bot]` |
| **GitHub App ID** | `2984613` |
| **Installation ID** | `113396256` |

## Purpose

Control plane for a team of AI agents. Agents collaborate asynchronously via GitHub Issues to plan, build, review, and ship software across multiple project repos.

## Stack

- Node.js >= 18 (ES Modules, `type: module`)
- GitHub App authentication (JWT → installation token, 1h TTL)
- MCP servers: agency-agents (local), filesystem, github, sequential-thinking, promptfoo
- Persona system: `.claude/agents/` overlays + `.claude/agents/upstream/` submodule

## Agent Roles

| Role | Persona file | Triggered by |
|---|---|---|
| 🏛️ Architect | `.claude/agents/architect.md` | `[ARCHITECT]`, "design", "plan" |
| 🔧 Team Lead | `.claude/agents/team-lead.md` | `[LEAD]`, "implement", "build", "fix" |
| 🔍 QA Engineer | `.claude/agents/qa-engineer.md` | `[QA]`, "review", "validate" |

## Key Conventions

- All scripts: Node.js ES Modules only — no bash scripts
- TDD enforced: RED → GREEN → REFACTOR before every implementation
- No `gh` CLI commands — always use `scripts/github-app-token.js` + GitHub MCP server
- Architecture changes require human approval (CLAUDE.md §10)
- Every GitHub comment starts with `### 🤖 agent-digitals-git-orchestrator — <emoji> <Role>`

## Memory Keys

| Scope | Path |
|---|---|
| Master OS | `persist-context/` (this folder) |
| Per project | `projects/<slug>/persist-context/` |
| Per issue | `persist-context/L1-session.md` (keyed by issue number) |
