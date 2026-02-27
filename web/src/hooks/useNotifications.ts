import { useEffect, useRef } from 'react';
import { matrixService } from '../matrix/MatrixService';

// Проверить среду выполнения
const isTauri = '__TAURI_INTERNALS__' in window;
const isVSCode = !!(window as any).__VSCODE__;

interface NotificationOptions {
    level?: 'message' | 'call' | 'mention';
    roomId?: string;
    callId?: string;
}

/** Показать уведомление — VS Code / Tauri / браузерное */
async function showNotification(title: string, body: string, onClick?: () => void, options?: NotificationOptions) {
    if (isVSCode) {
        (window as any).__VSCODE_API__?.postMessage({
            type: 'notification',
            level: options?.level || 'message',
            title,
            body,
            roomId: options?.roomId,
            callId: options?.callId,
        });
        return;
    }
    if (isTauri) {
        try {
            const { sendNotification, isPermissionGranted, requestPermission } =
                await import('@tauri-apps/plugin-notification');
            let permitted = await isPermissionGranted();
            if (!permitted) {
                const result = await requestPermission();
                permitted = result === 'granted';
            }
            if (permitted) {
                sendNotification({ title, body });
            }
        } catch (err) {
            console.warn('Tauri notification failed:', err);
        }
    } else {
        // Fallback на браузерные уведомления
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const notification = new Notification(title, {
            body,
            icon: '/uplink-icon.png',
            silent: false,
        });
        if (onClick) {
            notification.onclick = () => {
                window.focus();
                onClick();
                notification.close();
            };
        }
        setTimeout(() => notification.close(), 5000);
    }
}

/**
 * Хук для push-уведомлений о новых сообщениях.
 * В Tauri — нативные уведомления ОС, в браузере — Web Notification API.
 */
export function useNotifications(
    activeRoomId: string | null,
    onNavigateToRoom: (roomId: string) => void
) {
    const activeRoomIdRef = useRef(activeRoomId);
    activeRoomIdRef.current = activeRoomId;

    const onNavigateRef = useRef(onNavigateToRoom);
    onNavigateRef.current = onNavigateToRoom;

    // Запросить разрешение при монтировании
    useEffect(() => {
        if (isTauri) {
            // Tauri — разрешение запросится при первом уведомлении
        } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const unsub = matrixService.onNewMessage((roomId, event) => {
            const senderId = event.getSender();
            if (senderId === matrixService.getUserId()) return;
            if (roomId === activeRoomIdRef.current && document.hasFocus()) return;

            const senderName = matrixService.users.getDisplayName(senderId!);
            const content = event.getContent();
            const msgtype = content.msgtype;

            let notifBody: string;
            if (msgtype === 'm.image') {
                notifBody = '📷 Фото';
            } else if (msgtype === 'm.file') {
                notifBody = '📎 Файл';
            } else {
                const body = content.body || 'Новое сообщение';
                notifBody = body.length > 100 ? body.substring(0, 100) + '...' : body;
            }

            // Определяем уровень: mention если упоминают текущего пользователя
            const myUserId = matrixService.getUserId();
            const myDisplayName = matrixService.users.getMyDisplayName();
            const bodyText = content.body || '';
            const isMention = bodyText.includes(myUserId) ||
                (myDisplayName && bodyText.toLowerCase().includes(myDisplayName.toLowerCase()));

            showNotification(
                `Новое сообщение от ${senderName}`,
                notifBody,
                () => onNavigateRef.current(roomId),
                {
                    level: isMention ? 'mention' : 'message',
                    roomId,
                },
            );
        });
        return unsub;
    }, []);
}
