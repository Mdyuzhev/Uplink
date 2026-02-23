import React, { useState, useEffect } from 'react';
import { useMatrix } from './hooks/useMatrix';
import { LoginScreen } from './components/LoginScreen';
import { ChatLayout } from './components/ChatLayout';

export const App: React.FC = () => {
    const { connectionState, error, login, logout, restoreSession } = useMatrix();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        restoreSession().finally(() => setLoading(false));
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

    return <ChatLayout onLogout={logout} />;
};
