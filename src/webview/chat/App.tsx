import React, { useState, useEffect, useCallback } from 'react';
import { GroupedRooms, Message, Room } from './types';
import { Sidebar } from './Sidebar';
import { MainArea } from './MainArea';
import { vscodeApi } from './vscodeApi';
import './styles.css';

export const App: React.FC = () => {
    const [rooms, setRooms] = useState<GroupedRooms>({ channels: [], directs: [] });
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [connected, setConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState('');

    // Восстановить state из WebView state API
    useEffect(() => {
        const saved = vscodeApi.getState();
        if (saved?.activeRoomId) {
            setActiveRoomId(saved.activeRoomId);
        }
    }, []);

    // Слушатель сообщений от extension host
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.type) {
                case 'rooms':
                    setRooms({ channels: msg.channels, directs: msg.directs });
                    break;
                case 'messages':
                    if (msg.roomId === activeRoomId) {
                        setMessages(msg.messages);
                    }
                    break;
                case 'newMessage':
                    if (msg.roomId === activeRoomId) {
                        setMessages(prev => [...prev, msg.message]);
                    }
                    // Обновить rooms для badge
                    vscodeApi.postMessage({ type: 'requestRooms' });
                    break;
                case 'connectionStatus':
                    setConnected(msg.connected);
                    if (msg.userId) { setCurrentUser(msg.userId); }
                    break;
            }
        };
        window.addEventListener('message', handler);
        vscodeApi.postMessage({ type: 'requestRooms' });
        return () => window.removeEventListener('message', handler);
    }, [activeRoomId]);

    const handleSelectRoom = useCallback((roomId: string) => {
        setActiveRoomId(roomId);
        setMessages([]);
        vscodeApi.setState({ activeRoomId: roomId });
        vscodeApi.postMessage({ type: 'selectRoom', roomId });
    }, []);

    const handleSendMessage = useCallback((body: string) => {
        if (!activeRoomId) return;
        vscodeApi.postMessage({ type: 'sendMessage', roomId: activeRoomId, body });
    }, [activeRoomId]);

    const handleLoadMore = useCallback(() => {
        if (!activeRoomId) return;
        vscodeApi.postMessage({ type: 'loadMoreMessages', roomId: activeRoomId });
    }, [activeRoomId]);

    const getActiveRoom = (): Room | null => {
        const all = [...rooms.channels, ...rooms.directs];
        return all.find(r => r.id === activeRoomId) || null;
    };

    return (
        <div className="uplink-app">
            <Sidebar
                rooms={rooms}
                activeRoomId={activeRoomId}
                onSelectRoom={handleSelectRoom}
                connected={connected}
            />
            <MainArea
                messages={messages}
                activeRoom={getActiveRoom()}
                currentUser={currentUser}
                onSendMessage={handleSendMessage}
                onLoadMore={handleLoadMore}
            />
        </div>
    );
};
