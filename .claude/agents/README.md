# Agent Personas

All agent personas are defined as Markdown files in this directory and the `library/` subfolder.
Loaded via the `agency-agents` MCP server — no external connection needed.

## Overlay Personas (Enterprise-specific)

| File | Persona | Symbol | Trigger |
|---|---|---|---|
| `ceo.md` | CEO / Project Factory | 👔 | `[CEO]`, "strategy", "plan project", "research" |

> Note: Architect, Team Lead, and QA roles are loaded directly from `library/` — no local overlay files needed.

## Agent Library

The `library/` folder contains the full inline agent library — 100+ specialist agents across all domains.

```
library/
├── engineering/     — backend, frontend, devops, security, mobile, etc.
├── design/          — UI/UX, brand, visual storytelling
├── testing/         — QA, accessibility, performance, reality checker
├── marketing/       — SEO, social, content, paid media
├── product/         — PM, sprint planning, feedback synthesis
├── strategy/        — NEXUS orchestration, playbooks, runbooks
├── sales/           — discovery, deal strategy, account management
├── project-management/
├── specialized/     — blockchain, compliance, MCP builder, etc.
├── spatial-computing/
└── game-development/
```

## How to Load a Persona

```bash
# Via MCP (in-session — preferred)
# agency-agents MCP → list_library { category: "engineering" }
# agency-agents MCP → get_library_agent { path: "engineering/engineering-backend-architect.md" }
# agency-agents MCP → resolve_role { comment_text: "<last issue comment>" }

# Manually inspect
cat .claude/agents/ceo.md
cat .claude/agents/library/engineering/engineering-software-architect.md
```

## How to Add or Update a Library Agent

Edit the file directly in `library/<category>/`. No server restart needed — the MCP server reads on demand.

## How to Add an Enterprise Overlay

1. Create `.claude/agents/<name>.md` following `ceo.md` as a reference
2. Add trigger keywords to the Role Decision Matrix in `CLAUDE.md §4`
3. Add the persona key to `scripts/agents-mcp-server.js` → `PERSONA_MAP`
