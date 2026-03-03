Зафиксировать изменения и отправить в main. CI задеплоит автоматически.

1. `git status && git diff --stat`
2. Проверка: `cd web && npx tsc --noEmit` — если ошибки, СТОП
3. `git add -A`
4. `git commit -m "[prefix] описание на русском"`
5. `git push origin main`
6. CI деплой запустится автоматически (GitHub Actions → SSH → deploy-prod.sh)

## Префиксы
`[prod]` production readiness, `[chat]` UI, `[matrix]` Matrix, `[livekit]` звонки, `[infra]` Docker, `[fix]` баг, `[refactor]` рефакторинг, `[style]` стили, `[docs]` документация, `[test]` тесты

## Правила
- Один коммит = одна логическая единица
- Не коммить: node_modules/, dist/, docker/.env
- Сообщение на русском
- НЕ деплоить через SSH. Только git push → CI.
