import * as vscode from 'vscode';

/**
 * Управление авторизацией Uplink.
 * Хранит access token в VS Code SecretStorage (зашифрованное системное хранилище).
 */
export class AuthManager {
    private static readonly TOKEN_KEY = 'uplink.matrix.accessToken';
    private static readonly USER_KEY = 'uplink.matrix.userId';
    private static readonly DEVICE_KEY = 'uplink.matrix.deviceId';

    constructor(private secrets: vscode.SecretStorage) {}

    /** Сохранить credentials после успешного логина. */
    async saveCredentials(userId: string, token: string, deviceId: string): Promise<void> {
        await this.secrets.store(AuthManager.TOKEN_KEY, token);
        await this.secrets.store(AuthManager.USER_KEY, userId);
        await this.secrets.store(AuthManager.DEVICE_KEY, deviceId);
    }

    /** Получить сохранённые credentials. Null если не авторизован. */
    async getCredentials(): Promise<{
        userId: string;
        token: string;
        deviceId: string;
    } | null> {
        const token = await this.secrets.get(AuthManager.TOKEN_KEY);
        const userId = await this.secrets.get(AuthManager.USER_KEY);
        const deviceId = await this.secrets.get(AuthManager.DEVICE_KEY);
        if (!token || !userId || !deviceId) { return null; }
        return { userId, token, deviceId };
    }

    /** Очистить credentials (logout). */
    async clearCredentials(): Promise<void> {
        await this.secrets.delete(AuthManager.TOKEN_KEY);
        await this.secrets.delete(AuthManager.USER_KEY);
        await this.secrets.delete(AuthManager.DEVICE_KEY);
    }

    /** Показать диалог авторизации: homeserver → userId → пароль. */
    async promptLogin(): Promise<{
        homeserver: string;
        userId: string;
        password: string;
    } | undefined> {
        const defaultHomeserver = vscode.workspace
            .getConfiguration('uplink')
            .get<string>('matrix.homeserver', 'http://localhost:8008');

        const homeserver = await vscode.window.showInputBox({
            prompt: 'Matrix Homeserver URL',
            value: defaultHomeserver,
            placeHolder: 'http://localhost:8008',
            validateInput: (v) => {
                try { new URL(v); return null; }
                catch { return 'Введите корректный URL'; }
            }
        });
        if (!homeserver) { return undefined; }

        const userId = await vscode.window.showInputBox({
            prompt: 'Matrix User ID',
            placeHolder: '@username:uplink.local',
            validateInput: (v) =>
                v.startsWith('@') && v.includes(':')
                    ? null
                    : 'Формат: @username:domain'
        });
        if (!userId) { return undefined; }

        const password = await vscode.window.showInputBox({
            prompt: `Пароль для ${userId}`,
            password: true,
            validateInput: (v) => v.length > 0 ? null : 'Введите пароль'
        });
        if (!password) { return undefined; }

        return { homeserver, userId, password };
    }
}
