import * as vscode from 'vscode';
import { MatrixService } from '../matrix/client';
import { RoomsManager, RoomInfo } from '../matrix/rooms';

/**
 * TreeView провайдер для списка каналов и DM.
 * Отображает реальные комнаты из Matrix.
 */
export class ChannelsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private matrixService?: MatrixService) {}

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!this.matrixService?.isConnected) {
            const placeholder = new vscode.TreeItem(
                'Подключитесь для просмотра каналов',
                vscode.TreeItemCollapsibleState.None
            );
            placeholder.iconPath = new vscode.ThemeIcon('info');
            return Promise.resolve([placeholder]);
        }

        // Корневой уровень — секции
        if (!element) {
            const channelsSection = new vscode.TreeItem('Каналы', vscode.TreeItemCollapsibleState.Expanded);
            channelsSection.contextValue = 'section-channels';
            channelsSection.iconPath = new vscode.ThemeIcon('symbol-namespace');

            const directsSection = new vscode.TreeItem('Личные сообщения', vscode.TreeItemCollapsibleState.Expanded);
            directsSection.contextValue = 'section-directs';
            directsSection.iconPath = new vscode.ThemeIcon('person');

            return Promise.resolve([channelsSection, directsSection]);
        }

        const roomsManager = new RoomsManager(this.matrixService.matrixClient);
        const { channels, directs } = roomsManager.getGroupedRooms();

        if (element.contextValue === 'section-channels') {
            return Promise.resolve(channels.map(r => this.createRoomItem(r)));
        }

        if (element.contextValue === 'section-directs') {
            return Promise.resolve(directs.map(r => this.createRoomItem(r)));
        }

        return Promise.resolve([]);
    }

    private createRoomItem(room: RoomInfo): vscode.TreeItem {
        const label = room.type === 'channel' ? `# ${room.name}` : room.name;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);

        if (room.type === 'direct') {
            const presenceIcon = room.peerPresence === 'online' ? 'circle-filled' : 'circle-outline';
            item.iconPath = new vscode.ThemeIcon(presenceIcon);
        } else {
            item.iconPath = new vscode.ThemeIcon(room.encrypted ? 'lock' : 'hash');
        }

        if (room.lastMessage) {
            const preview = room.lastMessage.length > 50
                ? room.lastMessage.substring(0, 50) + '...'
                : room.lastMessage;
            item.description = room.unreadCount > 0
                ? `(${room.unreadCount}) ${preview}`
                : preview;
        }

        item.tooltip = [
            room.name,
            room.encrypted ? '🔒 Зашифрован' : '',
            room.topic || '',
        ].filter(Boolean).join('\n');

        item.contextValue = room.type;
        item.command = {
            command: 'uplink.openChat',
            title: 'Открыть чат',
            arguments: [{ roomId: room.id }],
        };

        return item;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
