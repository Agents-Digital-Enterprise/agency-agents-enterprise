# Workflow: Stack 02 — Frontend + Workers + Supabase
> Nuxt 3 + Nitro → Cloudflare Workers · Supabase DB/Auth · Zero cost

Base workflow: [`workflows/enterprise-development.md`](../enterprise-development.md)
Tech stack spec: [`tech-stacks/02-frontend-workers-supabase.md`](../../tech-stacks/02-frontend-workers-supabase.md)

---

## When to Use This Workflow

- SaaS with authentication and user data
- Dashboard backed by Supabase (PostgreSQL + Auth + Storage)
- Light server API (< 50 endpoints) via Nitro → Cloudflare Workers

---

## Agent Roster for This Stack

CEO selects and configures these agents at project creation.

| Agent key | Label | Library path | Role |
|---|---|---|---|
| `architect` | `agent:architect` | `engineering/engineering-software-architect.md` | System design, Nitro/Workers architecture |
| `frontend` | `agent:frontend` | `engineering/engineering-frontend-developer.md` | Vue 3, Tailwind, auth flows |
| `backend` | `agent:backend` | `engineering/engineering-backend-architect.md` | Nitro server routes, Supabase integration |
| `security` | `agent:security` | `engineering/engineering-security-engineer.md` | RLS policies, auth hardening, secret hygiene |
| `db` | `agent:db` | `engineering/engineering-database-optimizer.md` | Supabase schema, RLS, migrations |
| `qa` | `agent:qa` | `engineering/engineering-code-reviewer.md` | PR review, auth edge-case testing |

### CEO Setup Commands

For each agent above, create a GitHub label:
```bash
# GitHub MCP → create_label
{
  "name": "agent:security",
  "description": "engineering/engineering-security-engineer.md",
  "color": "e11d48"
}
```

Create `.claude/agents/skills/<key>.md` in the project repo for each.

---

## Step 0 — Project Bootstrap

```bash
# Auth
node scripts/github-app-token.js && source .secrets/.env

# Init Nuxt project
npx nuxi init <project-name>
cd <project-name>

# Install stack dependencies
npm install @supabase/supabase-js @nuxtjs/supabase
npm install -D tailwindcss @nuxtjs/tailwindcss

# Configure nuxt.config.ts — preset: cloudflare
```

**Supabase setup:**
```bash
npx supabase init
npx supabase login
npx supabase link --project-ref <ref>
```

**Required secrets in `.secrets/.env`:**
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
CLOUDFLARE_API_TOKEN=
CF_ACCOUNT_ID=
```

---

## Step 1 — Architecture (Architect + Security)

**Key decisions for this stack:**
- Auth strategy: email/password, OAuth providers, magic link — decide before any routes
- RLS policy design: must be planned before schema creation — Security agent owns this
- Server route structure: `server/api/[feature]/[action].[method].ts`
- Environment variable separation: what is safe for client (`SUPABASE_ANON_KEY`) vs server-only (`SUPABASE_SERVICE_KEY`)

**ADR must cover:**
- Auth flow (login → callback → session management)
- RLS policies per table
- Which routes need server-side auth validation vs client-side

**Security agent checklist before implementation:**
```
[ ] All tables have RLS enabled
[ ] SERVICE_KEY never referenced in client-side composables
[ ] ANON_KEY scoped by RLS — no open tables
[ ] Auth middleware protects all /dashboard/* routes
```

---

## Step 2 — Implementation (Frontend + Backend)

**Database migrations first:**
```bash
# Write migration
supabase/migrations/0001_init.sql

# Apply locally
npx supabase db reset

# Verify RLS policies work
npx supabase db test
```

**Server route TDD:**
```bash
# Write test for server route
tests/server/api/user/profile.test.ts

# Implement route
server/api/user/profile.get.ts

# Run tests
npm test
```

**Mandatory checks before PR:**
```bash
npm run lint
npm run typecheck
npm run build          # nuxt build — must complete with 0 errors
npx supabase db lint   # check schema issues
```

---

## Step 3 — QA Checklist (QA + Security)

Base checklist from `enterprise-development.md` PLUS:

```
[ ] All Supabase tables have RLS enabled (verify in Supabase dashboard)
[ ] No SUPABASE_SERVICE_KEY in client bundle — run: npm run build && grep -r "service_role" dist/
[ ] Auth flow tested: login, logout, session refresh, OAuth callback
[ ] Protected routes redirect to /auth/login when unauthenticated
[ ] Supabase free tier warning documented in project README (pauses after 7 days inactivity)
[ ] Server routes return correct HTTP status codes (401 vs 403 vs 404)
[ ] nuxt build completes with 0 errors
[ ] CF Workers deploy preview verified
```

---

## Step 4 — Deploy

```bash
# Deploy frontend → CF Pages
npx nuxt build
npx wrangler pages deploy .output/public/

# Deploy server → CF Workers (via Nitro)
# Nitro outputs to .output/server/ — deploy with wrangler
npx wrangler deploy .output/server/index.mjs

# Apply DB migrations to production
npx supabase db push
```

---

## Retrospective Notes for This Stack

Common issues to check in retro:
- Supabase project paused due to inactivity — add keep-alive ping or upgrade note
- RLS policy blocking valid queries — check Supabase logs for policy errors
- CF Workers bundle size limit (1MB) — check with `wrangler deploy --dry-run`
- Service key accidentally exposed — run `git log -S "service_role"` to verify clean history
