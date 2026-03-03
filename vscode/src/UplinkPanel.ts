import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { handleWebViewMessage, setWebviewViewRef } from './bridge';

/**
 * Панель Uplink — WebView с загруженным React SPA.
 *
 * Два режима:
 * 1. Dev: iframe с http://localhost:5173
 * 2. Production: загружает собранный dist/ из web/
 */
export class UplinkPanel {
    static currentPanel: UplinkPanel | undefined;
    private readonly _panel: vscode.WebviewPanel | vscode.WebviewView;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];

    /** Activity Bar — WebviewViewProvider */
    static createViewProvider(context: vscode.ExtensionContext): vscode.WebviewViewProvider {
        return {
            resolveWebviewView(webviewView: vscode.WebviewView) {
                webviewView.webview.options = UplinkPanel._getWebviewOptions(context.extensionUri);
                setWebviewViewRef(webviewView);
                const panel = new UplinkPanel(webviewView, context);
                UplinkPanel.currentPanel = panel;
            },
        };
    }

    /** Command Palette — открыть в отдельной панели */
    static createOrShow(context: vscode.ExtensionContext): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (UplinkPanel.currentPanel) {
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'uplink.chat',
            'Uplink',
            column || vscode.ViewColumn.Beside,
            UplinkPanel._getWebviewOptions(context.extensionUri),
        );

        UplinkPanel.currentPanel = new UplinkPanel(panel, context);
    }

    /** Отправить сообщение в WebView */
    static postToWebview(msg: Record<string, unknown>): void {
        if (!UplinkPanel.currentPanel) return;
        UplinkPanel.currentPanel._getWebview().postMessage(msg);
    }

    private constructor(
        panel: vscode.WebviewPanel | vscode.WebviewView,
        context: vscode.ExtensionContext,
    ) {
        this._panel = panel;
        this._context = context;

        this._update();

        const webview = this._getWebview();
        webview.onDidReceiveMessage(
            msg => handleWebViewMessage(msg, webview, context),
            undefined,
            this._disposables,
        );

        if ('onDidDispose' in panel) {
            (panel as vscode.WebviewPanel).onDidDispose(
                () => this.dispose(),
                null,
                this._disposables,
            );
        }
    }

    private _update(): void {
        const webview = this._getWebview();
        webview.html = this._getHtmlForWebview(webview);
    }

    private _getWebview(): vscode.Webview {
        return this._panel.webview;
    }

    /**
     * CSP и HTML для загрузки SPA.
     *
     * Разрешения:
     * - wasm-unsafe-eval — для matrix-sdk-crypto-wasm
     * - connect-src ws: wss: https: — Matrix sync + LiveKit WebSocket
     * - media-src — аватары и медиа
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const distPath = path.join(this._context.extensionUri.fsPath, 'webview-dist');
        const isDev = !fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'));

        if (isDev) {
            return this._getDevHtml();
        }

        return this._getProductionHtml(webview, distPath);
    }

    /** Dev-режим: iframe с Vite dev server */
    private _getDevHtml(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        frame-src http://localhost:5173;
        style-src 'unsafe-inline';
    ">
</head>
<body style="margin:0;padding:0;overflow:hidden;">
    <iframe
        src="http://localhost:5173"
        style="width:100%;height:100vh;border:none;"
        allow="camera;microphone"
    ></iframe>
</body>
</html>`;
    }

    /** Production: загрузить собранный SPA */
    private _getProductionHtml(webview: vscode.Webview, distPath: string): string {
        let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

        const nonce = getNonce();
        const baseUri = webview.asWebviewUri(vscode.Uri.file(distPath));

        const csp = [
            `default-src 'none'`,
            `script-src 'nonce-${nonce}' 'wasm-unsafe-eval'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource} https: data: blob:`,
            `media-src ${webview.cspSource} https: blob:`,
            `connect-src https: wss: ws: http://localhost:*`,
            `worker-src blob:`,
        ].join('; ');

        // Переписать пути ассетов
        html = html
            .replace(/(href|src)="\/assets\//g, `$1="${baseUri}/assets/`)
            .replace(/(href|src)="\//g, `$1="${baseUri}/`);

        // CSP
        html = html.replace(
            '<head>',
            `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`,
        );

        // Nonce для скриптов
        html = html.replace(/<script /g, `<script nonce="${nonce}" `);

        // URL сервера из настроек VSCode
        const serverUrl = vscode.workspace.getConfiguration('uplink').get<string>('serverUrl') || '';

        // Мост VS Code API
        html = html.replace(
            '</body>',
            `<script nonce="${nonce}">
    window.__VSCODE__ = true;
    window.__UPLINK_SERVER_URL__ = ${JSON.stringify(serverUrl)};
    window.__VSCODE_API__ = acquireVsCodeApi();
    window.__UPLINK_STORAGE_BRIDGE__ = {
        getItem: (key) => {
            return new Promise(resolve => {
                const id = Date.now() + Math.random();
                const handler = (e) => {
                    if (e.data?.type === 'storage-result' && e.data.id === id) {
                        window.removeEventListener('message', handler);
                        resolve(e.data.value);
                    }
                };
                window.addEventListener('message', handler);
                window.__VSCODE_API__.postMessage({ type: 'storage-get', key, id });
            });
        },
        setItem: (key, value) => {
            window.__VSCODE_API__.postMessage({ type: 'storage-set', key, value });
        },
        removeItem: (key) => {
            window.__VSCODE_API__.postMessage({ type: 'storage-remove', key });
        },
    };
</script>\n</body>`,
        );

        return html;
    }

    static _getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
        const distPath = vscode.Uri.joinPath(extensionUri, 'webview-dist');
        return {
            enableScripts: true,
            localResourceRoots: [distPath],
        };
    }

    dispose(): void {
        UplinkPanel.currentPanel = undefined;
        this._disposables.forEach(d => d.dispose());
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
