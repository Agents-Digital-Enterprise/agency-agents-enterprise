# Digital Enterprise OS

> An autonomous multi-agent operating system for software development — powered by Claude Code, GitHub Apps, and a filesystem-first agent library.

---

## What It Does

This repository is the **central control plane and project factory** for a fleet of AI agents that collaborate asynchronously to plan, build, review, and ship software. Work is divided across specialised roles that hand off via GitHub Issues — leaving a human-readable audit trail of every decision.

```
You write an order in a GitHub Issue.
↓
CEO reads it → researches → selects agents → structures project → creates issues
↓
Architect decomposes into tasks → writes acceptance criteria
↓
Team Lead implements with TDD → opens PR
↓
QA Engineer reviews → validates → merges or requests changes
```

Each agent session can start from any machine — GitHub Issue history and Claude Code auto-memory carry full context forward.

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
│  │  .claude/agents/library/    Inline agent library             │  │
│  │    engineering/             20+ engineering specialists       │  │
│  │    design/                  UI/UX, brand, visual             │  │
│  │    testing/                 QA, reality checker              │  │
│  │    marketing/ product/      Full business stack              │  │
│  │    strategy/ sales/ ...     100+ agents total                │  │
│  │                                                              │  │
│  │  .claude/agents/            Enterprise overlays              │  │
│  │    ceo.md         ──────►  👔 Project Factory CEO            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                │                                                    │
│                ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      MCP SERVER STACK                        │  │
│  │                                                              │  │
│  │  agency-agents      Local Node.js — personas + library scan  │  │
│  │  filesystem         Read/write project files offline         │  │
│  │  github             GitHub API — issues, PRs, comments       │  │
│  │  sequential-think   Force step-by-step plan before coding    │  │
│  │  ast-grep           Structural code analysis via AST         │  │
│  │  promptfoo          Output quality validation gate           │  │
│  │  cloudflare         Workers/Pages API                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                │                                                    │
│                ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               PROJECTS & AUTH                                │  │
│  │                                                              │  │
│  │  projects-registry.json     All managed projects (no        │  │
│  │                             submodules — URL + stack only)   │  │
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
├── CLAUDE.md                      # OS kernel — every agent reads this first
├── AGENT_PROTOCOLS.md             # Choreography rules — handoff format, TDD, signing
├── CONTRIBUTING_AGENTS.md         # Standards for all agents
├── REFACTOR-PLAN.md               # Architecture refactor log
│
├── projects-registry.json         # All managed projects (name, url, stack, status)
├── projects-registry.schema.json  # JSON Schema for registry validation
│
├── workflows/
│   └── enterprise-development.md  # 4-step sprint workflow
│
├── scripts/                       # All Node.js ES Modules
│   ├── github-app-token.js        # GitHub App JWT → installation token
│   ├── github-logger.js           # Signed GitHub comment poster
│   ├── agents-mcp-server.js       # Local MCP server — persona resolution + library scan
│   └── promptfoo-passthrough.js   # PromptFoo provider for offline validation
│
├── projects/
│   └── template/                  # Scaffold for new project repos
│       ├── config.json            # Project metadata template
│       ├── .env.example           # Environment variables template
│       ├── .gitignore             # Standard ignores for projects
│       ├── .code-review-graphignore
│       ├── PROJECT_CLAUDE_MD_TEMPLATE.md
│       └── scripts/               # Copies of auth scripts for self-contained projects
│           ├── github-app-token.js
│           └── github-logger.js
│
├── .claude/
│   ├── mcp-config.example.json    # MCP config template (mcp-config.json is gitignored)
│   └── agents/
│       ├── library/               # Full inline agent library (100+ agents, no submodule)
│       │   ├── engineering/
│       │   ├── design/
│       │   ├── testing/
│       │   ├── marketing/
│       │   ├── product/
│       │   ├── strategy/
│       │   ├── sales/
│       │   └── ...
│       └── ceo.md                 # Enterprise overlay: 👔 CEO / Project Factory
│
├── tests/
│   └── agents/personas.test.js    # Persona system integration tests
│
├── promptfooconfig.yaml           # Agent output quality validation rules
├── package.json                   # type: module, Node >= 18
├── .gitignore                     # Excludes .secrets/, mcp-config.json, .env
├── .code-review-graphignore
│
└── .secrets/                      # NEVER committed
    ├── github-app.json            # App ID + private key path
    ├── .env                       # Generated: GITHUB_TOKEN, GITHUB_APP_ID
    └── mcp-servers.json           # Token-injected MCP config
```

---

## Agent Roles

Every session starts by reading the last GitHub Issue comment to determine role.

### 👔 CEO — Project Factory
Researches the project, selects agents from the library, structures the master GitHub Issue, creates the repo, copies the template, registers in `projects-registry.json`. **Never writes code.**
- Trigger: `[CEO]`, "strategy", "plan project", "research"

### 🏛️ Architect
Translates orders into structured engineering plans. Creates child Issues with acceptance criteria. Writes ADRs.
- Base persona: `library/engineering/engineering-software-architect.md`
- Trigger: `[ARCHITECT]`, "design", "plan", "architecture"

### 🔧 Team Lead
Implements with TDD. Uses `sequential-thinking` MCP before coding. Opens PRs, never pushes to `main`.
- Base personas: `library/engineering/engineering-senior-developer.md`
- Trigger: `[LEAD]`, "implement", "build", "code", "fix"

### 🔍 QA Engineer
Final gate. Runs tests, `promptfoo eval`, checks TDD compliance. Closes issues only after all criteria met.
- Base personas: `library/engineering/engineering-code-reviewer.md`
- Trigger: `[QA]`, "review", "validate", "check"

Browse 100+ specialists via `agency-agents` MCP → `list_library` (filter by category).

---

## Project Factory

To create a new project, the CEO:

1. Creates the repo via GitHub MCP
2. Copies `projects/template/` into the new repo
3. Selects and adapts agents from `.claude/agents/library/`
4. Registers the project in `projects-registry.json`

No `git submodule add` — ever. Projects are tracked by URL in the registry.

---

## Authentication

GitHub App — not a personal token. Every session starts with:

```bash
node scripts/github-app-token.js    # JWT → 1h installation token → .secrets/.env
source .secrets/.env
echo "$GITHUB_TOKEN" | gh auth login --with-token
```

On 401: `node scripts/github-app-token.js --force && source .secrets/.env`

---

## Session Flow

```
1. node scripts/github-app-token.js && source .secrets/.env
2. Read last GitHub Issue comment → determine role
3. If working on a project: check projects-registry.json → read project CLAUDE.md
4. Load persona: agency-agents MCP → resolve_role or get_library_agent
5. node scripts/github-logger.js comment <N> <Role> "Assuming role..."
6. Do the work
7. node scripts/github-logger.js handoff <N> <From> <To> "<summary>"
```

---

## MCP Servers

Copy `.claude/mcp-config.example.json` to `.claude/mcp-config.json` and fill in your values. Merge `mcpServers` into `claude_desktop_config.json`.

| Server | Purpose |
|---|---|
| `agency-agents` | Persona resolution + library browsing (`list_library`, `get_library_agent`) |
| `filesystem` | Read/write project files offline |
| `github` | Full GitHub API — issues, PRs, comments |
| `sequential-thinking` | Force step-by-step plans before coding |
| `ast-grep` | Structural code analysis — impact radius, symbol search |
| `promptfoo` | Validate agent comment quality |
| `cloudflare` | Cloudflare Workers/Pages API |

---

## GitHub Organisation

| Repository | Purpose |
|---|---|
| [`agency-agents-enterprise`](https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise) | This repo — OS control plane + project factory |
| [`portfolio-luiszmarques`](https://github.com/Agents-Digital-Enterprise/portfolio-luiszmarques) | Active project — registered in projects-registry.json |

---

## Prerequisites

| Requirement | Check |
|---|---|
| Node.js >= 18 | `node --version` |
| GitHub App installed on org | App ID `2984613`, installation `113396256` |
| Private key in `.secrets/` | `agent-digitals-git-orchestrator.*.pem` |
| `promptfoo` global | `npm i -g promptfoo` |
