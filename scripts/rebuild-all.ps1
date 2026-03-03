# Uplink: полная пересборка и настройка
# Запуск: powershell scripts/rebuild-all.ps1

$ErrorActionPreference = "Continue"

Write-Host "=== 1. Пересборка и перезапуск Docker ===" -ForegroundColor Cyan
Set-Location E:\Uplink\docker

# Остановить всё
docker compose down

# Пересобрать web-контейнер (с новым кодом)
Write-Host "  Сборка web-контейнера (может занять 1-2 мин)..." -ForegroundColor Yellow
docker compose build uplink

# Запустить всё
docker compose up -d
Write-Host "  Ждём запуск Synapse (30 сек)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Проверить здоровье Synapse
$health = $null
for ($i = 0; $i -lt 10; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8008/health" -TimeoutSec 5
        break
    } catch {
        Write-Host "  Synapse ещё запускается... ($($i+1)/10)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if (-not $health) {
    Write-Host "  ОШИБКА: Synapse не отвечает!" -ForegroundColor Red
    exit 1
}
Write-Host "  Synapse OK" -ForegroundColor Green

# === 2. Создать/обновить пользователей ===
Write-Host "`n=== 2. Пользователи ===" -ForegroundColor Cyan

$SynapseUrl = "http://localhost:8008"

try {
    $loginResp = Invoke-RestMethod -Uri "$SynapseUrl/_matrix/client/v3/login" -Method Post -ContentType "application/json" -Body '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}'
    $adminToken = $loginResp.access_token
} catch {
    Write-Host "  ОШИБКА: не удалось залогиниться как admin" -ForegroundColor Red
    exit 1
}
Write-Host "  Admin token OK" -ForegroundColor Green

$users = @(
    @{username="alice"; displayname="Alice Иванова"},
    @{username="bob"; displayname="Bob Петров"},
    @{username="charlie"; displayname="Charlie Сидоров"},
    @{username="diana"; displayname="Diana Козлова"},
    @{username="eve"; displayname="Eve Смирнова"}
)

foreach ($u in $users) {
    $body = @{
        password = "test123"
        admin = $false
        deactivated = $false
        displayname = $u.displayname
    } | ConvertTo-Json -Depth 3

    try {
        Invoke-RestMethod -Uri "$SynapseUrl/_synapse/admin/v2/users/@$($u.username):uplink.local" `
            -Method Put `
            -Headers @{Authorization="Bearer $adminToken"} `
            -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
        Write-Host "  @$($u.username):uplink.local ($($u.displayname))" -ForegroundColor Green
    } catch {
        Write-Host "  @$($u.username):uplink.local — ошибка: $_" -ForegroundColor Red
    }
}

# Проверить логин каждого пользователя
Write-Host "`n=== 3. Проверка логина ===" -ForegroundColor Cyan
foreach ($u in $users) {
    try {
        $r = Invoke-RestMethod -Uri "$SynapseUrl/_matrix/client/v3/login" -Method Post -ContentType "application/json" -Body "{`"type`":`"m.login.password`",`"user`":`"$($u.username)`",`"password`":`"test123`"}"
        if ($r.access_token) {
            Write-Host "  $($u.username): OK" -ForegroundColor Green
        } else {
            Write-Host "  $($u.username): токен пустой!" -ForegroundColor Red
        }
    } catch {
        Write-Host "  $($u.username): ОШИБКА — $_" -ForegroundColor Red
    }
}

# === 4. Проверить web-контейнер ===
Write-Host "`n=== 4. Проверка web-контейнера ===" -ForegroundColor Cyan
try {
    $webResp = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 10 -UseBasicParsing
    if ($webResp.StatusCode -eq 200) {
        Write-Host "  http://localhost:3001 — OK (status 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  http://localhost:3001 — ОШИБКА: $_" -ForegroundColor Red
}

# Проверить проксирование Matrix API через nginx
try {
    $proxyResp = Invoke-RestMethod -Uri "http://localhost:3001/_matrix/client/versions" -TimeoutSec 10
    if ($proxyResp.versions) {
        Write-Host "  /_matrix/ proxy — OK (versions: $($proxyResp.versions -join ', '))" -ForegroundColor Green
    }
} catch {
    Write-Host "  /_matrix/ proxy — ОШИБКА: $_" -ForegroundColor Red
}

# === 5. Наполнение тестовыми данными ===
Write-Host "`n=== 5. Наполнение данными (seed) ===" -ForegroundColor Cyan
Set-Location E:\Uplink
try {
    node scripts/seed-test-data.mjs
    Write-Host "  Seed OK" -ForegroundColor Green
} catch {
    Write-Host "  Seed ошибка: $_" -ForegroundColor Red
}

# === Итог ===
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ГОТОВО!" -ForegroundColor Green
Write-Host ""
Write-Host "Веб-приложение: http://localhost:3001" -ForegroundColor White
Write-Host "Synapse API:    http://localhost:8008" -ForegroundColor White
Write-Host "Synapse Admin:  http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Пользователи (пароль test123):" -ForegroundColor White
Write-Host "  @alice:uplink.local   (Alice Иванова)" -ForegroundColor Gray
Write-Host "  @bob:uplink.local     (Bob Петров)" -ForegroundColor Gray
Write-Host "  @charlie:uplink.local (Charlie Сидоров)" -ForegroundColor Gray
Write-Host "  @diana:uplink.local   (Diana Козлова)" -ForegroundColor Gray
Write-Host "  @eve:uplink.local     (Eve Смирнова)" -ForegroundColor Gray
Write-Host ""
Write-Host "Поле 'Сервер' на экране логина оставить по умолчанию!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
