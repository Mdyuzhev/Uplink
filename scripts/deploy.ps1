# Деплой Uplink на сервер
# Запуск: powershell scripts/deploy.ps1

$Server = "flomaster@flomasterserver"
$RemotePath = "~/projects/uplink"

Write-Host "=== Uplink Deploy ===" -ForegroundColor Cyan

# 1. Коммит и пуш (если есть изменения)
Write-Host "1. Git push..." -ForegroundColor Yellow
git add -A
$status = git status --porcelain
if ($status) {
    $msg = Read-Host "Commit message (Enter для 'update')"
    if (-not $msg) { $msg = "update" }
    git commit -m $msg
}
git push

# 2. SSH: pull + rebuild
Write-Host "2. Deploying on server..." -ForegroundColor Yellow
ssh $Server "cd $RemotePath && ./deploy.sh"

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
