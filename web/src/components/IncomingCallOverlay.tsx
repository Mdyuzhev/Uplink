import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { CallInfo } from '../livekit/CallSignalingService';
import { Avatar } from './Avatar';

interface IncomingCallOverlayProps {
    callInfo: CallInfo;
    onAccept: () => void;
    onReject: () => void;
}

export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
    callInfo, onAccept, onReject,
}) => {
    return (
        <div className="call-toast">
            <div className="call-toast__card">
                <div className="call-toast__pulse" />
                <div className="call-toast__content">
                    <Avatar
                        userId={callInfo.callerId}
                        name={callInfo.callerName}
                        size={48}
                    />
                    <div className="call-toast__info">
                        <div className="call-toast__label">Входящий звонок</div>
                        <div className="call-toast__caller">{callInfo.callerName}</div>
                    </div>
                </div>
                <div className="call-toast__actions">
                    <button
                        className="call-toast__btn call-toast__btn--reject"
                        onClick={onReject}
                        title="Отклонить"
                    >
                        <PhoneOff size={20} />
                    </button>
                    <button
                        className="call-toast__btn call-toast__btn--accept"
                        onClick={onAccept}
                        title="Принять"
                    >
                        <Phone size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
