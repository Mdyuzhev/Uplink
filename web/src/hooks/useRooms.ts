import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { getGroupedRooms, RoomInfo } from '../matrix/RoomsManager';

export function useRooms() {
    const [channels, setChannels] = useState<RoomInfo[]>([]);
    const [directs, setDirects] = useState<RoomInfo[]>([]);

    const refresh = useCallback(() => {
        if (!matrixService.isConnected) return;
        try {
            const client = matrixService.getClient();
            const grouped = getGroupedRooms(client);
            setChannels(grouped.channels);
            setDirects(grouped.directs);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        const unsub1 = matrixService.onRoomsUpdated(refresh);
        const unsub2 = matrixService.onNewMessage(() => refresh());
        refresh();
        return () => { unsub1(); unsub2(); };
    }, [refresh]);

    return { channels, directs, refresh };
}
