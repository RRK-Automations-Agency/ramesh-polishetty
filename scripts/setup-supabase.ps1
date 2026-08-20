# ============================================================
# RAMESH POLISETTY - Supabase Setup Script (Windows)
# Run this in PowerShell to set up Supabase
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RAMESH POLISETTY - Supabase Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Supabase CLI is installed
Write-Host "[1/6] Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "  Installing Supabase CLI..." -ForegroundColor Gray
    npm install -g supabase
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Failed to install Supabase CLI" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Supabase CLI ready" -ForegroundColor Green

# Step 2: Login to Supabase
Write-Host ""
Write-Host "[2/6] Login to Supabase..." -ForegroundColor Yellow
Write-Host "  A browser window will open. Login and authorize the CLI." -ForegroundColor Gray
supabase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Login failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Logged in successfully" -ForegroundColor Green

# Step 3: Get Project Reference
Write-Host ""
Write-Host "[3/6] Link to your Supabase project..." -ForegroundColor Yellow
$projectId = Read-Host "  Enter your Supabase Project ID"
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "  Project ID is required" -ForegroundColor Red
    exit 1
}
supabase link --project-ref $projectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Failed to link project" -ForegroundColor Red
    exit 1
}
Write-Host "  Project linked" -ForegroundColor Green

# Step 4: Push database migrations
Write-Host ""
Write-Host "[4/6] Deploying database schema..." -ForegroundColor Yellow
supabase db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Some migrations may have failed. Check Supabase Dashboard." -ForegroundColor Yellow
}
Write-Host "  Database migrations applied" -ForegroundColor Green

# Step 5: Create config.json
Write-Host ""
Write-Host "[5/6] Creating configuration file..." -ForegroundColor Yellow
$url = Read-Host "  Enter your Supabase Project URL"
$key = Read-Host "  Enter your Supabase Anon Key"

if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($key)) {
    Write-Host "  URL and Key are required" -ForegroundColor Red
    Write-Host "  Find these in Dashboard > Settings > API" -ForegroundColor Gray
    exit 1
}

$configContent = @"
{
  "SUPABASE_URL": "$url",
  "SUPABASE_ANON_KEY": "$key",
  "BUCKET_NAME": "photos",
  "TABLE_NAME": "photos"
}
"@

if (-not (Test-Path "config")) {
    New-Item -ItemType Directory -Path "config" | Out-Null
}
$configContent | Out-File -FilePath "config\config.json" -Encoding UTF8
Write-Host "  config\config.json created" -ForegroundColor Green

# Step 6: Storage Bucket Instructions
Write-Host ""
Write-Host "[6/6] Storage Bucket Setup" -ForegroundColor Yellow
Write-Host "  The CLI does not support bucket creation." -ForegroundColor Yellow
Write-Host "  Please create the bucket manually in Supabase Dashboard:" -ForegroundColor Gray
Write-Host "    1. Go to https://app.supabase.com" -ForegroundColor Gray
Write-Host "    2. Select your project" -ForegroundColor Gray
Write-Host "    3. Go to Storage" -ForegroundColor Gray
Write-Host "    4. Click New bucket" -ForegroundColor Gray
Write-Host "    5. Name: photos" -ForegroundColor Gray
Write-Host "    6. Public: Yes" -ForegroundColor Gray
Write-Host "    7. Click Create bucket" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create storage bucket in Dashboard (see above)" -ForegroundColor Gray
Write-Host "  2. Create admin user in Dashboard > Authentication > Users" -ForegroundColor Gray
Write-Host "  3. Open admin.html and login" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
