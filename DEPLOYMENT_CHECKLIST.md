# FocusLock Deployment Checklist

Use this checklist to ensure all configuration is complete before deploying to production.

## Pre-Deployment Checklist

### 1. Environment Variables ✓

- [ ] All environment variables are set in `.env.local` for development
- [ ] All environment variables are configured in Vercel for production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is kept secret (never exposed to client)
- [ ] `ANTHROPIC_API_KEY` is kept secret (never exposed to client)
- [ ] `CRON_SECRET` is a strong random value (generated with `openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_APP_URL` is set to production domain

### 2. Supabase Configuration ✓

- [ ] Supabase project is created
- [ ] Database migrations are applied
- [ ] Row-level security (RLS) policies are enabled on all tables
- [ ] Badge definitions are seeded
- [ ] Google OAuth is configured in Supabase Auth settings
- [ ] Production domain is added to Supabase Auth redirect URLs

### 3. Google OAuth Configuration ✓

- [ ] Google Cloud project is created
- [ ] OAuth consent screen is configured
- [ ] OAuth credentials are created
- [ ] Production redirect URI is added: `https://your-domain.com/auth/callback`
- [ ] Client ID and Secret are added to Supabase Auth settings

### 4. Anthropic API Configuration ✓

- [ ] Anthropic account is created
- [ ] API key is generated
- [ ] Usage limits are configured (to avoid unexpected charges)
- [ ] Rate limiting is implemented in the app (1 req/hour per user)

### 5. Vercel Configuration ✓

- [ ] GitHub repository is connected to Vercel
- [ ] Project is configured with Next.js framework preset
- [ ] All environment variables are added in Vercel dashboard
- [ ] Cron jobs are configured (requires Pro plan)
- [ ] Production domain is configured
- [ ] SSL certificate is active

### 6. Security Configuration ✓

- [ ] Security headers are configured in `next.config.mjs`
- [ ] Content Security Policy (CSP) is reviewed
- [ ] HTTPS is enforced in production
- [ ] API routes have proper authentication
- [ ] Cron endpoints verify `CRON_SECRET`
- [ ] Input validation is implemented with Zod schemas
- [ ] Rate limiting is configured

### 7. Testing ✓

- [ ] Health check endpoint returns OK: `/api/health`
- [ ] Authentication flow works (magic link + Google OAuth)
- [ ] Lock rules can be created and evaluated
- [ ] Override flow works with mood prompt
- [ ] Streak tracking works
- [ ] Badge awards work
- [ ] AI coaching generates insights
- [ ] Buddy system notifications work
- [ ] Pomodoro timer works
- [ ] Statistics dashboard displays correctly

### 8. Performance ✓

- [ ] Lighthouse score ≥90 for Performance
- [ ] Core Web Vitals are optimized:
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1
- [ ] Images are optimized (WebP format)
- [ ] Code splitting is implemented
- [ ] Caching strategies are configured

### 9. Monitoring ✓

- [ ] Vercel Analytics is enabled
- [ ] Error tracking is configured (Sentry or similar)
- [ ] Uptime monitoring is set up (UptimeRobot or similar)
- [ ] Database performance is monitored
- [ ] API usage is monitored (Anthropic dashboard)

### 10. Documentation ✓

- [ ] README.md is up to date
- [ ] ENVIRONMENT_SETUP.md is complete
- [ ] API documentation is available
- [ ] User documentation is created
- [ ] Deployment process is documented

## Post-Deployment Verification

After deploying to production, verify:

1. **Health Check**
   ```bash
   curl https://your-domain.com/api/health
   ```
   Should return `{"status":"ok"}`

2. **Authentication**
   - Visit `/login`
   - Test magic link authentication
   - Test Google OAuth authentication
   - Verify redirect to dashboard after login

3. **Core Features**
   - Create a lock rule
   - Verify lock status is evaluated correctly
   - Test override flow with mood prompt
   - Check that streak is tracked
   - Verify badge awards

4. **Cron Jobs**
   - Check Vercel logs for cron job executions
   - Verify streak check runs at midnight UTC
   - Verify challenge generation runs Monday 6 AM UTC
   - Verify bedtime check runs every 15 minutes
   - Verify weekly insights run Monday 9 AM UTC

5. **Performance**
   - Run Lighthouse audit
   - Check Core Web Vitals in Vercel Analytics
   - Monitor API response times

6. **Error Monitoring**
   - Check error tracking dashboard
   - Verify errors are being captured
   - Set up alerts for critical errors

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate Rollback**
   - Go to Vercel dashboard
   - Navigate to Deployments
   - Click "..." on previous stable deployment
   - Click "Promote to Production"

2. **Fix and Redeploy**
   - Fix the issue in development
   - Test thoroughly
   - Deploy again

3. **Database Rollback** (if needed)
   - Supabase provides point-in-time recovery
   - Contact Supabase support for assistance

## Support Contacts

- **Supabase Support**: https://supabase.com/support
- **Anthropic Support**: https://support.anthropic.com/
- **Vercel Support**: https://vercel.com/support
- **Google Cloud Support**: https://cloud.google.com/support

## Notes

- Keep this checklist updated as new features are added
- Review security configuration regularly
- Monitor API usage to avoid unexpected charges
- Back up database regularly
- Test disaster recovery procedures

---

**Last Updated**: January 2024
