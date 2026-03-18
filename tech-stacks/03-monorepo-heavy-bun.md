# Stack 03 — Monorepo Heavy (Bun + ElysiaJS + Nuxt + Supabase)
> Turborepo · Nuxt 3 Frontend · Bun/ElysiaJS Backend · Elysia Eden · Supabase · Zero cost

---

## Resumo

Stack completa para aplicações SaaS com lógica de negócio complexa. Frontend Nuxt e Backend Bun/ElysiaJS vivem num Turborepo — partilham tipos, configurações e utilitários. O Elysia Eden garante tipagem end-to-end sem código gerado (equivalente a tRPC mas mais simples). Supabase para DB e Auth. Deploy: Cloudflare Pages (frontend) + Cloudflare Workers (backend via adapter).

---

## Tech Stack Aprovada

| Camada | Tecnologia | Versão mínima |
|---|---|---|
| Monorepo | Turborepo | >= 2.x |
| Package Manager | Bun | >= 1.x |
| Frontend | Nuxt 3 + Vue 3 | >= 3.x |
| Estilos | Tailwind CSS | >= 3.x |
| Backend | ElysiaJS (Bun) | >= 1.x |
| Tipagem E2E | Elysia Eden Treaty | >= 1.x |
| Base de dados | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth | — |
| ORM | Drizzle ORM | >= 0.30 |
| Validação | TypeBox (integrado no Elysia) | — |
| Hosting Frontend | Cloudflare Pages | — |
| Hosting Backend | Cloudflare Workers | — |
| CI/CD | GitHub Actions + Turborepo cache | — |

---

## Regras de Alojamento — Custo 0€

- **Cloudflare Pages Free:** frontend Nuxt
- **Cloudflare Workers Free:** 100k req/dia — backend ElysiaJS (via `@elysiajs/cloudflare`)
- **Supabase Free:** 500MB DB, 50k MAU, 1GB Storage
- **Turborepo cache:** gratuito com Vercel Remote Cache (apenas para cache — não deploy)
- **Nunca usar:** VPS, Railway, Render, ou serviços pagos

---

## Estrutura de Pastas Obrigatória

```
<project-root>/                 # Turborepo root
├── CLAUDE.md
├── package.json                # workspaces: ["apps/*", "packages/*"]
├── turbo.json                  # Pipeline: build, dev, lint, test
├── bun.lockb
├── .env.example                # Vars partilhadas
│
├── apps/
│   ├── web/                    # Nuxt 3 app
│   │   ├── CLAUDE.md
│   │   ├── nuxt.config.ts      # preset: 'cloudflare-pages'
│   │   ├── package.json
│   │   ├── components/
│   │   ├── composables/
│   │   │   └── useApi.ts       # Elysia Eden Treaty client
│   │   ├── pages/
│   │   └── server/             # Nuxt server routes (mínimas — lógica vai para api/)
│   │
│   └── api/                    # ElysiaJS app
│       ├── CLAUDE.md
│       ├── package.json
│       ├── src/
│       │   ├── index.ts        # Entry point — monta todos os routers
│       │   ├── lib/
│       │   │   ├── supabase.ts # Supabase admin client
│       │   │   └── db.ts       # Drizzle ORM instance
│       │   ├── modules/        # Feature modules
│       │   │   └── [feature]/
│       │   │       ├── routes.ts    # Elysia router para a feature
│       │   │       ├── service.ts   # Lógica de negócio
│       │   │       └── schema.ts    # TypeBox schemas
│       │   └── types/
│       │       └── eden.ts     # Export do tipo Eden Treaty
│       └── wrangler.toml       # CF Workers config
│
├── packages/
│   ├── ui/                     # Componentes Vue partilhados
│   │   ├── package.json        # name: "@repo/ui"
│   │   └── components/
│   ├── types/                  # Tipos TypeScript partilhados
│   │   ├── package.json        # name: "@repo/types"
│   │   └── index.ts
│   └── config/                 # Configs partilhadas (eslint, ts, tailwind)
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── supabase/                   # Supabase CLI (raiz — partilhado)
│   ├── migrations/
│   └── config.toml
│
└── .github/workflows/
    ├── ci.yml                  # Turborepo lint + test
    ├── deploy-web.yml          # Nuxt → CF Pages
    ├── deploy-api.yml          # ElysiaJS → CF Workers
    └── supabase-migrate.yml
```

---

## Convenções Obrigatórias

### Tipagem E2E com Elysia Eden

```ts
// apps/api/src/index.ts
import { Elysia } from 'elysia'
const app = new Elysia()
  .get('/health', () => ({ ok: true }))
  // ... montar módulos
export type App = typeof app  // exportar o tipo

// apps/web/composables/useApi.ts
import { treaty } from '@elysiajs/eden'
import type { App } from '../../api/src/index'

const api = treaty<App>(process.env.API_URL!)
export const useApi = () => api
```

- **NUNCA** duplicar tipos entre front e back — usar o Eden Treaty
- **NUNCA** `fetch()` direto no frontend para a API interna — sempre via `useApi()`

### Módulos ElysiaJS

```ts
// apps/api/src/modules/users/routes.ts
import { Elysia, t } from 'elysia'
import { userService } from './service'

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/:id', ({ params }) => userService.getById(params.id), {
    params: t.Object({ id: t.String() })
  })
```

- Cada módulo tem: `routes.ts`, `service.ts`, `schema.ts`
- Sem lógica de DB em routes — sempre delegar para service
- TypeBox para validação — nunca Zod (conflito com ElysiaJS)

### Drizzle ORM

```ts
// apps/api/src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client)
```

- Schema Drizzle em `packages/types/schema.ts` — partilhado
- Migrations sempre via Supabase CLI — nunca `drizzle-kit push` em produção

### Turborepo

```json
// turbo.json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".nuxt/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": { "dependsOn": ["build"] }
  }
}
```

- `bun run dev` na raiz inicia web + api em paralelo
- `bun run build` respeita a ordem de dependências

---

## Quando usar esta stack

- SaaS com lógica de negócio complexa
- Múltiplos consumers da mesma API (web + mobile)
- Equipas que trabalham em módulos independentes
- Precisa de tipagem E2E rigorosa sem overhead de codegen

## Quando NÃO usar

- Projeto simples sem API própria → usar Stack 01
- Auth + CRUD básico → usar Stack 02
- Prazo muito curto (esta stack tem overhead de setup inicial)
