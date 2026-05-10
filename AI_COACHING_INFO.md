# AI Coaching Feature - Optional & Paid

## Overview

The AI Coaching feature in FocusLock uses Anthropic's Claude API to provide personalized behavioral insights based on your app usage patterns. **This feature is completely optional** and the app works fully without it.

## Is It Required?

**No!** The AI coaching feature is optional. All core features of FocusLock work without it:

✅ **Works Without AI:**
- Lock rules (timer, schedule, date-based, nuclear mode)
- Streak tracking
- Badge system
- Buddy accountability
- Statistics dashboard
- Pomodoro timer
- Bedtime mode
- Family controls
- Browser extensions
- PWA support

❌ **Requires AI API Key:**
- AI-powered behavioral insights
- Mood pattern analysis
- Personalized coaching suggestions

## Cost Information

### Anthropic Claude API Pricing

The AI coaching feature uses Anthropic's Claude API, which is a **paid service**:

- **Pricing Page**: https://www.anthropic.com/pricing
- **Model Used**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Typical Cost**: ~$0.003 per insight generation (500 tokens)
- **Rate Limit**: 1 request per user per hour (built into the app)
- **Monthly Estimate**: If a user generates insights daily, approximately $0.09/month per user

### Free Alternatives

If you don't want to pay for AI coaching, you can:

1. **Use the app without AI** - All other features work perfectly
2. **Self-host a free LLM** - Modify the code to use:
   - Ollama (local LLM)
   - OpenAI API (has free tier)
   - Google Gemini API (has free tier)
   - Any other LLM API

## How to Enable AI Coaching

### Step 1: Get an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up for an account
3. Add payment method (required for API access)
4. Generate an API key
5. Copy the key (starts with `sk-ant-`)

### Step 2: Configure Your App

Add the API key to your `.env.local` file:

```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Step 3: Restart the Server

```bash
npm run dev
```

The AI coaching feature will now be available at `/ai-coach`.

## How It Works

When a user requests AI insights:

1. The app fetches their override logs from the past 7 days
2. Analyzes patterns (time-of-day, mood triggers, app-specific)
3. Sends anonymized data to Claude API
4. Claude generates personalized insights and suggestions
5. Results are cached for 24 hours to reduce API calls

### Privacy

- Only override patterns are sent to Claude (no personal info)
- Data is not stored by Anthropic (per their API terms)
- Insights are cached locally for 24 hours
- Rate limited to 1 request per user per hour

## Graceful Degradation

If the API key is not configured or invalid:

- The AI coach page shows a friendly message
- Users can still use all other features
- No errors or crashes
- The app continues to work normally

## Alternative: Use a Free LLM

If you want AI coaching without paying, you can modify the code to use a free alternative:

### Option 1: Ollama (Local, Free)

```typescript
// In lib/core/aiCoach.ts
export async function callClaudeAPI(prompt: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2',
      prompt: prompt,
    }),
  });
  // Parse and return response
}
```

### Option 2: Google Gemini (Free Tier)

```typescript
// In lib/core/aiCoach.ts
export async function callClaudeAPI(prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  // Parse and return response
}
```

### Option 3: OpenAI (Free Tier Available)

```typescript
// In lib/core/aiCoach.ts
export async function callClaudeAPI(prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  // Parse and return response
}
```

## Summary

- ✅ **AI Coaching is optional** - App works fully without it
- 💰 **Anthropic Claude is paid** - ~$0.003 per insight
- 🔄 **Free alternatives exist** - Ollama, Gemini, OpenAI free tier
- 🛡️ **Graceful degradation** - No errors if not configured
- 🔒 **Privacy-focused** - Minimal data sent, nothing stored

**Recommendation**: Start without AI coaching, and add it later if you want the feature and are willing to pay for it.
