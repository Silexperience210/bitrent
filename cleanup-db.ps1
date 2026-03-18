# Full Database Cleanup
# Remove all fake data from Supabase

Write-Host "Cleaning Supabase database..."

# Load env
$envFile = "packages/backend/.env"
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.+)') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        Set-Item -Path "env:$name" -Value $value
    }
}

$url = $env:SUPABASE_URL
$key = $env:SUPABASE_SERVICE_KEY

Write-Host "URL: $url"

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

Write-Host "Deleting payments..."
curl.exe -X DELETE "$url/rest/v1/payments?id=gt.0" -H "apikey: $key"

Write-Host "Deleting rentals..."
curl.exe -X DELETE "$url/rest/v1/rentals?id=gt.0" -H "apikey: $key"

Write-Host "Deleting mineurs..."
curl.exe -X DELETE "$url/rest/v1/mineurs?id=gt.0" -H "apikey: $key"

Write-Host "Deleting users..."
curl.exe -X DELETE "$url/rest/v1/users?id=gt.0" -H "apikey: $key"

Write-Host "Done!"
