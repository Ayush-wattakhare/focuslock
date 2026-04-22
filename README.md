# FocusLock - Social Media Addiction Reducer

A free, full-featured Progressive Web App (PWA) built with Next.js 14 that helps users reduce social media addiction through smart lock rules, gamification, AI coaching, and social accountability.

**Developer**: [Ayush Wattakhare](https://github.com/Ayush-wattakhare)

## Features

- 🎯 **Smart Lock Rules**: Timer, schedule, date-based, and nuclear mode locks
- 🏆 **Gamification**: Streaks, badges, and weekly challenges
- 🤝 **Buddy System**: Social accountability with real-time notifications
- 🤖 **AI Coaching**: Behavioral insights powered by Claude API
- 📊 **Statistics Dashboard**: Track usage patterns and progress
- 🍅 **Pomodoro Timer**: Focus sessions with automatic app locking
- 🌙 **Bedtime Mode**: Automatic locks for healthy sleep habits
- 👨‍👩‍👧 **Family Controls**: Parental management of child accounts
- 🌐 **Browser Extensions**: Chrome and Firefox support
- 📱 **PWA Support**: Install as a native app with offline capabilities

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes (Vercel Edge Functions)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link + Google OAuth)
- **AI**: Claude API (Anthropic)
- **Styling**: CSS Modules
- **Deployment**: Vercel

## Project Structure

```
focuslock-app/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Dashboard route group
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── lib/                   # Business logic & utilities
│   ├── core/             # Core business logic (lockEvaluator, streakManager, etc.)
│   ├── api/              # API client functions
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── types/                 # TypeScript type definitions
├── public/               # Static assets
└── config/               # Configuration files
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Anthropic API key (for AI coaching)
- Google Cloud account (for OAuth)

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd focuslock-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.local .env.local
   ```

   Edit `.env.local` and fill in your credentials. See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed instructions.

4. **Set up Supabase database:**

   The database schema is already created in `supabase/migrations/`. Apply it using:

   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push
   ```

   Or run the migration files manually in the Supabase SQL Editor.

5. **Run the development server:**

   ```bash
   npm run dev
   ```

6. **Verify configuration:**

   Visit [http://localhost:3000/api/health](http://localhost:3000/api/health) to check that all environment variables are configured correctly.

7. **Open the app:**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Detailed Setup Guide

For a comprehensive step-by-step guide including:
- Supabase project setup
- Google OAuth configuration
- Anthropic API setup
- Vercel deployment
- Troubleshooting

See **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)**

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Environment Variables

Required environment variables (see `.env.local` for template):

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (server-side only) | Yes |
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., http://localhost:3000) | Yes |
| `CRON_SECRET` | Secret for authenticating cron jobs | Yes |

**⚠️ Security Note**: Never commit `.env.local` to version control. The `.gitignore` file already excludes it.

## Development Guidelines

- Follow Next.js 14 App Router best practices
- Use TypeScript for type safety
- Write clean, maintainable code following ESLint and Prettier rules
- Keep components small and focused
- Use Server Components by default, Client Components only when needed
- Implement proper error handling and loading states

## Author

**Ayush Wattakhare**
- GitHub: [@Ayush-wattakhare](https://github.com/Ayush-wattakhare)

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.
