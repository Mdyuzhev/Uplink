import React, { useState, useEffect } from 'react';
import { useMatrix } from './hooks/useMatrix';
import { LoginScreen } from './components/LoginScreen';
import { ChatLayout } from './components/ChatLayout';
import { UpdateDialog } from './components/UpdateDialog';
import { initStorage } from './utils/storage';
import { checkForUpdates } from './utils/updater';

export const App: React.FC = () => {
    const { connectionState, error, login, logout, restoreSession } = useMatrix();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initStorage().then(() => {
            restoreSession().finally(() => setLoading(false));
        });
        // Проверка обновлений при запуске (только в Tauri)
        checkForUpdates();
    }, []);

    if (loading) {
        return (
            <div className="uplink-loading">
                <div className="uplink-loading__spinner" />
                <p>Uplink</p>
            </div>
        );
    }

    if (connectionState === 'disconnected' || connectionState === 'error') {
        return <LoginScreen onLogin={login} error={error} />;
    }

    if (connectionState === 'connecting') {
        return (
            <div className="uplink-loading">
                <div className="uplink-loading__spinner" />
                <p>Подключение...</p>
            </div>
        );
    }

    return (
        <>
            <ChatLayout onLogout={logout} />
            <UpdateDialog />
        </>
    );
};
