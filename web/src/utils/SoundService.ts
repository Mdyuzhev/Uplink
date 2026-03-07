type SoundName =
    | 'message'
    | 'mention'
    | 'incoming-call'
    | 'call-accepted'
    | 'call-ended'
    | 'message-sent';

const STORAGE_KEY = 'uplink_sounds_enabled';

class SoundService {
    private ctx: AudioContext | null = null;
    private _enabled: boolean;
    private _incomingCallInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        const stored = localStorage.getItem(STORAGE_KEY);
        this._enabled = stored === null ? true : stored === 'true';
    }

    get enabled(): boolean {
        return this._enabled;
    }

    setEnabled(value: boolean): void {
        this._enabled = value;
        localStorage.setItem(STORAGE_KEY, String(value));
    }

    play(name: SoundName): void {
        if (!this._enabled) return;
        try {
            const ctx = this.getContext();
            this.synthesize(ctx, name);
        } catch (err) {
            console.warn('SoundService: ошибка воспроизведения', err);
        }
    }

    startIncomingCall(): void {
        if (!this._enabled) return;
        this.stopIncomingCall();
        this.play('incoming-call');
        this._incomingCallInterval = setInterval(() => {
            this.play('incoming-call');
        }, 3000);
    }

    stopIncomingCall(): void {
        if (this._incomingCallInterval) {
            clearInterval(this._incomingCallInterval);
            this._incomingCallInterval = null;
        }
    }

    /** Исходящий: тональный гудок (400Hz, 1s on / 4s off) */
    startDialingTone(): void {
        this.stopIncomingCall();
        if (!this._enabled) return;
        const playBeep = () => {
            try {
                const ctx = this.getContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.value = 400;
                gain.gain.value = 0.15;
                osc.connect(gain).connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 1);
            } catch {
                // ignore
            }
        };
        playBeep();
        this._incomingCallInterval = setInterval(playBeep, 4000);
    }

    stopAllSounds(): void {
        this.stopIncomingCall();
    }

    private getContext(): AudioContext {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    private synthesize(ctx: AudioContext, name: SoundName): void {
        switch (name) {
            case 'message':
                this.playMessage(ctx);
                break;
            case 'mention':
                this.playMention(ctx);
                break;
            case 'incoming-call':
                this.playIncomingCallSound(ctx);
                break;
            case 'call-accepted':
                this.playCallAccepted(ctx);
                break;
            case 'call-ended':
                this.playCallEnded(ctx);
                break;
            case 'message-sent':
                this.playMessageSent(ctx);
                break;
        }
    }

    // Новое сообщение — мягкий одиночный тон 880 Гц, 120мс
    private playMessage(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    }

    // Упоминание — двойной тон 880 → 1100 Гц
    private playMention(ctx: AudioContext): void {
        const playTone = (freq: number, startAt: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startAt);

            gain.gain.setValueAtTime(0, startAt);
            gain.gain.linearRampToValueAtTime(0.2, startAt + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

            osc.start(startAt);
            osc.stop(startAt + duration);
        };

        playTone(880, ctx.currentTime, 0.1);
        playTone(1100, ctx.currentTime + 0.13, 0.12);
    }

    // Входящий звонок — двойной аккорд 440+660 Hz
    private playIncomingCallSound(ctx: AudioContext): void {
        const playChord = (startAt: number) => {
            [440, 660].forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startAt);

                gain.gain.setValueAtTime(0, startAt);
                gain.gain.linearRampToValueAtTime(0.12, startAt + 0.02);
                gain.gain.setValueAtTime(0.12, startAt + 0.35);
                gain.gain.linearRampToValueAtTime(0, startAt + 0.4);

                osc.start(startAt);
                osc.stop(startAt + 0.4);
            });
        };

        playChord(ctx.currentTime);
        playChord(ctx.currentTime + 0.6);
    }

    // Звонок принят — восходящий аккорд C5→E5→G5
    private playCallAccepted(ctx: AudioContext): void {
        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            const startAt = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, startAt);
            gain.gain.linearRampToValueAtTime(0.15, startAt + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.2);

            osc.start(startAt);
            osc.stop(startAt + 0.2);
        });
    }

    // Звонок завершён — нисходящий тон C5→G4
    private playCallEnded(ctx: AudioContext): void {
        [523, 392].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            const startAt = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0, startAt);
            gain.gain.linearRampToValueAtTime(0.13, startAt + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.18);

            osc.start(startAt);
            osc.stop(startAt + 0.18);
        });
    }

    // Отправка сообщения — едва слышимый «вжух»
    private playMessageSent(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    }
}

export const soundService = new SoundService();
