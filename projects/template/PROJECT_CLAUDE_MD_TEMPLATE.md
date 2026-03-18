# CLAUDE.md — [Project Name]

> **Every agent session on this project starts here.** Read completely before doing anything.
> The master OS lives at: `Agents-Digital-Enterprise/agency-agents-enterprise` — read its CLAUDE.md first for auth and global protocols.

---

## Project Identity

| Property | Value |
|---|---|
| **Repo** | `org/repo-name` |
| **Organisation** | org |
| **Stack** | TypeScript, Node.js (replace with real stack) |
| **Default branch** | `main` |
| **Issue tracker** | `org/repo-name` (GitHub Issues) |

---

## Viking Memory

Retrieve at session start. Save at session end.

```bash
node /path/to/agency-agents-enterprise/.claude/skills/viking-sync.js --key viking://memories/project/SLUG --retrieve
# ... do the work ...
node /path/to/agency-agents-enterprise/.claude/skills/viking-sync.js --key viking://memories/project/SLUG
```

Memory key: `viking://memories/project/REPLACE_WITH_SLUG`

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
- Do not delete files without human checkpoint (see master OS CLAUDE.md §10)

---

## Directory Layout

```
repo-root/
├── CLAUDE.md           ← this file
├── src/                ← application source
├── tests/              ← test suite
├── scripts/            ← utility scripts
└── docs/               ← documentation
```

---

## Role Assignments

| Role | Triggered by | Persona |
|---|---|---|
| 🏛️ Architect | `[ARCHITECT]` in issue title/label | master OS `architect.md` |
| 🔧 Team Lead  | `[LEAD]` in issue title/label | master OS `team-lead.md` |
| 🔍 QA Engineer | `[QA]` in issue title/label | master OS `qa-engineer.md` |

---

## Session Checklist

```
1. Auth: node <master-os-path>/scripts/github-app-token.js
2. Load project Viking memory: viking-sync --key viking://memories/project/<slug> --retrieve
3. Read issue → determine role
4. Load role persona from master OS .claude/agents/<role>.md
5. Post "Assuming <Role> on <Project>..." GitHub comment
6. Do the work
7. Save Viking memory: viking-sync --key viking://memories/project/<slug>
8. Post handoff comment
```
