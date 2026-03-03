/**
 * Автоматическая отправка typing indicator.
 * При изменении текста — sendTyping(true), через 4 сек — sendTyping(false).
 */

import { useEffect, useRef } from 'react';
import { matrixService } from '../matrix/MatrixService';

export function useTypingIndicator(roomId: string | undefined, text: string) {
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (!roomId) return;

        if (text.length > 0) {
            matrixService.users.sendTyping(roomId, true).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (roomId) matrixService.users.sendTyping(roomId, false).catch(() => {});
            }, 4000);
        } else {
            matrixService.users.sendTyping(roomId, false).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    }, [roomId, text]);

    // Сброс typing при смене комнаты или unmount
    useEffect(() => {
        return () => {
            if (roomId) matrixService.users.sendTyping(roomId, false).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [roomId]);
}
