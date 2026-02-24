import { useEffect, useRef } from 'react';
import { matrixService } from '../matrix/MatrixService';

/**
 * Хук для браузерных push-уведомлений о новых сообщениях.
 *
 * Показывает уведомление когда:
 * - Сообщение приходит в комнату, которая НЕ сейчас открыта
 * - Сообщение от другого пользователя (не от себя)
 * - Вкладка не в фокусе ИЛИ открыт другой чат
 *
 * При клике на уведомление — фокус на вкладку и переход в чат.
 */
export function useNotifications(
    activeRoomId: string | null,
    onNavigateToRoom: (roomId: string) => void
) {
    // Ref-ы чтобы эффект не переподписывался на каждый рендер
    const activeRoomIdRef = useRef(activeRoomId);
    activeRoomIdRef.current = activeRoomId;

    const onNavigateRef = useRef(onNavigateToRoom);
    onNavigateRef.current = onNavigateToRoom;

    // Запросить разрешение на уведомления при монтировании
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Слушать новые сообщения и показывать уведомления
    useEffect(() => {
        const unsub = matrixService.onNewMessage((roomId, event) => {
            // Не уведомлять о своих сообщениях
            const senderId = event.getSender();
            if (senderId === matrixService.getUserId()) return;

            // Не уведомлять если этот чат сейчас открыт И вкладка в фокусе
            if (roomId === activeRoomIdRef.current && document.hasFocus()) return;

            // Проверить разрешение
            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            // Получить имя отправителя и текст
            const senderName = matrixService.getDisplayName(senderId!);
            const content = event.getContent();
            const body = content.body || 'Новое сообщение';
            const msgtype = content.msgtype;

            // Текст уведомления в зависимости от типа
            let notifBody: string;
            if (msgtype === 'm.image') {
                notifBody = '📷 Фото';
            } else if (msgtype === 'm.file') {
                notifBody = '📎 Файл';
            } else {
                notifBody = body.length > 100 ? body.substring(0, 100) + '...' : body;
            }

            const notification = new Notification(`Новое сообщение от ${senderName}`, {
                body: notifBody,
                icon: '/uplink-icon.png',
                tag: `uplink-${roomId}`,  // Заменяет предыдущее уведомление из той же комнаты
                silent: false,
            });

            // При клике — перейти в чат
            notification.onclick = () => {
                window.focus();
                onNavigateRef.current(roomId);
                notification.close();
            };

            // Автозакрытие через 5 секунд
            setTimeout(() => notification.close(), 5000);
        });

        return unsub;
    }, []);  // Пустые зависимости — подписка один раз, актуальные значения через ref
}
