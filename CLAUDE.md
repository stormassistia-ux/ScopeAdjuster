# ScopeAdjuster — Claude Code Context

## What This App Does

ScopeAdjuster is an **AI-powered insurance estimating assistant** for property adjusters and claims professionals. Adjusters upload damage evidence (photos, PDFs, scope sheets) and the app uses Google Gemini to generate professional repair scopes with line items cross-referenced to Xactimate, Symbility/CoreLogic, and the IRC (International Residential Code).

**Target user**: Insurance adjusters, public adjusters, and forensic estimators handling property damage claims (water, fire, structural, mold, cosmetic).

---

## App Modes

| Mode | Purpose |
|------|---------|
| Dashboard | Overview and quick-access hub |
| Investigation | Upload evidence + synopsis → AI generates scoped line items |
| Comparison | Upload 2 estimates (any platform) → AI variance analysis |
| Reverse Engineer | Translate estimate from one platform to another (e.g., Xactimate → Symbility) |
| Compliance Audit | AI audits an estimate for missed items, overlaps, IRC violations |
| Reports Vault | View and restore saved reports |
| Policy Library | Carrier guidelines storage with market intel/price trends |
| Settings | Theme, preferences, API config |

---

## Tech Stack

### Frontend (`/` root)
- **React 19** + TypeScript via **Vite 6**
- **lucide-react** for icons
- **@google/genai** — Gemini SDK called directly from browser
- **firebase** (v12) — Auth (Google Sign-In) + Firestore (user profile doc)
- **@supabase/supabase-js** — file storage uploads to Supabase Storage bucket `estimates`
- Entry: `index.tsx` → `App.tsx` (single 163KB file containing all UI components)
- Runs on port **3000** in dev

### Backend (`/backend`)
- **Express 5** Node.js API, TypeScript, runs on port **3001** in dev
- **Prisma 7** ORM → **PostgreSQL** (Supabase hosted)
- **firebase-admin** — verifies Firebase JWTs on every protected route
- **@google/genai** — also present (not yet wired into routes, currently only in worker stubs)

---

## File Structure (non-node_modules)

```
ScopeAdjuster/
├── App.tsx                         # ALL frontend UI (single file, ~4400 lines)
├── index.tsx                       # React entry point
├── index.html                      # HTML shell
├── types.ts                        # Shared TypeScript types (frontend)
├── vite.config.ts                  # Vite config — inlines GEMINI_API_KEY at build time
├── tsconfig.json                   # Frontend TypeScript config
├── package.json                    # Frontend deps (React, Firebase, Supabase, Gemini)
├── .env.local                      # GEMINI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── services/
│   └── geminiService.ts            # Frontend Gemini AI service (7 exported functions)
│
├── src/
│   ├── firebase.ts                 # Firebase app init (auth + Firestore)
│   ├── supabaseClient.ts           # Supabase init + uploadEstimateFile()
│   └── services/
│       └── apiService.ts           # Fetch calls to Express backend (reports & baselines)
│
├── firebase-applet-config.json     # Firebase project config (projectId, apiKey, etc.)
├── firebase-blueprint.json         # Firestore data model documentation
├── firestore.rules                 # Firestore security rules
├── metadata.json                   # App name & camera/microphone permission requests
│
└── backend/
    ├── src/
    │   ├── server.ts               # Express app — all REST API routes
    │   ├── firebaseAdmin.ts        # Firebase Admin SDK init
    │   ├── diffEngine.ts           # Deterministic line-item diff algorithm
    │   ├── worker.ts               # Stubbed background job worker (not yet functional)
    │   ├── testWorkerQueue.ts      # Dev-only test harness for worker
    │   ├── types.ts                # Backend type defs (mirrors root types.ts)
    │   ├── middleware/
    │   │   └── auth.ts             # requireAuth middleware — verifies Firebase JWT
    │   └── services/
    │       └── geminiService.ts    # Backend copy of Gemini service (not yet used by routes)
    ├── prisma/
    │   └── schema.prisma           # Full data model (see Database Schema below)
    ├── prisma.config.ts            # Prisma config — reads DATABASE_URL from .env
    ├── tsconfig.json               # Backend TypeScript config (module: nodenext)
    ├── package.json                # Backend deps
    └── .env                        # DATABASE_URL (postgres connection string)
```

---

## API Routes (Express Backend)

All routes require `Authorization: Bearer <firebase-jwt>` except `/health`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (public) |
| GET | `/api/reports` | Fetch all reports for authenticated user |
| POST | `/api/reports` | Create a new saved report |
| DELETE | `/api/reports/:id` | Delete a report (owner-only) |
| GET | `/api/baselines` | Fetch all master baselines for authenticated user |
| POST | `/api/baselines` | Upsert a master baseline |
| DELETE | `/api/baselines/:id` | Delete a baseline (owner-only) |

---

## Gemini AI Functions (`services/geminiService.ts`)

All called directly from the browser. Models used:

| Function | Model | Purpose |
|----------|-------|---------|
| `fetchCarrierGuidelines` | gemini-3-flash-preview | Web-grounded carrier guideline lookup |
| `analyzeDamage` | gemini-3.1-pro-preview | Multimodal damage analysis → line items |
| `compareEstimates` | gemini-3-pro-preview | Side-by-side estimate comparison |
| `reverseEngineerEstimate` | gemini-3.1-pro-preview | Platform-to-platform translation |
| `parseBaselineFile` | gemini-3.1-pro-preview | Extract baseline line items from estimate |
| `searchMarketRates` | gemini-3-flash-preview | Web-grounded price list version lookup |
| `suggestBaselineAdjustments` | gemini-3-flash-preview | Market-driven price suggestions |
| `auditEstimate` | gemini-3.1-pro-preview | Compliance audit (missed/overlapping/IRC) |

---

## Database Schema (Prisma / PostgreSQL on Supabase)

### Currently used by backend API:
- `SavedReport` — stores complete UI state blob per report
- `MasterBaseline` — gold-standard estimate line items for comparison reference

### Future/planned (schema exists, routes not yet built):
- `Organization` — multi-tenant org container
- `User` — org-linked user records
- `Membership` — user roles per org (admin, adjuster, reviewer, read-only)
- `Project` — claim-level container (claim number, loss date, state, carrier)
- `Estimate` — individual estimate with source system and version
- `EstimateFile` — raw uploaded file with SHA256 and ingest status
- `EstimateLineItem` — normalized canonical line item rows
- `ComparisonRun` — comparison job with status
- `ComparisonDiff` — diff results (added/removed/changed) with severity
- `ReportArtifact` — generated report files (PDF/HTML/JSON)
- `AuditLog` — immutable event log for compliance

---

## Authentication Flow

1. User clicks "Sign in with Google" → Firebase `signInWithPopup`
2. Firebase issues JWT (ID token)
3. Frontend stores user in React state via `onAuthStateChanged`
4. For backend calls: `user.getIdToken()` → attached as `Authorization: Bearer <token>`
5. Backend `requireAuth` middleware calls `admin.auth().verifyIdToken(token)` → decodes `uid`
6. All DB queries filter by `userId` from decoded token

---

## Known Issues / Pre-Production Blockers

### Critical
1. **Gemini API key is public** — `GEMINI_API_KEY` is inlined into the Vite bundle via `define` in vite.config.ts, readable in browser DevTools. Must move AI calls to the backend.
2. **API URL hardcoded** — `apiService.ts` has `http://localhost:3001/api` hardcoded. Needs `VITE_API_BASE_URL` env var.
3. **CORS is open** — `app.use(cors())` in server.ts has no origin restriction. Needs production domain whitelist.
4. **No git repository** — project has no version control initialized.
5. **Duplicate geminiService** — `services/geminiService.ts` (used) and `backend/src/services/geminiService.ts` (unused) are identical. AI routes need to be moved to the backend.

### High Priority
6. **Prisma DATABASE_URL mismatch** — `backend/.env` contains both a real Supabase postgres URL AND a local `prisma+postgres://localhost:51213` URL; the Prisma config reads the local one. Production needs the real postgres URL set correctly.
7. **No rate limiting** — backend has no rate limiting on expensive AI-proxy or DB routes.
8. **Firebase project is AI Studio project** — `gen-lang-client-0600672518` was created by AI Studio, not a dedicated production Firebase project.
9. **Sensitive credentials in repo** — `backend/.env` with a real postgres password and `firebase-applet-config.json` with API keys will be committed if git is initialized without proper `.gitignore` attention.
10. **Worker is fully stubbed** — `worker.ts` has no real queue, no real ingestion, no comparison pipeline. Only `diffEngine.ts` is functional.

### Medium Priority
11. **App.tsx is one 4400-line file** — needs to be split into components for maintainability.
12. **No frontend error boundary** — unhandled errors will crash the whole app.
13. **base64 evidence stored in saved reports state** — large images in `state: Json` blob will bloat the database quickly. Images should reference `storageUrl` only.
14. **No input validation on backend routes** — only auth is checked; body fields are not validated.
15. **Gemini model names** — `gemini-3-flash-preview`, `gemini-3-pro-preview`, `gemini-3.1-pro-preview` need verification against current Google AI model availability.

---

## Environment Variables

### Frontend (`.env.local`)
```
GEMINI_API_KEY=          # Google AI Studio API key
VITE_SUPABASE_URL=       # Supabase project URL
VITE_SUPABASE_ANON_KEY=  # Supabase publishable anon key
```

### Backend (`backend/.env`)
```
DATABASE_URL=            # PostgreSQL connection string (Supabase)
PORT=                    # (optional) defaults to 3001
FIREBASE_PROJECT_ID=     # Firebase project ID (defaults to stormassistia-2a2b7 in code)
GEMINI_API_KEY=          # Needed when AI calls are moved to backend
```

---

## Dev Commands

```bash
# Frontend (port 3000)
npm run dev

# Backend (port 3001)
cd backend && npm run dev

# Backend build
cd backend && npm run build

# Type check frontend
npm run lint
```

---

## Production Deployment Plan Reference

A PDF named `Cost-Effective Production Deployment Plan for an Estimating-Software Comparison and Reporting UI.pdf` exists in the project root — consult it for the architectural deployment target decisions.
