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

## Session Checklist

```
1. Auth: node ./scripts/github-app-token.js && source .secrets/.env
2. Read issue → determine role (see master OS Role Decision Matrix)
3. Load persona from master OS .claude/agents/library/<category>/<agent>.md
4. Post "Assuming <Role> on <Project>..." GitHub comment
5. Do the work
6. Post handoff comment
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
