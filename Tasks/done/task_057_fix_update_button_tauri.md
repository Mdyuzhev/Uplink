# Задача 057 — Исправить кнопку «Скачать обновление» в Tauri

## Проблема

Кнопка «Скачать обновление» в `ProfileModal.tsx` реализована как `<a href target="_blank">`.
В Tauri WebView2 (Windows) внешние ссылки с `target="_blank"` молча игнорируются —
браузер не открывается, ничего не происходит.

`tauri-plugin-shell` уже подключён везде (`Cargo.toml`, `lib.rs`, `tauri.conf.json`).
Нужно только использовать его API вместо `<a>`.

## Исправление в `web/src/components/ProfileModal.tsx`

Прочитать файл перед правкой.

### Шаг 1 — Добавить функцию `openExternalUrl`

Добавить в начало файла (после существующих импортов):

```typescript
import { isTauri } from '../config';

/**
 * Открыть внешний URL.
 * В Tauri <a target="_blank"> не работает — нужен shell.open().
 * В браузере и VS Code — обычный window.open().
 */
async function openExternalUrl(url: string): Promise<void> {
    if (isTauri) {
        try {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(url);
        } catch (err) {
            console.error('[Uplink] shell.open не сработал:', err);
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
```

### Шаг 2 — Заменить `<a>` на `<button>`

Найти в JSX:

```tsx
<a
    href={updateInfo.downloadUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="profile-modal__btn profile-modal__btn--accent"
    onClick={e => e.stopPropagation()}
>
    {isVSCode ? 'Скачать .vsix' : 'Скачать обновление'}
</a>
```

Заменить на:

```tsx
<button
    className="profile-modal__btn profile-modal__btn--accent"
    onClick={() => openExternalUrl(updateInfo.downloadUrl)}
>
    {isVSCode ? 'Скачать .vsix' : 'Скачать обновление'}
</button>
```

Точный вид существующего JSX может немного отличаться — прочитать файл
и найти по классу `profile-modal__btn--accent`.

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `web/src/components/ProfileModal.tsx` | добавить `openExternalUrl`, заменить `<a>` на `<button>` |

`lib.rs`, `Cargo.toml`, `tauri.conf.json` — не трогать, shell-плагин уже подключён.

## Проверка

1. `npm run tauri:dev` — запустить десктоп в dev-режиме.
2. Профиль → О приложении → Проверить обновления.
3. Нажать «Скачать обновление» — должен открыться системный браузер.
4. В браузере (не Tauri) кнопка должна работать через `window.open` как раньше.
