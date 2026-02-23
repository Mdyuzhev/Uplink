import * as vscode from 'vscode';
import { MatrixService } from '../matrix/client';
import { RoomsManager } from '../matrix/rooms';
import { MessageFormatter, ParsedMessage } from '../matrix/messages';
import { logger } from '../utils/logger';

/**
 * Провайдер WebView-панели чата.
 * Связывает React UI с MatrixService через postMessage.
 */
export class ChatViewProvider {
    private panel: vscode.WebviewPanel | null = null;
    private disposables: vscode.Disposable[] = [];
    private activeRoomId: string | null = null;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly matrixService: MatrixService
    ) {}

    /** Показать или активировать панель чата. */
    show(): void {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'uplink.chatPanel',
            'Uplink Chat',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, 'dist'),
                ],
            }
        );

        this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'uplink-icon.svg');
        this.panel.webview.html = this.getHtml(this.panel.webview);

        // Обработка сообщений от WebView
        this.panel.webview.onDidReceiveMessage(
            (msg) => this.handleWebviewMessage(msg),
            null,
            this.disposables
        );

        // Подписки на события Matrix
        this.disposables.push(
            this.matrixService.onConnectionChanged((connected) => {
                this.postMessage({
                    type: 'connectionStatus',
                    connected,
                    userId: connected ? this.getUserId() : undefined,
                });
                if (connected) {
                    this.sendRooms();
                }
            }),
            this.matrixService.onNewMessage(({ roomId, event }) => {
                const parsed = MessageFormatter.parseEvent(event);
                if (!parsed) { return; }
                const message = this.toWebViewMessage(parsed, roomId);
                this.postMessage({ type: 'newMessage', roomId, message });
            }),
            this.matrixService.onRoomsUpdated(() => this.sendRooms()),
        );

        this.panel.onDidDispose(() => {
            this.panel = null;
            this.activeRoomId = null;
            this.disposables.forEach(d => d.dispose());
            this.disposables = [];
        });

        // Отправить начальное состояние
        this.sendConnectionStatus();
        if (this.matrixService.isConnected) {
            this.sendRooms();
        }
    }

    /** Открыть конкретную комнату в WebView. */
    openRoom(roomId: string): void {
        this.activeRoomId = roomId;
        this.postMessage({ type: 'openRoom', roomId });
    }

    /** Закрыть панель. */
    dispose(): void {
        this.panel?.dispose();
    }

    /** Обработка сообщений от WebView. */
    private async handleWebviewMessage(msg: WebViewIncoming): Promise<void> {
        switch (msg.type) {
            case 'requestRooms':
                this.sendRooms();
                break;

            case 'selectRoom':
                this.activeRoomId = msg.roomId;
                await this.matrixService.markRoomAsRead(msg.roomId);
                this.sendRoomMessages(msg.roomId);
                break;

            case 'sendMessage':
                if (msg.roomId && msg.body) {
                    try {
                        await this.matrixService.sendMessage(msg.roomId, msg.body);
                    } catch (err) {
                        logger.error('Ошибка отправки сообщения', err as Error);
                    }
                }
                break;

            case 'loadMoreMessages':
                if (msg.roomId) {
                    const hasMore = await this.matrixService.loadMoreMessages(msg.roomId);
                    if (hasMore) {
                        this.sendRoomMessages(msg.roomId);
                    }
                }
                break;

            case 'openFile':
                if (msg.fileName) {
                    this.openFileInEditor(msg.fileName, msg.lineStart);
                }
                break;
        }
    }

    /** Отправить список комнат в WebView. */
    private sendRooms(): void {
        if (!this.matrixService.isConnected) { return; }
        try {
            const roomsManager = new RoomsManager(this.matrixService.matrixClient);
            const { channels, directs } = roomsManager.getGroupedRooms();
            this.postMessage({ type: 'rooms', channels, directs });
        } catch (err) {
            logger.error('Ошибка получения комнат', err as Error);
        }
    }

    /** Отправить сообщения комнаты в WebView. */
    private sendRoomMessages(roomId: string): void {
        const events = this.matrixService.getRoomTimeline(roomId);
        const messages = events
            .map(e => MessageFormatter.parseEvent(e))
            .filter((m): m is ParsedMessage => m !== null)
            .map(m => this.toWebViewMessage(m, roomId));

        this.postMessage({ type: 'messages', roomId, messages });
    }

    /** Отправить статус подключения в WebView. */
    private sendConnectionStatus(): void {
        this.postMessage({
            type: 'connectionStatus',
            connected: this.matrixService.isConnected,
            userId: this.matrixService.isConnected ? this.getUserId() : undefined,
        });
    }

    /** Конвертировать ParsedMessage в формат WebView. */
    private toWebViewMessage(parsed: ParsedMessage, roomId: string) {
        return {
            id: parsed.id,
            roomId,
            sender: parsed.sender,
            senderDisplayName: this.matrixService.getDisplayName(parsed.sender),
            body: parsed.body,
            timestamp: parsed.timestamp,
            type: parsed.type,
            formattedBody: parsed.formattedBody,
            codeContext: parsed.codeContext,
        };
    }

    /** Получить userId текущего пользователя. */
    private getUserId(): string {
        try {
            return this.matrixService.matrixClient.getUserId() || '';
        } catch {
            return '';
        }
    }

    /** Открыть файл в редакторе. */
    private async openFileInEditor(fileName: string, lineStart?: number): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) { return; }

        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        try {
            const doc = await vscode.workspace.openTextDocument(fileUri);
            const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
            if (lineStart && lineStart > 0) {
                const pos = new vscode.Position(lineStart - 1, 0);
                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
            }
        } catch (err) {
            logger.warn(`Файл не найден: ${fileName}`);
        }
    }

    /** Отправить сообщение в WebView. */
    private postMessage(msg: unknown): void {
        this.panel?.webview.postMessage(msg);
    }

    /** Сгенерировать HTML для WebView. */
    private getHtml(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'chat.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';
                   worker-src ${webview.cspSource} blob:;
                   img-src ${webview.cspSource} https:;
                   font-src ${webview.cspSource};">
    <title>Uplink Chat</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
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

/** Типы входящих сообщений от WebView. */
type WebViewIncoming =
    | { type: 'requestRooms' }
    | { type: 'selectRoom'; roomId: string }
    | { type: 'sendMessage'; roomId: string; body: string }
    | { type: 'loadMoreMessages'; roomId: string }
    | { type: 'openFile'; fileName: string; lineStart?: number };
