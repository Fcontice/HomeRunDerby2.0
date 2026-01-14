# Deployment Guide - Home Run Derby 2.0

## Architecture Overview

| Service | Platform | Domain |
|---------|----------|--------|
| Frontend | Vercel | `www.hrderbyus.com` |
| Backend | Railway | `api.hrderbyus.com` |
| Database | Supabase | (managed) |

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Sign up at [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 1.2 Set Railway Environment Variables

```bash
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
BACKEND_URL=https://api.yourdomain.com

# Email Service
RESEND_API_KEY=re_your-resend-key
FROM_EMAIL=noreply@yourdomain.com

# Stripe Payments (use sk_live_ for production!)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# App Configuration
NODE_ENV=production
FRONTEND_URL=https://www.yourdomain.com
```

### 1.3 Add Custom Domain to Railway

1. Go to Railway → Settings → Networking
2. Add custom domain: `api.yourdomain.com`
3. Railway will show DNS instructions

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

1. Sign up at [vercel.com](https://vercel.com)
2. Import GitHub repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.2 Set Vercel Environment Variables

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
```

**IMPORTANT**: `VITE_API_URL` must point directly to your API domain (e.g., `https://api.hrderbyus.com`).

### 2.3 Frontend vercel.json

The `frontend/vercel.json` file handles SPA routing (prevents 404 on page refresh):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ]
}
```

**Note**: The vercel.json must be in the `frontend/` folder since that's the Vercel root directory.

### 2.4 Add Custom Domain to Vercel

1. Go to Vercel → Settings → Domains
2. Add: `www.yourdomain.com`
3. Vercel will show DNS instructions

---

## Step 3: Configure DNS

At your domain registrar, add these records:

### For Frontend (Vercel)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com (or the value Vercel provides)
```

### For Backend (Railway)
```
Type: CNAME
Name: api
Value: your-app.up.railway.app (the value Railway provides)
```

### Apex Domain (optional)
```
Type: A
Name: @
Value: 76.76.21.21
```

**Wait 5-30 minutes for DNS propagation.**

---

## Step 4: Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy the signing secret to Railway's `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Configure Google OAuth (Optional)

In Google Cloud Console:
1. Go to APIs & Services → Credentials
2. Edit your OAuth client
3. Add authorized redirect URI:
   ```
   https://api.yourdomain.com/api/auth/google/callback
   ```

---

## Key Files

### frontend/src/services/api.ts
```typescript
const API_URL = (import.meta as any).env.VITE_API_URL || ''
```
- Falls back to empty string for local development (uses Vite proxy)
- In production, `VITE_API_URL` points to the API domain

### frontend/vercel.json
- Located in `frontend/` folder (Vercel root)
- Handles SPA routing to prevent 404 on page refresh

### backend/src/server.ts
- CORS configured via `FRONTEND_URL` environment variable
- Automatically allows `https://www.hrderbyus.com` and `https://hrderbyus.com` in production

---

## Environment Variables Reference

### Vercel (Frontend)
| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_URL` | `https://api.hrderbyus.com` | Yes |
| `VITE_STRIPE_PUBLIC_KEY` | `pk_live_...` | Yes |

### Railway (Backend)
| Variable | Example | Required |
|----------|---------|----------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Yes |
| `SUPABASE_ANON_KEY` | `eyJ...` | Yes |
| `JWT_SECRET` | 32+ random chars | Yes |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Yes |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Yes |
| `RESEND_API_KEY` | `re_...` | Yes |
| `FROM_EMAIL` | `noreply@domain.com` | Yes |
| `NODE_ENV` | `production` | Yes |
| `FRONTEND_URL` | `https://www.hrderbyus.com` | Yes |
| `BACKEND_URL` | `https://api.hrderbyus.com` | Yes |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | No |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | No |

---

## Troubleshooting

### 404 on page refresh
- Ensure `frontend/vercel.json` exists with SPA rewrites
- Redeploy Vercel after adding the file

### API calls fail with Network Error
- Check `VITE_API_URL` is set correctly in Vercel
- Check `FRONTEND_URL` in Railway matches your frontend domain
- Check browser console for CORS errors

### CORS errors
- Verify `FRONTEND_URL` in Railway matches exactly (including `https://` and `www`)
- Redeploy Railway after changing environment variables

### Build fails on Vercel
- Ensure `@types/node` is in `frontend/package.json` devDependencies
- Check build logs for TypeScript errors

### Login redirects to wrong URL
- Check `BACKEND_URL` in Railway for Google OAuth callback
- Verify Google OAuth redirect URIs in Google Cloud Console

---

## Security Checklist

- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `STRIPE_SECRET_KEY` uses `sk_live_` (not `sk_test_`)
- [ ] `VITE_STRIPE_PUBLIC_KEY` uses `pk_live_` (not `pk_test_`)
- [ ] `FRONTEND_URL` only allows your production domain
- [ ] Webhook secrets are configured
- [ ] Email domain has SPF/DKIM records configured

---

## Deployment Commands

### Redeploy Frontend
```bash
git add .
git commit -m "Update frontend"
git push
```
Vercel auto-deploys on push to main.

### Redeploy Backend
Push to GitHub - Railway auto-deploys from main branch.

### Force Redeploy (clear cache)
- **Vercel**: Deployments → "..." → Redeploy (uncheck "Use existing Build Cache")
- **Railway**: Deployments → Redeploy

---

## Production URLs

- **Frontend**: https://www.hrderbyus.com
- **Backend API**: https://api.hrderbyus.com
- **Health Check**: https://api.hrderbyus.com/health
