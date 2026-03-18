# Plano de Refatorização — Digital Enterprise OS
**Data:** 2026-03-18
**Status:** APROVADO — pronto para execução
**Baseado em:** Prompt de reestruturação do repositório agency-agents

---

## Resumo Executivo

Transformar o repositório de um "OS com submodules" para uma **Fábrica de Projetos autónoma** com:
- Agentes locais (sem submodule)
- Registry JSON em vez de submodules para projetos
- Template de projeto auto-suficiente (scripts incluídos)
- `ast-grep` MCP como ferramenta de análise estrutural de código
- Eliminação completa do sistema Viking/persist-context

---

## Decisões Tomadas

| # | Questão | Decisão |
|---|---|---|
| 1 | Submodule `portfolio-luiszmarques` | **REMOVER** — CEO segue pelo registry + path/GitHub |
| 2 | Alternativa ao code-review-graph | **Opção C — `ast-grep` MCP** |
| 3 | `viking-sync.js` não existe | Remover referências + `persist-context/`. Criar `.env.example` |
| 4 | `mcp-config.json` com token exposto | Adicionar ao `.gitignore`; mover tokens para `.env` |
| 5 | Template `.gitignore` | Criar em `projects/template/` |
| 6 | JSON Schema validation | Tentar GitHub Actions; se não for possível, fica para o utilizador |
| 7 | `agents-mcp-server.js` | **Atualizar** após copiar library — adicionar suporte a leitura de `library/` para list/get de personas |

---

## Passo 1 — Localização dos Agentes (Remoção do Submodule `upstream`)

### O que existe hoje
- `.claude/agents/upstream/` — submodule apontando para `Agents-Digital-Enterprise/agency-agents`
- Conteúdo: 15+ categorias, ~60+ ficheiros `.md` de personas

### O que fazer
1. Clonar `https://github.com/Agents-Digital-Enterprise/agency-agents.git` para `../temp-agency-agents`
2. `git rm -r .claude/agents/upstream` — remove do git index e `.gitmodules`
3. Limpar `.git/modules/.claude/agents/upstream/` (referência interna do git)
4. Copiar conteúdo (excluindo `.git/`) para `.claude/agents/library/`
5. **Atualizar `scripts/agents-mcp-server.js`:**
   - Adicionar suporte a `library/` no scan de personas — `list_personas` deve incluir ficheiros de `library/**/*.md`
   - `resolve_role` e `get_persona` podem aceitar um nome de ficheiro relativo a `library/` (ex: `engineering/engineering-backend-architect`)
   - Os overlays locais (`architect.md`, `team-lead.md`, etc.) continuam com prioridade sobre a library
6. Commit: `chore(agents): inline upstream library — remove submodule, update mcp-server`

---

## Passo 2 — Refatorização da Gestão de Projetos (JSON Registry)

### O que fazer
1. `git rm projects/portfolio-luiszmarques` — remove o submodule do index
2. Limpar `.git/modules/projects/portfolio-luiszmarques/`
3. Criar `projects-registry.json` na raiz:
```json
[
  {
    "name": "portfolio-luiszmarques",
    "url": "https://github.com/Agents-Digital-Enterprise/portfolio-luiszmarques",
    "stack": ["Astro", "TypeScript", "TailwindCSS", "Vue (islands)"],
    "workflows": ["ci-cd", "code-review"],
    "status": "active",
    "local_path": "../portfolio-luiszmarques"
  }
]
```
4. Atualizar `CLAUDE.md` — adicionar §11 Project Registry:
   > "Para gerir projetos, não usamos submodules. Registar nome, URL e workflows em `projects-registry.json`. Nunca usar `git submodule add` para projetos. O CEO acede aos projetos via path local ou GitHub."
5. Commit: `feat(registry): add projects-registry.json — replace project submodules`

---

## Passo 3 — Scripts Autónomos no Template

### O que fazer
1. Criar `projects/template/scripts/` e copiar (não mover):
   - `github-app-token.js`
   - `github-logger.js`
2. Criar `projects/template/.env.example`:
```
GITHUB_APP_ID=
GITHUB_INSTALLATION_ID=
GITHUB_PRIVATE_KEY_PATH=.secrets/private-key.pem
```
3. Atualizar `projects/template/PROJECT_CLAUDE_MD_TEMPLATE.md`:
   - Substituir paths absolutos por `./scripts/`
   - Remover secção Viking (ver Passo 5)
4. Atualizar `projects/template/config.json`:
   - Remover campos `viking_memory_key` e `filesystem_root`
   - Adicionar campo `registry_version: 1`
5. Criar `projects/template/.gitignore`:
```
node_modules/
.env
.env.*
!.env.example
.secrets/
dist/
.astro/
```
6. Commit: `feat(template): self-contained scripts, .env.example, .gitignore`

---

## Passo 4 — ast-grep MCP (Análise Estrutural)

### O que é
`ast-grep` (`@ast-grep/mcp`) — análise semântica de código via AST. Suporta JS/TS/Python/Go/Rust. MCP nativo, sem necessidade de servidor separado.

### O que fazer
1. Adicionar ao `mcp-config.json`:
```json
"ast-grep": {
  "command": "npx",
  "args": ["-y", "@ast-grep/mcp"],
  "env": {},
  "_note": "Structural code analysis via AST. Use for impact radius, symbol search, refactor preview. Avoids reading entire files."
}
```
2. Criar `.code-review-graphignore` na raiz e em `projects/template/`:
```
node_modules/**
.git/**
.secrets/**
dist/**
.astro/**
*.lock
```
3. Atualizar instrução nos agentes (CEO + overlays):
   > "Para contexto estrutural de código, usa o `ast-grep` MCP. Determina impacto antes de editar. Não leias ficheiros inteiros desnecessariamente."
4. Commit: `feat(mcp): add ast-grep for structural code analysis`

---

## Passo 5 — Remoção do Sistema Viking / persist-context

### O que existe
| Item | Localização | Ação |
|---|---|---|
| Pasta memória | `persist-context/` | Eliminar |
| Script sync | Não existe fisicamente | Só remover referências |
| Referências em docs | Ver lista abaixo | Substituir |

### Ficheiros com referências a substituir
- `CLAUDE.md` — §5 Memory System → substituir por referência ao Claude Code auto-memory
- `CLAUDE.md` — §3 Session Start → remover steps de viking-sync
- `AGENT_PROTOCOLS.md`
- `CONTRIBUTING_AGENTS.md`
- `README.md`
- `workflows/enterprise-development.md`
- `projects/README.md`
- `.claude/agents/ceo.md`
- `scripts/github-logger.js` (verificar referências)
- `projects/portfolio-luiszmarques/config.json` (no repo remoto — atualizar separadamente)

### Novo sistema de memória
Exclusivamente o **Claude Code auto-memory** em `/home/laga/.claude/projects/…/memory/` — já está configurado e a funcionar.

### Commit
`chore(memory): remove persist-context + all viking references`

---

## Passo 6 — Segurança — mcp-config.json e .gitignore

### Problema
`mcp-config.json` contém `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` em texto limpo. O ficheiro não está no `.gitignore` atual.

### O que fazer
1. Adicionar ao `.gitignore`:
```
.claude/mcp-config.json
.claude/settings.local.json
```
2. Criar `.claude/mcp-config.example.json` — versão sanitizada (tokens substituídos por `${ENV_VAR}`)
3. Mover os valores sensíveis do mcp-config para `.env` / `.secrets/.env` e referenciar via `${CLOUDFLARE_API_TOKEN}`
4. Verificar git history — se o token já foi commitado, revogar e regenerar no Cloudflare dashboard
5. Commit: `security: gitignore mcp-config, externalize sensitive tokens`

---

## Passo 7 — Atualização do Agente CEO

### Adicionar secção "Project Factory Workflow" ao `ceo.md`

```markdown
### Project Factory Workflow

Quando criar um novo projeto:
1. Ler o pedido — definir stack, agentes necessários, workflows
2. Criar o repo via GitHub MCP (`create_repository`)
3. Copiar `projects/template/` para o novo repo (push local ou via GitHub MCP)
4. Selecionar agentes de `.claude/agents/library/` — adaptar ao contexto do projeto
5. Push dos agentes adaptados para o repo em `.claude/agents/`
6. Registar em `projects-registry.json` (name, url, stack, workflows, status)
7. NUNCA usar `git submodule add` para projetos

Para aceder a um projeto existente:
- Consultar `projects-registry.json` → usar `local_path` ou `url`
- NÃO há submodule — aceder diretamente via path ou GitHub MCP

Para análise de código:
- Usar `ast-grep` MCP para análise estrutural (impacto, símbolos, refactor preview)
- Não ler ficheiros inteiros sem necessidade
```

---

## Passo 8 — JSON Schema + GitHub Actions (validação do registry)

### O que fazer
1. Criar `projects-registry.schema.json` na raiz
2. Tentar criar `.github/workflows/validate-registry.yml` — GitHub Actions que corre `ajv validate` em cada PR que toque em `projects-registry.json`
3. Se o workflow não for possível automaticamente, fica como tarefa para o utilizador

---

## Passo 9 — Limpeza

1. Apagar `../temp-agency-agents` (clone temporário)
2. Verificar que `.gitmodules` ficou vazio ou foi removido
3. Verificar que `.git/modules/` está limpo
4. `git status` final — confirmar estado limpo

---

## Sequência de Commits

```
1. chore(agents): inline upstream library — remove submodule, update mcp-server
2. feat(registry): add projects-registry.json — replace project submodules
3. feat(template): self-contained scripts, .env.example, .gitignore
4. feat(mcp): add ast-grep for structural code analysis
5. chore(memory): remove persist-context + all viking references
6. security: gitignore mcp-config, externalize sensitive tokens
7. feat(agents): update CEO with Project Factory Workflow
8. feat(registry): add JSON schema + GitHub Actions validation
9. chore: cleanup temp dirs, verify .gitmodules clean
```

---

## Ficheiros a Criar (novos)

| Ficheiro | Passo |
|---|---|
| `.claude/agents/library/**` | 1 |
| `projects-registry.json` | 2 |
| `projects-registry.schema.json` | 8 |
| `projects/template/scripts/github-app-token.js` | 3 |
| `projects/template/scripts/github-logger.js` | 3 |
| `projects/template/.env.example` | 3 |
| `projects/template/.gitignore` | 3 |
| `.code-review-graphignore` | 4 |
| `projects/template/.code-review-graphignore` | 4 |
| `.claude/mcp-config.example.json` | 6 |
| `.github/workflows/validate-registry.yml` | 8 |

## Ficheiros a Modificar

| Ficheiro | Passo |
|---|---|
| `.gitmodules` | 1, 2 |
| `.gitignore` | 6 |
| `scripts/agents-mcp-server.js` | 1 |
| `.claude/mcp-config.json` | 4, 6 |
| `projects/template/config.json` | 3 |
| `projects/template/PROJECT_CLAUDE_MD_TEMPLATE.md` | 3, 5 |
| `.claude/agents/ceo.md` | 7 |
| `CLAUDE.md` | 2, 5 |
| `AGENT_PROTOCOLS.md` | 5 |
| `CONTRIBUTING_AGENTS.md` | 5 |
| `README.md` | 5 |
| `workflows/enterprise-development.md` | 5 |
| `projects/README.md` | 5 |

## Ficheiros a Eliminar

| Ficheiro/Pasta | Passo |
|---|---|
| `.claude/agents/upstream/` (submodule) | 1 |
| `projects/portfolio-luiszmarques/` (submodule) | 2 |
| `persist-context/` | 5 |

---

## Log de Execução

> Esta secção será preenchida à medida que os passos forem executados.

| Passo | Status | Notas | Commit |
|---|---|---|---|
| 1 — Inline library + rm upstream submodule | ⏳ Pendente | | |
| 1b — Update agents-mcp-server.js | ⏳ Pendente | | |
| 2 — Remove portfolio submodule + registry JSON | ⏳ Pendente | | |
| 3 — Template scripts + .env.example + .gitignore | ⏳ Pendente | | |
| 4 — ast-grep MCP + .code-review-graphignore | ⏳ Pendente | | |
| 5 — Remove persist-context + viking refs | ⏳ Pendente | | |
| 6 — Security: gitignore mcp-config + env vars | ⏳ Pendente | | |
| 7 — CEO agent update | ⏳ Pendente | | |
| 8 — JSON Schema + GitHub Actions | ⏳ Pendente | | |
| 9 — Cleanup + final git status | ⏳ Pendente | | |
