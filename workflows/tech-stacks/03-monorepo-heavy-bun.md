# Workflow: Stack 03 — Monorepo Heavy (Bun + ElysiaJS)
> Turborepo · Nuxt 3 Frontend · Bun/ElysiaJS Backend · Elysia Eden E2E types · Supabase · Zero cost

Base workflow: [`workflows/enterprise-development.md`](../enterprise-development.md)
Tech stack spec: [`tech-stacks/03-monorepo-heavy-bun.md`](../../tech-stacks/03-monorepo-heavy-bun.md)

---

## When to Use This Workflow

- SaaS with complex business logic requiring a dedicated backend
- Multiple consumers of the same API (web + mobile + integrations)
- Teams working in parallel on independent modules
- End-to-end TypeScript typing is critical (Elysia Eden)

---

## Agent Roster for This Stack

CEO selects and configures these agents at project creation.

| Agent key | Label | Library path | Role |
|---|---|---|---|
| `architect` | `agent:architect` | `engineering/engineering-software-architect.md` | Turborepo structure, module boundaries |
| `frontend` | `agent:frontend` | `engineering/engineering-frontend-developer.md` | Nuxt 3, Eden Treaty client, shared UI |
| `backend` | `agent:backend` | `engineering/engineering-backend-architect.md` | ElysiaJS modules, service layer |
| `security` | `agent:security` | `engineering/engineering-security-engineer.md` | Auth, RLS, API security, secret hygiene |
| `db` | `agent:db` | `engineering/engineering-database-optimizer.md` | Drizzle schema, Supabase migrations |
| `devops` | `agent:devops` | `engineering/engineering-devops-automator.md` | Turborepo CI, CF Pages + Workers deploy pipelines |
| `qa` | `agent:qa` | `engineering/engineering-code-reviewer.md` | PR review, E2E types validation |

### CEO Setup Commands

For each agent above, create a GitHub label:
```bash
# GitHub MCP → create_label
# Example:
{
  "name": "agent:devops",
  "description": "engineering/engineering-devops-automator.md",
  "color": "0891b2"
}
```

Create `.claude/agents/skills/<key>.md` in the project repo for each.

---

## Step 0 — Project Bootstrap

```bash
# Auth
node scripts/github-app-token.js && source .secrets/.env

# Init Turborepo
bunx create-turbo@latest <project-name>
cd <project-name>

# Add apps
cd apps && bunx nuxi init web
mkdir api && cd api && bun init

# Install backend dependencies
bun add elysia @elysiajs/eden @elysiajs/cloudflare
bun add drizzle-orm postgres
bun add -d drizzle-kit

# Install frontend dependencies (in apps/web)
bun add @nuxtjs/tailwindcss shadcn-vue
bun add @supabase/supabase-js @nuxtjs/supabase

# Shared packages
mkdir -p packages/ui packages/types packages/config
```

**Required secrets in `.secrets/.env`:**
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
CLOUDFLARE_API_TOKEN=
CF_ACCOUNT_ID=
API_URL=
```

---

## Step 1 — Architecture (Architect)

This is the most critical step for Stack 03 — mistakes here are expensive to fix later.

**Use `sequential-thinking` MCP for every architectural decision.**

**Key decisions:**
- Module boundaries — what lives in `apps/api/src/modules/<feature>/`?
- Shared types — what goes in `packages/types/` vs stays local?
- Eden Treaty contract — design the API surface before implementation
- Drizzle schema in `packages/types/schema.ts` — shared between front and back
- Turborepo pipeline dependencies — what builds before what?

**ADR must cover:**
- Module list with ownership (which agent implements which)
- Eden Treaty API surface (routes, input/output types)
- Auth strategy (Supabase Auth + service-role for admin operations)
- DB schema with RLS policies
- Turborepo `turbo.json` pipeline

**Architect deliverables:**
```
[ ] turbo.json pipeline defined
[ ] packages/types/schema.ts — Drizzle schema skeleton
[ ] apps/api/src/index.ts — Elysia app skeleton with module stubs
[ ] apps/web/composables/useApi.ts — Eden Treaty client wired
[ ] One GitHub Issue per module/feature
```

---

## Step 2 — Implementation (Backend + Frontend in parallel)

**Backend agent (ElysiaJS):**

TDD per module:
```bash
# Test first
bun test src/modules/users/routes.test.ts

# Implement routes.ts → service.ts → schema.ts
# Verify Eden type exports compile
bun run typecheck
```

Module structure — mandatory:
```
modules/<feature>/
├── routes.ts    ← Elysia router, no business logic
├── service.ts   ← all DB/business logic
└── schema.ts    ← TypeBox schemas (not Zod)
```

**Frontend agent (Nuxt):**

```bash
# Always use Eden Treaty — never raw fetch to internal API
# apps/web/composables/useApi.ts already wired from Step 1

# TDD for composables (Vitest)
bun test composables/useUser.test.ts
```

**Turborepo build check:**
```bash
bun run build      # builds all apps in correct dependency order
bun run lint       # lints all workspaces
bun run typecheck  # type-checks all workspaces including Eden types
```

**Commit format:**
```
feat(api/users): add profile GET endpoint with RLS — Issue #<N>
feat(web/dashboard): wire user profile to Eden Treaty — Issue #<N>
```

---

## Step 3 — QA Checklist (QA + Security)

Base checklist from `enterprise-development.md` PLUS:

```
[ ] bun run build completes in all workspaces with 0 errors
[ ] bun run typecheck passes — Eden Treaty types valid end-to-end
[ ] No raw fetch() calls to internal API — all via useApi() Eden client
[ ] No business logic in routes.ts — only in service.ts
[ ] All Supabase tables have RLS enabled
[ ] SUPABASE_SERVICE_KEY only in apps/api — never in apps/web bundle
[ ] DATABASE_URL not exposed in any client-side code
[ ] Turborepo cache not storing secrets (check turbo.json env[] declarations)
[ ] CF Workers bundle size < 1MB for apps/api
[ ] Each module has routes.test.ts covering happy path + auth error
[ ] Drizzle migrations reviewed — no destructive operations without approval
```

---

## Step 4 — Deploy

```bash
# Build everything
bun run build

# Deploy frontend → CF Pages
cd apps/web
npx wrangler pages deploy .output/public/

# Deploy backend → CF Workers
cd apps/api
npx wrangler deploy dist/index.js

# Apply DB migrations
npx supabase db push

# Verify Eden types still valid post-deploy
bun run typecheck
```

**GitHub Actions pipelines (managed by DevOps agent):**
- `.github/workflows/ci.yml` — Turborepo lint + test on every PR
- `.github/workflows/deploy-web.yml` — Nuxt → CF Pages on main merge
- `.github/workflows/deploy-api.yml` — ElysiaJS → CF Workers on main merge
- `.github/workflows/supabase-migrate.yml` — migrations on main merge

---

## Retrospective Notes for This Stack

Common issues to check in retro:
- Eden Treaty type drift — frontend using stale API type after backend change
- Turborepo cache miss on CI — check `outputs` config in turbo.json
- CF Workers 1MB bundle exceeded — split large modules or move to Pages Functions
- Drizzle schema out of sync with Supabase — always use `supabase db push`, never `drizzle-kit push` in prod
- Supabase project paused (free tier) — add keep-alive or document for client
