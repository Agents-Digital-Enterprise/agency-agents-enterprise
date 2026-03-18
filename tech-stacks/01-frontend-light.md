# Stack 01 — Frontend Light
> Nuxt 3 / Vue 3 + Tailwind CSS · Cloudflare Pages · Zero cost

---

## Resumo

Stack minimalista para projetos puramente de frontend — portfolios, landing pages, sites de conteúdo, dashboards estáticos. Sem servidor, sem base de dados. Deploy direto para a edge da Cloudflare com SSG ou SSR via Cloudflare Pages.

---

## Tech Stack Aprovada

| Camada | Tecnologia | Versão mínima |
|---|---|---|
| Framework | Nuxt 3 | >= 3.x |
| UI | Vue 3 (Composition API) | >= 3.4 |
| Estilos | Tailwind CSS | >= 3.x |
| Componentes | shadcn-vue / Radix Vue | latest |
| Ícones | Lucide Vue / Iconify | latest |
| Hosting | Cloudflare Pages | — |
| CI/CD | GitHub Actions → CF Pages | — |
| Domínio | pages.dev (gratuito) | — |

---

## Regras de Alojamento — Custo 0€

- **Cloudflare Pages Free Tier:** 500 builds/mês, bandwidth ilimitado, SSL incluído
- **Deploy:** `nuxt generate` → output estático → Pages
- **SSR:** Possível via Cloudflare Pages Functions (Edge Runtime) — sem custo adicional no plano free
- **Domínio próprio:** Adicionar via Cloudflare DNS — gratuito se o domínio já estiver na Cloudflare
- **Nunca usar:** Vercel, Netlify, ou qualquer plataforma paga

---

## Estrutura de Pastas Obrigatória

```
<project-root>/
├── CLAUDE.md                  # Instruções do agente para este projeto
├── .env.example               # Vars públicas (NUXT_PUBLIC_*)
├── nuxt.config.ts             # Config Nuxt — preset: 'cloudflare-pages'
├── tailwind.config.ts
├── package.json
│
├── public/                    # Assets estáticos (favicon, og:image, robots.txt)
│
├── assets/
│   └── css/
│       └── main.css           # @tailwind base/components/utilities
│
├── components/
│   ├── ui/                    # Componentes base (shadcn-vue)
│   └── [feature]/             # Componentes por feature
│
├── composables/               # useX() — lógica reutilizável
├── layouts/                   # default.vue, blank.vue
├── pages/                     # File-based routing
│   └── index.vue
├── middleware/                 # Route guards (se necessário)
│
└── .github/
    └── workflows/
        └── deploy.yml         # Build + deploy para CF Pages
```

---

## Convenções Obrigatórias

- **Naming:** `PascalCase` para componentes, `kebab-case` para páginas e rotas
- **Composables:** sempre prefixo `use` — `useUser()`, `useTheme()`
- **Sem lógica de negócio em páginas** — delegar para composables
- **Tailwind only** — sem CSS customizado exceto em `assets/css/main.css`
- **Sem `<script setup lang="ts">` sem tipos** — todo o código Vue deve ter tipagem explícita

---

## nuxt.config.ts mínimo

```ts
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages'
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // NUXT_PUBLIC_* vars aqui
    }
  }
})
```

---

## Quando usar esta stack

- Portfolio pessoal / empresa
- Landing page / marketing site
- Blog estático (com Nuxt Content)
- Dashboard read-only (dados via API externa)

## Quando NÃO usar

- Precisa de autenticação → usar Stack 02
- Precisa de base de dados → usar Stack 02 ou 03
- API própria complexa → usar Stack 03
