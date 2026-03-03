# Создание тестовых пользователей Uplink (Windows PowerShell)
# Использование: powershell scripts/create-users.ps1

$SynapseUrl = "http://localhost:8008"

# Получить admin токен
$loginResp = Invoke-RestMethod -Uri "$SynapseUrl/_matrix/client/v3/login" -Method Post -ContentType "application/json" -Body '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}'
$token = $loginResp.access_token

if (-not $token) {
    Write-Host "Не удалось получить admin токен" -ForegroundColor Red
    exit 1
}
Write-Host "Admin токен получен" -ForegroundColor Green

# Создать пользователей
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
            -Headers @{Authorization="Bearer $token"} `
            -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
        Write-Host "  @$($u.username):uplink.local ($($u.displayname))" -ForegroundColor Green
    } catch {
        Write-Host "  @$($u.username):uplink.local — ошибка: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Готово! Пароль для всех: test123" -ForegroundColor Cyan
