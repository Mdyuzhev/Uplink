import { useState, useEffect, useCallback } from 'react';
import { livekitService, CallState, CallParticipant } from '../livekit/LiveKitService';
import { matrixService } from '../matrix/MatrixService';

/**
 * Hook для управления звонками.
 * Предоставляет реактивное состояние звонка и методы управления.
 */
export function useLiveKit() {
    const [callState, setCallState] = useState<CallState>(livekitService.callState);
    const [participants, setParticipants] = useState<CallParticipant[]>([]);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsub1 = livekitService.onCallStateChange((state) => {
            setCallState(state);
            setActiveRoomName(livekitService.activeRoomName);
            if (state === 'error') {
                setError('Не удалось подключиться к звонку');
            } else {
                setError(null);
            }
        });
        const unsub2 = livekitService.onParticipantsChange((p) => {
            setParticipants(p);
            setIsMuted(livekitService.isMuted);
        });
        const unsub3 = livekitService.onDurationChange(setDuration);

        return () => { unsub1(); unsub2(); unsub3(); };
    }, []);

    const joinCall = useCallback(async (roomName: string) => {
        setError(null);
        try {
            const userId = matrixService.getUserId();
            await livekitService.joinCall(roomName, userId);
        } catch (err: any) {
            setError(err.message || 'Ошибка звонка');
        }
    }, []);

    const leaveCall = useCallback(async () => {
        await livekitService.leaveCall();
    }, []);

    const toggleMute = useCallback(async () => {
        await livekitService.toggleMute();
        setIsMuted(livekitService.isMuted);
    }, []);

    return {
        callState,
        participants,
        duration,
        isMuted,
        activeRoomName,
        error,
        joinCall,
        leaveCall,
        toggleMute,
    };
}
