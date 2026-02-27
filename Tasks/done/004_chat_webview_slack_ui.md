# 004: Chat WebView — UI в стиле Slack

## Цель

Реализовать полноценный чат-интерфейс в WebView-панели VS Code, визуально максимально приближённый к Slack: левая панель с каналами и DM, основная область с лентой сообщений, поле ввода внизу, подсветка кода в сниппетах.

## Контекст

Это главный пользовательский интерфейс Uplink. Разработчики привыкли к UX Slack, и чем ближе мы к нему — тем ниже порог входа. WebView в VS Code позволяет рендерить полноценное React-приложение. Данные приходят из Matrix через postMessage API между extension host и WebView.

## Зависимости

- Задача 002 (Extension scaffold) — **блокирующая**, нужен webpack и WebView инфраструктура
- Задача 003 (Matrix client) — **блокирующая**, нужны реальные данные

## Референс UI

Slack Desktop — основные элементы:

```
┌──────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │ WORKSPACE │  │ # general                    🔍  │  │
│  │           │  ├──────────────────────────────────┤  │
│  │ 🔍 Поиск  │  │                                  │  │
│  │           │  │  Иванов               10:30      │  │
│  │ Каналы ▾  │  │  Привет, посмотри этот PR        │  │
│  │  # general│  │                                  │  │
│  │  # backend│  │  Петров               10:35      │  │
│  │  # front  │  │  ┌─────────────────────────┐     │  │
│  │           │  │  │ api/routes.ts:42        │     │  │
│  │ Сообщения▾│  │  │ ```typescript           │     │  │
│  │  👤 Петров │  │  │ app.get('/users',...)   │     │  │
│  │  👤 Сидоров│  │  │ ```                     │     │  │
│  │           │  │  └─────────────────────────┘     │  │
│  │           │  │                                  │  │
│  │           │  │  Иванов               10:40      │  │
│  │           │  │  Понял, сейчас посмотрю          │  │
│  │           │  │                                  │  │
│  │           │  ├──────────────────────────────────┤  │
│  │           │  │ 📎  Сообщение...        ▶ Enter  │  │
│  └──────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Шаги

### ШАГ 1. Создать WebView Provider

Файл: `src/webview/chatViewProvider.ts`

```typescript
import * as vscode from 'vscode';

/**
 * Провайдер WebView-панели чата.
 * Управляет жизненным циклом WebView и обменом данными с extension host.
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'uplink.chatPanel';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly matrixService: MatrixService
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'media'),
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Обработка сообщений от WebView
        webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this));
    }

    /**
     * Протокол сообщений extension ↔ WebView:
     *
     * WebView → Extension:
     *   { type: 'sendMessage', roomId: string, body: string }
     *   { type: 'selectRoom', roomId: string }
     *   { type: 'loadMoreMessages', roomId: string, before: string }
     *   { type: 'requestRooms' }
     *   { type: 'markRead', roomId: string }
     *
     * Extension → WebView:
     *   { type: 'rooms', channels: Room[], directs: Room[] }
     *   { type: 'messages', roomId: string, messages: Message[] }
     *   { type: 'newMessage', roomId: string, message: Message }
     *   { type: 'presence', userId: string, status: 'online'|'offline' }
     *   { type: 'connectionStatus', connected: boolean, userId: string }
     *   { type: 'typing', roomId: string, userId: string, isTyping: boolean }
     */
    private async _handleMessage(message: any) { ... }

    /** Отправить данные в WebView */
    postMessage(message: any) {
        this._view?.webview.postMessage(message);
    }
}
```

### ШАГ 2. Создать HTML-обёртку для WebView

В метод `_getHtmlForWebview()`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- CSP — критично для безопасности -->
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';
                   img-src ${webview.cspSource} https:;
                   font-src ${webview.cspSource};">
    <link rel="stylesheet" href="${stylesUri}">
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
```

Где `scriptUri` — путь к собранному `dist/chat.js`, `stylesUri` — путь к `dist/chat.css`.

### ШАГ 3. Создать React-приложение чата

#### src/webview/chat/index.tsx

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
```

#### src/webview/chat/App.tsx — корневой компонент

```tsx
/**
 * Корневой компонент чата Uplink.
 * Layout: sidebar (каналы) + main area (сообщения + ввод).
 */
export const App: React.FC = () => {
    const [rooms, setRooms] = useState<GroupedRooms>({ channels: [], directs: [] });
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [connected, setConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState('');

    // Слушатель сообщений от extension host
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.type) {
                case 'rooms': setRooms(msg); break;
                case 'messages': setMessages(msg.messages); break;
                case 'newMessage': appendMessage(msg); break;
                case 'connectionStatus': setConnected(msg.connected); break;
                // ...
            }
        };
        window.addEventListener('message', handler);
        vscodeApi.postMessage({ type: 'requestRooms' });
        return () => window.removeEventListener('message', handler);
    }, []);

    return (
        <div className="uplink-app">
            <Sidebar
                rooms={rooms}
                activeRoomId={activeRoomId}
                onSelectRoom={handleSelectRoom}
            />
            <MainArea
                messages={messages}
                activeRoom={getActiveRoom()}
                currentUser={currentUser}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
};
```

### ШАГ 4. Компонент Sidebar

Файл: `src/webview/chat/Sidebar.tsx`

Структура (повторяет Slack):

```
┌─────────────────┐
│ 🔗 Uplink        │  ← заголовок + статус подключения
│                   │
│ 🔍 Поиск...      │  ← фильтрация каналов/контактов
│                   │
│ ▾ Каналы          │  ← секция, collapsible
│   # general    3  │  ← имя + badge непрочитанных
│   # backend       │
│   # frontend      │
│                   │
│ ▾ Личные сообщ.   │  ← секция DM
│   🟢 Петров       │  ← online-индикатор + имя
│   ⚪ Сидоров      │  ← offline
│                   │
└─────────────────┘
```

Компонент:

```tsx
interface SidebarProps {
    rooms: GroupedRooms;
    activeRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ rooms, activeRoomId, onSelectRoom }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [channelsExpanded, setChannelsExpanded] = useState(true);
    const [directsExpanded, setDirectsExpanded] = useState(true);

    // Фильтрация по поисковому запросу
    // Подсветка активной комнаты
    // Badge с непрочитанными сообщениями
    // Онлайн-индикатор для DM
};
```

CSS-стили — максимально приближённые к Slack:
- Фон sidebar: `var(--vscode-sideBar-background)` (адаптация к теме VS Code)
- Активный элемент: лёгкая подсветка фоном
- Hover: чуть светлее
- Badge: маленький круг с числом, ярким цветом
- Шрифт: наследуется от VS Code (var(--vscode-font-family))

### ШАГ 5. Компонент MainArea

Файл: `src/webview/chat/MainArea.tsx`

Структура:

```
┌──────────────────────────────────────┐
│ # general                       🔍 📞│  ← заголовок комнаты + действия
├──────────────────────────────────────┤
│                                      │
│  (лента сообщений, scroll вниз)      │
│                                      │
│  Иванов                    10:30     │  ← аватар + имя + время
│  Привет, кто смотрел новый PR?       │
│                                      │
│  Петров                    10:35     │
│  ┌──────────────────────────────┐    │
│  │ 📄 api/routes.ts:42-58      │    │  ← code snippet
│  │   git: feature/auth          │    │
│  │ ┌────────────────────────┐   │    │
│  │ │ app.get('/users', ...) │   │    │
│  │ │ ...                    │   │    │
│  │ └────────────────────────┘   │    │
│  └──────────────────────────────┘    │
│                                      │
│  Иванов                    10:40     │
│  Понял, сейчас гляну 👍              │
│                                      │
├──────────────────────────────────────┤
│ 😊 📎 | Сообщение в #general...  ▶  │  ← поле ввода
└──────────────────────────────────────┘
```

### ШАГ 6. Компонент MessageList

Файл: `src/webview/chat/MessageList.tsx`

```tsx
interface MessageListProps {
    messages: Message[];
    currentUser: string;
    onLoadMore: () => void;
}

export const MessageList: React.FC<MessageListProps> = (props) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // Auto-scroll к новым сообщениям (если пользователь внизу)
    // Infinite scroll вверх (загрузка истории)
    // Группировка сообщений от одного автора (не повторять аватар/имя)
    // Разделители по дням: "Сегодня", "Вчера", "15 января"
};
```

Группировка сообщений (как в Slack):
- Если автор тот же и разница < 5 минут → не показывать аватар и имя, только текст
- Если новый автор или прошло > 5 минут → полный блок (аватар + имя + время)

### ШАГ 7. Компонент MessageBubble

Файл: `src/webview/chat/MessageBubble.tsx`

```tsx
interface MessageBubbleProps {
    message: Message;
    showAuthor: boolean;  // false если сгруппировано с предыдущим
    isOwn: boolean;       // true если от текущего пользователя
}

export const MessageBubble: React.FC<MessageBubbleProps> = (props) => {
    // Рендер в зависимости от типа:
    // 'text' → обычный текст с markdown-рендером (жирный, курсив, ссылки)
    // 'code' → CodeSnippet компонент
    // 'image' → превью изображения
    // 'file' → иконка файла + имя + размер
};
```

### ШАГ 8. Компонент CodeSnippet

Файл: `src/webview/chat/CodeSnippet.tsx`

```tsx
/**
 * Блок кода в ленте сообщений.
 * Визуально выделен фоном, с заголовком (файл:строка) и подсветкой синтаксиса.
 */
interface CodeSnippetProps {
    code: string;
    language: string;
    fileName: string;
    lineStart: number;
    lineEnd: number;
    gitBranch?: string;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = (props) => {
    // Заголовок: "📄 src/api/routes.ts:42-58  |  branch: feature/auth"
    // Кнопка "Открыть в редакторе" → postMessage к extension → vscode.workspace.openTextDocument
    // Кнопка "Копировать" → clipboard
    // Тело: <pre><code> с подсветкой (использовать CSS-классы VS Code или highlight.js)
    // Номера строк слева
};
```

CSS для code snippet:
```css
.uplink-code-snippet {
    background: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    margin: 4px 0;
    overflow: hidden;
}
.uplink-code-snippet__header {
    background: var(--vscode-editor-background);
    padding: 4px 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-widget-border);
    display: flex;
    justify-content: space-between;
}
.uplink-code-snippet__body {
    padding: 8px;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    overflow-x: auto;
    white-space: pre;
}
```

### ШАГ 9. Компонент MessageInput

Файл: `src/webview/chat/MessageInput.tsx`

```tsx
/**
 * Поле ввода сообщения.
 * Поддерживает: многострочный ввод, Shift+Enter для новой строки, Enter для отправки.
 */
interface MessageInputProps {
    roomName: string;
    onSend: (body: string) => void;
    disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = (props) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea по содержимому (макс 200px)
    // Enter → отправить (если не пусто)
    // Shift+Enter → новая строка
    // Placeholder: "Сообщение в #general..."
    // Кнопка отправки справа (иконка)
    // TODO (будущее): кнопка прикрепления файлов, эмодзи-пикер
};
```

### ШАГ 10. Общие стили — CSS

Файл: `src/webview/chat/styles.css`

Основные принципы:
- Использовать CSS-переменные VS Code (`var(--vscode-*)`) для адаптации к любой теме
- Flexbox layout: sidebar (250px fixed) + main area (flex: 1)
- Высота: 100vh (занимает весь WebView)
- Скроллбар: стилизовать под VS Code
- Адаптивность: при ширине < 500px — скрыть sidebar, показать кнопку-гамбургер

Ключевые CSS-переменные для использования:
```css
:root {
    /* Основные цвета берём из VS Code */
    --uplink-sidebar-width: 250px;
    --uplink-avatar-size: 32px;
    --uplink-message-gap: 2px;
    --uplink-message-group-gap: 16px;
}

body {
    margin: 0;
    padding: 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
}

.uplink-app {
    display: flex;
    height: 100vh;
    overflow: hidden;
}
```

### ШАГ 11. Типы данных — общие интерфейсы

Файл: `src/webview/chat/types.ts`

```typescript
export interface Room {
    id: string;
    name: string;
    type: 'channel' | 'direct';
    unreadCount: number;
    lastMessage?: {
        sender: string;
        body: string;
        timestamp: number;
    };
    /** Для DM: статус собеседника */
    peerPresence?: 'online' | 'offline' | 'away';
    /** Для DM: userId собеседника */
    peerId?: string;
}

export interface Message {
    id: string;
    roomId: string;
    sender: string;
    senderDisplayName: string;
    body: string;
    timestamp: number;
    type: 'text' | 'code' | 'image' | 'file';
    /** Для type='code' */
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
}

export interface GroupedRooms {
    channels: Room[];
    directs: Room[];
}
```

### ШАГ 12. Утилита vscodeApi

Файл: `src/webview/chat/vscodeApi.ts`

```typescript
/**
 * Обёртка для VS Code API внутри WebView.
 * acquireVsCodeApi() можно вызвать только один раз.
 */

// @ts-ignore — vscode API доступен только в WebView runtime
const vscode = acquireVsCodeApi();

export const vscodeApi = {
    postMessage: (message: any) => vscode.postMessage(message),
    getState: () => vscode.getState(),
    setState: (state: any) => vscode.setState(state),
};
```

### ШАГ 13. Зарегистрировать WebView в extension.ts

Обновить `activate()`:

```typescript
// Зарегистрировать WebView Provider для панели чата
const chatProvider = new ChatViewProvider(context.extensionUri, matrixService);

// Вариант 1: как panel в editor area (большой чат)
context.subscriptions.push(
    vscode.commands.registerCommand('uplink.openChat', () => {
        const panel = vscode.window.createWebviewPanel(
            'uplink.chat',
            'Uplink Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'dist'),
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                ]
            }
        );
        chatProvider.resolvePanel(panel);
    })
);
```

### ШАГ 14. Обновить webpack.config.js

Добавить CSS обработку и убедиться что chat entry собирается:

```javascript
entry: {
    chat: './src/webview/chat/index.tsx',
},
```

### ШАГ 15. Собрать и проверить

```bash
npm run compile
npm run build:webview
```

Проверка в Extension Development Host:
1. Ctrl+Shift+P → "Uplink: Открыть чат"
2. Должна открыться WebView-панель рядом с редактором
3. Sidebar чата показывает каналы и DM из Matrix
4. Клик по каналу загружает сообщения
5. Ввод текста и Enter — сообщение отправляется и появляется в ленте
6. Код-сниппеты рендерятся с подсветкой и кнопкой "Открыть"
7. Новые сообщения от других пользователей появляются в real-time
8. Тема VS Code (light/dark) корректно применяется

## Критерии приёмки

- [ ] WebView-панель открывается по команде
- [ ] Sidebar отображает каналы и DM с корректными именами
- [ ] Непрочитанные сообщения показываются как badge
- [ ] Лента сообщений загружается при выборе комнаты
- [ ] Сообщения группируются по автору (как в Slack)
- [ ] Code snippets рендерятся с заголовком, подсветкой и кнопкой "Открыть"
- [ ] Отправка сообщений работает (Enter)
- [ ] Новые сообщения появляются в real-time (Matrix sync)
- [ ] Auto-scroll к новым сообщениям
- [ ] Поиск/фильтрация каналов в sidebar
- [ ] Темы VS Code (light и dark) поддерживаются через CSS-переменные
- [ ] `npm run build:webview` собирается без ошибок
- [ ] CSP настроен корректно (нет unsafe-eval)

## Коммит

```
[webview] Chat UI в стиле Slack: sidebar, лента сообщений, code snippets

- React-приложение чата в WebView
- Sidebar с каналами и DM
- MessageList с группировкой и auto-scroll
- CodeSnippet с подсветкой и "Открыть в редакторе"
- MessageInput с Shift+Enter
- CSS на переменных VS Code (поддержка тем)
- postMessage протокол extension ↔ WebView
```
