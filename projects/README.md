# Projects

This directory contains the **template** for new project repos managed by the Digital Enterprise OS.

The list of active projects is tracked in **`projects-registry.json`** at the repo root — not as subfolders or git submodules here.

## Registered Projects

See [`/projects-registry.json`](../projects-registry.json) for the full list.

| Project | Repo | Status |
|---|---|---|
| Portfolio — Luis Marques | [`Agents-Digital-Enterprise/portfolio-luiszmarques`](https://github.com/Agents-Digital-Enterprise/portfolio-luiszmarques) | 🔄 Active |

## How to Register a New Project (CEO Workflow)

1. Create the repo via GitHub MCP (`create_repository`)
2. Copy `projects/template/` into the new repo
3. Fill in `config.json` with the real slug, repo URL and stack
4. Select agents from `.claude/agents/library/` — adapt to project context — push to new repo under `.claude/agents/`
5. Add a row to `projects-registry.json` at the root of this repo
6. **Never use `git submodule add`** for projects

## Template Contents

```
template/
├── config.json                   # Project metadata (slug, repo, stack, workflows)
├── .env.example                  # Environment variables template
├── .gitignore                    # Standard ignores
├── .code-review-graphignore      # ast-grep ignore patterns
├── PROJECT_CLAUDE_MD_TEMPLATE.md # Starting point for project root CLAUDE.md
└── scripts/
    ├── github-app-token.js       # GitHub App auth (self-contained copy)
    └── github-logger.js          # GitHub comment poster (self-contained copy)
```

Each project is **self-contained** — it carries its own `scripts/` so it doesn't depend on paths to this repo.
