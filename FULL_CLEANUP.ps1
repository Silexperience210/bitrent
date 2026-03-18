# FULL CLEANUP - Remove ALL fake data from Supabase
# PowerShell version for Windows

Write-Host "🧹 BitRent Full Cleanup Script" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "1. Delete ALL payments"
Write-Host "2. Delete ALL rentals"
Write-Host "3. Delete ALL mineurs"
Write-Host "4. Delete ALL users"
Write-Host "5. Leave Supabase database EMPTY"
Write-Host ""
Write-Host "⚠️  This is DESTRUCTIVE - use only for development!" -ForegroundColor Red
Write-Host ""

# Charger les variables d'environnement
$envFile = "packages/backend/.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.+)') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "✅ Loaded environment from .env" -ForegroundColor Green
}

$supabaseUrl = $env:SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY not configured" -ForegroundColor Red
    Write-Host "Set them in packages/backend/.env"
    exit 1
}

Write-Host "🔗 Supabase URL: $supabaseUrl" -ForegroundColor Gray

# Delete all data
$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "🗑️  Deleting payments..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/payments?id=gt.0" `
    -Method DELETE `
    -Headers $headers `
    -ErrorAction SilentlyContinue | Out-Null

Write-Host "🗑️  Deleting rentals..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rentals?id=gt.0" `
    -Method DELETE `
    -Headers $headers `
    -ErrorAction SilentlyContinue | Out-Null

Write-Host "🗑️  Deleting mineurs..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/mineurs?id=gt.0" `
    -Method DELETE `
    -Headers $headers `
    -ErrorAction SilentlyContinue | Out-Null

Write-Host "🗑️  Deleting users..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users?id=gt.0" `
    -Method DELETE `
    -Headers $headers `
    -ErrorAction SilentlyContinue | Out-Null

Write-Host ""
Write-Host "✅ Full cleanup complete!" -ForegroundColor Green
Write-Host "Database is now empty and ready for real data."
Write-Host ""
Write-Host 'Verify at: https://app.supabase.com/project/taxudennjzcmjqcsgesn' -ForegroundColor Cyan
