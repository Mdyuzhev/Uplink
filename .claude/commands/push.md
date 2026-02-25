Зафиксировать и залить изменения.

1. `git status`
2. `git diff --stat`
3. Если есть проблемы (ошибки TypeScript, сломанная сборка) — СТОП, сначала чини
4. `git add -A`
5. Сформируй сообщение коммита (на русском, с префиксом)
6. `git commit -m "[prefix] сообщение"`
7. `git push origin main`
8. Деплой: если webhook настроен — происходит автоматически после push.
   Fallback: `bash scripts/deploy-remote.sh` (НЕ голый ssh!)

## Префиксы

`[chat]` `[matrix]` `[livekit]` `[infra]` `[docs]` `[fix]` `[refactor]` `[tauri]` `[style]`

## Правила

- Один коммит = одна логическая единица
- Не коммить: node_modules/, dist/, .env
- Коммит на русском
