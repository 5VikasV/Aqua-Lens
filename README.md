# Aqua Lens v2

Aqua Lens is a temporary, evidence-first intelligence workspace for public GitHub repositories. It clones a repository into an isolated temporary directory, maps source imports and symbols, and provides architecture exploration, grounded questions, blast-radius analysis, and implementation planning.

## What it does

- Accepts public `https://github.com/owner/repository` URLs only.
- Performs a shallow clone, scans JavaScript/TypeScript, Python, Go, JSON, CSS, HTML, and Markdown source, and creates a dependency map.
- Retains the analyzed workspace only in server memory for the configured TTL (two hours by default).
- Grounds investigation answers in source snippets. Gemini is optional; deterministic retrieval remains available without it.
- Never writes to GitHub, opens pull requests, accepts private repositories, or exposes API keys to the browser.

## Local development

Prerequisites: Node.js 20+, npm, and Git.

```bash
npm install
cd backend && npm install && cd ..
npm run dev
```

Open `http://localhost:3000`. The root command starts the Vite UI and Express API. Docker, Redis, and a separate worker are not required locally.

For optional Gemini answers, create `backend/.env` from `backend/.env.example` if it does not already exist, then set `GEMINI_API_KEY`. Keep the real file private.

## Exploring a repository

The home page starts an analysis, then shows a dedicated progress view before opening the workspace. Overview highlights the language mix and dependency hotspots. Architecture opens a 3D graph containing every analyzed file, resolved internal import, and package import. Search for a node or focus a folder cluster, then click a file to inspect its imports and dependents, preview its source, or assess its impact. Folder, language, package, color, and label controls are visible above the graph; filters are off by default. The 3D view needs a browser with WebGL support. Investigation citations open the relevant source line. Impact and Change Plan views guide the next steps.

Run `npm test` for graph mapping tests and `npm run build` for the frontend production build.

## API

- `POST /api/analyses` — begin analysis and receive a job identifier.
- `GET /api/analyses/:id` — poll job state and final workspace summary.
- `GET /api/workspaces/:id` — retrieve a workspace summary.
- `POST /api/investigate` — ask a source-grounded question.
- `POST /api/impact` — calculate downstream dependents for a file.
- `POST /api/plans` — generate an evidence-backed change plan.

## Production notes

The baseline is designed for a frontend host plus a Node API host. Configure `FRONTEND_URL`, `WORKSPACE_TTL_SECONDS`, clone limits, and the Gemini key as host secrets. For high throughput, move job/workspace storage to Redis and run an independent worker; the local product deliberately remains dependency-free.
