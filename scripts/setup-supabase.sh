#!/bin/bash

# FocusLock Supabase Setup Script
# This script helps set up Supabase for local development

set -e

echo "🚀 FocusLock Supabase Setup"
echo "============================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "📦 Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if Supabase is already initialized
if [ ! -f "supabase/config.toml" ]; then
    echo "⚠️  Supabase not initialized in this project"
    echo "🔧 Initializing Supabase..."
    supabase init
else
    echo "✅ Supabase already initialized"
fi

echo ""
echo "🔄 Starting Supabase local development environment..."
echo "   This may take a few minutes on first run..."
echo ""

supabase start

echo ""
echo "✅ Supabase is running!"
echo ""
echo "📊 Access points:"
echo "   - Studio UI: http://localhost:54323"
echo "   - API URL: http://localhost:54321"
echo "   - Database: postgresql://postgres:postgres@localhost:54322/postgres"
echo ""

# Get the anon key and service role key
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')

echo "🔑 API Keys (add these to your .env.local):"
echo ""
echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# Claude AI Configuration (add your key)
ANTHROPIC_API_KEY=your-api-key-here
EOF
    echo "✅ Created .env.local file"
else
    echo "⚠️  .env.local already exists. Please update it manually with the keys above."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your Anthropic API key"
echo "2. Run 'npm run dev' to start the Next.js development server"
echo "3. Visit http://localhost:3000 to see your app"
echo ""
echo "📚 Useful commands:"
echo "   - supabase status       : Check Supabase status"
echo "   - supabase stop         : Stop Supabase"
echo "   - supabase db reset     : Reset database and reapply migrations"
echo "   - supabase migration new: Create a new migration"
echo ""
