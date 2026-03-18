# Workflow: Enterprise Development Sprint

> Inspired by gstack (Garry Tan / YC, March 2026) — adapted for the Digital Enterprise OS with GitHub App auth, filesystem-based Claude Code memory, MCP servers, label-triggered agent sessions, and async issue-based handoffs.

## What is gstack?

**gstack** is Garry Tan's Claude Code setup providing slash-command skills that assign Claude a role rather than a prompt variation.

**Key gstack insight:** Role = mental model, not prompt variation.
**gstack limitation:** No MCP, no async memory, no GitHub App auth, no issue-based handoff trail, no webhook-triggered sessions.

---

## Enterprise vs gstack Mapping

| gstack | Library Agent | Triggered by | MCP Enhancement |
|---|---|---|---|
| `/plan-ceo-review` | `product/product-sprint-prioritizer.md` | `[CEO]` label / strategy trigger | `sequential-thinking` |
| `/plan-eng-review` | `engineering/engineering-software-architect.md` | `agent:architect` label | `sequential-thinking` + `filesystem` |
| `/review` | `engineering/engineering-code-reviewer.md` | `agent:qa` label | `filesystem` + `github` |
| `/ship` | `engineering/engineering-git-workflow-master.md` | `agent:team-lead` label | `github` MCP |
| `/qa` | `testing/testing-reality-checker.md` | `agent:qa` label | `filesystem` + `ast-grep` |
| `/browse` | *(not yet — planned)* | *(Issue #5 — Heretic/browser)* | Puppeteer MCP |
| `/retro` | `project-management/project-manager-senior.md` | manual / `[RETRO]` trigger | `github` (reads closed issues) |

---

## Tech-Stack Workflows

For stack-specific setup, agent rosters, deploy commands, and QA checklists:

| Stack | Workflow |
|---|---|
| 01 — Frontend Light (Nuxt 3 + CF Pages) | [`workflows/tech-stacks/01-frontend-light.md`](tech-stacks/01-frontend-light.md) |
| 02 — Frontend + Workers + Supabase | [`workflows/tech-stacks/02-frontend-workers-supabase.md`](tech-stacks/02-frontend-workers-supabase.md) |
| 03 — Monorepo Heavy (Bun + ElysiaJS) | [`workflows/tech-stacks/03-monorepo-heavy-bun.md`](tech-stacks/03-monorepo-heavy-bun.md) |

---

## Skills & Webhook Setup (Required for Every Project)

Before any sprint begins, the CEO must configure the agent roster for the project.

### What the CEO Does at Project Creation

1. Select agents using `agency-agents MCP → search_library` / `list_library`
2. For each selected agent, create a GitHub label:
   - `name`: `agent:<key>` (e.g. `agent:security-engineer`)
   - `description`: `<category>/<filename>.md` (e.g. `engineering/engineering-security-engineer.md`)
   - `color`: domain color (see `.claude/agents/skills/README.md`)
3. Create `.claude/agents/skills/<key>.md` in the project repo

### How Sessions Are Triggered

When a GitHub label `agent:<key>` is added to an issue, GitHub fires a webhook:

```
Issue labeled "agent:<key>"
  → GitHub sends POST webhook to configured endpoint
  → node scripts/webhook-label-handler.js '<payload>'
  → { agent_key, library_path, skills_file, issue_number, session_cmd }
  → Claude Code session starts with correct persona
```

Resolve manually:
```bash
node scripts/webhook-label-handler.js '<github-webhook-json>'
```

---

## The Workflow

### Step 0 — Session Bootstrap (every session)

```bash
node scripts/github-app-token.js
source .secrets/.env
echo "$GITHUB_TOKEN" | gh auth login --with-token
```

Read last issue comment → determine role via webhook label or `agency-agents MCP → resolve_role`.

---

### Step 1 — CEO Review (Sprint Prioritizer + Architect)

*Equivalent to gstack `/plan-ceo-review` + `/plan-eng-review`*

**Activate:**
```
Activate Product Sprint Prioritizer, then Software Architect.

Project context: [describe feature/fix]
Constraints: [timeline, tech debt, team size]

Deliverables:
1. Is this the right problem to solve? (CEO lens)
2. Sprint breakdown with acceptance criteria
3. Architecture decision (ADR format)
4. GitHub Issues created for each task
```

**Handoff:**
```bash
node scripts/github-logger.js handoff <N> Architect TeamLead "Architecture decided. Issues created. Ready to implement."
```

---

### Step 2 — Implementation (Team Lead + Git Workflow Master)

*Equivalent to gstack `/ship` — but with TDD and GitHub App PR*

**Activate:**
```
Activate Team Lead.

Read last comment on issue #<N>.
Implement the feature following TDD. Use sequential-thinking MCP before coding.
```

**TDD cycle (mandatory):**
```
sequential-thinking MCP → plan
Write test → RED
Write code → GREEN
Refactor → GREEN
Commit: feat(<scope>): <subject> / 🤖 Agent: Team Lead / Issue: #<N>
gh pr create --title "feat: ..." --body "Closes #<N>"
```

**Handoff:**
```bash
node scripts/github-logger.js handoff <N> TeamLead QA "Implementation complete. PR #<PR> open. Tests passing."
```

---

### Step 3 — Review + QA (QA Engineer + Reality Checker)

*Equivalent to gstack `/review` + `/qa`*

**Activate:**
```
Activate QA Engineer, extended by Reality Checker persona.

Read last comment on issue #<N>.
Review PR #<PR>. Run all QA checks. Default to NEEDS WORK.
```

**QA Checklist (base — see tech-stack workflow for stack-specific checks):**
```
[ ] Tests pass with 0 failures
[ ] git log shows test commit before code commit (TDD)
[ ] Acceptance criteria in issue fully met
[ ] No secrets in diff
[ ] PR description references issue (Closes #N)
```

**On PASS — merge and close:**
```bash
node scripts/github-logger.js handoff <N> QA System "All criteria met. Merging."
# GitHub MCP: merge PR, close issue
```

---

### Step 4 — Retrospective (Project Manager Senior)

*Equivalent to gstack `/retro` — runs after every sprint (3–5 issues)*

**Activate:**
```
Activate Project Manager Senior.

Read the last 5 closed issues.
Analyse: shipped vs planned, handoff delays, test failures caught in QA, patterns.

Output:
- Sprint summary with velocity metrics
- 3 process improvements for next sprint
- Updated workflow docs if needed
```

---

## Agents Used in This Workflow

| Agent | File | Role |
|---|---|---|
| Product Sprint Prioritizer | `library/product/product-sprint-prioritizer.md` | CEO review, sprint breakdown |
| Software Architect | `library/engineering/engineering-software-architect.md` | Architecture + ADRs |
| Senior Developer | `library/engineering/engineering-senior-developer.md` | Implementation core |
| Git Workflow Master | `library/engineering/engineering-git-workflow-master.md` | Commits + PR |
| Code Reviewer | `library/engineering/engineering-code-reviewer.md` | PR review |
| Reality Checker | `library/testing/testing-reality-checker.md` | Evidence-based QA gate |
| Project Manager Senior | `library/project-management/project-manager-senior.md` | Retrospective |

Library-backed roles: `library/engineering/engineering-software-architect.md`, `library/engineering/engineering-senior-developer.md`, `library/engineering/engineering-code-reviewer.md`

---

## What We Have That gstack Doesn't

| Feature | Our Enterprise | gstack |
|---|---|---|
| GitHub App auth (App token, not PAT) | ✅ | ❌ Personal only |
| Async handoff via GitHub Issues | ✅ | ❌ Single-session |
| Persistent memory (Claude Code auto-memory) | ✅ | ❌ |
| MCP server ecosystem | ✅ | ❌ |
| Label-triggered agent sessions via webhook | ✅ | ❌ |
| TDD enforcement gate | ✅ | Partial (`/qa`) |
| Human-readable audit trail | ✅ (GitHub Issues) | ❌ |
| Inline agent library (no submodule) | ✅ | ❌ |

## What gstack Has That We Should Add

| Feature | Status |
|---|---|
| `/browse` persistent Chromium QA | Issue #5 (planned) |
| Parallel sessions via Conductor | Future — needs worktree support |
