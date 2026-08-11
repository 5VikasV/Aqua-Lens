# Aqua Lens — Codebase Intelligence & Dependency Graph Platform

> Deterministic AST dependency graph extraction, blast-radius analysis, grounded AI codebase investigation, and step-by-step refactoring plan generation for software architectures.

---

### 🚀 **Live Demo**: [https://aqua-lens-sooty.vercel.app/](https://aqua-lens-sooty.vercel.app/)
> **Backend Health Endpoint**: `https://aqua-lens-jrw0.onrender.com/api/health`

---

## Table of Contents
- [What Aqua Lens Does](#what-aqua-lens-does)
- [Current Features](#current-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Security](#security)
- [Live Showcase & Interface](#live-showcase--interface)
- [Local Development](#local-development)
- [Backend API](#backend-api)
- [Project Status](#project-status)

---

## What Aqua Lens Does

Aqua Lens turns complex software repositories into structured visual dependency graphs and AST-grounded insights. By analyzing source code import trees, function exports, and module relationships, Aqua Lens enables software engineers to:
1. **Explore Architecture Topology**: Inspect interactive dependency graphs, line count metrics, and package imports.
2. **Conduct AI Codebase Investigations**: Query codebase flow and symbol definitions in natural language using grounded AST context citations (`[ev-1]`).
3. **Perform Blast-Radius Impact Analysis**: Evaluate multi-level transitive dependencies and calculate structural risk (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) before modifying target files.
4. **Generate Step-by-Step Change Plans**: Produce ordered implementation steps with expandable diff previews, symbol validations, and verification scripts.

---

## Current Features

- **Shallow Repository Analysis**: Clone and analyze public Git repositories via `simple-git` with file-type metrics (LOC, size in bytes, language distribution).
- **AST Dependency Graph Extraction**: Parse CommonJS `require()` and ESM `import` statements to extract module relationships, handling extensionless imports and circular dependencies.
- **Interactive Architecture Topology View**: Render visual graph nodes with latency indicators, outgoing dependency counts, and symbol inspection panels.
- **AI Code Intelligence Assistant**: Perform grounded natural language searches powered by Google Gemini (`gemini-3.6-flash`). Uses stable evidence citations (`[ev-1]`) that link directly to highlighted lines in the Code Inspector.
- **Transitive Blast-Radius Analyzer**: Traverses module dependency graphs to compute shortest depth paths and quantify downstream blast radius when modifying source files.
- **Deterministic Change Plan Generator**: Generates ordered refactoring steps with line-level diff previews, AST symbol verification, missing file integrity checks, and clipboard export guides.
- **Deterministic Fallback Engine**: Ensures 100% feature availability. If AI API limits or network disruptions occur, Aqua Lens automatically generates deterministic evidence-based answers and execution steps from repository AST context.

---

## Architecture

Aqua Lens uses a decoupled client-server architecture:

```text
┌────────────────────────────────────────────────────────┐
│              Frontend (Vite + React + TS)               │
│            Deployed on Vercel SPA Hosting              │
└───────────────────────────┬────────────────────────────┘
                            │  HTTP / REST API (JSON)
┌───────────────────────────▼────────────────────────────┐
│              Backend (Express + Node + TS)              │
│               Deployed on Render Engine                │
├─────────────────┬───────────────────┬──────────────────┤
│ File Scanner &  │ Dependency Graph  │  Code Search &   │
│ Git Cloner      │ & Blast Radius    │  Google Gemini   │
└─────────────────┴───────────────────┴──────────────────┘
```

- **Frontend**: Single-page application built with React 18, Vite, and Tailwind CSS. Implements a dark Stitch / AI Studio developer-tool aesthetic with responsive split panels.
- **Backend**: Express TypeScript engine executing shallow Git clones, file parsing, AST dependency extraction, code retrieval, and Google Gemini (`@google/genai`) integration.

---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript (`~5.8.2`)
- **Build Tool**: Vite (`^6.4.3`)
- **Styling**: Tailwind CSS (`@theme`), Material Symbols Icons
- **Deployment**: Vercel

### Backend
- **Runtime**: Node.js + Express (`^4.21.2`) (TypeScript)
- **AI Reasoning**: `@google/genai` (Google GenAI SDK — `gemini-3.6-flash`)
- **Git Operations**: `simple-git` (`^3.27.0`)
- **Testing**: Node.js Native Test Runner (`tsx --test`)
- **Deployment**: Render

---

## Security

- **Strict Secret Isolation**: `GEMINI_API_KEY` is kept strictly backend-only on Render. It is never exposed to the frontend, VITE environment variables, or client JavaScript bundles.
- **Prompt Injection Defense**: Untrusted repository source code snippets passed to LLM reasoning are wrapped inside explicit `<untrusted_code_context file="...">` tags with strict system boundary rules.
- **Environment Safety**: `.env` files are excluded from version control via `.gitignore` (`*.env*`), while `.env.example` provides safe templates.

---

## Live Showcase & Interface

> Access the live application at **[https://aqua-lens-sooty.vercel.app/](https://aqua-lens-sooty.vercel.app/)**

### 1. Architecture Topology
Inspect graph nodes, module line counts, import specifiers, and outgoing dependency relationships.

### 2. AI Codebase Investigation & Code Inspector
Query codebase flow and AST symbol references. Interactive evidence badges (`[ev-1]`) switch the Code Inspector tab and highlight target lines.

### 3. Impact Analysis & Blast Radius
Evaluate direct and transitive downstream dependents to quantify refactoring risk (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

### 4. Step-by-Step Change Plans
View ordered execution steps with inline git diff previews, symbol verification status, and exportable guides.

---

## Local Development

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Run Frontend Locally

```bash
# Install root dependencies
npm install

# Start Vite dev server
npm run dev
```
- **Frontend URL**: `http://localhost:3000`

### 2. Run Backend Locally

```bash
# Navigate to backend folder
cd backend

# Install backend dependencies
npm install

# Configure environment variables (Optional for local Gemini testing)
cp .env.example .env

# Start Express dev server
npm run dev
```
- **Backend API**: `http://localhost:5000`

### 3. Run Verification & Tests

```bash
# Frontend Typecheck & Build
npx tsc --noEmit
npm run build

# Backend Typecheck, Build & Unit Tests
cd backend
npm run check
npm run build
npm test
```

---

## Backend API

### 1. Health Check
`GET /api/health`

**Response (`200 OK`)**:
```json
{
  "status": "ok",
  "service": "aqua-lens-backend",
  "version": "1.0.0",
  "timestamp": "2026-08-11T13:45:00.000Z",
  "uptimeSeconds": 42
}
```

### 2. Analyze Repository
`POST /api/analyze`

**Request Body**:
```json
{
  "repositoryUrl": "https://github.com/expressjs/express"
}
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "workspaceId": "expressjs/express",
  "repository": {
    "url": "https://github.com/expressjs/express",
    "owner": "expressjs",
    "name": "express",
    "clonedAt": "2026-08-11T13:45:00.000Z"
  },
  "languages": [
    { "language": "JavaScript", "fileCount": 42, "lineCount": 4500, "percentage": 100 }
  ],
  "fileCount": 42,
  "dependencyCount": 85,
  "files": [
    { "path": "lib/express.js", "extension": ".js", "language": "JavaScript", "sizeBytes": 3400, "lineCount": 120, "importsCount": 4, "exportsCount": 2 }
  ],
  "dependencyGraph": {
    "nodes": [{ "id": "lib/express.js", "label": "express.js", "language": "JavaScript", "lineCount": 120, "sizeBytes": 3400 }],
    "edges": [{ "source": "lib/express.js", "target": "lib/application.js", "importSpecifier": "./application", "type": "relative" }]
  },
  "packageDependencies": {
    "dependencies": { "accepts": "~1.3.8" },
    "devDependencies": { "mocha": "10.2.0" }
  },
  "metrics": {
    "totalFilesScanned": 42,
    "totalFilesIgnored": 5,
    "totalLinesOfCode": 4500,
    "totalSizeBytes": 120000,
    "totalDependencies": 85,
    "analysisTimeMs": 1420
  }
}
```

### 3. Impact Analysis (Blast Radius)
`POST /api/analyze/impact`

**Request Body**:
```json
{
  "targetPath": "lib/express.js",
  "repositoryUrl": "https://github.com/expressjs/express"
}
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "target": {
    "path": "lib/express.js",
    "language": "JavaScript",
    "lineCount": 120,
    "sizeBytes": 3400
  },
  "directDependents": [
    { "path": "index.js", "importSpecifier": "./lib/express", "depth": 1 }
  ],
  "indirectDependents": [],
  "affectedFiles": [
    { "path": "index.js", "depth": 1, "isDirect": true, "language": "JavaScript", "lineCount": 11 }
  ],
  "riskLevel": "LOW",
  "statistics": { "directCount": 1, "indirectCount": 0, "totalAffected": 1, "maxDepth": 1 }
}
```

### 4. AI Codebase Investigation
`POST /api/investigate`

**Request Body**:
```json
{
  "workspaceId": "expressjs/express",
  "question": "How does Express create an application?"
}
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "answer": "Express creates an application through the `createApplication` function exported in `lib/express.js` [ev-1].",
  "confidence": "HIGH",
  "claims": [
    { "text": "Creates application instance via mixin prototype", "evidenceIds": ["ev-1"] }
  ],
  "evidence": [
    { "id": "ev-1", "filePath": "lib/express.js", "matchedSymbols": ["function createApplication"], "lineRanges": [{ "start": 15, "end": 45 }], "snippet": "function createApplication() { ... }", "relevanceScore": 120 }
  ],
  "referencedFiles": ["lib/express.js"],
  "retrievedContextMetadata": {
    "totalFilesRetrieved": 1,
    "totalLinesRetrieved": 30,
    "totalCharactersRetrieved": 850,
    "queryTermsUsed": ["create", "application"]
  }
}
```

### 5. Generate Change Plan
`POST /api/plan/generate`

**Request Body**:
```json
{
  "workspaceId": "expressjs/express",
  "changeRequest": "Add CORS middleware configuration options to the main application"
}
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "planId": "PLAN-4821",
  "title": "Plan: Add CORS middleware configuration options",
  "summary": "Step-by-step refactoring plan to introduce CORS configuration.",
  "riskLevel": "MEDIUM",
  "targetFiles": ["lib/express.js"],
  "affectedFiles": ["index.js"],
  "steps": [
    {
      "stepNumber": 1,
      "type": "Modify",
      "filePath": "lib/express.js",
      "badgeText": "Refactor Step",
      "isWarning": false,
      "linesCount": 10,
      "description": "Export cors middleware options helper",
      "diffHeader": "@@ -1,5 +1,10 @@",
      "diffLines": [{ "type": "add", "content": "+ exports.cors = require('./middleware/cors');" }],
      "symbolsInvolved": ["createApplication"],
      "prerequisiteSteps": []
    }
  ],
  "verificationSteps": ["npm test"],
  "evidenceReferences": [],
  "validation": { "allFilesExist": true, "invalidFiles": [], "validatedSymbolsCount": 4, "invalidSymbols": [] },
  "warnings": []
}
```

---

## Project Status

- **Status**: **Active & Production Deployed**
- **Frontend App**: [https://aqua-lens-sooty.vercel.app/](https://aqua-lens-sooty.vercel.app/)
- **Backend API**: [https://aqua-lens-jrw0.onrender.com](https://aqua-lens-jrw0.onrender.com)
- **Test Coverage**: 63 passing unit tests across 7 test suites.

