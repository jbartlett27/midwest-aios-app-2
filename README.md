# Midwest AIOS

Live Midwest Educational Furnishings application, built by DYFRENT. Vite + React, Supabase data, Vercel hosting at midwestaios.com. Main auto-deploys to production; there is no staging environment.

## Start here

1. [AGENTS.md](AGENTS.md): shared rules for Codex, Claude and developers.
2. [Developer guide](docs/DEVELOPMENT.md): setup, architecture, edit and test loop.
3. [Parallel-session workflow](docs/PARALLEL-WORK.md): safe concurrent branches/worktrees and serialized integration.
4. [Release runbook](docs/RELEASING.md): deployment scope, exact revision verification and release evidence.
5. [Canonical handoff](docs/HANDOFF.md): business context, data model, past failures and historical backlog.
6. [Reliability tests](tests/reliability/README.md) and [build records](docs/builds/2026-10-30-invoice-reliability.md).

Claude starts at [CLAUDE.md](CLAUDE.md); Codex starts at [AGENTS.md](AGENTS.md). Both follow the same workflow. Never request or copy credentials, sign in to the app, send client email, or test against real provider/database writes as part of a build.

The root lockfile is currently out of sync with package.json. Use the documented install fallback and label its reproducibility limit; do not silently regenerate the lockfile during a feature task.

## Original scaffold reference

The original Vite template notes are retained below as scaffold history. They are not the project's current setup instructions.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
