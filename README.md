# Digital Enterprise OS

> An autonomous multi-agent operating system for software development — powered by Claude Code, GitHub Apps, and a filesystem-first persona library.

---

## What It Does

This repository is the **control plane** for a team of AI agents that collaborate asynchronously to plan, build, review, and ship software. Instead of a single AI session doing everything, work is divided across specialised roles that hand off to each other via GitHub Issues — leaving a human-readable audit trail of every decision made.

```
You write an order in a GitHub Issue.
↓
Architect reads it → decomposes into tasks → creates child Issues
↓
Team Lead picks up a task → thinks sequentially → writes tests first → implements → opens PR
↓
QA Engineer reviews → runs validation → merges or requests changes
↓
Memory of every session persisted in persist-context/ for future agents to retrieve
```

Each agent session can be started from any machine, by any operator — the GitHub Issue history and `persist-context/` memory carry full context forward.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DIGITAL ENTERPRISE OS                        │
│                                                                     │
│  ┌─────────────────┐   reads    ┌──────────────────────────────┐   │
│  │   CLAUDE.md     │ ─────────► │    GitHub Issues             │   │
│  │   (OS kernel)   │            │  (async message bus)         │   │
│  └─────────────────┘            └──────────────────────────────┘   │
│                                          │ last comment             │
│                                          ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    AGENT PERSONA SYSTEM                      │  │
│  │                                                              │  │
│  │  .claude/agents/upstream/   (git submodule — org fork of    │  │
│  │    engineering/             msitarzewski/agency-agents)      │  │
│  │    design/                  100+ specialist agents           │  │
│  │    testing/  ...                                             │  │
│  │                                                              │  │
│  │  .claude/agents/            Enterprise overlays              │  │
│  │    architect.md   ──────►  extends Software Architect        │  │
│  │    team-lead.md   ──────►  extends Senior Dev + Git Master   │  │
│  │    qa-engineer.md ──────►  extends Code Reviewer + Security  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                │                                                    │
│                ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      MCP SERVER STACK                        │  │
│  │                                                              │  │
│  │  agency-agents      Local Node.js — reads .claude/agents/   │  │
│  │  filesystem         Read/write project files offline         │  │
│  │  github             GitHub API — issues, PRs, comments       │  │
│  │  sequential-think   Force step-by-step plan before coding    │  │
│  │  promptfoo          Output quality validation gate           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                │                                                    │
│                ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               MEMORY & AUTH                                  │  │
│  │                                                              │  │
│  │  persist-context/   Filesystem memory — L0/L1/L2 .md files  │  │
│  │    L0-identity.md   Stable: project identity, stack, roles   │  │
│  │    L1-session.md    Active: current sprint state             │  │
│  │    L2-history/      Append-only: audit trail of sessions     │  │
│  │                                                              │  │
│  │  GitHub App (ID: 2984613)                                    │  │
│  │    scripts/github-app-token.js  →  .secrets/.env            │  │
│  │    JWT (RS256, 9min) → Installation token (1h)              │  │
│  │    .secrets/  never committed  (.gitignore)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
agency-agents-enterprise/
│
├── CLAUDE.md                    # OS kernel — every agent reads this first
├── AGENT_PROTOCOLS.md           # Choreography rules — handoff format, TDD, signing
├── CONTRIBUTING_AGENTS.md       # Clean code standards for all agents
│
├── workflows/
│   └── enterprise-development.md  # 4-step sprint workflow (gstack-inspired)
│
├── scripts/                     # All Node.js ES Modules
│   ├── github-app-token.js      # GitHub App JWT → installation token generator
│   ├── github-logger.js         # Structured, signed GitHub comment poster
│   ├── agents-mcp-server.js     # Local MCP server for persona resolution
│   └── promptfoo-passthrough.js # PromptFoo provider for offline validation
│
├── projects/                    # Project registry — one entry per managed repo
│   ├── README.md                # Registry index + onboarding instructions
│   └── template/                # Scaffold for new projects
│       ├── config.json          # Repo URL, stack, Viking memory key
│       └── PROJECT_CLAUDE_MD_TEMPLATE.md  # Template for project root CLAUDE.md
│
├── persist-context/             # Filesystem memory — zero dependencies
│   ├── README.md                # Explains the L0/L1/L2 layer system
│   ├── L0-identity.md           # Stable: OS identity, stack, roles
│   ├── L1-session.md            # Active: current session state
│   └── L2-history/              # Append-only: one .md per session snapshot
│
├── .claude/
│   ├── mcp-config.json          # MCP server registry (merge into claude_desktop_config)
│   ├── agents/
│   │   ├── upstream/            # git submodule → Agents-Digital-Enterprise/agency-agents
│   │   ├── architect.md         # Enterprise overlay: 🏛️ Project Architect
│   │   ├── team-lead.md         # Enterprise overlay: 🔧 Team Lead
│   │   └── qa-engineer.md       # Enterprise overlay: 🔍 QA Engineer
│   └── skills/
│       └── viking-sync.js       # Filesystem memory sync (L1 write + L2 archive)
│
├── tests/
│   └── agents/personas.test.js  # 20 integration tests — all passing
│
├── promptfooconfig.yaml         # Agent output quality validation rules
├── package.json                 # type: module, Node >= 18
├── .gitmodules                  # Submodule: Agents-Digital-Enterprise/agency-agents
├── .gitignore                   # Excludes .secrets/, .env, tokens
│
└── .secrets/                    # NEVER committed
    ├── github-app.json          # App ID + private key path
    ├── .env                     # Generated: GITHUB_TOKEN, GITHUB_APP_ID
    └── mcp-servers.json         # Token-injected MCP config block
```

---

## The Three Agent Roles

Every session starts by reading the last GitHub Issue comment to determine which role to assume.

### 🏛️ Project Architect
Translates human orders into structured engineering plans. Creates child GitHub Issues with acceptance criteria. Writes Architectural Decision Records. **Never writes production code.**
- Base persona: `upstream/engineering/engineering-software-architect.md`
- Trigger keywords: `[ARCHITECT]`, "design", "plan", "architecture"

### 🔧 Team Lead
Implements features with strict TDD. Uses the `sequential-thinking` MCP tool before every coding session. Opens PRs, never pushes to `main` directly.
- Base personas: `upstream/engineering/engineering-senior-developer.md` + `upstream/engineering/engineering-git-workflow-master.md`
- Trigger keywords: `[LEAD]`, "implement", "build", "code", "fix"

### 🔍 QA Engineer
The final gate. Runs tests independently, runs `promptfoo eval`, checks TDD compliance in git log, approves or requests changes. Closes issues only after all acceptance criteria are met.
- Base personas: `upstream/engineering/engineering-code-reviewer.md` + `upstream/engineering/engineering-security-engineer.md`
- Trigger keywords: `[QA]`, "review", "validate", "check"

Adding more specialists is as simple as reading any file in `.claude/agents/upstream/` — 100+ agents available across engineering, design, testing, product, and strategy.

---

## How GitHub Authentication Works

This system uses a **GitHub App** — not a personal token. Every session must start with:

```bash
node scripts/github-app-token.js    # generates JWT → exchanges for 1h installation token
source .secrets/.env                # loads GITHUB_TOKEN into shell
```

The script reads `.secrets/github-app.json` (App ID + private key path), signs a JWT with RS256, calls the GitHub API to exchange it for an installation access token, and writes it to `.secrets/.env`, `.secrets/mcp-servers.json`, and `~/.config/gh/hosts.yml`. No browser, no OAuth flow, no `gh auth login`.

On any 401 error — rerun: `node scripts/github-app-token.js --force && source .secrets/.env`

---

## Session Flow

```
1.  node scripts/github-app-token.js && source .secrets/.env
2.  node .claude/skills/viking-sync.js master-os --retrieve   (load OS memory)
3.  Read last GitHub Issue comment → determine role
4.  If working on a project: read project root CLAUDE.md
5.  node .claude/skills/viking-sync.js <issue-N> --retrieve  (load issue memory)
6.  Read persona file: .claude/agents/<role>.md
7.  node scripts/github-logger.js comment <N> <Role> "Assuming role..."
8.  Do the work
9.  node .claude/skills/viking-sync.js <issue-N>             (save memory)
10. node scripts/github-logger.js handoff <N> <From> <To> "<summary>"
```

---

## Persistent Memory — persist-context/

Zero-dependency filesystem memory. No server, no embeddings, no API keys.

```bash
node .claude/skills/viking-sync.js master-os            # write OS snapshot
node .claude/skills/viking-sync.js master-os --retrieve # read current state
node .claude/skills/viking-sync.js <issue-number>       # write issue snapshot
node .claude/skills/viking-sync.js project/<slug>       # write project snapshot
```

| Layer | File | Purpose |
|---|---|---|
| L0 | `L0-identity.md` | Stable identity — project, stack, roles (rarely changes) |
| L1 | `L1-session.md` | Active session state — overwritten each sync |
| L2 | `L2-history/*.md` | Append-only archive — one file per sync, never deleted |

Each project repo also gets its own `persist-context/` folder and a root `CLAUDE.md` as the agent contract for that project.

---

## Every GitHub Comment Is Signed

All agent output on GitHub begins with:

```
### 🤖 agent-digitals-git-orchestrator — 🏛️ Architect
### 🤖 agent-digitals-git-orchestrator — 🔧 Team Lead
### 🤖 agent-digitals-git-orchestrator — 🔍 QA Engineer
```

This makes every action traceable — who did what, in which role, on which issue.

---

## MCP Servers

Configured in `.claude/mcp-config.json`. Merge the `mcpServers` block into your `claude_desktop_config.json`.

| Server | Type | Purpose | Requires |
|---|---|---|---|
| `agency-agents` | Local `node scripts/agents-mcp-server.js` | Resolve roles, load personas, get prefixes | Nothing — offline |
| `filesystem` | `npx @modelcontextprotocol/server-filesystem` | Read/write project files | Nothing |
| `github` | `npx @github/github-mcp-server` | Full GitHub API | `GITHUB_TOKEN` |
| `sequential-thinking` | `npx @modelcontextprotocol/server-sequential-thinking` | Force step-by-step plans | Nothing |
| `promptfoo` | `npx promptfoo mcp` | Validate agent comment quality | `npm i -g promptfoo` |

---

## Quality Gates

Nothing ships without passing:

```bash
node --test tests/agents/personas.test.js                  # 20 tests — persona system
npx promptfoo eval --filter-providers passthrough          # 4 tests — comment structure
```

The `promptfoo` config validates that every agent comment has: identification header, summary, progress table, and metadata footer.

---

## Inspiration: gstack

This system draws from **[gstack](https://github.com/garrytan/gstack)** (Garry Tan / YC, March 2026) — the insight that giving Claude a *role* produces more consistent output than prompt variation. Where gstack is single-session and terminal-local, this enterprise OS is async, multi-session, and leaves a permanent audit trail in GitHub.

See `workflows/enterprise-development.md` for the full comparison and sprint workflow.

---

## GitHub Organisation

| Repository | Purpose |
|---|---|
| [`agency-agents-enterprise`](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise) | Main OS repo — issues, PRs, workflow |
| [`agency-agents`](https://github.com/Agents-Digital-Enterprise/agency-agents) | Org fork of persona library (submodule) |
| [`agency-agents-testing`](https://github.com/Agents-Digital-Enterprise/agency-agents-testing) | Original testing ground (archived) |

---

## Prerequisites

| Requirement | Check |
|---|---|
| Node.js >= 18 | `node --version` |
| GitHub App installed on org | App ID `2984613`, installation `113396256` |
| Private key in `.secrets/` | `agent-digitals-git-orchestrator.*.pem` |
| `promptfoo` global | `npm i -g promptfoo` |
