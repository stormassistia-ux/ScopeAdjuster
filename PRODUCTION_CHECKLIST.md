# ScopeAdjuster — Production Integration Checklist

Ordered by priority. Complete Phase 1 before deploying anything to a live URL.

---

## Phase 1 — Security & Foundations (Must fix before any public access)

### 1.1 Initialize Git + Protect Secrets
- [ ] Run `git init` at the project root
- [ ] Ensure `.gitignore` covers:
  - `backend/.env` (contains real postgres password)
  - `.env.local` (contains Gemini + Supabase keys)
  - `firebase-applet-config.json` (contains Firebase API key)
- [ ] Move `firebase-applet-config.json` values to environment variables; load at runtime via `import.meta.env.VITE_FIREBASE_*`
- [ ] Delete the two placeholder files named `[full_path_of_file_1]` and `[full_path_of_file_2]`
- [ ] Make first commit

### 1.2 Move Gemini AI Calls Off the Browser
**Problem**: `vite.config.ts` inlines `GEMINI_API_KEY` into the JS bundle via `define`. Anyone can read it in DevTools.

**Fix**:
- [ ] Add backend API routes that proxy all 8 Gemini functions (`/api/ai/analyze`, `/api/ai/compare`, etc.)
- [ ] The backend already has `backend/src/services/geminiService.ts` — wire it into `server.ts` routes
- [ ] Remove the `GEMINI_API_KEY` from `.env.local` and from `vite.config.ts define`
- [ ] Add `GEMINI_API_KEY` to `backend/.env`
- [ ] Update `src/services/apiService.ts` to call the new backend routes instead of importing geminiService directly
- [ ] Delete root-level `services/geminiService.ts` once migration is complete

### 1.3 Fix Backend API URL
- [ ] In `src/services/apiService.ts` line 4, replace hardcoded `http://localhost:3001/api` with `import.meta.env.VITE_API_BASE_URL`
- [ ] Add `VITE_API_BASE_URL=http://localhost:3001` to `.env.local` for development
- [ ] Set `VITE_API_BASE_URL=https://your-production-domain.com` in your production build environment

### 1.4 Restrict CORS
- [ ] In `backend/src/server.ts`, replace `app.use(cors())` with:
  ```ts
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }));
  ```
- [ ] Add `ALLOWED_ORIGINS=https://yourdomain.com` to `backend/.env` for production

### 1.5 Fix Prisma DATABASE_URL
- [ ] In `backend/.env`, ensure `DATABASE_URL` is set to the Supabase postgres connection string:
  `postgresql://postgres:<password>@db.sjxdaunggnvexhguuyvg.supabase.co:5432/postgres`
- [ ] Remove the local `prisma+postgres://localhost:51213` URL from `backend/.env`
- [ ] Run `cd backend && npx prisma migrate deploy` to apply the schema to the live database
- [ ] Verify with `npx prisma studio` that tables exist and are accessible

---

## Phase 2 — Production Firebase Project

### 2.1 Create a Dedicated Firebase Project
- [ ] Go to console.firebase.google.com → Create new project named `scopeadjuster-prod`
- [ ] Enable Google Authentication (Authentication → Sign-in method → Google)
- [ ] Enable Firestore (for user profile docs if still needed)
- [ ] Copy new project credentials to `firebase-applet-config.json` (or env vars per 1.1)
- [ ] Update `backend/src/firebaseAdmin.ts` `FIREBASE_PROJECT_ID` env var to the new project ID
- [ ] Deploy `firestore.rules` to the new project: `firebase deploy --only firestore:rules`

### 2.2 Firestore vs. Postgres Decision
Currently the app uses both Firestore (user profile docs, legacy) and Postgres (reports, baselines via backend).
- [ ] Decide: are you keeping Firestore for user profiles or migrating everything to Postgres?
- [ ] If migrating: add `User` table routes to the backend and remove Firestore imports from `App.tsx`
- [ ] If keeping: document which data lives where to avoid confusion

---

## Phase 3 — Backend Hardening

### 3.1 Rate Limiting
- [ ] `npm install express-rate-limit` in backend
- [ ] Add global rate limit (e.g., 100 req/15min per IP) and stricter limit on AI proxy routes (e.g., 20 req/min)

### 3.2 Input Validation
- [ ] `npm install zod` in backend
- [ ] Add Zod schema validation to all POST route bodies (reports, baselines, AI proxy routes)
- [ ] Validate `type` field in reports is one of the allowed enum values
- [ ] Cap `state` blob size — reject payloads over a reasonable limit (e.g., 5MB)

### 3.3 Fix Large State Blobs in SavedReports
- [ ] In `App.tsx`, strip `base64` image data from evidence items before saving a report — keep only `storageUrl`, `fileName`, `mimeType`, `label`, `detectedDamage`
- [ ] Add a migration or cleanup script for any existing bloated saved reports

### 3.4 Remove Dev Artifacts
- [ ] Remove or move `backend/src/testWorkerQueue.ts` out of the src tree before production build
- [ ] Add `testWorkerQueue.ts` to `.gitignore` or a `scripts/` folder

### 3.5 Structured Logging
- [ ] `npm install pino pino-http` in backend
- [ ] Replace `console.log` / `console.error` with Pino logger
- [ ] Log request method, path, user uid, and response status on every request

---

## Phase 4 — Frontend Hardening

### 4.1 Error Boundary
- [ ] Create `src/components/ErrorBoundary.tsx` (React class component)
- [ ] Wrap the root `<App />` in `index.tsx` with the error boundary
- [ ] Show a user-friendly "Something went wrong" UI with a reload button

### 4.2 Split App.tsx
- [ ] Extract each mode (Investigation, Comparison, ReverseEngineer, ComplianceAudit, Reports, Library, Settings, Dashboard) into its own component file under `src/components/modes/`
- [ ] Extract reusable UI elements (EvidenceCard, LineItemTable, CarrierSelector, etc.) into `src/components/ui/`
- [ ] This is low-risk to defer until Phase 5 if you need to ship fast

### 4.3 Verify Gemini Model Names
- [ ] Check the Google AI documentation for current model IDs — the preview model names in `geminiService.ts` (`gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3-pro-preview`) may have changed
- [ ] Update to stable model IDs once confirmed

### 4.4 Image Upload Deduplication
- [ ] In `supabaseClient.ts`, replace `Math.random()` filename with a content hash or UUID to avoid collisions
- [ ] Add file type validation before upload (only allow images and PDFs)

---

## Phase 5 — Deployment Infrastructure

### 5.1 Frontend — Vercel ✅
- [x] `vercel.json` — multi-service experimentalServices config, SPA rewrites
- [x] All 9 `VITE_*` env vars set in Vercel dashboard (Production + Preview)
- [x] GitHub repo `stormassistia-ux/ScopeAdjuster` connected; live at `scope-adjuster-roan.vercel.app`
- [ ] Custom domain (optional — purchase via Vercel or point existing DNS)

### 5.2 Backend — Vercel (experimental services) ✅
- [x] `backend/Dockerfile` — multi-stage node:22-alpine
- [x] `backend/tsconfig.json` — rootDir/outDir/include fixed; tsc clean
- [x] `DATABASE_URL`, `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS` set in Vercel dashboard
- [x] Backend deployed alongside frontend as Vercel service

### 5.3 Database — Supabase ✅ (partial)
- [x] RLS migration SQL created at `backend/prisma/migrations/20260422000000_rls_policies/`
- [ ] Run `cd backend && npx prisma migrate deploy` against production DATABASE_URL
- [ ] Wire `SET LOCAL "app.current_user_id"` per-request before enabling RLS policies
- [ ] Confirm Supabase Storage bucket `estimates` access policies in dashboard

### 5.4 CI/CD Pipeline ✅
- [x] `.github/workflows/deploy.yml` — type-check + build on PR, auto-deploy on main merge
- [x] All 12 GitHub secrets set: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` + all `VITE_*`

---

## Phase 6 — Observability & Operations

- [ ] Add Sentry or LogRocket to the frontend for error tracking
- [ ] Add health check monitoring (UptimeRobot or Better Uptime on `/health`)
- [ ] Set up Supabase query performance monitoring
- [ ] Set Google AI quota alerts so you know before hitting Gemini rate limits
- [ ] Document your runbook: how to restart the backend, how to run a DB migration, how to rotate keys

---

## Quick Reference: What Currently Works vs. What Doesn't

| Feature | Status | Blocker |
|---------|--------|---------|
| Google Sign-In | Works locally | New Firebase project needed for prod |
| Investigation (AI analysis) | Works locally | API key exposed in bundle |
| Comparison | Works locally | API key exposed in bundle |
| Reverse Engineer | Works locally | API key exposed in bundle |
| Compliance Audit | Works locally | API key exposed in bundle |
| Save/Load Reports | Works locally | Hardcoded localhost URL |
| Master Baselines | Works locally | Hardcoded localhost URL |
| File uploads to Supabase | Works | — |
| Carrier Guidelines (web-grounded) | Works locally | API key exposed |
| Market Intel | Works locally | API key exposed |
| Worker / ingestion pipeline | Does NOT work | Fully stubbed |
| Multi-tenant orgs/projects | Does NOT work | Schema exists, no routes |
