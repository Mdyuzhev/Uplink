/**
 * Сервис записи видео-кружочков.
 * Фронтальная камера, лимит 30 сек, круглая маска на уровне UI.
 */

const MAX_DURATION = 30;

export interface VideoNoteRecording {
    blob: Blob;
    duration: number;
    mimetype: string;
    thumbnailBlob?: Blob;
    width: number;
    height: number;
}

class VideoNoteRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private chunks: Blob[] = [];
    private startTime = 0;
    private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
    private timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

    state: 'idle' | 'recording' | 'stopped' = 'idle';

    onTimeUpdate?: (seconds: number) => void;
    onAutoStop?: () => void;

    async getPreviewStream(): Promise<MediaStream> {
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
            audio: true,
        });
        return this.stream;
    }

    start(): void {
        if (!this.stream || this.state === 'recording') return;

        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')
            ? 'video/webm; codecs=vp9,opus'
            : MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')
                ? 'video/webm; codecs=vp8,opus'
                : 'video/mp4';

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType, videoBitsPerSecond: 800000 });
        this.chunks = [];
        this.startTime = Date.now();

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };

        this.mediaRecorder.start(100);
        this.state = 'recording';

        this.timeUpdateInterval = setInterval(() => {
            this.onTimeUpdate?.((Date.now() - this.startTime) / 1000);
        }, 100);

        this.autoStopTimer = setTimeout(() => {
            this.onAutoStop?.();
        }, MAX_DURATION * 1000);
    }

    async stop(): Promise<VideoNoteRecording | null> {
        if (this.state !== 'recording' || !this.mediaRecorder) return null;

        if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
        if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);

        return new Promise((resolve) => {
            this.mediaRecorder!.onstop = async () => {
                const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
                const duration = (Date.now() - this.startTime) / 1000;
                const thumbnail = await this.captureThumbnail(blob);

                this.state = 'stopped';

                resolve({
                    blob,
                    duration: Math.min(duration, MAX_DURATION),
                    mimetype: blob.type,
                    thumbnailBlob: thumbnail || undefined,
                    width: 480,
                    height: 480,
                });
            };
            this.mediaRecorder!.stop();
        });
    }

    cancel(): void {
        if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
        if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
        if (this.mediaRecorder && this.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.releaseStream();
        this.state = 'idle';
    }

    releaseStream(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.chunks = [];
    }

    private async captureThumbnail(videoBlob: Blob): Promise<Blob | null> {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.muted = true;
            video.preload = 'auto';

            const cleanup = () => URL.revokeObjectURL(video.src);

            // Таймаут 5s: если браузер не загружает видео (detached element), не зависаем
            const timeout = setTimeout(() => {
                cleanup();
                resolve(null);
            }, 5000);

            const done = (blob: Blob | null) => {
                clearTimeout(timeout);
                cleanup();
                resolve(blob);
            };

            video.onloadeddata = () => { video.currentTime = 0.1; };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                const size = Math.min(video.videoWidth, video.videoHeight) || 480;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                const sx = (video.videoWidth - size) / 2;
                const sy = (video.videoHeight - size) / 2;
                ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
                canvas.toBlob((blob) => done(blob), 'image/jpeg', 0.7);
            };

            video.onerror = () => done(null);

            video.src = URL.createObjectURL(videoBlob);
        });
    }
}

export const videoNoteRecorder = new VideoNoteRecorder();
