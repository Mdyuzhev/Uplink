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

    // При завершении LiveKit-звонка → сбросить сигнализацию
    useEffect(() => {
        if (lk.callState === 'idle' && sig.signalState === 'accepted') {
            sig.resetSignaling();
        }
    }, [lk.callState, sig.signalState, sig.resetSignaling]);

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
