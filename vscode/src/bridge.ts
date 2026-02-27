import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { updateConnectionStatus, setCallState } from './statusBar';
import { handleNotification } from './notifications';

/** Ссылка на WebviewView для обновления badge */
let _webviewView: vscode.WebviewView | undefined;

export function setWebviewViewRef(view: vscode.WebviewView): void {
    _webviewView = view;
}

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

        // --- Уведомления (три уровня) ---
        case 'notification': {
            handleNotification(
                msg as any,
                webview,
            );
            break;
        }

        // --- Unread badge на Activity Bar ---
        case 'unread-count': {
            const count = msg.count as number;
            if (_webviewView) {
                _webviewView.badge = count > 0
                    ? { tooltip: `${count} непрочитанных`, value: count }
                    : undefined;
            }
            break;
        }

        // --- Статус подключения ---
        case 'connection-state': {
            updateConnectionStatus(msg.state as string);
            break;
        }

        // --- Состояние звонка ---
        case 'call-state': {
            setCallState(msg.active as boolean);
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
