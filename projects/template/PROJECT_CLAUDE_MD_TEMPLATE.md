# CLAUDE.md — [Project Name]

> **Every agent session on this project starts here.** Read completely before doing anything.
> The master OS lives at: `Agents-Digital-Enterprise/agency-agents-enterprise` — read its CLAUDE.md first for auth and global protocols.

---

## Project Identity

| Property | Value |
|---|---|
| **Repo** | `Agents-Digital-Enterprise/repo-name` |
| **Organisation** | Agents-Digital-Enterprise |
| **Stack** | [Replace with real stack] |
| **Default branch** | `main` |
| **Issue tracker** | `Agents-Digital-Enterprise/repo-name` (GitHub Issues) |

---

## MCP-First Rule

> **Always prefer MCP tools over raw shell commands or manual approaches.**

The master OS `.mcp.json` defines the available MCP servers. Before writing code or running CLI commands, check if an MCP can handle it:

| Task | Use MCP |
|---|---|
| Read/write files | `filesystem` |
| Git operations | `git` |
| GitHub issues/PRs | `github` |
| HTTP calls / API tests | `fetch` |
| DB queries | `postgres` |
| Code impact analysis | `ast-grep` |
| Cloudflare deploy | `cloudflare` |
| Supabase migrations | `supabase` |
| Visual / E2E tests | `puppeteer` |
| Shell commands (last resort) | `terminal` |

---

## Session Checklist

```
1. Auth: node ./scripts/github-app-token.js && source .secrets/.env
2. Open or locate a GitHub Issue for this task — MANDATORY before any work begins
   If no issue exists: GitHub MCP → create_issue { title, body }
   Every task must have an issue so the human can see what is happening.
3. Read issue → determine role (see master OS Role Decision Matrix)
4. Load persona from master OS .claude/agents/library/<category>/<agent>.md
5. Post "Assuming <Role> on <Project>..." GitHub comment
6. Use MCP tools first (see MCP-First Rule above)
7. Do the work
8. Close issue with completion summary (GitHub MCP → update_issue { state: closed })
```

---

## Agent Instructions

### Coding Conventions
- [Replace with project conventions]
- [e.g. ESLint + Prettier enforced, run `npm run lint` before every commit]
- [e.g. All functions must have JSDoc]

### Test Commands
```bash
npm test          # unit tests
npm run test:e2e  # end-to-end
npm run lint      # linting
```

### PR Rules
- Always open PRs against `main`
- Never push directly to `main`
- PR title must reference the issue number: `fix(auth): resolve token expiry (#42)`
- Require 1 review before merge

### Forbidden Actions
- Do not modify `.env` or secrets files
- Do not run database migrations without explicit human approval
- Do not delete files without human checkpoint (see master OS CLAUDE.md §11)

---

## Directory Layout

```
repo-root/
├── CLAUDE.md           ← this file
├── .env.example        ← env vars template (never commit .env)
├── scripts/            ← github-app-token.js, github-logger.js
├── src/                ← application source
├── tests/              ← test suite
└── docs/               ← documentation
```

---

## Role Assignments

| Role | Triggered by | Persona |
|---|---|---|
| 🏛️ Architect | `[ARCHITECT]` in issue | `library/engineering/engineering-software-architect.md` |
| 🔧 Team Lead  | `[LEAD]` in issue | `library/engineering/engineering-senior-developer.md` |
| 🔍 QA Engineer | `[QA]` in issue | `library/engineering/engineering-code-reviewer.md` |
