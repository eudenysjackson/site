# Inicia site (8080) + API upload (8082) — so node.exe, sem npx
$NodeDir = "C:\Program Files\nodejs"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$NodeDir\node.exe")) {
    Write-Host "Node.js nao encontrado. Instale em https://nodejs.org" -ForegroundColor Red
    exit 1
}

$env:Path = "$NodeDir;$env:Path"
Set-Location $Root

function Test-Api {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8082/api/health" -UseBasicParsing -TimeoutSec 2
        return ($r.Content -match '"ok"\s*:\s*true')
    } catch { return $false }
}

function Test-Site {
    try {
        Invoke-WebRequest -Uri "http://localhost:8080/admin/index.html" -UseBasicParsing -TimeoutSec 2 | Out-Null
        return $true
    } catch { return $false }
}

function Test-Decap {
    try {
        Invoke-WebRequest -Uri "http://localhost:8081/" -UseBasicParsing -TimeoutSec 2 | Out-Null
        return $true
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) { return $true }
        return $false
    }
}

Write-Host ""
Write-Host "Denys Jackson - ambiente local" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Api)) {
    Write-Host "Subindo API (8082)..." -ForegroundColor Yellow
    Start-Process -FilePath "$NodeDir\node.exe" -ArgumentList "scripts/local-api.js" -WorkingDirectory $Root
    Start-Sleep -Seconds 2
} else {
    Write-Host "API 8082: OK" -ForegroundColor Green
}

if (-not (Test-Site)) {
    Write-Host "Subindo site (8080)..." -ForegroundColor Yellow
    Start-Process -FilePath "$NodeDir\node.exe" -ArgumentList "scripts/serve-static.js" -WorkingDirectory $Root
    Start-Sleep -Seconds 2
} else {
    Write-Host "Site 8080: OK" -ForegroundColor Green
}

if (-not (Test-Decap)) {
    Write-Host "Subindo CMS proxy (8081)..." -ForegroundColor Yellow
    Start-Process -FilePath "$NodeDir\npx.cmd" -ArgumentList "--yes decap-server" -WorkingDirectory $Root -WindowStyle Hidden
    Start-Sleep -Seconds 4
} else {
    Write-Host "CMS proxy 8081: OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pronto!" -ForegroundColor Green
Write-Host "  Site:  http://localhost:8080/"
Write-Host "  Admin: http://localhost:8080/admin/index.html"
Write-Host ""
Write-Host "No admin local: clique em 'Login' (backend local, sem token)." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Comandos manuais (se precisar):" -ForegroundColor DarkGray
Write-Host '  $env:Path = "C:\Program Files\nodejs;" + $env:Path'
Write-Host "  node scripts/local-api.js"
Write-Host "  node scripts/serve-static.js"
Write-Host "  npx --yes decap-server"
Write-Host ""
