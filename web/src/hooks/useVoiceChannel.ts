import { useState, useCallback, useRef, useEffect } from 'react';
import { livekitService } from '../livekit/LiveKitService';
import { matrixService } from '../matrix/MatrixService';

export function useVoiceChannel() {
    const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const activeRoomRef = useRef<string | null>(null);

    const joinVoiceChannel = useCallback(async (roomId: string) => {
        if (activeRoomRef.current === roomId) return;

        setIsConnecting(true);

        try {
            if (activeRoomRef.current) {
                await leaveCurrentChannel();
            }

            const userId = matrixService.getUserId();
            await livekitService.joinCall(roomId, userId);
            await sendVoicePresence(roomId, true);

            activeRoomRef.current = roomId;
            setActiveVoiceRoomId(roomId);
            setIsMuted(false);
        } catch (err: unknown) {
            console.error('Ошибка подключения к голосовому каналу:', err);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const leaveVoiceChannel = useCallback(async () => {
        await leaveCurrentChannel();
        setActiveVoiceRoomId(null);
        activeRoomRef.current = null;
    }, []);

    const toggleMute = useCallback(async () => {
        await livekitService.toggleMute();
        setIsMuted(livekitService.isMuted);
    }, []);

    async function leaveCurrentChannel() {
        const roomId = activeRoomRef.current;
        if (!roomId) return;

        await livekitService.leaveCall();

        try {
            await sendVoicePresence(roomId, false);
        } catch (e) {
            console.warn('Не удалось снять голосовое присутствие:', e);
        }
    }

    async function sendVoicePresence(roomId: string, joined: boolean) {
        const client = matrixService.getClient();
        const userId = matrixService.getUserId();
        await client.sendStateEvent(roomId, 'uplink.voice.member' as any, { joined }, userId);
    }

    // Обновлять isMuted при изменении участников LiveKit
    useEffect(() => {
        if (!activeVoiceRoomId) return;
        return livekitService.onParticipantsChange(() => {
            setIsMuted(livekitService.isMuted);
        });
    }, [activeVoiceRoomId]);

    // Cleanup при закрытии страницы
    useEffect(() => {
        const handleUnload = () => {
            if (activeRoomRef.current) {
                livekitService.leaveCall();
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    return {
        activeVoiceRoomId,
        isConnecting,
        isMuted,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
    };
}
