Зафиксировать и залить изменения.

1. `git status`
2. `git diff --stat`
3. Запусти линтер: `npx eslint src/ --ext .ts,.tsx 2>/dev/null || echo "ESLint не настроен"`
4. Запусти тесты: `npm test 2>/dev/null || echo "Тесты не настроены"`
5. Если линтер или тесты падают — СТОП, сначала чини
6. `git add -A`
7. Сформируй сообщение коммита (на русском, с префиксом)
8. `git commit -m "[prefix] сообщение"`
9. `git push origin main`

## Префиксы

`[ext]` `[matrix]` `[livekit]` `[webview]` `[infra]` `[docs]` `[test]` `[fix]` `[refactor]`

## Правила

- НИКОГДА не пушь если тесты или линтер падают
- Один коммит = одна логическая единица
- Не коммить: node_modules/, out/, dist/, .env (проверь .gitignore)
