import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { getGroupedRooms, RoomInfo, SpaceInfo, VoiceRoomInfo } from '../matrix/RoomsManager';

export function useRooms() {
    const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
    const [channels, setChannels] = useState<RoomInfo[]>([]);
    const [directs, setDirects] = useState<RoomInfo[]>([]);
    const [voiceChannels, setVoiceChannels] = useState<VoiceRoomInfo[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const refresh = useCallback(() => {
        if (!matrixService.isConnected) return;
        try {
            const client = matrixService.getClient();
            const grouped = getGroupedRooms(client);
            setSpaces(grouped.spaces);
            setChannels(grouped.channels);
            setDirects(grouped.directs);
            setVoiceChannels(grouped.voiceChannels);
        } catch { /* ignore */ }
    }, []);

    // Проверка админа — один раз при подключении
    useEffect(() => {
        if (matrixService.isConnected) {
            matrixService.admin.checkIsAdmin().then(setIsAdmin);
        }
    }, []);

    useEffect(() => {
        const unsub1 = matrixService.onRoomsUpdated(refresh);
        const unsub2 = matrixService.onNewMessage(() => refresh());
        refresh();
        return () => { unsub1(); unsub2(); };
    }, [refresh]);

    return { spaces, channels, directs, voiceChannels, isAdmin, refresh };
}
