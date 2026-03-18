# CLAUDE.md — Digital Enterprise OS

> **Every agent session starts here.** Read this file completely before doing anything.

---

## 1. Identity & Repository

| Property | Value |
|---|---|
| **Organisation** | Agents-Digital-Enterprise |
| **Home Repo** | `Agents-Digital-Enterprise/agency-agents-enterprise` |
| **Bot Identity** | `agent-digitals-git-orchestrator[bot]` |
| **App ID** | `2984613` |
| **Installation ID** | `113396256` |

---

## 2. Authentication — Always Use the App Script

> ⚠️ **Rule:** Never use `gh` CLI commands directly. Never use `gh auth login` manually with a raw token.
> All GitHub authentication and API calls go through the App token script + `github-logger.js` / GitHub MCP server.

### Why
This enterprise uses a **GitHub App** (App ID `2984613`), not a Personal Access Token.
The script handles JWT generation → installation token exchange → writes `.secrets/.env` → injects token into `gh` CLI.
Using `gh` commands or manual token injection bypasses the App audit trail and breaks on expiry.

### Token Refresh (run at every session start, or on any 401 error)
```bash
node scripts/github-app-token.js
source .secrets/.env
echo "$GITHUB_TOKEN" | gh auth login --with-token
```

### On 401 / Bad credentials
The fix is always:
```bash
node scripts/github-app-token.js && source .secrets/.env && echo "$GITHUB_TOKEN" | gh auth login --with-token
```

### GitHub Operations — Use Scripts, Not Raw `gh` Commands
| Task | Use |
|---|---|
| Post issue comment | `node scripts/github-logger.js comment <N> <Role> "<msg>"` |
| Post handoff | `node scripts/github-logger.js handoff <N> <From> <To> "<msg>"` |
| GitHub API calls | `github` MCP server (in-session) or `scripts/github-app-token.js` generated token |
| Create issues, PRs | GitHub MCP server `create_issue` / `create_pull_request` tools |
| Close issues | GitHub MCP server `update_issue` tool (state: closed) |

Direct `gh issue`, `gh pr`, `gh repo` commands are **not** used — all GitHub operations go through the MCP server or the project scripts with the App token.

---

## 3. Session Start — Always Do This First

```bash
# Step 1 — Authenticate via App script
node scripts/github-app-token.js
source .secrets/.env
echo "$GITHUB_TOKEN" | gh auth login --with-token

# Step 2 — Read last issue comment → determine your role
# Use GitHub MCP server get_issue tool, or:
node scripts/github-logger.js comment <N> <Role> "Reading context..."

# Step 3 — Retrieve session memory
node .claude/skills/viking-sync.js <ISSUE_NUMBER> --retrieve

# Step 3b — If working on a project (not master OS tasks), read project root CLAUDE.md
# Navigate to the project repo and read its CLAUDE.md for project-specific instructions

# Step 4 — Load your persona
# Read: .claude/agents/<your-role>.md (which extends upstream persona)
# Then declare your role with a GitHub comment
node scripts/github-logger.js comment <ISSUE_NUMBER> <Role> "Assuming <Role> role. Reading context..."
```

---

## 3. Agent Persona System

### How It Works

Personas are **filesystem-first** — no external server needed.

```
.claude/agents/
├── upstream/              ← git submodule: msitarzewski/agency-agents
│   ├── engineering/       ← 20+ engineering specialists
│   ├── design/            ← UI/UX agents
│   ├── testing/           ← QA specialists
│   └── ...                ← marketing, product, strategy
├── architect.md           ← Enterprise overlay → extends upstream Software Architect
├── team-lead.md           ← Enterprise overlay → extends Senior Dev + Git Workflow Master
├── qa-engineer.md         ← Enterprise overlay → extends Code Reviewer + Security Engineer
└── README.md
```

**To load a persona:**
```bash
# Via MCP tool (in-session)
# agency-agents MCP → resolve_role tool → pass last issue comment text

# Manually inspect any persona:
cat .claude/agents/architect.md
cat .claude/agents/upstream/engineering/engineering-software-architect.md
```

**To add a new specialist** from the upstream library:
```bash
# Browse available upstream agents
ls .claude/agents/upstream/engineering/
ls .claude/agents/upstream/design/
ls .claude/agents/upstream/testing/

# Create a thin enterprise overlay referencing it
# Add trigger keywords to the Role Decision Matrix below
```

### Submodule — Org Fork + Upstream Sync

The submodule at `.claude/agents/upstream/` points to the **org fork**:
`https://github.com/Agents-Digital-Enterprise/agency-agents`

This lets us customise personas freely. To pull new agents from the original repo:

```bash
# Inside the submodule
cd .claude/agents/upstream

# Fetch new commits from msitarzewski/agency-agents
git fetch upstream
git merge upstream/main    # or cherry-pick specific agents

# Push customised version to org fork
git push origin main

# Back in root — update the submodule pointer
cd ../../../
git add .claude/agents/upstream
git commit -m "chore(agents): sync upstream persona additions"
```

**Remotes inside submodule:**
- `origin` → `Agents-Digital-Enterprise/agency-agents` (our customisable fork)
- `upstream` → `msitarzewski/agency-agents` (original — pull-only)

### Role Decision Matrix

| Last comment trigger | Role to assume | Persona file |
|---|---|---|
| `[ARCHITECT]` / "design" / "plan" / "architecture" | Project Architect 🏛️ | `architect.md` |
| `[LEAD]` / "implement" / "build" / "code" / "fix" | Team Lead 🔧 | `team-lead.md` |
| `[QA]` / "review" / "validate" / "check" | QA Engineer 🔍 | `qa-engineer.md` |
| No prior comment (first run) | Project Architect 🏛️ | `architect.md` |

---

## 4. GitHub Comment Protocol — Global Rule

**Every single GitHub output must begin with:**

```
### 🤖 agent-digitals-git-orchestrator — <emoji> <RoleName>
```

Examples:
```
### 🤖 agent-digitals-git-orchestrator — 🏛️ Architect
### 🤖 agent-digitals-git-orchestrator — 🔧 Team Lead
### 🤖 agent-digitals-git-orchestrator — 🔍 QA Engineer
```

Post all comments using:
```bash
node scripts/github-logger.js comment <N> <Role> "<summary>"
node scripts/github-logger.js handoff <N> <FromRole> <ToRole> "<summary>"
node scripts/github-logger.js status  <N> <Role>
```

---

## 5. Memory System

### Filesystem Persistent Context (`persist-context/`)

Zero-dependency, human-readable `.md` files. No server, no embeddings, no API keys.

```bash
node .claude/skills/viking-sync.js master-os            # write snapshot (master OS)
node .claude/skills/viking-sync.js master-os --retrieve # read current state
node .claude/skills/viking-sync.js <issue-number>       # write issue-scoped snapshot
node .claude/skills/viking-sync.js project/<slug>       # write project-scoped snapshot
```

**Layer structure** in each `persist-context/` folder:

| File | Layer | Purpose |
|---|---|---|
| `L0-identity.md` | L0 | Stable identity — project, stack, roles (rarely changes) |
| `L1-session.md` | L1 | Active session state — overwritten each sync |
| `L2-history/*.md` | L2 | Append-only archive — one file per sync, never deleted |

**Key convention:**

| Scope | Key | Path |
|---|---|---|
| Master OS | `master-os` | `persist-context/` |
| Per project | `project/<slug>` | `projects/<slug>/persist-context/` |
| Per issue | `<number>` | `persist-context/` |

At session start, retrieve in order: **master-os → project → issue**.
At session end, save in order: **issue → project** (if changed).

### Claude Code Memory
Stored in `/home/laga/.claude/projects/-home-laga-agency-agents/memory/`

---

## 6. Issue Navigation

Issues in `Agents-Digital-Enterprise/agency-agents-enterprise`:

| Issue | Title | Status |
|---|---|---|
| [#1](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/1) | Architecture: Plugin Stack & Integration Design | ✅ Closed |
| [#2](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/2) | Sprint 1: Dependencies, MCP Verification, Filesystem Agent System | 🔄 Active |
| [#5](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/5) | Repo Audit: Inconsistent Docs — Human Review Required | 🔄 Open |
| [#6](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/6) | Architecture: Multi-Project Support — projects/ layer | ✅ Closed |
| [#7](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/7) | Infra: Install OpenViking — persistent agent memory | ✅ Closed |
| [#8](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/8) | Architecture: Replace OpenViking with filesystem persist-context/ | 🔄 Active |

Each issue's **first comment** contains a link to the previous issue for navigation.

---

## 7. MCP Servers

Configured in `.claude/mcp-config.json`:

| Server | Type | Purpose |
|---|---|---|
| `agency-agents` | Local Node.js script | Persona resolution from `.claude/agents/` |
| `filesystem` | npx | Read/write project files + `.claude/` dir |
| `github` | npx | Full GitHub API (needs `GITHUB_TOKEN`) |
| `sequential-thinking` | npx | Mandatory pre-coding step (Superpowers) |
| `promptfoo` | npx | QA eval gate |

---

## 8. Scripts Quick Reference

```bash
# Auth
node scripts/github-app-token.js               # generate + write .secrets/.env

# GitHub comments
node scripts/github-logger.js comment N Role "msg"
node scripts/github-logger.js handoff N FromRole ToRole "msg"

# Memory
node .claude/skills/viking-sync.js N
node .claude/skills/viking-sync.js N --retrieve

# Persona resolution
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"resolve_role","arguments":{"comment_text":"<paste last comment>"}}}' \
  | node scripts/agents-mcp-server.js

# QA
npx promptfoo eval --config promptfooconfig.yaml
```

---

## 9. Technical Standards

- All scripts: **Node.js ES Modules** (`.js`, `"type":"module"` in `package.json`)
- No bash scripts
- Tests before code (TDD — see `AGENT_PROTOCOLS.md §3`)
- Full standards: `CONTRIBUTING_AGENTS.md`

---

## 10. Human-in-the-Loop Checkpoints — MANDATORY

> ⛔ **Critical rule:** Architecture-level decisions require explicit human approval before execution.
> Never delete files, restructure the repo, change authentication flows, or modify CI/CD configuration without a human sign-off.

### When to STOP and Ask

You **must** pause and post a GitHub Issue or comment requesting human review before proceeding with any of the following:

| Category | Examples |
|---|---|
| **File deletion** | Removing any script, config, or agent persona |
| **Architecture changes** | Adding/removing MCP servers, changing agent roles, restructuring directories |
| **Auth/security changes** | Modifying `github-app-token.js`, changing key paths, altering GitHub App config |
| **Dependency changes** | Adding/removing npm packages, changing `package.json` type or engine |
| **Submodule changes** | Repointing submodule, merging upstream, changing remotes |
| **Workflow changes** | Modifying `AGENT_PROTOCOLS.md`, `CONTRIBUTING_AGENTS.md`, or this file |
| **External integrations** | Adding new MCP servers, changing OpenViking schema, new PromptFoo providers |

### How to Request Human Approval

1. Post a GitHub Issue comment with label `[HUMAN CHECKPOINT]`:
   ```bash
   node scripts/github-logger.js comment <N> <Role> "[HUMAN CHECKPOINT] Requesting approval for: <describe change>"
   ```
2. Include in the comment:
   - **What** you want to change
   - **Why** it is needed
   - **Risk** if applied / if not applied
   - **Proposed action** (step by step)
3. **Stop all work** on that task until a human replies with explicit approval.

### What Agents Are Allowed Without Approval

- Reading any file
- Writing code within an existing feature (implementing a GitHub Issue task)
- Running tests, running QA evals
- Posting GitHub comments / handoffs
- Generating tokens (session-local, not config changes)
- Saving/retrieving OpenViking memory

### Why This Rule Exists

Autonomous agents have full filesystem and GitHub API access. A single wrong delete or config change can break authentication, lose work, or corrupt the submodule state — all of which are hard to reverse. Human checkpoints are the safety valve that keeps the system trustworthy.
