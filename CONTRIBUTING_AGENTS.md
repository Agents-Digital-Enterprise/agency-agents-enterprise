# CONTRIBUTING_AGENTS.md — Clean Code Standards for All Agents

> These rules apply to every agent in every role. They are non-negotiable.

---

## 1. Language & Runtime

- **All scripts:** Node.js ES Modules only
- **Runtime:** Node.js >= 18 (built-in `fetch`, `crypto`, `fs/promises`)
- **No external runtime dependencies** for tooling scripts (use built-ins)
- **Application code** may use `npm` packages — always pin versions in `package.json`
- No bash scripts. If shell execution is needed, use `node:child_process`

---

## 2. File Structure

```
agency-agents/
├── CLAUDE.md                   # Agent operating instructions
├── AGENT_PROTOCOLS.md          # Choreography rules
├── CONTRIBUTING_AGENTS.md      # This file
├── package.json                # type: module, node >= 18
├── .gitignore                  # Excludes .secrets/, .env
├── .secrets/                   # NEVER committed
│   ├── github-app.json         # App ID + key path
│   ├── .env                    # Generated tokens
│   └── mcp-servers.json        # MCP connection config
├── .claude/
│   ├── mcp-config.json         # Full MCP server registry
│   └── skills/                 # Agent skill scripts
│       └── viking-sync.js      # OpenViking sync utility
├── scripts/                    # Automation & tooling (all .js)
│   ├── github-app-token.js     # Token generator
│   └── github-logger.js        # GitHub comment formatter
├── src/                        # Application source
└── tests/                      # All tests (written before code)
```

---

## 3. Code Quality Rules

### 3.1 Functions
- Maximum 20 lines per function — extract if longer
- Single responsibility: one function does one thing
- Pure functions preferred — minimise side effects
- Name functions as verbs: `fetchToken()`, `buildComment()`, `validatePayload()`

### 3.2 Variables
- `const` by default, `let` only when mutation is required, never `var`
- Descriptive names — no single-letter variables except loop counters
- No magic numbers — use named constants

### 3.3 Error Handling
- All `async` functions must have try/catch or `.catch()`
- Errors logged to `stderr` with context: `console.error('[!] context: message')`
- Never swallow errors silently

### 3.4 Comments
- Write self-documenting code first
- Comments explain **why**, not **what**
- JSDoc for all exported functions

---

## 4. Testing Standards

### 4.1 TDD is Mandatory
1. Write the test before the code
2. Test must fail first (prove it tests the right thing)
3. Write minimum code to pass
4. Refactor without breaking tests

### 4.2 Test File Naming
```
src/auth/token.js       → tests/auth/token.test.js
scripts/logger.js       → tests/scripts/logger.test.js
```

### 4.3 Test Structure (Arrange-Act-Assert)
```js
describe('buildJWT', () => {
  it('should include iss claim with app ID', () => {
    // Arrange
    const appId = '123456';
    const key   = generateTestKey();

    // Act
    const jwt = buildJWT(appId, key);
    const payload = decodeJWT(jwt);

    // Assert
    assert.equal(payload.iss, appId);
  });
});
```

### 4.4 Coverage
- Minimum 80% line coverage for `src/`
- Scripts in `scripts/` must have at minimum happy-path + error-path tests

---

## 5. Git Discipline

- **One logical change per commit** — no "fix everything" commits
- **Commit message format** (from AGENT_PROTOCOLS.md §3.3)
- **Branch naming:** `feat/issue-<number>-short-description` or `fix/issue-<number>-short-description`
- **PRs required** for all changes to `main` — no direct pushes
- **PR descriptions** must reference the issue: `Closes #<number>`

---

## 6. Security Rules

- Secrets live in `.secrets/` only — never hardcoded
- `process.env` access only at top-level config loading, not deep in business logic
- No `eval()`, no `new Function()`
- Validate all external inputs (API responses, user args) before use
- Dependencies: audit with `npm audit` before merging any `package.json` change

---

## 7. Agent-Specific Rules

- Always declare your role before acting (see AGENT_PROTOCOLS.md §1)
- Never modify files outside your role's scope
- Always leave the codebase cleaner than you found it — but only touch what your task requires
- When in doubt, open an Issue rather than making assumptions
