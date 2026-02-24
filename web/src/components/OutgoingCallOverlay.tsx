import React from 'react';
import { CallSignalState } from '../livekit/CallSignalingService';

interface OutgoingCallOverlayProps {
    calleeName: string;
    signalState: CallSignalState;
    onCancel: () => void;
}

/**
 * Оверлей исходящего звонка.
 * Показывается пока ждём ответа собеседника.
 * Также показывает статус: «Отклонено» / «Нет ответа».
 */
export const OutgoingCallOverlay: React.FC<OutgoingCallOverlayProps> = ({
    calleeName, signalState, onCancel,
}) => {
    const isTerminal = signalState === 'rejected' || signalState === 'no-answer';
    const statusText = signalState === 'rejected' ? 'Отклонено'
        : signalState === 'no-answer' ? 'Нет ответа'
        : 'Вызов...';

    return (
        <div className="incoming-call-overlay">
            <div className="incoming-call-overlay__card">
                <div className="incoming-call-overlay__title">{statusText}</div>
                <div className="incoming-call-overlay__caller">{calleeName}</div>
                {!isTerminal && (
                    <div className="incoming-call-overlay__actions">
                        <button
                            className="incoming-call-overlay__btn incoming-call-overlay__btn--reject"
                            onClick={onCancel}
                            title="Отмена"
                        >
                            &#x2715;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
