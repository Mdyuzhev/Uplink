import { useEffect, useRef } from 'react';
import { callSignalingService } from '../livekit/CallSignalingService';

const isVSCode = !!(window as any).__VSCODE__;

interface VSCodeBridgeCallbacks {
    onNavigateRoom: (roomId: string) => void;
    onSnippet: (code: string, language: string, fileName: string, lineRange: string) => void;
    onFilePicked: (name: string, base64: string, mimeType: string) => void;
    onStartCall: () => void;
}

/**
 * Хук для обработки postMessage от VS Code extension host.
 * Обрабатывает: navigate-room, send-snippet, file-picked, call-accept/reject, command.
 */
export function useVSCodeBridge(callbacks: VSCodeBridgeCallbacks): void {
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    useEffect(() => {
        if (!isVSCode) return;

        const handler = (event: MessageEvent) => {
            const msg = event.data;
            if (!msg || !msg.type) return;

            switch (msg.type) {
                case 'navigate-room':
                    if (msg.roomId) {
                        callbacksRef.current.onNavigateRoom(msg.roomId);
                    }
                    break;

                case 'send-snippet':
                    callbacksRef.current.onSnippet(
                        msg.code, msg.language, msg.fileName, msg.lineRange,
                    );
                    break;

                case 'file-picked':
                    callbacksRef.current.onFilePicked(
                        msg.name, msg.base64, msg.mimeType,
                    );
                    break;

                case 'call-accept':
                    callSignalingService.acceptCall();
                    break;

                case 'call-reject':
                    callSignalingService.rejectCall();
                    break;

                case 'command':
                    if (msg.command === 'start-call') {
                        callbacksRef.current.onStartCall();
                    }
                    break;
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);
}

/** Утилита: конвертировать base64 в File */
export function base64ToFile(base64: string, name: string, mimeType: string): File {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], name, { type: mimeType });
}
