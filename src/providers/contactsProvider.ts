import * as vscode from 'vscode';
import { MatrixService } from '../matrix/client';

/**
 * TreeView провайдер для списка контактов.
 * Показывает пользователей из joined-комнат с онлайн-статусами.
 */
export class ContactsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private matrixService?: MatrixService) {}

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        if (!this.matrixService?.isConnected) {
            const placeholder = new vscode.TreeItem(
                'Подключитесь для просмотра контактов',
                vscode.TreeItemCollapsibleState.None
            );
            placeholder.iconPath = new vscode.ThemeIcon('person');
            return Promise.resolve([placeholder]);
        }

        const client = this.matrixService.matrixClient;
        const myUserId = client.getUserId();
        const usersMap = new Map<string, { userId: string; displayName: string; presence: string }>();

        for (const room of this.matrixService.getRooms()) {
            for (const member of room.getJoinedMembers()) {
                if (member.userId === myUserId) { continue; }
                if (usersMap.has(member.userId)) { continue; }

                const user = client.getUser(member.userId);
                usersMap.set(member.userId, {
                    userId: member.userId,
                    displayName: user?.displayName || member.userId.split(':')[0].substring(1),
                    presence: (user?.presence as string) || 'offline',
                });
            }
        }

        const users = Array.from(usersMap.values());
        users.sort((a, b) => {
            if (a.presence === 'online' && b.presence !== 'online') { return -1; }
            if (a.presence !== 'online' && b.presence === 'online') { return 1; }
            return a.displayName.localeCompare(b.displayName);
        });

        return Promise.resolve(users.map(u => {
            const item = new vscode.TreeItem(u.displayName, vscode.TreeItemCollapsibleState.None);
            const isOnline = u.presence === 'online';
            item.iconPath = new vscode.ThemeIcon(isOnline ? 'circle-filled' : 'circle-outline');
            item.description = isOnline ? 'в сети' : 'не в сети';
            item.tooltip = `${u.displayName}\n${u.userId}\n${isOnline ? '🟢 В сети' : '⚪ Не в сети'}`;
            item.contextValue = 'contact';
            item.command = {
                command: 'uplink.startDirectMessage',
                title: 'Написать',
                arguments: [u.userId, u.displayName],
            };
            return item;
        }));
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
