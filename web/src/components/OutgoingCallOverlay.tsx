import React from 'react';
import { Phone, X } from 'lucide-react';
import { CallSignalState } from '../livekit/CallSignalingService';

interface OutgoingCallOverlayProps {
    calleeName: string;
    signalState: CallSignalState;
    onCancel: () => void;
}

export const OutgoingCallOverlay: React.FC<OutgoingCallOverlayProps> = ({
    calleeName, signalState, onCancel,
}) => {
    const isTerminal = signalState === 'rejected' || signalState === 'no-answer';
    const statusText = signalState === 'rejected' ? 'Отклонено'
        : signalState === 'no-answer' ? 'Нет ответа'
        : 'Соединение...';
    const statusClass = isTerminal ? 'call-toast__label--error' : '';

    return (
        <div className="call-toast">
            <div className="call-toast__card">
                {!isTerminal && <div className="call-toast__pulse" />}
                <div className="call-toast__content">
                    <div className="call-outgoing__icon-wrap">
                        {isTerminal ? (
                            <X size={24} className="call-outgoing__icon--terminal" />
                        ) : (
                            <Phone size={24} className="call-outgoing__icon--ringing" />
                        )}
                    </div>
                    <div className="call-toast__info">
                        <div className={`call-toast__label ${statusClass}`}>{statusText}</div>
                        <div className="call-toast__caller">{calleeName}</div>
                    </div>
                </div>
                {!isTerminal && (
                    <div className="call-toast__actions">
                        <button
                            className="call-toast__btn call-toast__btn--reject"
                            onClick={onCancel}
                            title="Отменить вызов"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
