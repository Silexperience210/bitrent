# Push BitRent Backend to GitHub
# Exécute ce script PowerShell!

$token = "YOUR_GITHUB_TOKEN_HERE"  # Set via environment variable or input
$username = "Silexperience210"
$repoName = "bitrent"

# Créer le repo via GitHub API
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github+json"
}

$body = @{
    name = $repoName
    description = "BitRent Backend - Vercel Serverless API with Nostr Auth & NWC Payments"
    private = $false
} | ConvertTo-Json

Write-Host "🔧 Créating GitHub repository..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ Repository created at: $($response.html_url)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "⚠️  Repository might already exist. Continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Now push
Write-Host "📤 Pushing code to GitHub..." -ForegroundColor Cyan

cd "C:\Users\silex\.openclaw\workspace\bitrent-backend"

git remote remove origin -ErrorAction SilentlyContinue
git remote add origin "https://${username}:${token}@github.com/${username}/${repoName}.git"
git branch -M main
git push -u origin main -f

Write-Host "✅ Push completed!" -ForegroundColor Green
Write-Host "🌐 Repository: https://github.com/${username}/${repoName}" -ForegroundColor Cyan
