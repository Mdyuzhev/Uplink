import * as vscode from 'vscode';
import { UplinkPanel } from './UplinkPanel';
import { setStatusBarItem } from './statusBar';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
    console.log('Uplink активирован');

    // Activity Bar — WebView Provider
    const provider = UplinkPanel.createViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('uplink.chatPanel', provider, {
            webviewOptions: { retainContextWhenHidden: true },
        }),
    );

    // Команда: открыть чат в отдельной панели
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.openChat', () => {
            UplinkPanel.createOrShow(context);
        }),
    );

    // Команда: отключиться
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.disconnect', () => {
            UplinkPanel.postToWebview({ type: 'command', command: 'logout' });
        }),
    );

    // Команды: отправка кода, файлов, звонок
    registerCommands(context);

    // Status Bar
    const statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 100,
    );
    statusBar.command = 'uplink.openChat';
    statusBar.text = '$(comment-discussion) Uplink';
    statusBar.tooltip = 'Открыть Uplink';
    statusBar.show();
    setStatusBarItem(statusBar);
    context.subscriptions.push(statusBar);
}

export function deactivate() {
    console.log('Uplink деактивирован');
}
