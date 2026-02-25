# 019: Десктопное приложение — Tauri v2 (Windows, macOS, Linux)

## Статус: КОД ГОТОВ, БЛОКЕР — Windows SDK

Всё закоммичено и запушено. Блокер для локальной сборки:
`LNK1181: kernel32.lib` — нет Windows 10/11 SDK.

**Для разблокировки:**
1. Visual Studio Installer → VS 2019 Build Tools → Modify
2. Включить **Windows 10 SDK** (или Windows 11 SDK)
3. После установки: `npm run tauri:build` из **PowerShell** (не bash/MSYS2)

GitHub Actions CI соберёт на всех платформах без этого блокера.

---

## Цель

Обернуть веб-приложение Uplink в нативное десктопное приложение через Tauri v2. Один и тот же React-фронтенд, три платформы: Windows (.exe/.msi), macOS (.dmg), Linux (.deb/.AppImage).

## Зачем

- Нативные системные уведомления (не зависят от разрешений браузера)
- Иконка в системном трее с бэджем непрочитанных
- Автозапуск при включении компа
- Запоминание позиции/размера окна
- Бинарник 5-10MB (vs Electron ~150MB)
- Выглядит как полноценное приложение, а не вкладка браузера

## Зависимости

- Веб-приложение (`E:\Uplink\web`) — работает ✅
- Vite + React + TypeScript — настроены ✅
- GitHub репозиторий — есть ✅

## Предусловия

### Rust (OBЯЗАТЕЛЬНО перед началом)

Rust НЕ установлен на машине. Агент должен **первым делом** попросить пользователя установить его:

1. Скачать https://rustup.rs → нажать «Download rustup-init.exe (64-bit)»
2. Запустить, в терминале выбрать **1 (default)**, дождаться установки
3. Перезапустить терминал и проверить: `rustc --version` (должно показать 1.70+)

Агент НЕ продолжает выполнение пока пользователь не подтвердит что `rustc --version` работает.

### Остальное

```bash
# Node.js — уже есть (проверить)
node --version    # 18+

# Microsoft Visual Studio C++ Build Tools — нужны для Tauri на Windows
# Если нет — скачать Visual Studio Build Tools:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Выбрать "Desktop development with C++"
```

---

## ЧАСТЬ 1: Инициализация Tauri в проекте

### ШАГ 1.1. Установить Tauri CLI

```bash
cd E:\Uplink\web
npm install -D @tauri-apps/cli@latest
```

### ШАГ 1.2. Инициализировать Tauri

```bash
npx tauri init
```

Tauri задаст вопросы. Ответы:

- **What is your app name?** → `Uplink`
- **What should the window title be?** → `Uplink`
- **Where are your web assets (HTML/CSS/JS) located relative to tauri.conf.json?** → `../dist`
- **What is the URL of your dev server?** → `http://localhost:5173`
- **What is your frontend dev command?** → `npm run dev`
- **What is your frontend build command?** → `npm run build`

Это создаст папку `E:\Uplink\web\src-tauri/` со структурой:

```
src-tauri/
├── Cargo.toml          # Rust-зависимости
├── tauri.conf.json     # Конфиг приложения
├── src/
│   └── main.rs         # Точка входа Rust
├── icons/              # Иконки приложения
└── capabilities/       # Разрешения (Tauri v2)
```

### ШАГ 1.3. Установить Tauri API для фронтенда

```bash
cd E:\Uplink\web
npm install @tauri-apps/api@latest
```

### ШАГ 1.4. Добавить npm-скрипты

В `E:\Uplink\web\package.json` добавить скрипты:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "tsc && vite build",
    "preview": "vite preview --port 5173",
    "lint": "eslint . --ext ts,tsx",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### ШАГ 1.5. Проверить что dev-режим работает

```bash
cd E:\Uplink\web
npm run tauri:dev
```

Должно открыться нативное окно с Uplink внутри. Весь функционал (чат, звонки, видео) должен работать как в браузере.

Если появляется ошибка Rust — проверить что `rustc` и `cargo` доступны в PATH.

---

## ЧАСТЬ 2: Настройка tauri.conf.json

### ШАГ 2.1. Обновить конфигурацию

Файл: `E:\Uplink\web\src-tauri\tauri.conf.json`

Заменить содержимое на:

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json",
  "productName": "Uplink",
  "version": "0.1.0",
  "identifier": "com.uplink.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "title": "Uplink",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "center": true,
        "resizable": true,
        "decorations": true
      }
    ],
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    },
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "wix": {
        "language": "ru-RU"
      },
      "nsis": {
        "languages": ["Russian"],
        "displayLanguageSelector": false
      }
    },
    "macOS": {
      "minimumSystemVersion": "10.15"
    },
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0"]
      },
      "appimage": {}
    }
  }
}
```

**Ключевые настройки:**
- `frontendDist: "../dist"` — Tauri берёт собранный Vite-бандл
- `devUrl: "http://localhost:5173"` — в dev-режиме подключается к Vite HMR
- `bundle.targets: "all"` — собирать для всех форматов текущей платформы
- `trayIcon` — иконка в системном трее
- `security.csp: null` — отключить CSP (нужно для WebSocket к LiveKit Cloud и Matrix)
- `windows.nsis` — NSIS-инсталлятор для Windows с русским языком
- `linux.deb` + `linux.appimage` — оба формата для Linux
- `macOS.minimumSystemVersion: "10.15"` — Catalina+

---

## ЧАСТЬ 3: Rust-бэкенд — трей, автозапуск

### ШАГ 3.1. Добавить зависимости в Cargo.toml

Файл: `E:\Uplink\web\src-tauri\Cargo.toml`

В секцию `[dependencies]` добавить плагины:

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-notification = "2"
tauri-plugin-autostart = "2"
tauri-plugin-window-state = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Плагины:
- **notification** — нативные уведомления ОС (лучше чем Web Notification API)
- **autostart** — добавить в автозагрузку при включении компа
- **window-state** — запоминать позицию/размер окна между запусками

### ШАГ 3.2. Обновить main.rs

Файл: `E:\Uplink\web\src-tauri\src\main.rs`

Заменить содержимое на:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    Manager,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

fn main() {
    tauri::Builder::default()
        // Запоминать позицию и размер окна
        .plugin(tauri_plugin_window_state::Builder::new().build())
        // Нативные уведомления
        .plugin(tauri_plugin_notification::init())
        // Автозапуск при включении ОС
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            // Создать иконку в системном трее
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Uplink")
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            // Клик по трею → показать/скрыть окно
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        // При закрытии окна — скрыть в трей, а не убивать процесс
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Uplink");
}
```

**Что делает:**
- При запуске создаёт иконку в трее
- Клик по трею — показать/скрыть окно (toggle)
- При нажатии «крестик» — окно скрывается в трей, а не закрывается (мессенджер должен работать в фоне)
- Запоминает позицию/размер окна через плагин window-state
- Автозапуск через плагин autostart

### ШАГ 3.3. Разрешения (capabilities)

Файл: `E:\Uplink\web\src-tauri\capabilities\default.json`

```json
{
  "identifier": "default",
  "description": "Default capabilities for Uplink",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "notification:default",
    "notification:allow-notify",
    "notification:allow-request-permission",
    "notification:allow-is-permission-granted",
    "autostart:default",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled",
    "window-state:default"
  ]
}
```

---

## ЧАСТЬ 4: Иконки приложения

### ШАГ 4.1. Сгенерировать иконки

Tauri нужны иконки разных размеров и форматов. Самый простой способ — подготовить одну PNG 1024×1024 и сгенерировать остальные:

```bash
cd E:\Uplink\web
npx tauri icon path/to/icon-1024x1024.png
```

Эта команда создаст все нужные форматы в `src-tauri/icons/`:
- `icon.ico` — Windows
- `icon.icns` — macOS
- `32x32.png`, `128x128.png`, `128x128@2x.png` — все платформы
- `icon.png` — трей

Если у пользователя нет готовой иконки 1024×1024, агент может:
1. Создать простую SVG-иконку (стрелка вверх / молния в круге) и конвертировать в PNG
2. Или попросить пользователя предоставить изображение

**Спросить пользователя:** «Есть ли готовая иконка для приложения (PNG, минимум 512×512)? Если нет, создам простую.»

---

## ЧАСТЬ 5: Нативные уведомления (замена Web Notification API)

### ШАГ 5.1. Обновить useNotifications.ts

В десктопном приложении лучше использовать нативные уведомления через Tauri API вместо Web Notification. Они работают надёжнее и выглядят нативно для каждой ОС.

Файл: `E:\Uplink\web\src\hooks\useNotifications.ts`

Добавить определение окружения и выбор способа уведомлений:

```typescript
import { useEffect, useRef } from 'react';
import { matrixService } from '../matrix/MatrixService';

// Проверить, работаем ли мы внутри Tauri
const isTauri = '__TAURI_INTERNALS__' in window;

/** Показать уведомление — нативное (Tauri) или браузерное */
async function showNotification(title: string, body: string, onClick?: () => void) {
    if (isTauri) {
        try {
            const { sendNotification, isPermissionGranted, requestPermission } =
                await import('@tauri-apps/plugin-notification');
            let permitted = await isPermissionGranted();
            if (!permitted) {
                const result = await requestPermission();
                permitted = result === 'granted';
            }
            if (permitted) {
                sendNotification({ title, body });
            }
        } catch (err) {
            console.warn('Tauri notification failed:', err);
        }
    } else {
        // Fallback на браузерные уведомления
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const notification = new Notification(title, {
            body,
            icon: '/uplink-icon.png',
            silent: false,
        });
        if (onClick) {
            notification.onclick = () => {
                window.focus();
                onClick();
                notification.close();
            };
        }
        setTimeout(() => notification.close(), 5000);
    }
}

export function useNotifications(
    activeRoomId: string | null,
    onNavigateToRoom: (roomId: string) => void
) {
    const activeRoomIdRef = useRef(activeRoomId);
    activeRoomIdRef.current = activeRoomId;

    const onNavigateRef = useRef(onNavigateToRoom);
    onNavigateRef.current = onNavigateToRoom;

    // Запросить разрешение при монтировании
    useEffect(() => {
        if (isTauri) {
            // Tauri — разрешение запросится при первом уведомлении
        } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const unsub = matrixService.onNewMessage((roomId, event) => {
            const senderId = event.getSender();
            if (senderId === matrixService.getUserId()) return;
            if (roomId === activeRoomIdRef.current && document.hasFocus()) return;

            const senderName = matrixService.getDisplayName(senderId!);
            const content = event.getContent();
            const msgtype = content.msgtype;

            let notifBody: string;
            if (msgtype === 'm.image') {
                notifBody = '📷 Фото';
            } else if (msgtype === 'm.file') {
                notifBody = '📎 Файл';
            } else {
                const body = content.body || 'Новое сообщение';
                notifBody = body.length > 100 ? body.substring(0, 100) + '...' : body;
            }

            showNotification(
                `Новое сообщение от ${senderName}`,
                notifBody,
                () => onNavigateRef.current(roomId)
            );
        });
        return unsub;
    }, []);
}
```

Это обратно-совместимо: в браузере работает как раньше (Web Notification), в Tauri — нативные уведомления.

### ШАГ 5.2. Установить Tauri notification плагин для фронтенда

```bash
cd E:\Uplink\web
npm install @tauri-apps/plugin-notification@latest
```

---

## ЧАСТЬ 6: Кросс-платформенная сборка через GitHub Actions

Собрать под macOS и Linux нельзя на Windows — нужен CI. GitHub Actions позволяет собирать на всех трёх ОС параллельно.

### ШАГ 6.1. Создать workflow

Файл: `E:\Uplink\.github\workflows\build-desktop.yml`

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'  # Запускается при создании тега v0.1.0, v0.2.0, ...
  workflow_dispatch:  # Ручной запуск

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
          - platform: macos-latest
            target: aarch64-apple-darwin
          - platform: macos-latest
            target: x86_64-apple-darwin
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            patchelf

      - name: Install frontend dependencies
        working-directory: web
        run: npm ci

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: web
          tauriScript: npx tauri
          args: --target ${{ matrix.target }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: uplink-${{ matrix.target }}
          path: |
            web/src-tauri/target/${{ matrix.target }}/release/bundle/**/*.exe
            web/src-tauri/target/${{ matrix.target }}/release/bundle/**/*.msi
            web/src-tauri/target/${{ matrix.target }}/release/bundle/**/*.dmg
            web/src-tauri/target/${{ matrix.target }}/release/bundle/**/*.deb
            web/src-tauri/target/${{ matrix.target }}/release/bundle/**/*.AppImage

  # Собрать все артефакты в один релиз
  release:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')
    permissions:
      contents: write

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: artifacts/**/*
          draft: true
          generate_release_notes: true
```

**Что делает:**
- При создании git-тега `v*` (или вручную) → запускает сборку параллельно на 4 целях
- Windows: `.exe` (NSIS installer) + `.msi`
- macOS Intel: `.dmg`
- macOS Apple Silicon: `.dmg`
- Linux: `.deb` + `.AppImage`
- Все артефакты загружаются в GitHub Release (как черновик)

### ШАГ 6.2. Как выпустить релиз

```bash
cd E:\Uplink
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions соберёт все бинарники и создаст черновик релиза. Зайти на GitHub → Releases → проверить → опубликовать.

---

## ЧАСТЬ 7: Локальная сборка (Windows)

Для быстрого теста на своей машине:

### ШАГ 7.1. Dev-режим

```bash
cd E:\Uplink\web
npm run tauri:dev
```

Откроется нативное окно. Hot reload работает — изменения в React-коде подхватываются мгновенно.

### ШАГ 7.2. Production build

```bash
cd E:\Uplink\web
npm run tauri:build
```

Результат в `src-tauri/target/release/bundle/`:
- `nsis/Uplink_0.1.0_x64-setup.exe` — NSIS-установщик
- `msi/Uplink_0.1.0_x64_en-US.msi` — MSI-установщик

### ШАГ 7.3. Запустить установщик

Запустить `.exe` или `.msi` → Uplink устанавливается в Program Files, создаёт ярлык на рабочем столе.

---

## ЧАСТЬ 8: Обновить .gitignore

Файл: `E:\Uplink\.gitignore` (или `E:\Uplink\web\.gitignore`)

Добавить:

```gitignore
# Tauri
src-tauri/target/
src-tauri/gen/
```

`target/` — Rust build output, может весить гигабайты. Не коммитить.

---

## ЧАСТЬ 9: Проверка

### ШАГ 9.1. Dev-режим (Windows)

```bash
cd E:\Uplink\web
npm run tauri:dev
```

Проверить:
- [ ] Окно открывается с Uplink
- [ ] Логин работает
- [ ] Чат — сообщения отправляются/принимаются
- [ ] Звонки — аудио/видео через LiveKit Cloud
- [ ] Иконка в трее — кликнуть → окно показывается/скрывается
- [ ] Крестик — окно скрывается (не закрывается)
- [ ] Уведомления — нативные (тест: открыть другой чат, получить сообщение)

### ШАГ 9.2. Production build (Windows)

```bash
npm run tauri:build
```

Проверить:
- [ ] Сборка проходит без ошибок
- [ ] `.exe` установщик работает
- [ ] Приложение запускается после установки
- [ ] Автозапуск при включении компьютера (после активации в настройках)

### ШАГ 9.3. CI/CD (GitHub Actions)

```bash
git tag v0.1.0
git push origin v0.1.0
```

Проверить на GitHub:
- [ ] Actions → workflow запустился
- [ ] Windows, macOS, Linux сборки прошли
- [ ] Артефакты доступны для скачивания
- [ ] Release черновик создан со всеми файлами

---

## Критерии приёмки

- [ ] `npm run tauri:dev` — окно с Uplink открывается, всё работает
- [ ] `npm run tauri:build` — `.exe`/`.msi` собирается на Windows
- [ ] Иконка в системном трее, toggle по клику
- [ ] Крестик → скрыть в трей (не закрывать)
- [ ] Нативные уведомления (Tauri) + fallback на Web Notification в браузере
- [ ] Автозапуск через плагин (можно включить/выключить)
- [ ] Позиция/размер окна запоминается между запусками
- [ ] GitHub Actions: `.exe`, `.dmg` (Intel + ARM), `.deb`, `.AppImage`
- [ ] `.gitignore` — `src-tauri/target/` не коммитится

## Коммит

```
[desktop] Tauri v2 — нативное приложение для Windows/macOS/Linux

- Tauri обёртка для существующего React-фронтенда
- Системный трей: toggle окна, работа в фоне
- Нативные уведомления (Tauri plugin-notification)
- Автозапуск при включении ОС (plugin-autostart)
- Запоминание окна (plugin-window-state)
- GitHub Actions: кросс-платформенная сборка
- Артефакты: .exe, .msi, .dmg (Intel+ARM), .deb, .AppImage
```
