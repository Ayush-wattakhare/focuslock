# FocusLock Environment Setup Guide

This guide walks you through setting up all required environment variables and configuration for the FocusLock application.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- An Anthropic API account (for Claude AI coaching)
- A Google Cloud account (for OAuth)

## Step 1: Supabase Configuration

### 1.1 Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `focuslock`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 1.2 Get Supabase Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### 1.3 Run Database Migrations

The database schema has already been created in the `supabase/migrations/` directory. To apply it:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Alternatively, you can run the migration files manually in the Supabase SQL Editor.

## Step 2: Google OAuth Configuration

### 2.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "FocusLock"
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://your-domain.com/auth/callback` (for production)
5. Copy the **Client ID** and **Client Secret**

### 2.2 Configure Supabase Auth

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Paste your Google Client ID and Client Secret
4. Save changes

## Step 3: Anthropic API Configuration

### 3.1 Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to "API Keys"
4. Click "Create Key"
5. Copy the API key → `ANTHROPIC_API_KEY`

⚠️ **Important**: The Anthropic API is a paid service. Monitor your usage to avoid unexpected charges.

## Step 4: Environment Variables Setup

### 4.1 Create .env.local File

Copy the `.env.local` template and fill in your values:

```bash
cp .env.local .env.local.example
```

Edit `.env.local` with your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret (generate with: openssl rand -base64 32)
CRON_SECRET=your_random_secret_here
```

### 4.2 Generate Cron Secret

Generate a secure random secret for cron job authentication:

```bash
openssl rand -base64 32
```

Copy the output to `CRON_SECRET` in your `.env.local` file.

## Step 5: Verify Configuration

### 5.1 Test Supabase Connection

```bash
npm run dev
```

Visit `http://localhost:3000/login` and try to sign in with Google OAuth. If successful, your Supabase configuration is correct.

### 5.2 Test Environment Variables

Create a test API route to verify all environment variables are loaded:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "supabase": "connected",
  "anthropic": "configured"
}
```

## Step 6: Vercel Deployment Configuration

### 6.1 Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

### 6.2 Add Environment Variables in Vercel

Go to Project Settings → Environment Variables and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | Your Anthropic key | Production, Preview, Development |
| `CRON_SECRET` | Your cron secret | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | Your production URL | Production |
| `NEXT_PUBLIC_APP_URL` | Your preview URL | Preview |
| `NEXT_PUBLIC_APP_URL` | http://localhost:3000 | Development |

### 6.3 Configure Cron Jobs

The `vercel.json` file already contains cron job configurations:

- **Daily Streak Check**: Runs at midnight UTC
- **Weekly Challenge Generation**: Runs Monday 6 AM UTC
- **Bedtime Mode Check**: Runs every 15 minutes
- **Weekly AI Insights**: Runs Monday 9 AM UTC

These will be automatically configured when you deploy to Vercel.

### 6.4 Update OAuth Redirect URIs

After deploying to Vercel, update your Google OAuth redirect URIs:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add your Vercel production URL:
   - `https://your-app.vercel.app/auth/callback`
4. Update Supabase Auth settings with the same URL

## Step 7: Security Checklist

Before going to production, ensure:

- [ ] All environment variables are set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the client
- [ ] `ANTHROPIC_API_KEY` is never exposed to the client
- [ ] `CRON_SECRET` is a strong random value
- [ ] OAuth redirect URIs are configured for production domain
- [ ] Supabase RLS policies are enabled on all tables
- [ ] HTTPS is enforced in production
- [ ] Security headers are configured (already in `next.config.mjs`)

## Troubleshooting

### Issue: "Invalid API key" error from Supabase

**Solution**: Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct. Check for extra spaces or quotes.

### Issue: Google OAuth redirect mismatch

**Solution**: Ensure the redirect URI in Google Cloud Console exactly matches your callback URL (including http/https and trailing slashes).

### Issue: Anthropic API rate limit errors

**Solution**: The app implements rate limiting (1 request/hour per user) and caching (24 hours). If you're still hitting limits, check your Anthropic dashboard for usage.

### Issue: Cron jobs not running

**Solution**: Verify that:
1. `CRON_SECRET` is set in Vercel environment variables
2. Cron endpoints authenticate with the secret
3. Vercel cron jobs are enabled for your plan (Pro plan required)

### Issue: Environment variables not loading

**Solution**: 
1. Restart your development server after changing `.env.local`
2. In Vercel, redeploy after adding environment variables
3. Check that variable names match exactly (case-sensitive)

## Next Steps

After completing this setup:

1. Run the development server: `npm run dev`
2. Test authentication flow at `/login`
3. Create your first lock rule
4. Test the AI coaching feature (requires override logs)
5. Deploy to Vercel for production

## Support

For issues or questions:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Check the [Anthropic API Documentation](https://docs.anthropic.com/)
- Check the [Next.js Documentation](https://nextjs.org/docs)
- Review the project README.md

---

**Last Updated**: January 2024
