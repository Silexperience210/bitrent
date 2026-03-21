# setup-autostart.ps1 — Install BitRent tunnel manager in Windows Task Scheduler
# Run once as Administrator: powershell -ExecutionPolicy Bypass -File setup-autostart.ps1

$TaskName   = "BitRent-Tunnels"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeExe    = (Get-Command node).Source
$ScriptFile = Join-Path $ScriptDir "start-miners.cjs"
$EnvFile    = Join-Path $ScriptDir ".env.local"
$LogFile    = Join-Path $ScriptDir "tunnel.log"

# Read env vars from .env.local
$envVars = @{}
Get-Content $EnvFile | Where-Object { $_ -match "^[^#].*=.*" } | ForEach-Object {
    $parts = $_ -split "=", 2
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    $envVars[$key] = $value
}

$supabaseUrl = $envVars["SUPABASE_URL"]
$supabaseKey = $envVars["SUPABASE_SERVICE_KEY"]

# Build the command with env vars inlined
$cmd = "cmd /c `"set SUPABASE_URL=$supabaseUrl && set SUPABASE_SERVICE_KEY=$supabaseKey && `"$NodeExe`" `"$ScriptFile`" >> `"$LogFile`" 2>&1`""

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Create trigger: at logon + 30s delay (ensures network is up)
$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = "PT30S"

# Create action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command `"$cmd`""

# Settings: run whether logged on or not, restart on failure
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "BitRent: starts Cloudflare tunnels + Hex proxy at login, auto-updates Supabase with new URLs"

Write-Host ""
Write-Host "✅ Task '$TaskName' installed." -ForegroundColor Green
Write-Host "   Starts automatically 30s after Windows login."
Write-Host "   Logs: $LogFile"
Write-Host ""
Write-Host "To test now: node `"$ScriptFile`"" -ForegroundColor Cyan
