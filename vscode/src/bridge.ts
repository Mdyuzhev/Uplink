import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { updateConnectionStatus } from './statusBar';

/**
 * Мост между Extension Host и WebView.
 *
 * WebView отправляет postMessage → extension обрабатывает и отвечает.
 * Протокол: { type: string, ...payload }
 */
export function handleWebViewMessage(
    msg: Record<string, unknown>,
    webview: vscode.Webview,
    context: vscode.ExtensionContext,
): void {
    switch (msg.type) {
        // --- Хранилище (замена localStorage) ---
        case 'storage-get': {
            const value = context.globalState.get<string>(msg.key as string) ?? null;
            webview.postMessage({ type: 'storage-result', id: msg.id, value });
            break;
        }
        case 'storage-set': {
            context.globalState.update(msg.key as string, msg.value);
            break;
        }
        case 'storage-remove': {
            context.globalState.update(msg.key as string, undefined);
            break;
        }

        // --- Уведомления ---
        case 'notification': {
            const { title, body } = msg as { title: string; body: string };
            vscode.window.showInformationMessage(`${title}: ${body}`);
            break;
        }

        // --- Unread badge ---
        case 'unread-count': {
            // ViewBadge обновляется через webviewView, пока логируем
            const count = msg.count as number;
            if (count > 0) {
                vscode.window.setStatusBarMessage(`Uplink: ${count} непрочитанных`, 5000);
            }
            break;
        }

        // --- Статус подключения ---
        case 'connection-state': {
            updateConnectionStatus(msg.state as string);
            break;
        }

        // --- Выбор файла из workspace ---
        case 'pick-file': {
            vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'Все файлы': ['*'] },
            }).then(uris => {
                if (uris && uris[0]) {
                    const filePath = uris[0].fsPath;
                    const data = fs.readFileSync(filePath);
                    const base64 = data.toString('base64');
                    const name = path.basename(filePath);
                    webview.postMessage({
                        type: 'file-picked',
                        name,
                        base64,
                        mimeType: getMimeType(name),
                    });
                }
            });
            break;
        }
    }
}

function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
        pdf: 'application/pdf', zip: 'application/zip',
        txt: 'text/plain', json: 'application/json',
        js: 'text/javascript', ts: 'text/typescript',
    };
    return map[ext || ''] || 'application/octet-stream';
}
