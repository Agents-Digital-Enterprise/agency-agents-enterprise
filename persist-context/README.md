# persist-context/ — Agent Memory System

This folder is the **persistent memory** for agents working in this repository.
It replaces OpenViking with a zero-dependency filesystem approach using `.md` files.

## Layer Structure

| Layer | File | Changes | Purpose |
|---|---|---|---|
| **L0** | `L0-identity.md` | Rarely | Stable identity — who this project is, stack, roles |
| **L1** | `L1-session.md` | Every session | Active state — what's in progress, next role, blockers |
| **L2** | `L2-history/*.md` | Append-only | Audit trail — one file per completed session, never deleted |

## How Agents Use This

```bash
# At session start — load context
node .claude/skills/viking-sync.js master-os --retrieve

# At session end — save state
node .claude/skills/viking-sync.js master-os

# For issue-specific work
node .claude/skills/viking-sync.js <issue-number> --retrieve
node .claude/skills/viking-sync.js <issue-number>
```

## Rules

- **L0** is maintained by humans or the Architect — never auto-overwritten by viking-sync
- **L1** is overwritten each session — always reflects current state
- **L2** is append-only — files are never deleted or modified after creation
- All files are Markdown — human-readable, git-trackable, no server needed
