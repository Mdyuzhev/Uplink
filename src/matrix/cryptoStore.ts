import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Хранилище криптоключей для E2E шифрования.
 * Ключи хранятся в globalStorageUri расширения (персистентная директория VS Code).
 */
export class CryptoStoreManager {

    /** Получить путь к директории криптохранилища. Создаёт если не существует. */
    static getCryptoStorePath(context: vscode.ExtensionContext): string {
        const storagePath = context.globalStorageUri.fsPath;
        const cryptoPath = path.join(storagePath, 'crypto');
        if (!fs.existsSync(cryptoPath)) {
            fs.mkdirSync(cryptoPath, { recursive: true });
        }
        return cryptoPath;
    }

    /** Очистить криптохранилище. ВНИМАНИЕ: зашифрованные сообщения станут нечитаемыми! */
    static clearCryptoStore(context: vscode.ExtensionContext): void {
        const cryptoPath = this.getCryptoStorePath(context);
        if (fs.existsSync(cryptoPath)) {
            fs.rmSync(cryptoPath, { recursive: true, force: true });
            fs.mkdirSync(cryptoPath, { recursive: true });
        }
    }
}
