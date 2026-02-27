import * as vscode from 'vscode';

let _statusBarItem: vscode.StatusBarItem | undefined;
let _callTimer: ReturnType<typeof setInterval> | undefined;
let _callStartTime: number | undefined;

export function setStatusBarItem(item: vscode.StatusBarItem): void {
    _statusBarItem = item;
}

export function updateConnectionStatus(state: string): void {
    if (!_statusBarItem) return;
    // Не перезаписывать если идёт звонок
    if (_callTimer) return;

    switch (state) {
        case 'connected':
            _statusBarItem.text = '$(comment-discussion) Uplink';
            _statusBarItem.backgroundColor = undefined;
            break;
        case 'connecting':
            _statusBarItem.text = '$(sync~spin) Uplink...';
            _statusBarItem.backgroundColor = undefined;
            break;
        default:
            _statusBarItem.text = '$(circle-slash) Uplink';
            _statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.errorBackground',
            );
    }
}

export function setCallState(active: boolean): void {
    if (!_statusBarItem) return;

    if (active) {
        _callStartTime = Date.now();
        _callTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - _callStartTime!) / 1000);
            const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const sec = (elapsed % 60).toString().padStart(2, '0');
            _statusBarItem!.text = `$(call-outgoing) Uplink — ${min}:${sec}`;
            _statusBarItem!.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.warningBackground',
            );
        }, 1000);
    } else {
        if (_callTimer) {
            clearInterval(_callTimer);
            _callTimer = undefined;
            _callStartTime = undefined;
        }
        updateConnectionStatus('connected');
    }
}
