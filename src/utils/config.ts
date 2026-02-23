import * as vscode from 'vscode';

/**
 * Получение конфигурации Uplink из VS Code settings.
 */
export function getConfig() {
    const config = vscode.workspace.getConfiguration('uplink');
    return {
        homeserver: config.get<string>('matrix.homeserver', 'http://localhost:8008'),
        userId: config.get<string>('matrix.userId', ''),
        livekitUrl: config.get<string>('livekit.url', 'ws://localhost:7880'),
        autoConnect: config.get<boolean>('autoConnect', true),
    };
}
