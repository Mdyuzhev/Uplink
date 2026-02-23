Ревью кода: стиль, архитектура, тесты.

1. Посмотри что изменилось: `git diff --name-only HEAD~3`
2. Для каждого файла проверь:

## Стиль
- TypeScript strict, нет `any` без обоснования
- ESLint чистый, Prettier форматирование
- Комментарии/документация на русском
- Экспорты явные, нет `export *`

## Архитектура
- Matrix-модули не импортируют LiveKit и наоборот (изоляция)
- WebView общается с extension только через postMessage API
- Нет прямых DOM-манипуляций вне WebView
- Конфигурация через VS Code settings API, не хардкод
- Нет синхронных операций, блокирующих event loop
- Dispose pattern: все подписки отписываются при деактивации

## Безопасность
- Токены не хардкодятся, используется SecretStorage API
- WebView CSP настроен корректно
- Нет eval(), innerHTML с пользовательскими данными
- Matrix E2E — ключи не логируются

## Тесты
- Каждый модуль имеет тест
- Тест проверяет happy path и error handling
- Моки для Matrix/LiveKit SDK
- Тесты проходят

## Общее
- Нет хардкода URL серверов
- Нет секретов и паролей в коде
- .gitignore актуален (node_modules, out, dist, .env)
- package.json — зависимости актуальны

Формат:
```
Uplink Code Review
═══════════════════════
Файлов проверено: X

✅ extension.ts — OK
⚠️ matrix/client.ts — нет обработки ошибки переподключения
❌ webview/chat/App.tsx — innerHTML без санитизации

Итого: X ✅ / X ⚠️ / X ❌
```
