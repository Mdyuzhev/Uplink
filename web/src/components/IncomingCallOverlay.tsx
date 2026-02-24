import React from 'react';
import { CallInfo } from '../livekit/CallSignalingService';

interface IncomingCallOverlayProps {
    callInfo: CallInfo;
    onAccept: () => void;
    onReject: () => void;
}

/**
 * Оверлей входящего звонка.
 * Показывается поверх UI когда кто-то звонит.
 */
export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
    callInfo, onAccept, onReject,
}) => {
    return (
        <div className="incoming-call-overlay">
            <div className="incoming-call-overlay__card">
                <div className="incoming-call-overlay__icon">📞</div>
                <div className="incoming-call-overlay__title">Входящий звонок</div>
                <div className="incoming-call-overlay__caller">{callInfo.callerName}</div>
                <div className="incoming-call-overlay__actions">
                    <button
                        className="incoming-call-overlay__btn incoming-call-overlay__btn--reject"
                        onClick={onReject}
                    >
                        Отклонить
                    </button>
                    <button
                        className="incoming-call-overlay__btn incoming-call-overlay__btn--accept"
                        onClick={onAccept}
                    >
                        Принять
                    </button>
                </div>
            </div>
        </div>
    );
};
