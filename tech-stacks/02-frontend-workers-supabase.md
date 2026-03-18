# Stack 02 — Frontend + Workers + Supabase
> Nuxt 3 + Nitro → Cloudflare Workers · Supabase DB/Auth · Zero cost

---

## Resumo

Stack para aplicações que precisam de lógica de servidor leve (autenticação, validação, chamadas a APIs privadas) sem a complexidade de um backend dedicado. O Nuxt Nitro gera Cloudflare Workers nativamente. O Supabase fornece PostgreSQL gerido, autenticação e storage — tudo gratuito no plano free.

---

## Tech Stack Aprovada

| Camada | Tecnologia | Versão mínima |
|---|---|---|
| Framework | Nuxt 3 | >= 3.x |
| UI | Vue 3 (Composition API) | >= 3.4 |
| Estilos | Tailwind CSS | >= 3.x |
| Runtime de servidor | Nitro → Cloudflare Workers | — |
| Base de dados | Supabase (PostgreSQL) | — |
| Autenticação | Supabase Auth | — |
| Storage | Supabase Storage | — |
| ORM / Query | Supabase JS Client v2 | >= 2.x |
| Hosting Frontend | Cloudflare Pages | — |
| Hosting API | Cloudflare Workers (via Nitro) | — |
| CI/CD | GitHub Actions | — |

---

## Regras de Alojamento — Custo 0€

- **Cloudflare Workers Free:** 100k requests/dia, sem cold starts, edge global
- **Cloudflare Pages Free:** builds ilimitados para o frontend
- **Supabase Free Tier:** 500MB DB, 1GB Storage, 50k MAU Auth, 5GB bandwidth
- **Nunca usar:** AWS Lambda, Railway, Render, ou qualquer serviço pago
- **Limites críticos Supabase free:** projeto pausa após 7 dias de inatividade — avisar o cliente

---

## Estrutura de Pastas Obrigatória

```
<project-root>/
├── CLAUDE.md
├── .env.example               # SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
├── nuxt.config.ts             # preset: 'cloudflare'
├── tailwind.config.ts
├── package.json
│
├── public/
├── assets/css/main.css
│
├── components/
│   ├── ui/                    # shadcn-vue
│   └── [feature]/
│
├── composables/
│   ├── useSupabase.ts         # cliente Supabase singleton
│   └── useAuth.ts             # wraps Supabase Auth
│
├── middleware/
│   └── auth.ts                # Protege rotas autenticadas
│
├── pages/
│   ├── index.vue
│   ├── auth/
│   │   ├── login.vue
│   │   └── callback.vue       # OAuth redirect handler
│   └── dashboard/
│       └── index.vue
│
├── server/                    # Nitro → compila para Cloudflare Workers
│   ├── api/                   # Endpoints: server/api/[route].ts
│   │   └── user/
│   │       └── profile.get.ts # GET /api/user/profile
│   ├── middleware/
│   │   └── auth.ts            # Validação JWT server-side
│   └── utils/
│       └── supabase.ts        # Supabase admin client (SERVICE_KEY)
│
├── supabase/                  # Supabase CLI migrations
│   ├── migrations/
│   │   └── 0001_init.sql
│   └── config.toml
│
└── .github/workflows/
    ├── deploy.yml
    └── supabase-migrate.yml   # Aplica migrations em CI
```

---

## Convenções Obrigatórias

- **Nunca expor `SUPABASE_SERVICE_KEY` no cliente** — apenas em `server/`
- **`SUPABASE_ANON_KEY`** é segura para o cliente (Row Level Security obrigatória)
- **RLS sempre ativa** em todas as tabelas Supabase — nunca desativar
- **Server routes naming:** `[name].[method].ts` — ex: `profile.get.ts`, `user.post.ts`
- **Auth flow:** sempre via Supabase Auth — nunca implementar JWT próprio
- **Composables:** lógica de cliente; `server/utils/`: lógica de servidor

---

## nuxt.config.ts mínimo

```ts
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare'
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: true,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/callback'
    }
  },
  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY
    }
  }
})
```

---

## Quando usar esta stack

- SaaS simples com autenticação
- Dashboard com dados do utilizador
- API leve (< 50 endpoints)
- Apps com file upload (Supabase Storage)

## Quando NÃO usar

- Lógica de servidor complexa (WebSockets, queues, cron jobs pesados) → usar Stack 03
- Múltiplos serviços independentes → usar Stack 03
- Precisa de TypeScript end-to-end tipado entre front e back → usar Stack 03
