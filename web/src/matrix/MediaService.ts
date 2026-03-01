import * as sdk from 'matrix-js-sdk';
import type { VoiceRecording } from '../services/VoiceRecorder';
import type { VideoNoteRecording } from '../services/VideoNoteRecorder';

/**
 * Сервис медиа — конвертация mxc:// URL, загрузка файлов, отправка медиа-сообщений.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class MediaService {
    constructor(private getClient: () => sdk.MatrixClient) {}

    /** Конвертировать mxc:// URL в HTTP URL для <img src> (thumbnail) */
    mxcToHttp(mxcUrl: string | undefined | null, size: number = 96): string | null {
        const client = this.getClient();
        if (!mxcUrl) return null;
        // mxc://serverName/mediaId → /_matrix/client/v1/media/thumbnail/serverName/mediaId
        // Synapse 1.147: старый /_matrix/media/v3/ отключён, нужен новый authenticated endpoint
        const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
        if (!match) return null;
        const [, serverName, mediaId] = match;
        const baseUrl = client.getHomeserverUrl();
        const token = client.getAccessToken();
        const params = new URLSearchParams({ width: String(size), height: String(size), method: 'crop' });
        if (token) params.set('access_token', token);
        return `${baseUrl}/_matrix/client/v1/media/thumbnail/${serverName}/${mediaId}?${params}`;
    }

    /** Получить HTTP URL для скачивания/просмотра полного файла (не thumbnail) */
    mxcToHttpDownload(mxcUrl: string | undefined | null): string | null {
        const client = this.getClient();
        if (!mxcUrl) return null;
        const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
        if (!match) return null;
        const [, serverName, mediaId] = match;
        const baseUrl = client.getHomeserverUrl();
        const token = client.getAccessToken();
        const params = new URLSearchParams();
        if (token) params.set('access_token', token);
        return `${baseUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}?${params}`;
    }

    /** Загрузить файл на сервер и отправить как сообщение */
    async sendFile(roomId: string, file: File): Promise<void> {
        const client = this.getClient();
        const uploadResponse = await client.uploadContent(file, { type: file.type });
        const mxcUrl = uploadResponse.content_uri;
        const isImage = file.type.startsWith('image/');

        if (isImage) {
            const dims = await this.getImageDimensions(file);
            await client.sendMessage(roomId, {
                msgtype: 'm.image',
                body: file.name,
                url: mxcUrl,
                info: { mimetype: file.type, size: file.size, w: dims.width, h: dims.height },
            } as any);
        } else {
            await client.sendMessage(roomId, {
                msgtype: 'm.file',
                body: file.name,
                url: mxcUrl,
                info: { mimetype: file.type, size: file.size },
            } as any);
        }
    }

    /** Загрузить файл на сервер и вернуть mxc:// URL (без отправки сообщения) */
    async uploadFile(file: File): Promise<string> {
        const client = this.getClient();
        const response = await client.uploadContent(file, { type: file.type });
        return response.content_uri;
    }

    /** Отправить голосовое сообщение */
    async sendVoiceMessage(roomId: string, recording: VoiceRecording): Promise<void> {
        const client = this.getClient();
        const file = new File([recording.blob], 'voice.ogg', { type: recording.mimetype });
        const mxcUrl = await this.uploadFile(file);

        await client.sendEvent(roomId, 'm.room.message' as sdk.EventType, {
            msgtype: 'm.audio',
            body: 'Голосовое сообщение',
            url: mxcUrl,
            info: {
                mimetype: recording.mimetype,
                size: recording.blob.size,
                duration: Math.round(recording.duration * 1000),
            },
            'org.matrix.msc1767.audio': {
                duration: Math.round(recording.duration * 1000),
                waveform: recording.waveform.map((v: number) => Math.round(v * 1024)),
            },
            'org.matrix.msc3245.voice': {},
            'dev.uplink.voice': true,
        });
    }

    /** Отправить видео-кружочек */
    async sendVideoNote(roomId: string, recording: VideoNoteRecording): Promise<void> {
        const client = this.getClient();
        const videoFile = new File([recording.blob], 'video_note.webm', { type: recording.mimetype });
        const videoMxc = await this.uploadFile(videoFile);

        let thumbnailMxc: string | undefined;
        if (recording.thumbnailBlob) {
            const thumbFile = new File([recording.thumbnailBlob], 'thumb.jpg', { type: 'image/jpeg' });
            thumbnailMxc = await this.uploadFile(thumbFile);
        }

        const content: Record<string, unknown> = {
            msgtype: 'm.video',
            body: 'Видеосообщение',
            url: videoMxc,
            info: {
                mimetype: recording.mimetype,
                size: recording.blob.size,
                duration: Math.round(recording.duration * 1000),
                w: recording.width,
                h: recording.height,
                ...(thumbnailMxc ? {
                    thumbnail_url: thumbnailMxc,
                    thumbnail_info: { mimetype: 'image/jpeg', w: recording.width, h: recording.height },
                } : {}),
            },
            'dev.uplink.video_note': true,
        };

        await client.sendEvent(roomId, 'm.room.message' as sdk.EventType, content);
    }

    /** Получить размеры изображения из File */
    getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src); };
            img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(img.src); };
            img.src = URL.createObjectURL(file);
        });
    }
}
