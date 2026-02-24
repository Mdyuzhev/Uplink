import { useState, useEffect, useCallback } from 'react';
import { callSignalingService, CallSignalState, CallInfo } from '../livekit/CallSignalingService';

/**
 * React-хук для сигнализации звонков.
 * Слушает изменения состояния и предоставляет методы управления.
 */
export function useCallSignaling() {
    const [signalState, setSignalState] = useState<CallSignalState>(callSignalingService.state);
    const [callInfo, setCallInfo] = useState<CallInfo | null>(callSignalingService.currentCall);

    useEffect(() => {
        const unsub = callSignalingService.onStateChange((state, info) => {
            setSignalState(state);
            setCallInfo(info);
        });
        return unsub;
    }, []);

    const startCall = useCallback(async (roomId: string, calleeName: string) => {
        await callSignalingService.startCall(roomId, calleeName);
    }, []);

    const acceptCall = useCallback(async () => {
        await callSignalingService.acceptCall();
    }, []);

    const rejectCall = useCallback(async () => {
        await callSignalingService.rejectCall();
    }, []);

    const cancelCall = useCallback(async () => {
        await callSignalingService.cancelOrHangup();
    }, []);

    const resetSignaling = useCallback(() => {
        callSignalingService.reset();
    }, []);

    return {
        signalState,
        callInfo,
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        resetSignaling,
    };
}
