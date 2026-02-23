import * as vscode from 'vscode';
import { ChannelsProvider } from './providers/channelsProvider';
import { ContactsProvider } from './providers/contactsProvider';
import { logger } from './utils/logger';

/**
 * Активация расширения Uplink.
 * Вызывается VS Code при первом использовании команды или при запуске (onStartupFinished).
 */
export function activate(context: vscode.ExtensionContext) {
    logger.info('Расширение активировано');

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

    // Sidebar: каналы и контакты
    const channelsProvider = new ChannelsProvider();
    const contactsProvider = new ContactsProvider();

    vscode.window.registerTreeDataProvider('uplink.channels', channelsProvider);
    vscode.window.registerTreeDataProvider('uplink.contacts', contactsProvider);

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

    logger.info('Все команды зарегистрированы');
}

/**
 * Деактивация расширения.
 * Вызывается при закрытии VS Code или отключении расширения.
 */
export function deactivate() {
    logger.info('Расширение деактивировано');
    logger.dispose();
    // TODO: отключиться от Matrix, закрыть LiveKit, cleanup
}
