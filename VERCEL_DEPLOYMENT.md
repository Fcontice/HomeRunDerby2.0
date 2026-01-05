# Vercel Deployment Guide - Home Run Derby 2.0

## Deployment Architecture

**Frontend**: Vercel (Static hosting)
**Backend**: Railway/Render/Fly.io (Express server)
**Database**: Supabase PostgreSQL (already configured)

---

## Step 1: Deploy Backend First

### Option A: Railway (Recommended - $5/month)

1. **Sign up at [railway.app](https://railway.app)**

2. **Create new project from GitHub repo**
   - Connect your GitHub account
   - Select your repository
   - Railway will auto-detect Node.js

3. **Configure build settings**
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: Railway auto-detects from `PORT` env var

4. **Set environment variables** (see section below)

5. **Deploy** - Railway will provide a URL like `https://your-app.up.railway.app`

### Option B: Render (Free tier available)

1. **Sign up at [render.com](https://render.com)**

2. **New Web Service** → Connect GitHub repo

3. **Configure**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Set environment variables** (see section below)

5. **Deploy** - URL: `https://your-app.onrender.com`

---

## Step 2: Configure Backend Environment Variables

Add these to your backend hosting service (Railway/Render):

```bash
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret

# Email Service
RESEND_API_KEY=re_your-resend-key

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key

# Redis Cache (Upstash)
REDIS_URL=redis://default:your-password@endpoint.upstash.io:port

# App Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.vercel.app
```

**⚠️ IMPORTANT**:
- Use **production** Stripe keys (`sk_live_...` not `sk_test_...`)
- Keep `JWT_SECRET` at least 32 characters
- Update `FRONTEND_URL` with your actual Vercel domain

---

## Step 3: Deploy Frontend to Vercel

### Using Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project root**
   ```bash
   cd C:\Users\conti\Desktop\HRD2.0
   vercel
   ```

4. **Follow prompts**:
   - Link to existing project? → No
   - Project name? → `home-run-derby`
   - Directory? → `./` (root)
   - Override settings? → No

5. **Set environment variables**:
   ```bash
   vercel env add VITE_API_URL
   ```
   Enter: `https://your-backend-domain.com` (your Railway/Render URL)

   ```bash
   vercel env add VITE_STRIPE_PUBLIC_KEY
   ```
   Enter: `pk_live_...` (your Stripe public key)

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Using Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com) and login**

2. **Import Git Repository**
   - Click "Add New" → "Project"
   - Import your GitHub repo
   - Select repository

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (auto-detected from vercel.json)
   - **Output Directory**: (auto-detected from vercel.json)

4. **Environment Variables** (click "Environment Variables"):
   ```
   VITE_API_URL = https://your-backend-url.up.railway.app
   VITE_STRIPE_PUBLIC_KEY = pk_live_your-stripe-public-key
   ```

5. **Deploy** - Vercel will build and deploy

6. **Get your domain**: `https://your-project.vercel.app`

---

## Step 4: Update Backend CORS & Webhook

### Update CORS in backend

After deploying frontend, update `backend/src/server.ts` with your Vercel domain:

```typescript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://your-domain.vercel.app'  // Add this line
  ],
  credentials: true
}));
```

Redeploy backend after this change.

### Configure Stripe Webhook

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://your-backend-domain.com/api/payments/webhook`
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. **Copy webhook signing secret** and add to backend env vars as `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Update vercel.json

Before deploying, update the `vercel.json` file:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-ACTUAL-BACKEND-URL.up.railway.app/api/:path*"
    }
  ]
}
```

Replace `YOUR-ACTUAL-BACKEND-URL` with your Railway/Render domain.

---

## Step 6: Custom Domain (Optional)

### Add your custom domain to Vercel:

1. **Vercel Dashboard** → Your Project → Settings → Domains
2. **Add domain**: `yourdomain.com`
3. **Configure DNS** (at your domain registrar):
   - Type: `A` Record
   - Name: `@`
   - Value: `76.76.21.21`

   OR

   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`

4. **Wait for DNS propagation** (5-30 minutes)

5. **Update environment variables**:
   - Backend `FRONTEND_URL`: `https://yourdomain.com`
   - Backend CORS: Add `https://yourdomain.com`

---

## Testing Your Deployment

### Frontend Checklist
- [ ] Site loads at Vercel URL
- [ ] Login/Register pages work
- [ ] Can create account and verify email
- [ ] Dashboard displays after login

### Backend Checklist
- [ ] `/api/health` endpoint returns 200
- [ ] API calls from frontend work (check Network tab)
- [ ] CORS errors don't appear in console
- [ ] Authentication flow completes

### Payments Checklist
- [ ] Team creation works
- [ ] Payment page loads
- [ ] Stripe Checkout redirects correctly
- [ ] Webhook processes payment (check Stripe logs)
- [ ] Team status updates to "paid" after payment

---

## Troubleshooting

### "Network Error" when calling API
- Verify `VITE_API_URL` is set in Vercel
- Check backend is running (visit backend URL in browser)
- Verify CORS settings in `backend/src/server.ts`

### Stripe webhook not working
- Verify webhook URL in Stripe dashboard
- Check webhook secret matches `STRIPE_WEBHOOK_SECRET` env var
- View webhook logs in Stripe dashboard

### Build fails on Vercel
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles (`npm run build` locally)

### Email verification not working
- Check `RESEND_API_KEY` in backend env vars
- Verify `FRONTEND_URL` is set correctly
- Check Resend logs for delivery status

---

## Post-Deployment Updates

### Updating Frontend
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel auto-deploys on push to main branch.

### Updating Backend
Push to GitHub, then:
- **Railway**: Auto-deploys from main branch
- **Render**: Auto-deploys from main branch

---

## Environment Variables Quick Reference

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend-url.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

### Backend (Railway/Render)
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
RESEND_API_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLIC_KEY
REDIS_URL
NODE_ENV=production
FRONTEND_URL=https://your-vercel-domain.com
```

---

## Security Checklist Before Going Live

- [ ] All env vars use production credentials (no test keys)
- [ ] JWT_SECRET is strong (min 32 random characters)
- [ ] CORS only allows your production frontend domain
- [ ] Stripe uses live mode keys
- [ ] Webhook secrets are configured
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced (Vercel does this automatically)
- [ ] Email service has proper SPF/DKIM records

---

## Cost Estimate

- **Vercel**: Free for hobby projects (upgrade if needed)
- **Railway**: ~$5-20/month (pay for usage)
- **Supabase**: Free tier (500MB database, 50K monthly active users)
- **Upstash Redis**: Free tier (10,000 commands/day)
- **Resend**: Free tier (100 emails/day)
- **Stripe**: No monthly fee (2.9% + $0.30 per transaction)

**Total**: ~$5-20/month (mostly backend hosting)

---

Need help? Check logs:
- **Vercel**: Dashboard → Deployments → View Function Logs
- **Railway**: Dashboard → Deployments → View Logs
- **Stripe**: Dashboard → Developers → Webhooks → View logs
