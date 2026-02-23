/**
 * Обёртка для VS Code API внутри WebView.
 * acquireVsCodeApi() можно вызвать только один раз.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

export const vscodeApi = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postMessage: (message: any) => vscode.postMessage(message),
    getState: () => vscode.getState(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState: (state: any) => vscode.setState(state),
};
