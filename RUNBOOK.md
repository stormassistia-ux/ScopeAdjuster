# ScopeAdjuster — Operations Runbook

## Services

| Service | URL | Platform |
|---------|-----|----------|
| Frontend + Backend | https://scope-adjuster-roan.vercel.app | Vercel (stormassistia-ux's project) |
| Database | Supabase project `sjxdaunggnvexhguuyvg` | Supabase |
| Auth | Firebase project `scopeadjuster-prod` | Google Firebase |
| AI | Google AI Studio | Gemini API |
| Error tracking | Sentry | sentry.io |
| GitHub repo | https://github.com/stormassistia-ux/ScopeAdjuster | GitHub |

---

## Health Check

```
GET https://scope-adjuster-roan.vercel.app/health
```

Returns `{ status: "ok", db: "connected" }` when healthy.
Returns `503` with `db: "unreachable"` if the database is down.

Set up UptimeRobot to ping this URL every 5 minutes:
1. Go to uptimerobot.com → Add Monitor
2. Type: HTTP(s), URL: `https://scope-adjuster-roan.vercel.app/health`
3. Interval: 5 minutes, Alert to: your email

---

## Restart the Backend

The backend runs as a Vercel serverless service — there is no persistent process to restart.
To force a fresh deployment:

```bash
git commit --allow-empty -m "chore: force redeploy"
git push origin main
```

Or use the Vercel dashboard → Deployments → Redeploy.

---

## Run a Database Migration

```powershell
cd backend
$env:DATABASE_URL = "postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
npx prisma migrate deploy
```

To verify the migration applied:
```powershell
npx prisma migrate status
```

---

## Rotate API Keys

### Gemini API Key
1. Go to aistudio.google.com → API Keys → Create new key
2. In Vercel dashboard → scope-adjuster → Settings → Environment Variables → update `GEMINI_API_KEY`
3. Redeploy

### Supabase Anon Key
1. Supabase dashboard → Project Settings → API → regenerate anon key
2. Update `VITE_SUPABASE_ANON_KEY` in Vercel environment variables
3. Update `VITE_SUPABASE_ANON_KEY` GitHub secret:
   ```powershell
   & "C:\Program Files\GitHub CLI\gh.exe" secret set VITE_SUPABASE_ANON_KEY --body "new-key" --repo stormassistia-ux/ScopeAdjuster
   ```
4. Redeploy

### Firebase API Key
1. Firebase console → Project Settings → Web API Key — rotate via Google Cloud Console → APIs & Services → Credentials
2. Update `VITE_FIREBASE_API_KEY` in Vercel and GitHub secrets
3. Redeploy

### Vercel Deploy Token (VERCEL_TOKEN)
1. vercel.com/account/tokens → delete old token → create new one
2. Update GitHub secret:
   ```powershell
   & "C:\Program Files\GitHub CLI\gh.exe" secret set VERCEL_TOKEN --body "new-token" --repo stormassistia-ux/ScopeAdjuster
   ```

---

## View Logs

**Backend logs** (Vercel):
Vercel dashboard → scope-adjuster → Logs tab → filter by function path `/_/backend`

**Frontend errors** (Sentry):
sentry.io → ScopeAdjuster project → Issues

**Database logs** (Supabase):
Supabase dashboard → Logs → Postgres

---

## Supabase Storage Policies

Bucket: `estimates`

To set access policies in Supabase dashboard → Storage → estimates → Policies:

- **INSERT**: `(auth.uid()::text = (storage.foldername(name))[1])`
- **SELECT**: `(auth.uid()::text = (storage.foldername(name))[1])`
- **DELETE**: `(auth.uid()::text = (storage.foldername(name))[1])`

This ensures users can only access files under their own `userId/` prefix.

---

## Google AI Quota Alerts

1. Go to console.cloud.google.com → APIs & Services → Quotas
2. Filter for "Generative Language API"
3. Set alert at 80% of your daily token quota
4. Alert goes to stormassistia@gmail.com
