# Задача 056 — Кнопка обновления в Tauri + подпись установщика

## Проблема 1 — Кнопка «Скачать обновление» не работает в Tauri

### Причина

В `ProfileModal.tsx` кнопка реализована как `<a href="..." target="_blank">`.
В Tauri WebView2 (Windows) и WKWebView (macOS) ссылки с `target="_blank"` на
внешние URL по умолчанию не открываются ни в системном браузере, ни во
внутреннем webview — они просто игнорируются.

Правильный способ открыть внешнюю ссылку в Tauri — вызвать `open()` из
`@tauri-apps/plugin-shell`. Этот плагин уже подключён (`Cargo.toml`,
`lib.rs`, `tauri.conf.json`), нужно только использовать его API вместо `<a>`.

### Исправление в `ProfileModal.tsx`

Прочитать файл перед правкой.

Добавить импорт в начало файла (рядом с другими импортами):

```typescript
import { isTauri } from '../config';

// Динамический импорт — пакет существует только в Tauri runtime
async function openExternalUrl(url: string): Promise<void> {
    if (isTauri) {
        try {
            // @tauri-apps/plugin-shell — единственный правильный способ
            // открыть внешний URL в Tauri; <a target="_blank"> не работает
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(url);
        } catch (err) {
            // Fallback на случай если плагин недоступен (dev-режим в браузере)
            console.error('shell.open failed:', err);
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
```

Найти в JSX кнопку скачивания обновления. Сейчас это:

```tsx
<a
    href={updateInfo.downloadUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="profile-modal__btn profile-modal__btn--accent"
>
    {isVSCode ? 'Скачать .vsix' : 'Скачать обновление'}
</a>
```

Заменить на `<button>` с обработчиком:

```tsx
<button
    className="profile-modal__btn profile-modal__btn--accent"
    onClick={() => openExternalUrl(updateInfo.downloadUrl)}
>
    {isVSCode ? 'Скачать .vsix' : 'Скачать обновление'}
</button>
```

Важно: `openExternalUrl` — async функция, но в `onClick` не нужно `await` —
просто вызываем и отпускаем. Браузер/система откроет ссылку асинхронно.

---

## Проблема 2 — Windows Defender SmartScreen ругается на установщик

### Причина

SmartScreen — это reputation-based система Microsoft. Она блокирует или
предупреждает о любом `.exe` файле у которого нет цифровой подписи от
доверенного издателя **или** нет накопленной репутации (достаточного
количества запусков у пользователей по всему миру).

Сейчас CI собирает NSIS-установщик (`Uplink_1.0.0_x64-setup.exe`) без
какой-либо подписи. Windows видит неизвестный неподписанный `.exe` и
показывает «Windows защитил ваш компьютер» с кнопкой «Подробнее → Всё равно
запустить».

### Решение — Code Signing сертификат

Единственный настоящий способ убрать предупреждение — подписать бинарь
сертификатом от доверенного CA (Certification Authority).

#### Два уровня сертификатов

**OV (Organization Validation), ~$70–200/год:**
Certum (польский CA, самый дешёвый вариант — есть open-source программа
за €0), Sectigo (~$100/год), SSL.com (~$130/год). SmartScreen всё равно
показывает предупреждение на первых запусках, но через несколько сотен
запусков репутация накапливается и предупреждение пропадает.

**EV (Extended Validation), ~$300–500/год + аппаратный USB-токен:**
DigiCert, Sectigo, SSL.com. SmartScreen пропускает сразу без предупреждений
при первом же запуске — у EV сертификатов нулевой порог репутации.
Недостаток: требует физический HSM-токен (USB-ключ), который нельзя
использовать в облачном CI напрямую без специальных решений.

**Практический выбор для Uplink на этом этапе:**
Certum Open Source Code Signing — бесплатный для open-source проектов.
Если репозиторий публичный (github.com/Mdyuzhev/Uplink), можно подать заявку.
Срок рассмотрения 2–5 дней, даёт OV-сертификат на 1 год бесплатно.
Подробнее: https://www.certum.eu/en/open-source-code-signing/

#### Настройка подписи в GitHub Actions CI

После получения сертификата и экспорта в `.pfx` файл:

**Шаг 1 — Добавить секреты в GitHub репозиторий:**
`Settings → Secrets → Actions → New repository secret`:
- `WINDOWS_CERTIFICATE` — base64-кодированный `.pfx` файл
  ```bash
  # Как закодировать pfx в base64 на Windows PowerShell:
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx"))
  ```
- `WINDOWS_CERTIFICATE_PASSWORD` — пароль от `.pfx`

**Шаг 2 — Изменить `build-desktop.yml`:**

В шаге `Build Tauri app` для Windows-платформы добавить env-переменные
которые Tauri подхватит автоматически для подписи:

```yaml
- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # Подпись Windows установщика — Tauri читает эти переменные автоматически
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.WINDOWS_CERTIFICATE }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
  with:
    projectPath: web
    tauriScript: npx tauri
    args: --target ${{ matrix.target }}
```

Применять только для Windows:

```yaml
- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ matrix.platform == 'windows-latest' && secrets.WINDOWS_CERTIFICATE || '' }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ matrix.platform == 'windows-latest' && secrets.WINDOWS_CERTIFICATE_PASSWORD || '' }}
  with:
    projectPath: web
    tauriScript: npx tauri
    args: --target ${{ matrix.target }}
```

**Шаг 3 — `tauri.conf.json` для Windows подписи:**

Добавить в секцию `bundle.windows`:

```json
"windows": {
    "wix": {
        "language": "ru-RU"
    },
    "nsis": {
        "languages": ["Russian"],
        "displayLanguageSelector": false
    },
    "signCommand": "signtool sign /fd SHA256 /td SHA256 /tr http://timestamp.digicert.com /f certificate.pfx /p %CERTIFICATE_PASSWORD% %1"
}
```

Однако если используется `TAURI_SIGNING_PRIVATE_KEY` env-переменная,
`tauri-action` сам вызывает signtool. `signCommand` нужен только для
кастомных CI пайплайнов без `tauri-action`.

#### Временный обходной путь (до получения сертификата)

Можно добавить в NSIS-скрипт метаданные издателя и URL — это не убирает
предупреждение, но делает диалог SmartScreen более понятным для пользователя
(показывает имя автора вместо «Неизвестный издатель»):

В `tauri.conf.json` добавить в `bundle`:
```json
"publisher": "Uplink Team",
"copyright": "Copyright © 2024 Uplink Team",
"homepage": "https://uplink.wh-lab.ru"
```

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `web/src/components/ProfileModal.tsx` | Заменить `<a>` на `<button onClick={openExternalUrl}>`, добавить функцию `openExternalUrl` |
| `.github/workflows/build-desktop.yml` | Добавить `TAURI_SIGNING_PRIVATE_KEY` и `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env-переменные в шаг Build Tauri (только после получения сертификата) |
| `web/src-tauri/tauri.conf.json` | Добавить `publisher`, `copyright`, `homepage` в `bundle` |

`lib.rs` и `Cargo.toml` — **не трогать**, `tauri-plugin-shell` уже подключён.

---

## Тестирование кнопки

1. Собрать Tauri `npm run tauri:build` или запустить dev `npm run tauri:dev`.
2. Профиль → О приложении → «Проверить обновления» → дождаться результата.
3. Если обновление найдено — нажать «Скачать обновление».
4. Должен открыться системный браузер (Chrome/Edge/Firefox) с URL ссылки.
5. Если в консоли WebView2 ошибка `shell.open` — проверить что в
   `tauri.conf.json` есть `"plugins": { "shell": { "open": true } }` (уже есть).
