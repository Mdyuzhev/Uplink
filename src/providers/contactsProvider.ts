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
