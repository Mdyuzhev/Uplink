import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { UplinkPanel } from './UplinkPanel';

/** Mime-type по расширению */
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

/** Регистрация всех команд Uplink */
export function registerCommands(context: vscode.ExtensionContext): void {
    // Отправить выделенный код в чат
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.sendSnippet', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const selection = editor.document.getText(editor.selection);
            if (!selection) {
                vscode.window.showWarningMessage('Выделите текст для отправки');
                return;
            }

            const language = editor.document.languageId;
            const fileName = editor.document.fileName.split(/[\\/]/).pop() || '';
            const lineRange = `${editor.selection.start.line + 1}-${editor.selection.end.line + 1}`;

            UplinkPanel.postToWebview({
                type: 'send-snippet',
                code: selection,
                language,
                fileName,
                lineRange,
            });

            vscode.commands.executeCommand('uplink.chatPanel.focus');
        }),
    );

    // Отправить файл в чат (file picker)
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.sendFile', async () => {
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Отправить',
                filters: {
                    'Изображения': ['png', 'jpg', 'jpeg', 'gif', 'webp'],
                    'Документы': ['pdf', 'doc', 'docx', 'txt'],
                    'Все файлы': ['*'],
                },
            });

            if (!uris || uris.length === 0) return;

            const filePath = uris[0].fsPath;
            const data = fs.readFileSync(filePath);
            const base64 = data.toString('base64');
            const name = path.basename(filePath);

            UplinkPanel.postToWebview({
                type: 'file-picked',
                name,
                base64,
                mimeType: getMimeType(name),
            });

            vscode.commands.executeCommand('uplink.chatPanel.focus');
        }),
    );

    // Начать звонок в активной комнате
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.startCall', () => {
            UplinkPanel.postToWebview({ type: 'command', command: 'start-call' });
            vscode.commands.executeCommand('uplink.chatPanel.focus');
        }),
    );
}
