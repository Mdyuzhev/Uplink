Показать состояние проекта.

```bash
echo "=== Структура ==="
find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './out/*' -not -path './dist/*' -not -name '*.map' | sort

echo "=== Git ==="
git branch -v
git log --oneline -10
git status --short

echo "=== Компоненты ==="
echo "--- Extension ---"
ls src/extension.ts 2>/dev/null && echo "✅" || echo "⬜"
echo "--- Commands ---"
ls src/commands/*.ts 2>/dev/null | wc -l
echo "--- Matrix ---"
ls src/matrix/*.ts 2>/dev/null | wc -l
echo "--- LiveKit ---"
ls src/livekit/*.ts 2>/dev/null | wc -l
echo "--- WebView Chat ---"
ls src/webview/chat/*.tsx 2>/dev/null | wc -l
echo "--- WebView Call ---"
ls src/webview/call/*.tsx 2>/dev/null | wc -l

echo "=== Тесты ==="
npm test 2>/dev/null || echo "Тесты не настроены"

echo "=== Инфраструктура ==="
docker compose -f docker/docker-compose.yml ps 2>/dev/null || echo "Docker не запущен"

echo "=== Backlog ==="
ls Tasks/backlog/ 2>/dev/null || echo "Пусто"
echo "=== Done ==="
ls Tasks/done/ 2>/dev/null || echo "Пусто"
```

Формат вывода:
```
Uplink — Status Report
═══════════════════════════════════
Extension:    scaffold ✅/⬜
Matrix:       X модулей
LiveKit:      X модулей
Chat UI:      X компонентов
Call UI:      X компонентов
Тесты:        X passed / X failed
Ветка:        main (clean/dirty)
Коммитов:     X
Задачи:       X в backlog / X выполнено
Инфраструктура: running/stopped

Последние изменения:
- [дата] коммит...
```
