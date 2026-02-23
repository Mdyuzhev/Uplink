# /scaffold — Создать заготовку компонента

## Аргументы

```
/scaffold <type> <name> <description>
```

Типы: `command`, `matrix-module`, `livekit-module`, `webview-component`, `provider`, `util`

Примеры:
- `/scaffold command toggleMute Переключение микрофона в звонке`
- `/scaffold matrix-module presence Отслеживание онлайн-статусов`
- `/scaffold webview-component UserAvatar Аватар пользователя с онлайн-индикатором`

## Шаблоны

### command
Файл: `src/commands/<name>.ts`
```typescript
import * as vscode from 'vscode';

/**
 * <description>
 */
export function register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('uplink.<name>', async () => {
        // TODO: реализовать
    });
}
```

### matrix-module
Файл: `src/matrix/<name>.ts`
```typescript
import { MatrixClient } from 'matrix-js-sdk';

/**
 * <description>
 */
export class <ClassName> {
    constructor(private client: MatrixClient) {}

    // TODO: реализовать
}
```

### livekit-module
Файл: `src/livekit/<name>.ts`
```typescript
import { Room } from 'livekit-client';

/**
 * <description>
 */
export class <ClassName> {
    constructor(private room: Room) {}

    // TODO: реализовать
}
```

### webview-component
Файл: `src/webview/chat/<Name>.tsx` (или call/ — уточнить)
```tsx
import React from 'react';

interface <Name>Props {
    // TODO: определить пропсы
}

/**
 * <description>
 */
export const <Name>: React.FC<<Name>Props> = (props) => {
    return (
        <div className="uplink-<name>">
            {/* TODO: реализовать */}
        </div>
    );
};
```

### provider
Файл: `src/providers/<name>Provider.ts`
```typescript
import * as vscode from 'vscode';

/**
 * <description>
 */
export class <ClassName>Provider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        // TODO: реализовать
        return Promise.resolve([]);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
```

## Что делать

1. Проверь что компонент с таким именем не существует
2. Создай файл из шаблона
3. Создай файл теста в `test/suite/<name>.test.ts`
4. Выведи:
```
Создан компонент: <name>
  Тип:   <type>
  Файл:  src/<path>/<name>.ts
  Тест:  test/suite/<name>.test.ts
  Статус: заготовка, требует реализации
```

## Правила

- Не реализуй логику — только заготовку
- Импорты только из зависимостей в package.json
- Имена файлов: camelCase для TS, PascalCase для TSX-компонентов
