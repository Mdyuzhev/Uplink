Обновить документацию по фактическому состоянию проекта.

## Что проверить

```bash
# Структура
find src/ -name '*.ts' -o -name '*.tsx' | sort

# Компоненты
echo "--- Commands ---"
ls src/commands/*.ts 2>/dev/null
echo "--- Matrix ---"
ls src/matrix/*.ts 2>/dev/null
echo "--- LiveKit ---"
ls src/livekit/*.ts 2>/dev/null
echo "--- WebView ---"
find src/webview/ -name '*.tsx' 2>/dev/null | sort
echo "--- Providers ---"
ls src/providers/*.ts 2>/dev/null

# Тесты
ls test/suite/*.test.ts 2>/dev/null

# package.json
cat package.json | grep -A 20 '"contributes"'
cat package.json | grep -A 20 '"dependencies"'

# Docker
ls docker/ 2>/dev/null
cat docker/docker-compose.yml 2>/dev/null | head -30
```

## Что обновить

1. **README.md:**
   - Описание проекта и скриншоты (если есть)
   - Инструкция по установке и запуску (расширение + серверы)
   - Список реализованных фич (✅) и запланированных (⬜)
   - Настройки подключения

2. **`.claude/CLAUDE.md`:**
   - Секция "Текущее состояние" — обновить статусы компонентов
   - Секция "Структура проекта" — по фактической структуре
   - Технический стек — актуализировать зависимости

3. **CHANGELOG.md** (создать если нет):
   - Что добавлено/изменено с последнего обновления

4. **docs/setup.md:**
   - Актуальные шаги развёртывания серверов
   - Версии Docker-образов

## Правила

- Документация на русском
- Только факты — не выдумывай функционал, которого нет
- Не удаляй концептуальные секции из CLAUDE.md
- Закоммить: `[docs] Обновлена документация`
