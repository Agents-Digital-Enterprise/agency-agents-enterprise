# Projects Registry

This directory is the **project registry** for the Digital Enterprise OS.

Each subdirectory here is a lightweight config entry for a project repo managed by the agent fleet. The authoritative agent instructions for each project live in that project's own root `CLAUDE.md`.

## Registered Projects

| Project | Repo | Status |
|---|---|---|
| Portfolio — Luis Marques | `Agents-Digital-Enterprise/portfolio-luiszmarques` | 🔄 Active |

## How to Register a New Project

1. Copy `template/` to `<your-project-name>/`
2. Fill in `config.json` with the real repo URL and stack
3. Add a root `CLAUDE.md` to the project repo itself (copy `template/PROJECT_CLAUDE_MD_TEMPLATE.md` as a starting point)
4. Add a row to the table above
5. Commit both changes

## Viking Memory Key Convention

| Scope | Key |
|---|---|
| Master OS (this repo) | `viking://memories/master-os` |
| Per project | `viking://memories/project/<repo-slug>` |
| Per issue | `viking://memories/<issue-number>` |
