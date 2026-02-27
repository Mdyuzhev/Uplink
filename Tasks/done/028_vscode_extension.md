# 028 — VS Code Extension: WebView SPA, авторизация, базовые команды

## Контекст

Расширение для VS Code — один из двух целевых клиентов Uplink (наряду с десктопом). Позволяет команде общаться прямо из редактора: чат, звонки, реакции, треды, боты — без переключения на другое окно.

В задаче 002 был создан scaffold расширения с отдельным MatrixService, TreeData-провайдерами для sidebar, кастомным WebView. Этот подход устарел — после 007-027 весь функционал реализован в React SPA (`web/`). Переписывать всё заново под VS Code API бессмысленно.

**Новый подход:** встроить готовый React SPA в WebView panel VS Code. Расширение — тонкая обёртка: создаёт панель, загружает бандл, мостит пару нативных API (SecretStorage, уведомления). Весь бизнес-код работает внутри WebView, как в браузере.

**Зависимость:** задача 027 (рефакторинг). Все фичи из 023-026 автоматически доступны в WebView.


## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code                                   │
│                                                                   │
│  ┌──────────────┐    postMessage     ┌────────────────────────┐  │
│  │ Extension     │ ◄──────────────► │ WebView Panel           │  │
│  │ Host          │                   │                        │  │
│  │               │                   │  React SPA (web/dist)  │  │
│  │ • SecretStore │                   │  • MatrixService       │  │
│  │ • StatusBar   │                   │  • LiveKitService      │  │
│  │ • Commands    │                   │  • Crypto WASM         │  │
│  │ • Badges      │                   │  • Все UI компоненты   │  │
│  │ • Notifications│                  │                        │  │
│  └──────────────┘                   └────────────────────────┘  │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ Activity Bar │  ← иконка Uplink                              │
│  │ 💬 (badge: 3)│                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Почему WebView, а не нативные VS Code views

TreeView/WebviewView хороши для простых списков, но чат-мессенджер — это сложный интерактивный UI: виртуальный скролл, медиа-превью, видеосетка, модалки, drag-and-drop файлов. Всё это уже реализовано в React SPA. Встраивание готового бандла — единственный разумный путь.

WebView в VS Code — это по сути iframe с Chromium. Поддерживает WebSocket, WASM, Web Audio, getUserMedia (для звонков). Ограничения — CSP и доступ к файлам.


## Часть 1. Scaffold расширения

### 1.1. Структура проекта

Расширение живёт в `E:\Uplink\vscode\` — отдельная папка, чтобы не путать с web-фронтендом и старым `src/`.

```
E:\Uplink\vscode/
├── src/
│   ├── extension.ts          — activate/deactivate, регистрация команд
│   ├── UplinkPanel.ts        — WebView panel: загрузка SPA, postMessage мост
│   ├── bridge.ts             — обработка сообщений WebView ↔ Extension Host
│   ├── statusBar.ts          — статус-бар: подключение, unread, звонок
│   └── notifications.ts      — VS Code уведомления вместо Web Notification
├── package.json              — VS Code extension manifest
├── tsconfig.json             — TypeScript конфигурация
├── esbuild.config.mjs        — сборка extension host (esbuild, не webpack)
├── .vscodeignore              — файлы, исключённые из .vsix
└── README.md
```

### 1.2. package.json — манифест расширения

```json
{
    "name": "uplink",
    "displayName": "Uplink",
    "description": "Командный мессенджер со звонками, встроенный в VS Code",
    "version": "0.1.0",
    "publisher": "uplink-team",
    "engines": {
        "vscode": "^1.85.0"
    },
    "categories": ["Other"],
    "activationEvents": ["onStartupFinished"],
    "main": "./out/extension.js",
    "contributes": {
        "commands": [
            {
                "command": "uplink.openChat",
                "title": "Uplink: Открыть чат",
                "icon": "$(comment-discussion)"
            },
            {
                "command": "uplink.disconnect",
                "title": "Uplink: Отключиться"
            }
        ],
        "viewsContainers": {
            "activitybar": [
                {
                    "id": "uplink",
                    "title": "Uplink",
                    "icon": "resources/icon.svg"
                }
            ]
        },
        "views": {
            "uplink": [
                {
                    "type": "webview",
                    "id": "uplink.chatPanel",
                    "name": "Чат"
                }
            ]
        },
        "configuration": {
            "title": "Uplink",
            "properties": {
                "uplink.serverUrl": {
                    "type": "string",
                    "default": "",
                    "description": "URL Matrix-сервера (например, https://uplink.example.com)"
                }
            }
        }
    },
    "scripts": {
        "vscode:prepublish": "npm run build",
        "build": "node esbuild.config.mjs --production",
        "watch": "node esbuild.config.mjs --watch",
        "package": "vsce package"
    },
    "devDependencies": {
        "@types/vscode": "^1.85.0",
        "@vscode/vsce": "^2.22.0",
        "esbuild": "^0.19.0",
        "typescript": "^5.3.0"
    }
}
```

### 1.3. tsconfig.json

```json
{
    "compilerOptions": {
        "module": "commonjs",
        "target": "ES2022",
        "outDir": "out",
        "lib": ["ES2022"],
        "sourceMap": true,
        "rootDir": "src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true
    },
    "exclude": ["node_modules", "out"]
}
```

### 1.4. esbuild.config.mjs

```javascript
import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const config = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'],
    sourcemap: !production,
    minify: production,
};

if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('Watching...');
} else {
    await esbuild.build(config);
    console.log('Built.');
}
```


## Часть 2. WebView Panel — загрузка SPA

### 2.1. UplinkPanel.ts

Главный класс — создаёт WebView panel и загружает в неё React SPA.

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Панель Uplink — WebView с загруженным React SPA.
 *
 * Два режима работы:
 * 1. Production: загружает собранный dist/ из web-фронтенда
 * 2. Dev: загружает через iframe с http://localhost:5173
 */
export class UplinkPanel {
    public static currentPanel: UplinkPanel | undefined;
    private readonly _panel: vscode.WebviewPanel | vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Для Activity Bar (WebviewViewProvider).
     */
    static createViewProvider(extensionUri: vscode.Uri): vscode.WebviewViewProvider {
        return {
            resolveWebviewView(webviewView: vscode.WebviewView) {
                webviewView.webview.options = UplinkPanel._getWebviewOptions(extensionUri);
                const panel = new UplinkPanel(webviewView, extensionUri);
                UplinkPanel.currentPanel = panel;
            },
        };
    }

    /**
     * Для Command Palette — открыть в отдельной панели.
     */
    static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (UplinkPanel.currentPanel) {
            // Уже открыт — показать
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'uplink.chat',
            'Uplink',
            column || vscode.ViewColumn.Beside,
            UplinkPanel._getWebviewOptions(extensionUri),
        );

        UplinkPanel.currentPanel = new UplinkPanel(panel, extensionUri);
    }

    private constructor(
        panel: vscode.WebviewPanel | vscode.WebviewView,
        extensionUri: vscode.Uri,
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Установить HTML
        this._update();

        // Слушать сообщения из WebView
        const webview = 'webview' in panel ? panel.webview : panel.webview;
        webview.onDidReceiveMessage(
            msg => this._handleMessage(msg),
            undefined,
            this._disposables,
        );

        // Cleanup
        if ('onDidDispose' in panel) {
            panel.onDidDispose(() => this.dispose(), null, this._disposables);
        }
    }

    private _update(): void {
        const webview = this._getWebview();
        webview.html = this._getHtmlForWebview(webview);
    }

    private _getWebview(): vscode.Webview {
        return 'webview' in this._panel ? this._panel.webview : this._panel.webview;
    }

    /**
     * CSP и HTML для загрузки SPA.
     *
     * КЛЮЧЕВОЙ МОМЕНТ: нужно разрешить:
     * - wasm-unsafe-eval — для matrix-sdk-crypto-wasm
     * - connect-src ws: wss: https: — для Matrix sync и LiveKit WebSocket
     * - media-src — для аватаров и медиа-сообщений
     * - img-src — для изображений
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const distPath = path.join(this._extensionUri.fsPath, '..', 'web', 'dist');
        const isDev = !fs.existsSync(distPath);

        if (isDev) {
            // Dev-режим: загрузить через Vite dev server
            return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    frame-src http://localhost:5173;
                    style-src 'unsafe-inline';
                ">
            </head>
            <body style="margin:0;padding:0;overflow:hidden;">
                <iframe
                    src="http://localhost:5173"
                    style="width:100%;height:100vh;border:none;"
                    allow="camera;microphone"
                ></iframe>
            </body>
            </html>`;
        }

        // Production: загрузить собранные файлы
        const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

        // Подменить пути на webview URI
        const nonce = getNonce();
        const baseUri = webview.asWebviewUri(vscode.Uri.file(distPath));

        // CSP для production
        const csp = [
            `default-src 'none'`,
            `script-src 'nonce-${nonce}' 'wasm-unsafe-eval'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource} https: data: blob:`,
            `media-src ${webview.cspSource} https: blob:`,
            `connect-src https: wss: ws: http://localhost:*`,
            `worker-src blob:`,
        ].join('; ');

        // Переписать пути ассетов в index.html на webview URI
        let html = indexHtml
            .replace(/(href|src)="\/assets\//g, `$1="${baseUri}/assets/`)
            .replace(/(href|src)="\//g, `$1="${baseUri}/`);

        // Добавить CSP meta-тег
        html = html.replace(
            '<head>',
            `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`,
        );

        // Добавить nonce к script-тегам
        html = html.replace(/<script /g, `<script nonce="${nonce}" `);

        // Добавить мост VS Code API
        html = html.replace(
            '</body>',
            `<script nonce="${nonce}">
                // Мост VS Code ↔ SPA
                window.__VSCODE__ = true;
                window.__VSCODE_API__ = acquireVsCodeApi();

                // Перехват localStorage для SecretStorage
                window.__UPLINK_STORAGE_BRIDGE__ = {
                    getItem: (key) => {
                        return new Promise(resolve => {
                            const id = Date.now() + Math.random();
                            const handler = (e) => {
                                if (e.data?.type === 'storage-result' && e.data.id === id) {
                                    window.removeEventListener('message', handler);
                                    resolve(e.data.value);
                                }
                            };
                            window.addEventListener('message', handler);
                            window.__VSCODE_API__.postMessage({
                                type: 'storage-get', key, id
                            });
                        });
                    },
                    setItem: (key, value) => {
                        window.__VSCODE_API__.postMessage({
                            type: 'storage-set', key, value
                        });
                    },
                    removeItem: (key) => {
                        window.__VSCODE_API__.postMessage({
                            type: 'storage-remove', key
                        });
                    },
                };
            </script>\n</body>`,
        );

        return html;
    }

    /**
     * Обработка сообщений из WebView.
     */
    private async _handleMessage(msg: any): Promise<void> {
        // Делегировать в bridge.ts
        const { handleWebViewMessage } = await import('./bridge');
        handleWebViewMessage(msg, this._getWebview());
    }

    static _getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
        const distPath = vscode.Uri.joinPath(extensionUri, '..', 'web', 'dist');
        return {
            enableScripts: true,
            localResourceRoots: [distPath],
            // Разрешить WebSocket, WASM и т.д.
        };
    }

    public dispose(): void {
        UplinkPanel.currentPanel = undefined;
        this._disposables.forEach(d => d.dispose());
    }
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
```

### 2.2. Проблема: WASM и CSP

matrix-sdk-crypto-wasm загружается через `WebAssembly.instantiate()`. VS Code WebView блокирует `wasm-eval` по умолчанию. Решение — добавить `'wasm-unsafe-eval'` в `script-src` директиву CSP.

Если `wasm-unsafe-eval` не поддерживается конкретной версией VS Code (старые Electron):
- Fallback: загрузить WASM как ArrayBuffer через fetch, потом instantiate. Fetch с `blob:` URI разрешён.
- Или: отключить E2E в режиме расширения (как запасной вариант, нежелательно).

### 2.3. Проблема: localStorage

React SPA хранит токен в localStorage. WebView в VS Code сбрасывает localStorage при перезапуске (не гарантирует persistence). Решение:

1. В SPA добавить проверку `window.__VSCODE__` — если true, использовать мост вместо localStorage.
2. Мост передаёт get/set через postMessage в extension host.
3. Extension host хранит данные в `context.globalState` (persistent) или `context.secrets` (для токенов).

Изменение в `web/src/matrix/MatrixService.ts`:

```typescript
// Утилита для хранения — выбирает localStorage или VS Code bridge
async function storageGet(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && (window as any).__UPLINK_STORAGE_BRIDGE__) {
        return (window as any).__UPLINK_STORAGE_BRIDGE__.getItem(key);
    }
    return localStorage.getItem(key);
}

function storageSet(key: string, value: string): void {
    if (typeof window !== 'undefined' && (window as any).__UPLINK_STORAGE_BRIDGE__) {
        (window as any).__UPLINK_STORAGE_BRIDGE__.setItem(key, value);
        return;
    }
    localStorage.setItem(key, value);
}

function storageRemove(key: string): void {
    if (typeof window !== 'undefined' && (window as any).__UPLINK_STORAGE_BRIDGE__) {
        (window as any).__UPLINK_STORAGE_BRIDGE__.removeItem(key);
        return;
    }
    localStorage.removeItem(key);
}
```

Заменить все `localStorage.getItem/setItem/removeItem` в MatrixService на эти утилиты. Вынести в `web/src/utils/storage.ts`.


## Часть 3. Bridge — мост Extension Host ↔ WebView

Файл: `vscode/src/bridge.ts`

```typescript
import * as vscode from 'vscode';

/**
 * Мост между Extension Host и WebView.
 *
 * WebView отправляет postMessage → extension обрабатывает и отвечает.
 * Протокол: { type: string, ...payload }
 */
export function handleWebViewMessage(
    msg: any,
    webview: vscode.Webview,
    context?: vscode.ExtensionContext,
): void {
    switch (msg.type) {
        // Хранилище (замена localStorage)
        case 'storage-get': {
            const value = context?.globalState.get<string>(msg.key) ?? null;
            webview.postMessage({ type: 'storage-result', id: msg.id, value });
            break;
        }
        case 'storage-set': {
            context?.globalState.update(msg.key, msg.value);
            break;
        }
        case 'storage-remove': {
            context?.globalState.update(msg.key, undefined);
            break;
        }

        // Уведомления (замена Web Notification API)
        case 'notification': {
            const { title, body } = msg;
            vscode.window.showInformationMessage(`${title}: ${body}`);
            break;
        }

        // Unread count для Activity Bar badge
        case 'unread-count': {
            updateBadge(msg.count);
            break;
        }

        // Статус подключения для StatusBar
        case 'connection-state': {
            updateConnectionStatus(msg.state);
            break;
        }

        // Открыть файл из workspace (для отправки в чат)
        case 'pick-file': {
            vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'Все файлы': ['*'] },
            }).then(uris => {
                if (uris && uris[0]) {
                    const filePath = uris[0].fsPath;
                    // Прочитать файл и отправить обратно в WebView как base64
                    const fs = require('fs');
                    const data = fs.readFileSync(filePath);
                    const base64 = data.toString('base64');
                    const name = require('path').basename(filePath);
                    webview.postMessage({
                        type: 'file-picked',
                        name,
                        base64,
                        mimeType: getMimeType(name),
                    });
                }
            });
            break;
        }
    }
}

let _statusBarItem: vscode.StatusBarItem | undefined;

export function setStatusBarItem(item: vscode.StatusBarItem): void {
    _statusBarItem = item;
}

function updateBadge(count: number): void {
    // Activity Bar badge обновляется через ViewBadge API
    // Это делается из extension.ts через viewProvider
}

function updateConnectionStatus(state: string): void {
    if (!_statusBarItem) return;
    switch (state) {
        case 'connected':
            _statusBarItem.text = '$(comment-discussion) Uplink';
            _statusBarItem.color = undefined;
            break;
        case 'connecting':
            _statusBarItem.text = '$(sync~spin) Uplink...';
            _statusBarItem.color = 'yellow';
            break;
        default:
            _statusBarItem.text = '$(circle-slash) Uplink';
            _statusBarItem.color = 'red';
    }
}

function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
        pdf: 'application/pdf', zip: 'application/zip',
        txt: 'text/plain', json: 'application/json',
        js: 'text/javascript', ts: 'text/typescript',
    };
    return map[ext || ''] || 'application/octet-stream';
}
```


## Часть 4. Extension Entry Point

Файл: `vscode/src/extension.ts`

```typescript
import * as vscode from 'vscode';
import { UplinkPanel } from './UplinkPanel';
import { setStatusBarItem } from './bridge';

export function activate(context: vscode.ExtensionContext) {
    console.log('Uplink активирован');

    // Activity Bar — WebView Provider
    const provider = UplinkPanel.createViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('uplink.chatPanel', provider, {
            webviewOptions: { retainContextWhenHidden: true },
        }),
    );

    // Команда: открыть чат в отдельной панели
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.openChat', () => {
            UplinkPanel.createOrShow(context.extensionUri);
        }),
    );

    // Команда: отключиться
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.disconnect', () => {
            // Отправить сообщение в WebView
            const webview = UplinkPanel.currentPanel;
            if (webview) {
                // postMessage в SPA для logout
            }
        }),
    );

    // Status Bar
    const statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 100
    );
    statusBar.command = 'uplink.openChat';
    statusBar.text = '$(comment-discussion) Uplink';
    statusBar.tooltip = 'Открыть Uplink';
    statusBar.show();
    setStatusBarItem(statusBar);
    context.subscriptions.push(statusBar);
}

export function deactivate() {
    console.log('Uplink деактивирован');
}
```


## Часть 5. Адаптация SPA для работы в WebView

### 5.1. Утилита хранения

Файл: `web/src/utils/storage.ts` (новый)

```typescript
/**
 * Абстракция над хранилищем.
 *
 * В браузере/Tauri — localStorage (синхронный).
 * В VS Code WebView — мост через postMessage (асинхронный).
 *
 * Для простоты: при инициализации SPA загружаем все ключи из моста
 * в in-memory кеш, после чего get работает синхронно.
 */

const isVSCode = typeof window !== 'undefined' && !!(window as any).__VSCODE__;
const cache = new Map<string, string | null>();

export function storageGet(key: string): string | null {
    if (isVSCode) {
        return cache.get(key) ?? null;
    }
    return localStorage.getItem(key);
}

export function storageSet(key: string, value: string): void {
    if (isVSCode) {
        cache.set(key, value);
        (window as any).__UPLINK_STORAGE_BRIDGE__?.setItem(key, value);
        return;
    }
    localStorage.setItem(key, value);
}

export function storageRemove(key: string): void {
    if (isVSCode) {
        cache.delete(key);
        (window as any).__UPLINK_STORAGE_BRIDGE__?.removeItem(key);
        return;
    }
    localStorage.removeItem(key);
}

/**
 * Инициализация — загрузить токены из extension host в кеш.
 * Вызывается в App.tsx перед restoreSession().
 */
export async function initStorage(): Promise<void> {
    if (!isVSCode) return;

    const keys = [
        'uplink_homeserver',
        'uplink_user_id',
        'uplink_access_token',
        'uplink_device_id',
    ];

    for (const key of keys) {
        const value = await (window as any).__UPLINK_STORAGE_BRIDGE__.getItem(key);
        if (value !== null) {
            cache.set(key, value);
        }
    }
}
```

### 5.2. Адаптация MatrixService

В `web/src/matrix/MatrixService.ts` — заменить все `localStorage.getItem/setItem/removeItem` на импорт из `utils/storage.ts`:

```typescript
import { storageGet, storageSet, storageRemove } from '../utils/storage';

// Было: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
// Стало: storageGet(STORAGE_KEYS.ACCESS_TOKEN)
```

### 5.3. Адаптация уведомлений

В `web/src/hooks/useNotifications.ts` — добавить проверку VS Code:

```typescript
const isVSCode = !!(window as any).__VSCODE__;

function showNotification(title: string, body: string) {
    if (isVSCode) {
        (window as any).__VSCODE_API__?.postMessage({
            type: 'notification', title, body,
        });
        return;
    }
    // Существующая логика: Tauri / Web Notification API
    // ...
}
```

### 5.4. Адаптация App.tsx

```typescript
import { initStorage } from './utils/storage';

// В useEffect перед restoreSession:
useEffect(() => {
    initStorage().then(() => {
        restoreSession().finally(() => setLoading(false));
    });
}, []);
```


## Часть 6. Сборка и dev-процесс

### 6.1. Скрипт сборки SPA для расширения

В `web/package.json` — добавить скрипт:

```json
{
    "scripts": {
        "build:vscode": "vite build --outDir dist-vscode --base ./"
    }
}
```

`--base ./` — относительные пути к ассетам (иначе WebView не найдёт файлы).

### 6.2. Dev workflow

1. `cd web && npm run dev` — запустить Vite dev server
2. `cd vscode && npm run watch` — собирать расширение в watch-режиме
3. F5 в VS Code — запустить Extension Development Host
4. WebView загрузит SPA через iframe с localhost:5173

### 6.3. Production workflow

1. `cd web && npm run build:vscode` — собрать SPA
2. `cd vscode && npm run build` — собрать расширение
3. `cd vscode && npx vsce package` — создать .vsix
4. Установить: `code --install-extension uplink-0.1.0.vsix`

### 6.4. Что включать в .vsix

`.vscodeignore`:
```
src/**
node_modules/**
.gitignore
tsconfig.json
esbuild.config.mjs
```

В .vsix входит: `out/extension.js`, `package.json`, `resources/`, и **собранный dist** из web (скопировать при сборке).


## Порядок реализации

1. **Scaffold** — package.json, tsconfig, esbuild, extension.ts с пустой панелью.
2. **UplinkPanel** — загрузка SPA в WebView, CSP конфигурация.
3. **Storage bridge** — `utils/storage.ts`, адаптация MatrixService.
4. **WASM проверка** — убедиться что matrix-sdk-crypto-wasm загружается в WebView CSP.
5. **Dev workflow** — iframe с Vite dev server, F5 запуск.
6. **Уведомления** — мост VS Code notification API.
7. **Status bar** — индикатор подключения.
8. **Build pipeline** — `build:vscode`, vsce package, .vsix.
9. **Тест** — установить .vsix, логин, отправить сообщение, проверить E2E crypto.


## Файлы

Новые:
- `vscode/` — весь каталог расширения
- `vscode/src/extension.ts` — точка входа
- `vscode/src/UplinkPanel.ts` — WebView panel
- `vscode/src/bridge.ts` — обработка postMessage
- `vscode/src/statusBar.ts` — статус-бар
- `vscode/package.json` — манифест
- `vscode/tsconfig.json`
- `vscode/esbuild.config.mjs`
- `vscode/resources/icon.svg` — иконка Activity Bar
- `web/src/utils/storage.ts` — абстракция хранилища

Изменённые:
- `web/src/matrix/MatrixService.ts` — localStorage → storage.ts
- `web/src/hooks/useNotifications.ts` — VS Code notification bridge
- `web/src/App.tsx` — initStorage() перед restoreSession()
- `web/package.json` — скрипт build:vscode

Старые файлы (удалить или оставить как архив):
- `E:\Uplink\src\` — старый scaffold из задачи 002. Не используется. Можно удалить или переместить в `_archive/`.


## Коммиты

```
[vscode] Scaffold расширения: package.json, extension.ts, esbuild
[vscode] WebView Panel: загрузка SPA, CSP для WASM/WebSocket
[vscode] Storage bridge: utils/storage.ts, адаптация MatrixService
[vscode] Notification bridge, status bar, dev workflow
[vscode] Build pipeline: build:vscode, vsce package, .vsix
```


## Риски и подводные камни

**WASM в WebView.** Главный риск. Если `wasm-unsafe-eval` не сработает — нужен fallback с fetch + instantiate из ArrayBuffer. Проверить на минимальной версии VS Code 1.85.

**LiveKit в WebView.** getUserMedia (микрофон/камера) работает в VS Code WebView — проверено другими расширениями. Но может потребовать разрешение allow="camera;microphone" в CSP.

**Звонки.** LiveKit Client SDK использует WebRTC. В VS Code WebView WebRTC работает (Electron), но могут быть нюансы с ICE candidates через Cloudflare Tunnel.

**Размер .vsix.** SPA бандл ~2-3 MB + WASM ~1 MB + расширение. Итого ~5 MB — приемлемо для VS Code marketplace (лимит 50 MB).

**Горячая перезагрузка.** В dev-режиме через iframe с Vite — HMR работает нормально. В production WebView нет HMR — нужно перезагрузить панель (Developer: Reload Webview).
