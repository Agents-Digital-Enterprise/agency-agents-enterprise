# Workflow: Stack 01 — Frontend Light
> Nuxt 3 / Vue 3 + Tailwind CSS · Cloudflare Pages · Zero cost

Base workflow: [`workflows/enterprise-development.md`](../enterprise-development.md)
Tech stack spec: [`tech-stacks/01-frontend-light.md`](../../tech-stacks/01-frontend-light.md)

---

## When to Use This Workflow

- Portfolio, landing page, marketing site, static dashboard
- No backend, no database, no authentication required
- Deploy: `nuxt generate` → Cloudflare Pages (SSG or edge SSR via Pages Functions)

---

## Agent Roster for This Stack

CEO selects and configures these agents at project creation.

| Agent key | Label | Library path | Role |
|---|---|---|---|
| `architect` | `agent:architect` | `engineering/engineering-software-architect.md` | Component architecture, Nuxt config |
| `frontend` | `agent:frontend` | `engineering/engineering-frontend-developer.md` | Vue 3, Tailwind, shadcn-vue |
| `ui-designer` | `agent:ui-designer` | `design/design-ui-designer.md` | Visual design, component library |
| `qa` | `agent:qa` | `engineering/engineering-code-reviewer.md` | PR review, accessibility check |
| `seo` | `agent:seo` | `marketing/marketing-seo-specialist.md` | Meta tags, sitemap, Core Web Vitals |

### CEO Setup Commands

For each agent above, create a GitHub label:
```bash
# Example — repeat for each agent
# GitHub MCP → create_label
{
  "name": "agent:frontend",
  "description": "engineering/engineering-frontend-developer.md",
  "color": "0075ca"
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
npm install

# Install stack dependencies
npm install -D tailwindcss @nuxtjs/tailwindcss
npm install shadcn-vue radix-vue lucide-vue-next

# Configure nuxt.config.ts — preset: cloudflare-pages
```

**GitHub Actions deploy setup:**
```yaml
# .github/workflows/deploy.yml
# Trigger: push to main → nuxt generate → wrangler pages deploy
```

Set Cloudflare Pages secrets in repo settings: `CLOUDFLARE_API_TOKEN`, `CF_ACCOUNT_ID`.

---

## Step 1 — Architecture (Architect)

**Key decisions for this stack:**
- SSG vs edge SSR (Pages Functions) — decide upfront based on dynamic content needs
- Component structure: `components/ui/` (shadcn-vue base) + `components/<feature>/`
- Composables for all data-fetching logic — no business logic in pages
- Route structure and SEO metadata strategy (Nuxt `useSeoMeta`)

**ADR must cover:**
- Static vs dynamic pages
- Any external APIs being called (CORS, CSP headers)
- OG image strategy

---

## Step 2 — Implementation (Frontend Developer)

**TDD cycle for Vue components:**
```bash
# Write component test first (Vitest + Vue Test Utils)
npm run test -- --watch

# Implement component
# Refactor
```

**Mandatory checks before PR:**
```bash
npm run lint          # ESLint + Vue rules
npm run typecheck     # vue-tsc
npm run generate      # nuxt generate — must complete with 0 errors
```

**Commit format:**
```
feat(components): add HeroSection with CTA button — Issue #<N>
```

---

## Step 3 — QA Checklist (QA Engineer)

Base checklist from `enterprise-development.md` PLUS:

```
[ ] nuxt generate completes with 0 errors
[ ] Lighthouse score >= 90 (Performance, Accessibility, SEO) — run locally
[ ] All images have alt text
[ ] useSeoMeta set on all public pages (title, description, og:image)
[ ] No hardcoded colours — Tailwind classes only
[ ] Mobile-first: tested at 375px, 768px, 1280px breakpoints
[ ] No console errors in production build
[ ] CF Pages preview deployment URL verified
```

---

## Step 4 — Deploy

```bash
# Manual deploy (if not using GitHub Actions)
npx nuxt generate
npx wrangler pages deploy dist/

# Verify deployment
curl -I https://<project>.pages.dev
```

---

## Retrospective Notes for This Stack

Common issues to check in retro:
- SSG build time growing with content — consider ISR or edge SSR
- Tailwind purge missing classes — verify `content` array in config
- CF Pages build cache invalidation needed after dependency updates
