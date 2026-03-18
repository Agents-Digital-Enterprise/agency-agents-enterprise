# .claude/agents/skills/

This directory contains the **agent roster for this project** — one `.md` file per agent the CEO selected when creating the project.

Each file is a thin identity card that:
1. Declares which master OS library persona backs this role
2. Serves as the local anchor when the webhook label handler resolves an agent

---

## How Files Get Here

When the CEO creates this project, it:
1. Selects agents from the master OS library (`agency-agents MCP → list_library`)
2. Creates a GitHub label per agent: `name: "agent:<key>"`, `description: "<library-path>"`
3. Creates the matching `.md` file here using the template below

The `library_path` in the label description and in the file frontmatter must match exactly so the webhook handler can resolve the agent without ambiguity.

---

## File Format

```markdown
---
agent_key:    security-engineer
label:        agent:security-engineer
library_path: engineering/engineering-security-engineer.md
symbol:       🔒
label_color:  "#e11d48"
---

# 🔒 Security Engineer

Backed by master OS persona:
`library/engineering/engineering-security-engineer.md`

Triggered by GitHub label: `agent:security-engineer`
```

---

## Webhook Flow

```
GitHub issue labeled "agent:security-engineer"
        ↓
GitHub sends POST webhook to configured endpoint
        ↓
node scripts/webhook-label-handler.js '<payload>'
        ↓
{ agent_key, library_path, skills_file, issue_number, session_cmd }
        ↓
Claude Code session started with resolved persona
```

---

## Label Color Conventions

| Domain        | Color     | Hex       |
|---------------|-----------|-----------|
| Engineering   | Blue      | `#0075ca` |
| Design        | Purple    | `#7c3aed` |
| Testing / QA  | Yellow    | `#ca8a04` |
| Marketing     | Green     | `#16a34a` |
| Strategy      | Orange    | `#ea580c` |
| Product       | Teal      | `#0891b2` |
| Security      | Red       | `#e11d48` |
