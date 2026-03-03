# CSS стратегия

## Текущее состояние

- 15 глобальных CSS файлов (~5000 строк)
- Переменные в `variables.css` — глобальные, не трогать
- Базовые стили в `global.css` — глобальные, не трогать
- `mobile.css` — адаптив, глобальный

## Правила для новых компонентов

- Использовать CSS Modules: `Component.module.css`
- Импорт: `import styles from './Component.module.css'`
- Классы через `styles.className`
- camelCase для составных имён: `styles.recordingDot` (не `recording-dot`)

## Миграция существующих

- Инкрементально: при касании компонента — переводить его CSS на modules
- Не мигрировать всё сразу
- Пример: `VoiceRecordBar.module.css` (первый переведённый)

## Что уже переведено

| Компонент | Файл |
|-----------|------|
| VoiceRecordBar | `VoiceRecordBar.module.css` |
