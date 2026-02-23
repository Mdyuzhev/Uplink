import * as vscode from 'vscode';
import { AuthManager } from './matrix/auth';
import { MatrixService } from './matrix/client';
import { CryptoStoreManager } from './matrix/cryptoStore';
import { RoomsManager } from './matrix/rooms';
import { ChannelsProvider } from './providers/channelsProvider';
import { ContactsProvider } from './providers/contactsProvider';
import { ChatViewProvider } from './providers/chatViewProvider';
import { getCodeContext } from './context/codeContext';
import { getConfig } from './utils/config';
import { logger } from './utils/logger';

/**
 * Активация расширения Uplink.
 */
export async function activate(context: vscode.ExtensionContext) {
    logger.info('Расширение активировано');

    // Сервисы
    const authManager = new AuthManager(context.secrets);
    const matrixService = new MatrixService();
    const cryptoStorePath = CryptoStoreManager.getCryptoStorePath(context);

    // Провайдеры sidebar
    const channelsProvider = new ChannelsProvider(matrixService);
    const contactsProvider = new ContactsProvider(matrixService);
    vscode.window.registerTreeDataProvider('uplink.channels', channelsProvider);
    vscode.window.registerTreeDataProvider('uplink.contacts', contactsProvider);

    // Chat WebView
    const chatProvider = new ChatViewProvider(context.extensionUri, matrixService);

    // Status bar
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.command = 'uplink.openChat';
    updateStatusBar(statusBar, false);
    statusBar.show();

    // Подписки на события Matrix
    matrixService.onConnectionChanged((connected) => {
        updateStatusBar(statusBar, connected);
        if (connected) {
            channelsProvider.refresh();
            contactsProvider.refresh();
        }
    });
    matrixService.onRoomsUpdated(() => channelsProvider.refresh());
    matrixService.onNewMessage(() => channelsProvider.refresh());
    matrixService.onPresenceChanged(() => contactsProvider.refresh());

    // Автологин по сохранённому токену
    const config = getConfig();
    const savedCreds = await authManager.getCredentials();

    if (savedCreds && config.autoConnect) {
        try {
            await matrixService.loginWithToken(
                config.homeserver,
                savedCreds.userId,
                savedCreds.token,
                savedCreds.deviceId,
                cryptoStorePath
            );
            await matrixService.startSync();
            logger.info('Автологин успешен');
        } catch (_err) {
            logger.warn('Автологин не удался, требуется повторная авторизация');
            await authManager.clearCredentials();
        }
    }

    // Команда: открыть чат / логин
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.openChat', async () => {
            if (!matrixService.isConnected) {
                const loginData = await authManager.promptLogin();
                if (!loginData) { return; }

                try {
                    const creds = await matrixService.login(
                        loginData.homeserver,
                        loginData.userId,
                        loginData.password,
                        cryptoStorePath
                    );
                    await authManager.saveCredentials(creds.userId, creds.accessToken, creds.deviceId);
                    await matrixService.startSync();
                    vscode.window.showInformationMessage(`Uplink: подключено как ${creds.userId}`);
                } catch (err) {
                    vscode.window.showErrorMessage(`Uplink: ошибка подключения — ${(err as Error).message}`);
                    return;
                }
            }
            chatProvider.show();
        })
    );

    // Команда: отправить выделенный код
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.sendSnippet', async () => {
            if (!matrixService.isConnected) {
                vscode.window.showWarningMessage('Uplink: сначала подключитесь к серверу');
                return;
            }

            const codeCtx = getCodeContext();
            if (!codeCtx) {
                vscode.window.showWarningMessage('Uplink: выделите код для отправки');
                return;
            }

            const roomsManager = new RoomsManager(matrixService.matrixClient);
            const { channels, directs } = roomsManager.getGroupedRooms();
            const allRooms = [...channels, ...directs];

            const picked = await vscode.window.showQuickPick(
                allRooms.map(r => ({
                    label: r.type === 'channel' ? `# ${r.name}` : r.name,
                    description: r.encrypted ? '🔒' : '',
                    roomId: r.id,
                })),
                { placeHolder: 'Выберите канал для отправки кода' }
            );
            if (!picked) { return; }

            try {
                await matrixService.sendCodeSnippet(picked.roomId, {
                    code: codeCtx.selectedText,
                    language: codeCtx.languageId,
                    fileName: codeCtx.relativePath,
                    lineStart: codeCtx.lineStart,
                    lineEnd: codeCtx.lineEnd,
                    gitBranch: codeCtx.gitBranch,
                });
                vscode.window.showInformationMessage(`Uplink: код отправлен в ${picked.label}`);
            } catch (err) {
                vscode.window.showErrorMessage(`Uplink: ошибка отправки — ${(err as Error).message}`);
            }
        })
    );

    // Команда: написать пользователю (DM)
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.startDirectMessage', async (userId: string, displayName: string) => {
            if (!matrixService.isConnected) {
                vscode.window.showWarningMessage('Uplink: сначала подключитесь к серверу');
                return;
            }

            try {
                const roomsManager = new RoomsManager(matrixService.matrixClient);
                const { directs } = roomsManager.getGroupedRooms();
                let existingRoom = directs.find(r => r.peerId === userId);

                let roomId: string;
                if (existingRoom) {
                    roomId = existingRoom.id;
                } else {
                    roomId = await roomsManager.createDirectMessage(userId);
                    // Обновляем m.direct account data
                    const directMap = matrixService.matrixClient
                        .getAccountData('m.direct')?.getContent() || {};
                    const updated = { ...directMap, [userId]: [...((directMap as Record<string, string[]>)[userId] || []), roomId] };
                    await matrixService.matrixClient.setAccountData('m.direct', updated);
                }

                chatProvider.show();
                chatProvider.openRoom(roomId);
                logger.info(`DM открыт с ${displayName} (${userId})`);
            } catch (err) {
                vscode.window.showErrorMessage(`Uplink: не удалось начать чат с ${displayName} — ${(err as Error).message}`);
            }
        })
    );

    // Команда: начать звонок (заглушка)
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.startCall', () => {
            vscode.window.showInformationMessage('Uplink: звонки будут в задаче 005');
        })
    );

    // Команда: отключиться
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.disconnect', async () => {
            await matrixService.logout();
            await authManager.clearCredentials();
            CryptoStoreManager.clearCryptoStore(context);
            channelsProvider.refresh();
            contactsProvider.refresh();
            vscode.window.showInformationMessage('Uplink: отключено');
        })
    );

    context.subscriptions.push(statusBar);
    logger.info('Все команды зарегистрированы');
}

function updateStatusBar(item: vscode.StatusBarItem, connected: boolean) {
    if (connected) {
        item.text = '$(check) Uplink';
        item.tooltip = 'Uplink: подключено';
        item.backgroundColor = undefined;
    } else {
        item.text = '$(plug) Uplink';
        item.tooltip = 'Uplink: нажмите для подключения';
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

export function deactivate() {
    logger.info('Расширение деактивировано');
    logger.dispose();
}
