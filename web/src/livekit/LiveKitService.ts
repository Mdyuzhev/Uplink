import {
    Room,
    RoomEvent,
    RemoteParticipant,
    Track,
} from 'livekit-client';
import { config } from '../config';

export type CallState = 'idle' | 'connecting' | 'connected' | 'error';

export interface CallParticipant {
    identity: string;
    displayName: string;
    isMuted: boolean;
    isSpeaking: boolean;
    isLocal: boolean;
}

type Listener<T extends (...args: any[]) => void> = T;

export class LiveKitService {
    private room: Room | null = null;
    private _callState: CallState = 'idle';
    private _activeRoomName: string | null = null;
    private _durationTimer: ReturnType<typeof setInterval> | null = null;
    private _durationSeconds = 0;

    private _callStateListeners = new Set<Listener<(state: CallState) => void>>();
    private _participantsListeners = new Set<Listener<(participants: CallParticipant[]) => void>>();
    private _durationListeners = new Set<Listener<(seconds: number) => void>>();

    get callState(): CallState { return this._callState; }
    get isInCall(): boolean { return this._callState === 'connected'; }
    get activeRoomName(): string | null { return this._activeRoomName; }
    get durationSeconds(): number { return this._durationSeconds; }

    // === Подписки ===

    onCallStateChange(fn: (state: CallState) => void): () => void {
        this._callStateListeners.add(fn);
        return () => { this._callStateListeners.delete(fn); };
    }

    onParticipantsChange(fn: (participants: CallParticipant[]) => void): () => void {
        this._participantsListeners.add(fn);
        return () => { this._participantsListeners.delete(fn); };
    }

    onDurationChange(fn: (seconds: number) => void): () => void {
        this._durationListeners.add(fn);
        return () => { this._durationListeners.delete(fn); };
    }

    private emitCallState(state: CallState): void {
        this._callState = state;
        this._callStateListeners.forEach(fn => fn(state));
    }

    private emitParticipants(): void {
        const participants = this.getParticipants();
        this._participantsListeners.forEach(fn => fn(participants));
    }

    private emitDuration(seconds: number): void {
        this._durationListeners.forEach(fn => fn(seconds));
    }

    // === Основные методы ===

    /**
     * Присоединиться к звонку в комнате.
     */
    async joinCall(roomName: string, userId: string): Promise<void> {
        if (this._callState === 'connected' || this._callState === 'connecting') {
            console.warn('Уже в звонке, сначала выйдите');
            return;
        }

        this.emitCallState('connecting');
        this._activeRoomName = roomName;

        try {
            const token = await this.fetchToken(userId, roomName);

            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            this.setupRoomListeners();

            await this.room.connect(config.livekitUrl, token);

            try {
                await this.room.localParticipant.setMicrophoneEnabled(true);
            } catch (micErr) {
                console.warn('Микрофон недоступен (HTTP? нет разрешения?):', micErr);
            }

            this.startDurationTimer();

            this.emitCallState('connected');
            this.emitParticipants();

            console.log(`Звонок начат: ${roomName}`);
        } catch (err) {
            console.error('Ошибка подключения к звонку:', err);
            this.emitCallState('error');
            this.cleanup();
            throw err;
        }
    }

    /**
     * Покинуть звонок.
     */
    async leaveCall(): Promise<void> {
        if (!this.room) return;

        try {
            this.room.disconnect(true);
        } catch {
            // ignore disconnect errors
        }

        this.cleanup();
        this.emitCallState('idle');
        console.log('Звонок завершён');
    }

    /**
     * Переключить микрофон (mute/unmute).
     */
    async toggleMute(): Promise<boolean> {
        if (!this.room) return false;

        const currentlyEnabled = this.room.localParticipant.isMicrophoneEnabled;
        await this.room.localParticipant.setMicrophoneEnabled(!currentlyEnabled);

        this.emitParticipants();
        return !currentlyEnabled === false;
    }

    get isMuted(): boolean {
        if (!this.room) return false;
        return !this.room.localParticipant.isMicrophoneEnabled;
    }

    getParticipants(): CallParticipant[] {
        if (!this.room) return [];

        const result: CallParticipant[] = [];

        const local = this.room.localParticipant;
        result.push({
            identity: local.identity,
            displayName: local.name || local.identity.split(':')[0].replace('@', ''),
            isMuted: !local.isMicrophoneEnabled,
            isSpeaking: local.isSpeaking,
            isLocal: true,
        });

        this.room.remoteParticipants.forEach((p: RemoteParticipant) => {
            result.push({
                identity: p.identity,
                displayName: p.name || p.identity.split(':')[0].replace('@', ''),
                isMuted: !p.isMicrophoneEnabled,
                isSpeaking: p.isSpeaking,
                isLocal: false,
            });
        });

        return result;
    }

    // === Вспомогательные методы ===

    private async fetchToken(userId: string, roomName: string): Promise<string> {
        const resp = await fetch(`${config.tokenServiceUrl}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, roomName }),
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Ошибка получения токена: ${resp.status} ${text}`);
        }

        const data = await resp.json();
        return data.token;
    }

    private setupRoomListeners(): void {
        if (!this.room) return;

        this.room.on(RoomEvent.ParticipantConnected, () => {
            this.emitParticipants();
        });

        this.room.on(RoomEvent.ParticipantDisconnected, () => {
            this.emitParticipants();
        });

        this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
            if (track.kind === Track.Kind.Audio) {
                const audioEl = track.attach();
                audioEl.id = `audio-${participant.identity}`;
                document.body.appendChild(audioEl);
            }
        });

        this.room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
            track.detach().forEach(el => el.remove());
            const audioEl = document.getElementById(`audio-${participant.identity}`);
            if (audioEl) audioEl.remove();
        });

        this.room.on(RoomEvent.TrackMuted, () => this.emitParticipants());
        this.room.on(RoomEvent.TrackUnmuted, () => this.emitParticipants());
        this.room.on(RoomEvent.ActiveSpeakersChanged, () => this.emitParticipants());

        this.room.on(RoomEvent.Disconnected, () => {
            console.log('Отключены от LiveKit');
            this.cleanup();
            this.emitCallState('idle');
        });

        this.room.on(RoomEvent.Reconnecting, () => {
            console.log('Переподключение к LiveKit...');
        });

        this.room.on(RoomEvent.Reconnected, () => {
            console.log('Переподключение к LiveKit успешно');
            this.emitParticipants();
        });
    }

    private startDurationTimer(): void {
        this._durationSeconds = 0;
        this._durationTimer = setInterval(() => {
            this._durationSeconds++;
            this.emitDuration(this._durationSeconds);
        }, 1000);
    }

    private cleanup(): void {
        if (this._durationTimer) {
            clearInterval(this._durationTimer);
            this._durationTimer = null;
        }
        this._durationSeconds = 0;
        this._activeRoomName = null;

        if (this.room) {
            this.room.removeAllListeners();
            this.room.remoteParticipants.forEach((p) => {
                const el = document.getElementById(`audio-${p.identity}`);
                if (el) el.remove();
            });
            this.room = null;
        }

        this.emitParticipants();
        this.emitDuration(0);
    }
}

// Singleton
export const livekitService = new LiveKitService();
