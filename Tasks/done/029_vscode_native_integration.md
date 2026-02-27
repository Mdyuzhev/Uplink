# 029 — VS Code Extension: нативная интеграция (уведомления, badge, команды, файлы)

## Контекст

Задача 028 даёт работающий чат внутри VS Code — SPA загружен в WebView, авторизация через storage bridge, E2E crypto через WASM. Но пока расширение — просто iframe. Эта задача добавляет интеграцию с нативными возможностями VS Code, которые делают Uplink частью редактора, а не отдельным окном.

**Зависимость:** задача 028 (VS Code Extension: WebView SPA).


## Фича 1. Уведомления через VS Code API

### Проблема

Web Notification API внутри WebView работает ненадёжно — некоторые версии VS Code блокируют `Notification.requestPermission()`. Tauri использует свой plugin. Нужен третий путь — нативные VS Code уведомления.

### Реализация

В задаче 028 уже заложен мост `notification` через postMessage. Здесь расширяем:

**Три уровня уведомлений:**

1. **Информационное** — обычное сообщение в чате. `vscode.window.showInformationMessage()`. Кнопка "Открыть" → переключиться на Uplink panel.
2. **Входящий звонок** — с кнопками "Принять" / "Отклонить". `vscode.window.showInformationMessage()` с action buttons. При принятии → postMessage в WebView для accept.
3. **Mention (@имя)** — выделенное уведомление. Показать имя и текст, кнопка "Перейти".

Файл: `vscode/src/notifications.ts`

```typescript
import * as vscode from 'vscode';

interface NotificationMessage {
    type: 'notification';
    level: 'message' | 'call' | 'mention';
    title: string;
    body: string;
    roomId?: string;
    callId?: string;
}

/**
 * Обработка уведомлений из WebView.
 * Используем VS Code notification API — работает на всех платформах,
 * интегрируется с системным центром уведомлений.
 */
export async function handleNotification(
    msg: NotificationMessage,
    webview: vscode.Webview,
): Promise<void> {
    switch (msg.level) {
        case 'call': {
            const action = await vscode.window.showInformationMessage(
                `📞 ${msg.title}`,
                { modal: false },
                'Принять',
                'Отклонить',
            );
            if (action === 'Принять') {
                webview.postMessage({ type: 'call-accept', callId: msg.callId });
            } else if (action === 'Отклонить') {
                webview.postMessage({ type: 'call-reject', callId: msg.callId });
            }
            break;
        }

        case 'mention': {
            const action = await vscode.window.showWarningMessage(
                `💬 ${msg.title}: ${msg.body}`,
                'Перейти',
            );
            if (action === 'Перейти') {
                webview.postMessage({ type: 'navigate-room', roomId: msg.roomId });
                // Показать панель Uplink
                vscode.commands.executeCommand('uplink.chatPanel.focus');
            }
            break;
        }

        default: {
            const action = await vscode.window.showInformationMessage(
                `${msg.title}: ${msg.body}`,
                'Открыть',
            );
            if (action === 'Открыть') {
                webview.postMessage({ type: 'navigate-room', roomId: msg.roomId });
                vscode.commands.executeCommand('uplink.chatPanel.focus');
            }
        }
    }
}
```

### Адаптация SPA

В `web/src/hooks/useNotifications.ts` — расширить VS Code ветку:

```typescript
function showNotification(title: string, body: string, options?: {
    level?: 'message' | 'call' | 'mention';
    roomId?: string;
    callId?: string;
}) {
    const isVSCode = !!(window as any).__VSCODE__;
    const isTauri = !!(window as any).__TAURI_INTERNALS__;

    if (isVSCode) {
        (window as any).__VSCODE_API__?.postMessage({
            type: 'notification',
            level: options?.level || 'message',
            title,
            body,
            roomId: options?.roomId,
            callId: options?.callId,
        });
        return;
    }

    if (isTauri) {
        // Существующая Tauri-логика
        return;
    }

    // Web Notification API fallback
    if (Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}
```

### Настройка: DND-режим

VS Code имеет встроенный Do Not Disturb (DND). Уведомления `showInformationMessage` блокируются в DND — это ожидаемое поведение, ничего дополнительно делать не надо.


## Фича 2. Activity Bar Badge — непрочитанные

### Реализация

VS Code поддерживает `WebviewView.badge` для отображения счётчика на иконке в Activity Bar.

В extension.ts, при регистрации WebviewViewProvider:

```typescript
let viewRef: vscode.WebviewView | undefined;

const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView: vscode.WebviewView) {
        viewRef = webviewView;
        // ... настройка WebView ...

        webviewView.webview.onDidReceiveMessage(msg => {
            if (msg.type === 'unread-count') {
                // Badge на Activity Bar
                webviewView.badge = msg.count > 0
                    ? { tooltip: `${msg.count} непрочитанных`, value: msg.count }
                    : undefined;
            }
            // ... остальные обработчики ...
        });
    },
};
```

### Адаптация SPA

В `web/src/hooks/useRooms.ts` или в ChatLayout — при изменении unread count отправлять в extension host:

```typescript
useEffect(() => {
    if (!(window as any).__VSCODE__) return;
    const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
    (window as any).__VSCODE_API__?.postMessage({
        type: 'unread-count',
        count: totalUnread,
    });
}, [rooms]);
```


## Фича 3. Status Bar — статус подключения и звонка

### Реализация

Status bar item показывает текущее состояние Uplink. Три состояния:

1. **Подключён** — `$(comment-discussion) Uplink` (обычный текст)
2. **Подключение** — `$(sync~spin) Uplink...` (спиннер)
3. **Отключён** — `$(circle-slash) Uplink` (красный)
4. **В звонке** — `$(call-outgoing) Uplink — звонок 03:25` (таймер)

Файл: `vscode/src/statusBar.ts`

```typescript
import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;
let callTimer: NodeJS.Timer | undefined;
let callStartTime: number | undefined;

export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'uplink.openChat';
    statusBarItem.tooltip = 'Открыть Uplink';
    setConnectionState('connecting');
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    return statusBarItem;
}

export function setConnectionState(state: 'connected' | 'connecting' | 'disconnected'): void {
    if (!statusBarItem) return;
    // Не перезаписывать если идёт звонок
    if (callTimer) return;

    switch (state) {
        case 'connected':
            statusBarItem.text = '$(comment-discussion) Uplink';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'connecting':
            statusBarItem.text = '$(sync~spin) Uplink...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'disconnected':
            statusBarItem.text = '$(circle-slash) Uplink';
            statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.errorBackground'
            );
            break;
    }
}

export function setCallState(active: boolean): void {
    if (!statusBarItem) return;

    if (active) {
        callStartTime = Date.now();
        callTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - callStartTime!) / 1000);
            const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const sec = (elapsed % 60).toString().padStart(2, '0');
            statusBarItem.text = `$(call-outgoing) Uplink — ${min}:${sec}`;
            statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.warningBackground'
            );
        }, 1000);
    } else {
        if (callTimer) {
            clearInterval(callTimer);
            callTimer = undefined;
            callStartTime = undefined;
        }
        setConnectionState('connected');
    }
}
```

### Адаптация SPA

Из MatrixService (или хука useMatrix) — при смене connectionState:

```typescript
// В матрикс-сервисе, в колбэке на sync state
if ((window as any).__VSCODE__) {
    (window as any).__VSCODE_API__?.postMessage({
        type: 'connection-state',
        state: connected ? 'connected' : 'disconnected',
    });
}
```

Из CallSignalingService — при смене состояния звонка:

```typescript
if ((window as any).__VSCODE__) {
    (window as any).__VSCODE_API__?.postMessage({
        type: 'call-state',
        active: state === 'accepted',
    });
}
```


## Фича 4. Command Palette — быстрые команды

### Команды

```
Uplink: Открыть чат              → фокус на WebView panel
Uplink: Отправить код в чат      → отправить выделенный текст
Uplink: Отправить файл           → file picker → отправка в текущий чат
Uplink: Начать звонок             → начать звонок в активной комнате
Uplink: Отключиться              → logout
```

Файл: обновить `vscode/package.json` contributes.commands:

```json
{
    "contributes": {
        "commands": [
            {
                "command": "uplink.openChat",
                "title": "Uplink: Открыть чат",
                "icon": "$(comment-discussion)"
            },
            {
                "command": "uplink.sendSnippet",
                "title": "Uplink: Отправить код в чат"
            },
            {
                "command": "uplink.sendFile",
                "title": "Uplink: Отправить файл в чат"
            },
            {
                "command": "uplink.startCall",
                "title": "Uplink: Начать звонок"
            },
            {
                "command": "uplink.disconnect",
                "title": "Uplink: Отключиться"
            }
        ],
        "menus": {
            "editor/context": [
                {
                    "command": "uplink.sendSnippet",
                    "when": "editorHasSelection",
                    "group": "uplink"
                }
            ]
        }
    }
}
```

### Отправка кода из редактора

Самая полезная VS Code-специфичная фича. Выделил код → ПКМ → "Отправить в чат" (или Command Palette).

```typescript
// В extension.ts
context.subscriptions.push(
    vscode.commands.registerCommand('uplink.sendSnippet', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showWarningMessage('Выделите текст для отправки');
            return;
        }

        const language = editor.document.languageId;
        const fileName = editor.document.fileName.split(/[\\/]/).pop();
        const lineRange = `${editor.selection.start.line + 1}-${editor.selection.end.line + 1}`;

        // Отправить в WebView — SPA покажет превью и предложит выбрать комнату
        const webview = getActiveWebview();
        if (webview) {
            webview.postMessage({
                type: 'send-snippet',
                code: selection,
                language,
                fileName,
                lineRange,
            });
        }
    }),
);
```

### Обработка в SPA

В `web/src/components/MessageInput.tsx` — слушать postMessage от extension:

```typescript
useEffect(() => {
    if (!(window as any).__VSCODE__) return;

    const handler = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.type === 'send-snippet') {
            // Вставить код как markdown code block
            const codeBlock = `\`\`\`${msg.language}\n// ${msg.fileName}:${msg.lineRange}\n${msg.code}\n\`\`\``;
            setText(codeBlock);
            // Фокус на textarea
            textareaRef.current?.focus();
        }
        if (msg.type === 'navigate-room' && msg.roomId) {
            // Переключиться на комнату
            onSelectRoom(msg.roomId);
        }
        if (msg.type === 'call-accept' && msg.callId) {
            // Принять звонок
            callSignalingService.acceptCall();
        }
        if (msg.type === 'call-reject' && msg.callId) {
            callSignalingService.rejectCall();
        }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}, []);
```


## Фича 5. Отправка файлов из workspace

### Два способа

**Через Command Palette** — `Uplink: Отправить файл`. Открывает VS Code file picker (`showOpenDialog`), читает файл, отправляет base64 в WebView. WebView загружает через MatrixService.uploadFile().

**Drag-and-drop из Explorer** — сложнее. VS Code WebView поддерживает drop events, но нужно обработать `dataTransfer`. Если файл из workspace — прочитать через fs API. Если внешний — через стандартный File API.

Для первой версии — только Command Palette. D&D — как улучшение позже.

```typescript
// В extension.ts
context.subscriptions.push(
    vscode.commands.registerCommand('uplink.sendFile', async () => {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Отправить',
            filters: {
                'Изображения': ['png', 'jpg', 'jpeg', 'gif', 'webp'],
                'Документы': ['pdf', 'doc', 'docx', 'txt'],
                'Все файлы': ['*'],
            },
        });

        if (!uris || uris.length === 0) return;

        const filePath = uris[0].fsPath;
        const fs = require('fs');
        const path = require('path');

        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        const name = path.basename(filePath);
        const size = data.length;

        const webview = getActiveWebview();
        if (webview) {
            webview.postMessage({
                type: 'file-picked',
                name,
                base64,
                size,
                mimeType: getMimeType(name),
            });
        }
    }),
);
```

### Обработка в SPA

В MessageInput — при получении `file-picked` конвертировать base64 → File → upload:

```typescript
if (msg.type === 'file-picked') {
    const binary = atob(msg.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const file = new File([bytes], msg.name, { type: msg.mimeType });
    // Использовать существующий handleFileUpload
    handleFileUpload(file);
}
```


## Фича 6. Keybindings

```json
{
    "contributes": {
        "keybindings": [
            {
                "command": "uplink.openChat",
                "key": "ctrl+shift+u",
                "mac": "cmd+shift+u"
            },
            {
                "command": "uplink.sendSnippet",
                "key": "ctrl+shift+s",
                "mac": "cmd+shift+s",
                "when": "editorTextFocus && editorHasSelection"
            }
        ]
    }
}
```


## Порядок реализации

1. **Уведомления** — три уровня (message, call, mention), обработка кнопок, адаптация useNotifications.
2. **Activity Bar badge** — unread count из SPA → viewRef.badge.
3. **Status bar** — connection state, call timer.
4. **Command Palette** — openChat, sendSnippet, sendFile, disconnect.
5. **Отправка кода** — выделение → postMessage → markdown code block в MessageInput.
6. **Отправка файлов** — file picker → base64 → postMessage → upload.
7. **Keybindings** — Ctrl+Shift+U, Ctrl+Shift+S.
8. **Тест** — уведомление при новом сообщении, badge count, отправка кода, файл.


## Файлы

Новые:
- `vscode/src/notifications.ts` — обработка уведомлений
- `vscode/src/statusBar.ts` — статус-бар и таймер звонка
- `vscode/src/commands.ts` — регистрация команд (sendSnippet, sendFile)

Изменённые:
- `vscode/src/extension.ts` — регистрация команд, badge, status bar
- `vscode/src/bridge.ts` — новые типы сообщений (call-state, send-snippet, file-picked)
- `vscode/package.json` — commands, menus, keybindings
- `web/src/hooks/useNotifications.ts` — VS Code ветка с уровнями
- `web/src/hooks/useRooms.ts` — отправка unread-count
- `web/src/components/MessageInput.tsx` — обработка postMessage (snippet, file, navigate)
- `web/src/livekit/CallSignalingService.ts` — отправка call-state в VS Code


## Коммиты

```
[vscode] Уведомления: три уровня, обработка звонков, mention
[vscode] Activity Bar badge (unread), Status Bar (connection, call timer)
[vscode] Command Palette: отправка кода и файлов из редактора
[vscode] Keybindings, контекстное меню, финальная интеграция
```
