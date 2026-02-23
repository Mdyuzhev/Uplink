# 002: VS Code Extension — Scaffold проекта

## Цель

Создать базовый каркас VS Code расширения Uplink: package.json с манифестом, TypeScript-конфигурация, webpack для сборки WebView, точка входа с регистрацией команд, базовая структура каталогов.

## Контекст

Это скелет расширения, на который будут навешиваться все остальные компоненты. Без него невозможна разработка UI, Matrix-интеграции, звонков. Scaffold должен компилироваться, запускаться в Extension Development Host и показывать хотя бы пустую панель.

## Зависимости

- Задача 001 (Docker-инфраструктура) — НЕ блокирующая, scaffold можно делать параллельно

## Шаги

### ШАГ 1. Инициализировать проект

```bash
cd E:\Uplink
npm init -y
```

### ШАГ 2. Создать package.json

Перезаписать `package.json` полноценным манифестом расширения:

```json
{
  "name": "uplink",
  "displayName": "Uplink",
  "description": "Контекстный мессенджер и звонилка для разработчиков, встроенные в VS Code",
  "version": "0.1.0",
  "publisher": "rostelecom-qa",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "uplink.openChat",
        "title": "Uplink: Открыть чат",
        "icon": "$(comment-discussion)"
      },
      {
        "command": "uplink.sendSnippet",
        "title": "Uplink: Отправить код в чат",
        "icon": "$(code)"
      },
      {
        "command": "uplink.startCall",
        "title": "Uplink: Начать звонок",
        "icon": "$(call-outgoing)"
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
          "icon": "media/uplink-icon.svg"
        }
      ]
    },
    "views": {
      "uplink": [
        {
          "id": "uplink.channels",
          "name": "Каналы"
        },
        {
          "id": "uplink.contacts",
          "name": "Контакты"
        }
      ]
    },
    "menus": {
      "editor/context": [
        {
          "command": "uplink.sendSnippet",
          "group": "uplink@1",
          "when": "editorHasSelection"
        }
      ]
    },
    "configuration": {
      "title": "Uplink",
      "properties": {
        "uplink.matrix.homeserver": {
          "type": "string",
          "default": "http://localhost:8008",
          "description": "URL Matrix Synapse сервера"
        },
        "uplink.matrix.userId": {
          "type": "string",
          "default": "",
          "description": "Matrix User ID (@user:domain)"
        },
        "uplink.livekit.url": {
          "type": "string",
          "default": "ws://localhost:7880",
          "description": "URL LiveKit сервера"
        },
        "uplink.autoConnect": {
          "type": "boolean",
          "default": true,
          "description": "Подключаться автоматически при запуске VS Code"
        }
      }
    },
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
        "when": "editorHasSelection"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src --ext ts,tsx",
    "test": "node ./out/test/runTest.js",
    "build:webview": "webpack --config webpack.config.js",
    "build:webview:watch": "webpack --config webpack.config.js --watch"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.0.0",
    "@types/mocha": "^10.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vscode/test-electron": "^2.3.0",
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.5.0",
    "css-loader": "^6.8.0",
    "style-loader": "^3.3.0",
    "mocha": "^10.2.0"
  },
  "dependencies": {
    "matrix-js-sdk": "^31.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### ШАГ 3. Создать tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "out",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  },
  "exclude": [
    "node_modules",
    "out",
    "dist",
    "src/webview/**/*"
  ]
}
```

Обрати внимание: `src/webview/` исключён из основного tsconfig, потому что WebView собирается отдельно через webpack.

### ШАГ 4. Создать webpack.config.js

Webpack нужен для сборки React-приложений внутри WebView:

```javascript
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    chat: './src/webview/chat/index.tsx',
    // call: './src/webview/call/index.tsx'  — добавится позже
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devtool: 'source-map',
};
```

### ШАГ 5. Создать tsconfig.webview.json

Отдельный tsconfig для WebView React-кода:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src/webview",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  },
  "include": ["src/webview/**/*"]
}
```

Обновить webpack ts-loader для использования этого конфига:

```javascript
{
  test: /\.tsx?$/,
  use: {
    loader: 'ts-loader',
    options: {
      configFile: 'tsconfig.webview.json'
    }
  },
  exclude: /node_modules/,
}
```

### ШАГ 6. Создать .eslintrc.json

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "warn"
  },
  "ignorePatterns": ["out", "dist", "node_modules", "webpack.config.js"]
}
```

### ШАГ 7. Создать структуру каталогов

```bash
mkdir -p src/commands
mkdir -p src/providers
mkdir -p src/matrix
mkdir -p src/livekit
mkdir -p src/context
mkdir -p src/webview/chat
mkdir -p src/webview/call
mkdir -p src/utils
mkdir -p test/suite
mkdir -p media
mkdir -p scripts
mkdir -p docs
```

### ШАГ 8. Создать точку входа — src/extension.ts

```typescript
import * as vscode from 'vscode';

/**
 * Активация расширения Uplink.
 * Вызывается VS Code при первом использовании команды или при запуске (onStartupFinished).
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Uplink: расширение активировано');

    // Регистрация команды: открыть чат
    const openChatCmd = vscode.commands.registerCommand('uplink.openChat', () => {
        vscode.window.showInformationMessage('Uplink: чат будет здесь');
        // TODO: открыть WebView панель чата
    });

    // Регистрация команды: отправить выделенный код
    const sendSnippetCmd = vscode.commands.registerCommand('uplink.sendSnippet', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Uplink: нет активного редактора');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showWarningMessage('Uplink: выделите код для отправки');
            return;
        }
        // TODO: отправить сниппет в Matrix
        vscode.window.showInformationMessage(`Uplink: отправка ${text.split('\n').length} строк кода`);
    });

    // Регистрация команды: начать звонок
    const startCallCmd = vscode.commands.registerCommand('uplink.startCall', () => {
        vscode.window.showInformationMessage('Uplink: звонки будут здесь');
        // TODO: инициировать LiveKit звонок
    });

    // Регистрация команды: отключиться
    const disconnectCmd = vscode.commands.registerCommand('uplink.disconnect', () => {
        vscode.window.showInformationMessage('Uplink: отключено');
        // TODO: отключиться от Matrix и LiveKit
    });

    // Статус-бар
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.text = '$(plug) Uplink';
    statusBarItem.tooltip = 'Uplink: нажмите для подключения';
    statusBarItem.command = 'uplink.openChat';
    statusBarItem.show();

    context.subscriptions.push(
        openChatCmd,
        sendSnippetCmd,
        startCallCmd,
        disconnectCmd,
        statusBarItem
    );
}

/**
 * Деактивация расширения.
 * Вызывается при закрытии VS Code или отключении расширения.
 */
export function deactivate() {
    console.log('Uplink: расширение деактивировано');
    // TODO: отключиться от Matrix, закрыть LiveKit, cleanup
}
```

### ШАГ 9. Создать заглушки провайдеров

Файл: `src/providers/channelsProvider.ts`

```typescript
import * as vscode from 'vscode';

/**
 * TreeView провайдер для списка каналов (комнат Matrix).
 * Отображается в sidebar расширения.
 */
export class ChannelsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        // TODO: загрузить комнаты из Matrix
        const placeholder = new vscode.TreeItem(
            'Подключитесь для просмотра каналов',
            vscode.TreeItemCollapsibleState.None
        );
        placeholder.iconPath = new vscode.ThemeIcon('info');
        return Promise.resolve([placeholder]);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
```

Файл: `src/providers/contactsProvider.ts`

```typescript
import * as vscode from 'vscode';

/**
 * TreeView провайдер для списка контактов.
 * Показывает пользователей Matrix с онлайн-статусами.
 */
export class ContactsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        // TODO: загрузить пользователей из Matrix
        const placeholder = new vscode.TreeItem(
            'Подключитесь для просмотра контактов',
            vscode.TreeItemCollapsibleState.None
        );
        placeholder.iconPath = new vscode.ThemeIcon('person');
        return Promise.resolve([placeholder]);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
```

### ШАГ 10. Зарегистрировать провайдеры в extension.ts

Добавить в функцию `activate()`:

```typescript
// Sidebar: каналы и контакты
const channelsProvider = new ChannelsProvider();
const contactsProvider = new ContactsProvider();

vscode.window.registerTreeDataProvider('uplink.channels', channelsProvider);
vscode.window.registerTreeDataProvider('uplink.contacts', contactsProvider);
```

Не забыть добавить импорты.

### ШАГ 11. Создать иконку расширения

Файл: `media/uplink-icon.svg`

Создать минимальную SVG-иконку: стрелка вверх (uplink) стилизованная, монохромная, 24x24. Формат — простая SVG без внешних зависимостей.

### ШАГ 12. Создать утилиты

Файл: `src/utils/config.ts`

```typescript
import * as vscode from 'vscode';

/**
 * Получение конфигурации Uplink из VS Code settings.
 */
export function getConfig() {
    const config = vscode.workspace.getConfiguration('uplink');
    return {
        homeserver: config.get<string>('matrix.homeserver', 'http://localhost:8008'),
        userId: config.get<string>('matrix.userId', ''),
        livekitUrl: config.get<string>('livekit.url', 'ws://localhost:7880'),
        autoConnect: config.get<boolean>('autoConnect', true),
    };
}
```

Файл: `src/utils/logger.ts`

```typescript
import * as vscode from 'vscode';

/**
 * Логгер Uplink. Пишет в Output Channel.
 */
class UplinkLogger {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('Uplink');
    }

    info(message: string) {
        this.channel.appendLine(`[INFO] ${new Date().toISOString()} ${message}`);
    }

    error(message: string, error?: Error) {
        this.channel.appendLine(`[ERROR] ${new Date().toISOString()} ${message}`);
        if (error?.stack) {
            this.channel.appendLine(error.stack);
        }
    }

    warn(message: string) {
        this.channel.appendLine(`[WARN] ${new Date().toISOString()} ${message}`);
    }

    show() {
        this.channel.show();
    }

    dispose() {
        this.channel.dispose();
    }
}

export const logger = new UplinkLogger();
```

### ШАГ 13. Создать базовый тест

Файл: `test/suite/extension.test.ts`

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Uplink Extension Test Suite', () => {
    test('Extension should be present', () => {
        const ext = vscode.extensions.getExtension('rostelecom-qa.uplink');
        assert.ok(ext, 'Расширение должно быть установлено');
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('uplink.openChat'), 'openChat зарегистрирована');
        assert.ok(commands.includes('uplink.sendSnippet'), 'sendSnippet зарегистрирована');
        assert.ok(commands.includes('uplink.startCall'), 'startCall зарегистрирована');
    });
});
```

Файл: `test/runTest.ts`

```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error('Ошибка запуска тестов:', err);
        process.exit(1);
    }
}

main();
```

Файл: `test/suite/index.ts`

```typescript
import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
    const mocha = new Mocha({ ui: 'tdd', color: true });
    const testsRoot = path.resolve(__dirname, '.');
    return new Promise((resolve, reject) => {
        glob.glob('**/**.test.js', { cwd: testsRoot }).then(files => {
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
            try {
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} тестов провалено`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}
```

### ШАГ 14. Установить зависимости и собрать

```bash
npm install
npm run compile
```

Убедиться что компиляция проходит без ошибок.

### ШАГ 15. Проверить запуск

Открыть проект в VS Code, нажать F5 (Run Extension). В новом окне Extension Development Host:
- В Activity Bar должна появиться иконка Uplink
- В Status Bar — элемент "Uplink"
- Ctrl+Shift+P → "Uplink" — должны быть видны все 4 команды
- Команда "Uplink: Открыть чат" должна показать notification

## Критерии приёмки

- [ ] `npm run compile` проходит без ошибок
- [ ] `npm run lint` — 0 ошибок ESLint
- [ ] F5 запускает Extension Development Host
- [ ] Иконка Uplink в Activity Bar
- [ ] 4 команды видны в Command Palette
- [ ] Sidebar показывает "Каналы" и "Контакты" (с placeholder)
- [ ] Status Bar элемент отображается
- [ ] Контекстное меню редактора содержит "Отправить код в чат" при выделении

## Коммит

```
[ext] Scaffold расширения Uplink

- package.json с манифестом, командами, views, keybindings
- TypeScript + webpack конфигурация
- Точка входа с регистрацией команд
- Провайдеры sidebar (каналы, контакты)
- Утилиты (config, logger)
- Базовые тесты
- SVG иконка
```
