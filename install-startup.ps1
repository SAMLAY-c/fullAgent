# Bot Agent Platform - Install Startup Script
# Run this script as Administrator to register auto-startup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Bot Agent Platform - Startup Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click the script and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Project path
$projectPath = "F:\samlay-c\agent-group"
$startupScript = "$projectPath\startup.bat"
$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = "$startupFolder\Bot-Agent-Platform.lnk"

Write-Host "[1/3] Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker version >$null 2>&1
    if ($?) {
        $dockerRunning = $true
        Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker Desktop is not running" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Docker Desktop is not installed or not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2/3] Configuring Docker Desktop autostart..." -ForegroundColor Yellow

# Enable Docker Desktop autostart
if (Test-Path "$env:LOCALAPPDATA\Docker\Docker Desktop.exe") {
    # Create shortcut to startup folder with autostart parameter
    $dockerShortcutPath = "$startupFolder\Docker-Desktop.lnk"
    if (-not (Test-Path $dockerShortcutPath)) {
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($dockerShortcutPath)
        $Shortcut.TargetPath = "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
        $Shortcut.Arguments = "--autostart"
        $Shortcut.Save()
        Write-Host "✓ Docker Desktop autostart enabled" -ForegroundColor Green
    } else {
        Write-Host "✓ Docker Desktop autostart already configured" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ Docker Desktop not found at default location" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Creating startup shortcut..." -ForegroundColor Yellow

# Create startup shortcut
if (Test-Path $startupScript) {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $startupScript
    $Shortcut.WorkingDirectory = $projectPath
    $Shortcut.Description = "Start Bot Agent Platform"
    $Shortcut.Save()

    Write-Host "✓ Startup shortcut created" -ForegroundColor Green
    Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
} else {
    Write-Host "✗ startup.bat not found at $startupScript" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next time you restart your computer:" -ForegroundColor White
Write-Host "  1. Docker Desktop will start automatically" -ForegroundColor Cyan
Write-Host "  2. PostgreSQL and Redis will start" -ForegroundColor Cyan
Write-Host "  3. Backend service will start on port 8915" -ForegroundColor Cyan
Write-Host ""
Write-Host "To uninstall, delete these shortcuts from:" -ForegroundColor Yellow
Write-Host "  $startupFolder" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..."
pause >$null
