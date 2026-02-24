import React, { useState } from 'react';
import { config } from '../config';
import '../styles/login.css';

interface LoginScreenProps {
    onLogin: (homeserver: string, userId: string, password: string) => Promise<void>;
    error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
    const [homeserver, setHomeserver] = useState(config.matrixHomeserver);
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const canSubmit = homeserver.trim() && userId.trim() && password.trim() && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        try {
            await onLogin(homeserver.trim(), userId.trim(), password);
        } catch {
            // error handled via props
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <form className="login-card" onSubmit={handleSubmit}>
                <div className="login-card__header">
                    <div className="login-card__logo">Uplink</div>
                    <div className="login-card__subtitle">Мессенджер для разработчиков</div>
                </div>

                <div className="login-card__field">
                    <label className="login-card__label">Сервер</label>
                    <input
                        className="login-card__input"
                        type="text"
                        value={homeserver}
                        onChange={e => setHomeserver(e.target.value)}
                        placeholder="http://localhost:8008"
                    />
                </div>

                <div className="login-card__field">
                    <label className="login-card__label">Пользователь</label>
                    <input
                        className="login-card__input"
                        type="text"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        placeholder="@username:uplink.local"
                        autoComplete="username"
                    />
                </div>

                <div className="login-card__field">
                    <label className="login-card__label">Пароль</label>
                    <input
                        className="login-card__input"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Введите пароль"
                        autoComplete="current-password"
                    />
                </div>

                <button
                    className="login-card__button"
                    type="submit"
                    disabled={!canSubmit}
                >
                    {loading ? 'Подключение...' : 'Войти'}
                </button>

                {error && (
                    <div className="login-card__error">
                        <p>{error}</p>
                        {error.includes('шифрование') && (
                            <p className="login-card__error-hint">
                                Обратитесь к администратору: крипто-модуль не установлен на сервере.
                            </p>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
};
