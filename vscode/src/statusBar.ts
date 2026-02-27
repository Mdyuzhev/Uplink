import * as vscode from 'vscode';

let _statusBarItem: vscode.StatusBarItem | undefined;

export function setStatusBarItem(item: vscode.StatusBarItem): void {
    _statusBarItem = item;
}

export function updateConnectionStatus(state: string): void {
    if (!_statusBarItem) return;
    switch (state) {
        case 'connected':
            _statusBarItem.text = '$(comment-discussion) Uplink';
            _statusBarItem.color = undefined;
            break;
        case 'connecting':
            _statusBarItem.text = '$(sync~spin) Uplink...';
            _statusBarItem.color = 'yellow';
            break;
        default:
            _statusBarItem.text = '$(circle-slash) Uplink';
            _statusBarItem.color = 'red';
    }
}
