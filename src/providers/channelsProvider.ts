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
