/**
 * CallContext — состояние звонков (LiveKit + сигнализация).
 * Объединяет useLiveKit + useCallSignaling + производные handlers.
 */

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useLiveKit } from '../hooks/useLiveKit';
import { useCallSignaling } from '../hooks/useCallSignaling';
import { callSignalingService } from '../livekit/CallSignalingService';
import { CallState, CallParticipant } from '../livekit/LiveKitService';
import { CallSignalState, CallInfo } from '../livekit/CallSignalingService';
import { startDialingTone, startRingtone, stopAllSounds } from '../utils/callSounds';

interface CallContextValue {
    // LiveKit state
    callState: CallState;
    participants: CallParticipant[];
    duration: number;
    isMuted: boolean;
    isCameraOn: boolean;
    activeRoomName: string | null;
    callError: string | null;
    // Signaling state
    signalState: CallSignalState;
    callInfo: CallInfo | null;
    // Actions
    handleJoinCall: (roomId: string, roomName?: string, type?: string) => void;
    handleAcceptCall: () => Promise<void>;
    handleLeaveCall: () => Promise<void>;
    cancelCall: () => void;
    rejectCall: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const lk = useLiveKit();
    const sig = useCallSignaling();

    // Запуск слушателя сигнализации звонков
    useEffect(() => {
        callSignalingService.startListening();
        return () => callSignalingService.stopListening();
    }, []);

    // Когда signalState → accepted у звонящего → подключиться к LiveKit
    useEffect(() => {
        if (sig.signalState === 'accepted' && sig.callInfo?.direction === 'outgoing') {
            lk.joinCall(sig.callInfo.roomId);
        }
    }, [sig.signalState, sig.callInfo, lk.joinCall]);

    // Когда собеседник повесил трубку — отключить LiveKit
    useEffect(() => {
        if (sig.signalState === 'ended' && lk.callState !== 'idle') {
            lk.leaveCall();
        }
    }, [sig.signalState, lk.callState, lk.leaveCall]);

    // При завершении LiveKit-звонка → сбросить сигнализацию
    useEffect(() => {
        if (lk.callState === 'idle' && sig.signalState === 'accepted') {
            sig.resetSignaling();
        }
    }, [lk.callState, sig.signalState, sig.resetSignaling]);

    // Звуки при изменении состояния сигнализации
    useEffect(() => {
        if (sig.signalState === 'ringing-out') {
            startDialingTone();
        } else if (sig.signalState === 'ringing-in') {
            startRingtone();
        } else {
            stopAllSounds();
        }
        return () => stopAllSounds();
    }, [sig.signalState]);

    // Push-уведомление о входящем звонке
    useEffect(() => {
        if (sig.signalState !== 'ringing-in' || !sig.callInfo) return;

        const callerName = sig.callInfo.callerName;

        // Tauri — нативное уведомление ОС
        if ('__TAURI_INTERNALS__' in window) {
            import('@tauri-apps/plugin-notification').then(({ sendNotification, isPermissionGranted }) => {
                isPermissionGranted().then(ok => {
                    if (ok) sendNotification({ title: 'Входящий звонок', body: `${callerName} звонит вам` });
                });
            }).catch(() => { /* notification plugin не установлен */ });
        }
        // Браузер — Web Notification (если вкладка не в фокусе)
        else if (!document.hasFocus() && 'Notification' in window && Notification.permission === 'granted') {
            const n = new Notification('Входящий звонок', {
                body: `${callerName} звонит вам`,
                icon: '/uplink-icon.png',
                requireInteraction: true,
            });
            n.onclick = () => { window.focus(); n.close(); };
            const unsub = callSignalingService.onStateChange((state) => {
                if (state !== 'ringing-in') { n.close(); unsub(); }
            });
        }
        // VS Code
        else if ((window as unknown as Record<string, unknown>).__VSCODE__) {
            const vscodeApi = (window as unknown as Record<string, { postMessage?: (msg: unknown) => void }>).__VSCODE_API__;
            vscodeApi?.postMessage?.({
                type: 'notification',
                level: 'call',
                title: 'Входящий звонок',
                body: `${callerName} звонит вам`,
                callId: sig.callInfo.callId,
            });
        }
    }, [sig.signalState, sig.callInfo]);

    const handleJoinCall = useCallback((roomId: string, roomName?: string, type?: string) => {
        if (type === 'direct') {
            sig.startCall(roomId, roomName || '');
        } else {
            lk.joinCall(roomId);
        }
    }, [sig.startCall, lk.joinCall]);

    const handleAcceptCall = useCallback(async () => {
        await sig.acceptCall();
        if (sig.callInfo) lk.joinCall(sig.callInfo.roomId);
    }, [sig.acceptCall, sig.callInfo, lk.joinCall]);

    const handleLeaveCall = useCallback(async () => {
        await lk.leaveCall();
        await callSignalingService.cancelOrHangup();
    }, [lk.leaveCall]);

    const value: CallContextValue = {
        callState: lk.callState,
        participants: lk.participants,
        duration: lk.duration,
        isMuted: lk.isMuted,
        isCameraOn: lk.isCameraOn,
        activeRoomName: lk.activeRoomName,
        callError: lk.error,
        signalState: sig.signalState,
        callInfo: sig.callInfo,
        handleJoinCall,
        handleAcceptCall,
        handleLeaveCall,
        cancelCall: sig.cancelCall,
        rejectCall: sig.rejectCall,
        toggleMute: lk.toggleMute,
        toggleCamera: lk.toggleCamera,
    };

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within CallProvider');
    return ctx;
}
