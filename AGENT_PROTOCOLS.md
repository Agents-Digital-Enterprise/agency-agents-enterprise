# AGENT_PROTOCOLS.md — Enterprise Choreography

> Global rules applied on top of every upstream agent persona.
> These protocols are what makes any agency-agents persona work inside this enterprise.

---

## 1. Identification — Non-Negotiable

Every GitHub output (issue comment, PR description, PR review) **must** begin with:

```
### 🤖 agent-digitals-git-orchestrator — <emoji> <RoleName>
```

This is the enterprise signature. Without it, the comment is invalid and will fail `promptfoo eval`.

---

## 2. Session Start Checklist

```
[ ] 1. Read CLAUDE.md completely
[ ] 2. Run: node scripts/github-app-token.js (if token expired)
[ ] 3. source .secrets/.env
[ ] 4. Read last issue comment → determine role (see CLAUDE.md §3)
[ ] 5. Read relevant source files via filesystem MCP (never assume state from memory)
[ ] 6. Declare role with a GitHub comment before doing any work
```

---

## 3. Execution Methodology — Team Lead Only

### 3.1 Sequential Thinking Gate (Superpowers)
Before writing any code, call the `sequential-thinking` MCP tool.
The numbered plan it returns must be posted as the first block of your GitHub comment:

```markdown
#### Sequential Plan
1. [step]
2. [step]
3. [step — identify edge cases here]
```

### 3.2 TDD Cycle
```
1. Write failing test  → npm test → confirm RED
2. Write minimum code  → npm test → confirm GREEN
3. Refactor            → npm test → confirm still GREEN
4. Commit (one logical change)
```

Never commit without a test. The commit log must show the test commit **before** the code commit.

### 3.3 Commit Format
```
<type>(<scope>): <subject>

[what and why — not how]

🤖 Agent: Team Lead
Issue: #<number>
```

Types: `feat` `fix` `test` `refactor` `docs` `chore`

---

## 4. Handoff Protocol

### 4.1 GitHub Handoff Comment
```bash
node scripts/github-logger.js handoff <N> <FromRole> <ToRole> "<one-line summary>"
```

Required comment structure:
```markdown
### 🤖 agent-digitals-git-orchestrator — <emoji> <Role> → Handoff

**Summary:** <one paragraph, human-readable>

#### Progress
| Task | Status |
|---|---|
| <task> | ✅ Done / 🔄 In Progress / ❌ Blocked |

#### Next Step
**Role needed:** <emoji> <NextRole>
**Action:** <specific instruction for the next agent>

---
<sub>🕐 <timestamp> · 🔑 App ID: `2984613`</sub>
```

---

## 5. GitHub Operations

### Creating Issues (Architect)
```bash
gh issue create \
  --repo Agents-Digital-Enterprise/agency-agents-enterprise \
  --title "<title>" \
  --body "$(cat issue-body.md)"
```

### Issue Navigation Rule
The **first comment** on every new issue must contain a link to the previous issue:
```markdown
> **Previous issue:** https://github.com/Agents-Digital-Enterprise/agency-agents-enterprise/issues/<N-1>
```

### Linking Issues
- Always reference parent: `Part of #<parent_issue>`
- PR descriptions: `Closes #<issue_number>`
- Child issues: use label `child-of-#<N>`

### PR Workflow (Team Lead)
```bash
git checkout -b feat/issue-<N>-short-description
# ... implement with TDD ...
gh pr create \
  --repo Agents-Digital-Enterprise/agency-agents-enterprise \
  --title "feat: <description>" \
  --body "Closes #<N>"
```

---

## 6. Plugin Integration Commands

### Impeccable Dark (UI work only)
```bash
/impeccable-dark ui-audit --component <path>
/impeccable-dark design-system-init
```
Activate when: `*.css`, `*.scss` modified, or issue has `[UI]` label.

### PromptFoo (QA role)
```bash
npx promptfoo eval --config promptfooconfig.yaml   # validate agent output
npx promptfoo view                                  # browser report
```

### Sequential Thinking (Team Lead, before coding)
Invoked via `sequential-thinking` MCP tool in-session.

### Library Agents (any role, for specialist tasks)
```bash
# Browse available specialists via MCP
# agency-agents MCP → list_library → filter by category: engineering, design, testing, etc.
# agency-agents MCP → get_library_agent → load specific agent

# Example: activate security review
# "Activate engineering-security-engineer from library and review this PR"
```

---

## 7. Quality Gates

A task is **not done** until:
- [ ] All tests pass (`npm test`)
- [ ] `promptfoo eval` returns 0 failures
- [ ] GitHub Issue has a Handoff comment with correct signature
- [ ] PR open and linked to issue (if code was written)

---

## 8. Forbidden Actions

| ❌ Forbidden | ✅ Required Instead |
|---|---|
| Push directly to `main` | Open a PR via `gh pr create` |
| Skip sequential thinking | Call `sequential-thinking` MCP tool first |
| Skip tests | Write tests first (TDD — RED before GREEN) |
| GitHub comment without `### 🤖` prefix | Always use identification header |
| Assume state without reading files | Use `filesystem` MCP to read source |
| Close issue without QA approval | Wait for QA sign-off |
| Commit secrets | Use `.secrets/` + `.gitignore` |
