import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';
import type { ThreadPreview } from '../matrix/ThreadIndexService';

export function useAllThreads() {
    const [threads, setThreads] = useState<ThreadPreview[]>([]);

    const refresh = useCallback(() => {
        try {
            setThreads(matrixService.threadIndex.getAllMyThreads());
        } catch {
            // client not ready yet
        }
    }, []);

    useEffect(() => {
        refresh();
        const u1 = matrixService.onThreadUpdate(() => refresh());
        const u2 = matrixService.onNewMessage(() => refresh());
        return () => { u1(); u2(); };
    }, [refresh]);

    return { threads, refresh };
}
