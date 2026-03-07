import { describe, it, expect } from 'vitest';
import { parseEvent } from '../MessageFormatter';

function mockEvent(overrides: {
    type?: string;
    content?: Record<string, unknown>;
    sender?: string;
    eventId?: string;
    ts?: number;
    decryptionFailure?: boolean;
    clearContent?: Record<string, unknown> | null;
} = {}) {
    const content = overrides.content || { msgtype: 'm.text', body: 'тест' };
    return {
        getType: () => overrides.type || 'm.room.message',
        getSender: () => overrides.sender || '@user:server',
        getId: () => overrides.eventId || '$event1',
        getTs: () => overrides.ts || 1709000000000,
        getContent: () => content,
        isDecryptionFailure: () => overrides.decryptionFailure || false,
        getClearContent: () =>
            overrides.clearContent !== undefined ? overrides.clearContent : content,
        isRedacted: () => false,
    };
}

const getName = (userId: string) => userId.split(':')[0].slice(1);
const getAvatar = () => null;
const mxcToHttp = (url: string) =>
    url.replace('mxc://', 'https://server/_matrix/media/v3/thumbnail/');
const mxcToHttpDl = (url: string) =>
    url.replace('mxc://', 'https://server/_matrix/media/v3/download/');

describe('parseEvent', () => {
    it('текстовое сообщение', () => {
        const event = mockEvent({ content: { msgtype: 'm.text', body: 'привет' } });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('text');
        expect(result!.body).toBe('привет');
        expect(result!.sender).toBe('@user:server');
    });

    it('изображение', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.image',
                body: 'photo.jpg',
                url: 'mxc://server/abc',
                info: { w: 800, h: 600, size: 12345, mimetype: 'image/jpeg' },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('image');
        expect(result!.imageUrl).toContain('download');
        expect(result!.thumbnailUrl).toContain('thumbnail');
        expect(result!.imageWidth).toBe(800);
    });

    it('файл', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.file',
                body: 'doc.pdf',
                url: 'mxc://server/file1',
                info: { size: 50000, mimetype: 'application/pdf' },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('file');
        expect(result!.fileUrl).toContain('download');
        expect(result!.fileSize).toBe(50000);
    });

    it('стикер (m.sticker)', () => {
        const event = mockEvent({
            type: 'm.sticker',
            content: {
                body: 'стикер',
                url: 'mxc://server/sticker1',
                info: { w: 200, h: 200, mimetype: 'image/webp' },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('sticker');
        expect(result!.imageUrl).toContain('download');
    });

    it('GIF (dev.uplink.gif маркер)', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.image',
                body: 'cat.gif',
                url: 'https://media.giphy.com/cat.gif',
                'dev.uplink.gif': true,
                info: { w: 300, h: 200 },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('gif');
        expect(result!.imageUrl).toBe('https://media.giphy.com/cat.gif');
    });

    it('голосовое сообщение', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.audio',
                body: 'Голосовое сообщение',
                url: 'mxc://server/voice1',
                'org.matrix.msc3245.voice': {},
                'org.matrix.msc1767.audio': { duration: 5000, waveform: [10, 20, 30] },
                info: { size: 8000, mimetype: 'audio/ogg' },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('voice');
        expect(result!.duration).toBe(5000);
        expect(result!.waveform).toEqual([10, 20, 30]);
    });

    it('видео-кружочек (dev.uplink.video_note)', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.video',
                body: 'видео',
                url: 'mxc://server/vnote1',
                'dev.uplink.video_note': true,
                info: { w: 240, h: 240, duration: 10000, size: 500000 },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('video_note');
        expect(result!.isVideoNote).toBe(true);
    });

    it('зашифрованное (failure)', () => {
        const event = mockEvent({
            type: 'm.room.encrypted',
            decryptionFailure: true,
        });
        const result = parseEvent(event as never, getName);
        expect(result!.type).toBe('encrypted');
        expect(result!.body).toBe('Не удалось расшифровать');
    });

    it('reply — убирает fallback-цитату из body', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.text',
                body: '> <@sender:server> оригинал\n\nмой ответ',
                'm.relates_to': { 'm.in_reply_to': { event_id: '$original' } },
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.body).toBe('мой ответ');
        expect(result!.replyToEventId).toBe('$original');
    });

    it('неизвестный тип события — null', () => {
        const event = mockEvent({ type: 'm.room.member' });
        expect(parseEvent(event as never, getName)).toBeNull();
    });

    it('code context (dev.uplink.code_context)', () => {
        const ctx = { language: 'typescript', fileName: 'app.ts', lineStart: 10, lineEnd: 20 };
        const event = mockEvent({
            content: {
                msgtype: 'm.text',
                body: 'const x = 1;',
                'dev.uplink.code_context': ctx,
            },
        });
        const result = parseEvent(event as never, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('code');
        expect(result!.codeContext).toEqual(ctx);
    });
});
