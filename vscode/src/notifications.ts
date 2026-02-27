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
 * Три уровня: обычное сообщение, входящий звонок, упоминание.
 */
export async function handleNotification(
    msg: NotificationMessage,
    webview: vscode.Webview,
): Promise<void> {
    switch (msg.level) {
        case 'call': {
            const action = await vscode.window.showInformationMessage(
                `${msg.title}`,
                { modal: false },
                'Принять',
                'Отклонить',
            );
            if (action === 'Принять') {
                webview.postMessage({ type: 'call-accept', callId: msg.callId });
                vscode.commands.executeCommand('uplink.chatPanel.focus');
            } else if (action === 'Отклонить') {
                webview.postMessage({ type: 'call-reject', callId: msg.callId });
            }
            break;
        }

        case 'mention': {
            const action = await vscode.window.showWarningMessage(
                `${msg.title}: ${msg.body}`,
                'Перейти',
            );
            if (action === 'Перейти') {
                webview.postMessage({ type: 'navigate-room', roomId: msg.roomId });
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
