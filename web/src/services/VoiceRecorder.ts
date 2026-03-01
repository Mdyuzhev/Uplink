/**
 * Сервис записи голосовых сообщений.
 * MediaRecorder API + Web Audio API для waveform.
 * Лимит: 30 секунд.
 */

const MAX_DURATION = 30;

export interface VoiceRecording {
    blob: Blob;
    duration: number;        // секунды
    waveform: number[];      // амплитуды 0-1, ~50 значений
    mimetype: string;
}

export type RecorderState = 'idle' | 'recording' | 'stopped';

class VoiceRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private stream: MediaStream | null = null;
    private chunks: Blob[] = [];
    private waveformSamples: number[] = [];
    private startTime = 0;
    private animFrameId = 0;
    private autoStopTimer: ReturnType<typeof setTimeout> | null = null;

    state: RecorderState = 'idle';

    onStateChange?: (state: RecorderState) => void;
    onAmplitude?: (amplitude: number) => void;
    onTimeUpdate?: (seconds: number) => void;
    onAutoStop?: () => void;

    async start(): Promise<void> {
        if (this.state === 'recording') return;

        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
        });

        const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
            ? 'audio/ogg; codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
                ? 'audio/webm; codecs=opus'
                : 'audio/mp4';

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        this.chunks = [];
        this.waveformSamples = [];
        this.startTime = Date.now();

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };

        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        this.mediaRecorder.start(100);
        this.state = 'recording';
        this.onStateChange?.('recording');

        this.collectWaveform();

        this.autoStopTimer = setTimeout(() => {
            this.onAutoStop?.();
        }, MAX_DURATION * 1000);
    }

    async stop(): Promise<VoiceRecording | null> {
        if (this.state !== 'recording' || !this.mediaRecorder) return null;

        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
            this.autoStopTimer = null;
        }
        cancelAnimationFrame(this.animFrameId);

        return new Promise((resolve) => {
            this.mediaRecorder!.onstop = () => {
                const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
                const duration = (Date.now() - this.startTime) / 1000;
                const waveform = this.normalizeWaveform(this.waveformSamples, 50);

                this.cleanup();
                this.state = 'stopped';
                this.onStateChange?.('stopped');

                resolve({
                    blob,
                    duration: Math.min(duration, MAX_DURATION),
                    waveform,
                    mimetype: blob.type,
                });
            };
            this.mediaRecorder!.stop();
        });
    }

    cancel(): void {
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
            this.autoStopTimer = null;
        }
        cancelAnimationFrame(this.animFrameId);
        if (this.mediaRecorder && this.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.cleanup();
        this.state = 'idle';
        this.onStateChange?.('idle');
    }

    get elapsed(): number {
        if (this.state !== 'recording') return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    private collectWaveform(): void {
        if (!this.analyser || this.state !== 'recording') return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const amplitude = Math.min(rms * 3, 1);

        this.waveformSamples.push(amplitude);
        this.onAmplitude?.(amplitude);

        const elapsed = (Date.now() - this.startTime) / 1000;
        this.onTimeUpdate?.(elapsed);

        this.animFrameId = requestAnimationFrame(() => this.collectWaveform());
    }

    private normalizeWaveform(samples: number[], targetLength: number): number[] {
        if (samples.length === 0) return new Array(targetLength).fill(0);
        if (samples.length <= targetLength) return samples;

        const result: number[] = [];
        const blockSize = samples.length / targetLength;
        for (let i = 0; i < targetLength; i++) {
            const start = Math.floor(i * blockSize);
            const end = Math.floor((i + 1) * blockSize);
            let sum = 0;
            for (let j = start; j < end; j++) sum += samples[j];
            result.push(sum / (end - start));
        }
        return result;
    }

    private cleanup(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
        this.analyser = null;
        this.mediaRecorder = null;
        this.chunks = [];
    }
}

export const voiceRecorder = new VoiceRecorder();
