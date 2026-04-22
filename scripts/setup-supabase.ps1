# FocusLock Supabase Setup Script (PowerShell)
# This script helps set up Supabase for local development on Windows

Write-Host "🚀 FocusLock Supabase Setup" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
    Write-Host "📦 Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if Supabase is already initialized
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "⚠️  Supabase not initialized in this project" -ForegroundColor Yellow
    Write-Host "🔧 Initializing Supabase..." -ForegroundColor Cyan
    supabase init
} else {
    Write-Host "✅ Supabase already initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔄 Starting Supabase local development environment..." -ForegroundColor Cyan
Write-Host "   This may take a few minutes on first run..." -ForegroundColor Gray
Write-Host ""

supabase start

Write-Host ""
Write-Host "✅ Supabase is running!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access points:" -ForegroundColor Cyan
Write-Host "   - Studio UI: http://localhost:54323"
Write-Host "   - API URL: http://localhost:54321"
Write-Host "   - Database: postgresql://postgres:postgres@localhost:54322/postgres"
Write-Host ""

# Get the anon key and service role key
$statusOutput = supabase status | Out-String
$anonKey = ($statusOutput | Select-String "anon key: (.+)" | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
$serviceRoleKey = ($statusOutput | Select-String "service_role key: (.+)" | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()

Write-Host "🔑 API Keys (add these to your .env.local):" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
Write-Host "SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local file..." -ForegroundColor Cyan
    @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey

# Claude AI Configuration (add your key)
ANTHROPIC_API_KEY=your-api-key-here
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local file" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.local already exists. Please update it manually with the keys above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env.local with your Anthropic API key"
Write-Host "2. Run 'npm run dev' to start the Next.js development server"
Write-Host "3. Visit http://localhost:3000 to see your app"
Write-Host ""
Write-Host "📚 Useful commands:" -ForegroundColor Cyan
Write-Host "   - supabase status       : Check Supabase status"
Write-Host "   - supabase stop         : Stop Supabase"
Write-Host "   - supabase db reset     : Reset database and reapply migrations"
Write-Host "   - supabase migration new: Create a new migration"
Write-Host ""
