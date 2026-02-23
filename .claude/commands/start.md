Актуализируй контекст перед началом работы.

1. Прочитай `.claude/CLAUDE.md` — основной контекст проекта
2. Прочитай `README.md` (если существует)
3. Прочитай `package.json` (если существует)
4. Посмотри структуру: `find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './out/*' -not -path './dist/*' | head -60`
5. Git-статус: `git status && git log --oneline -5`
6. Зависимости: `cat package.json | grep -A 50 '"dependencies"' | head -30`
7. Задачи: `ls Tasks/backlog/ Tasks/done/ 2>/dev/null`
8. Docker: `docker compose -f docker/docker-compose.yml ps 2>/dev/null || echo "Инфраструктура не запущена"`

Выведи краткий отчёт:
```
Uplink — статус проекта
═══════════════════════════
Компоненты:
  Extension scaffold:  ✅/⬜
  Matrix клиент:       ✅/⬜
  Chat WebView:        ✅/⬜
  Call WebView:        ✅/⬜
  Sidebar:             ✅/⬜
  Docker infra:        ✅/⬜

Ветка:          ...
Последний коммит: ...
Задач в backlog: X
Задач выполнено: X
Инфраструктура:  running/stopped
```

НЕ создавай файлы. НЕ меняй код. Только читай и отчитывайся.
