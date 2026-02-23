import * as vscode from 'vscode';

/** Контекст выделенного кода в редакторе. */
export interface CodeContext {
    selectedText: string;
    fileName: string;
    relativePath: string;
    languageId: string;
    lineStart: number;
    lineEnd: number;
    gitBranch?: string;
}

/** Получить контекст текущего выделения. Null если нет выделения. */
export function getCodeContext(): CodeContext | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return null; }

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) { return null; }

    return {
        selectedText: text,
        fileName: editor.document.fileName,
        relativePath: vscode.workspace.asRelativePath(editor.document.uri),
        languageId: editor.document.languageId,
        lineStart: selection.start.line + 1,
        lineEnd: selection.end.line + 1,
        gitBranch: getGitBranch(),
    };
}

/** Получить текущую Git-ветку через встроенный VS Code Git extension. */
function getGitBranch(): string | undefined {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) { return undefined; }

        const api = gitExtension.getAPI(1);
        if (!api || api.repositories.length === 0) { return undefined; }

        const repo = api.repositories[0];
        return repo.state.HEAD?.name || undefined;
    } catch {
        return undefined;
    }
}
