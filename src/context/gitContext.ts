import * as vscode from 'vscode';

/** Расширенная Git-информация для привязки к контексту разработки. */
export interface GitInfo {
    branch: string;
    remoteUrl?: string;
    lastCommitHash?: string;
    lastCommitMessage?: string;
    isDirty: boolean;
}

/** Получить информацию о текущем Git-репозитории. */
export function getGitInfo(): GitInfo | null {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) { return null; }

        const api = gitExtension.getAPI(1);
        if (!api || api.repositories.length === 0) { return null; }

        const repo = api.repositories[0];
        const head = repo.state.HEAD;

        return {
            branch: head?.name || 'detached',
            remoteUrl: repo.state.remotes[0]?.fetchUrl,
            lastCommitHash: head?.commit?.substring(0, 8),
            lastCommitMessage: head?.name,
            isDirty: repo.state.workingTreeChanges.length > 0,
        };
    } catch {
        return null;
    }
}
