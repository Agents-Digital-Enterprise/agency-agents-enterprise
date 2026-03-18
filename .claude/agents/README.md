# Agent Personas — Filesystem Registry

All agent personas are defined as local Markdown files in this directory.
They are read by Claude via the `filesystem` MCP server — no external connection needed.

## Available Personas

| File | Persona | Symbol | Trigger |
|---|---|---|---|
| `architect.md` | Project Architect | 🏛️ | `[ARCHITECT]`, "design", "plan" |
| `team-lead.md` | Team Lead | 🔧 | `[LEAD]`, "implement", "build" |
| `qa-engineer.md` | QA Engineer | 🔍 | `[QA]`, "review", "validate" |

## How to Load a Persona

At session start, the agent reads CLAUDE.md, determines its role from the last GitHub Issue comment, then loads the corresponding persona file:

```bash
# The filesystem MCP tool reads this automatically when Claude starts
# Manually inspect any persona:
cat .claude/agents/architect.md
cat .claude/agents/team-lead.md
cat .claude/agents/qa-engineer.md
```

## How to Add a Persona

1. Create `.claude/agents/<name>.md` following the existing structure
2. Add it to the table above
3. Add trigger keywords to the Role Decision Matrix in `CLAUDE.md`
4. No server restart needed — filesystem MCP reads on demand

## Why Filesystem Over Remote Server

- **Offline-first:** No external service dependency at session start
- **Version controlled:** Persona changes tracked in git history
- **Transparent:** Human-readable, easy to audit and modify
- **Extensible:** Add personas by adding files, zero config changes
