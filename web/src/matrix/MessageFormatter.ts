import * as sdk from 'matrix-js-sdk';

export interface ParsedMessage {
    id: string;
    sender: string;
    senderDisplayName: string;
    senderAvatarUrl?: string | null;
    timestamp: number;
    type: 'text' | 'code' | 'image' | 'file' | 'encrypted' | 'sticker' | 'gif';
    body: string;
    formattedBody?: string;
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
    // Медиа
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    fileUrl?: string | null;
    fileSize?: number;
    mimetype?: string;
    imageWidth?: number;
    imageHeight?: number;
    // Reply
    replyToEventId?: string;
    replyToSender?: string;
    replyToBody?: string;
}

export function parseEvent(
    event: sdk.MatrixEvent,
    getDisplayName: (userId: string) => string,
    getAvatarUrl?: (userId: string) => string | null,
    mxcToHttp?: (mxcUrl: string, size?: number) => string | null,
    mxcToHttpDownload?: (mxcUrl: string) => string | null,
): ParsedMessage | null {
    const type = event.getType();
    if (type !== 'm.room.message' && type !== 'm.room.encrypted' && type !== 'm.sticker') return null;

    const sender = event.getSender()!;
    const senderDisplayName = getDisplayName(sender);
    const senderAvatarUrl = getAvatarUrl ? getAvatarUrl(sender) : null;

    if (type === 'm.room.encrypted') {
        if (event.isDecryptionFailure()) {
            return { id: event.getId()!, sender, senderDisplayName, senderAvatarUrl, timestamp: event.getTs(), type: 'encrypted', body: 'Не удалось расшифровать' };
        }
        if (!event.getClearContent()) {
            return { id: event.getId()!, sender, senderDisplayName, senderAvatarUrl, timestamp: event.getTs(), type: 'encrypted', body: 'Расшифровка...' };
        }
    }

    const content = event.getContent();
    const info = content.info || {};
    const mxcUrl = content.url;

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let fileUrl: string | null = null;

    if (mxcUrl && mxcToHttp && mxcToHttpDownload) {
        if (content.msgtype === 'm.image') {
            imageUrl = mxcToHttpDownload(mxcUrl);
            thumbnailUrl = mxcToHttp(mxcUrl, 400);
        }
        if (content.msgtype === 'm.file' || content.msgtype === 'm.image') {
            fileUrl = mxcToHttpDownload(mxcUrl);
        }
    }

    // Reply info
    const relatesTo = content['m.relates_to'];
    const inReplyTo = relatesTo?.['m.in_reply_to'];
    let replyToEventId: string | undefined;
    let replyToSender: string | undefined;
    let replyToBody: string | undefined;

    if (inReplyTo?.event_id) {
        replyToEventId = inReplyTo.event_id;
        // Reply info (sender, body) заполняется в useMessages через MatrixService.findEventInRoom
    }

    // Убрать fallback-цитату из body (> <@user:server> текст\n\n)
    let body = content.body || '';
    if (replyToEventId && body.startsWith('> ')) {
        const emptyLineIdx = body.indexOf('\n\n');
        if (emptyLineIdx !== -1) {
            body = body.substring(emptyLineIdx + 2);
        }
    }

    // Стикер (m.sticker event)
    if (type === 'm.sticker') {
        const stickerUrl = mxcUrl && mxcToHttpDownload ? mxcToHttpDownload(mxcUrl) : null;
        return {
            id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
            timestamp: event.getTs(), type: 'sticker' as const,
            body: content.body || 'Стикер',
            imageUrl: stickerUrl,
            mimetype: info.mimetype,
            imageWidth: info.w || 200,
            imageHeight: info.h || 200,
        };
    }

    // GIF (m.image с маркером dev.uplink.gif)
    if (content['dev.uplink.gif']) {
        const isExternal = mxcUrl && !mxcUrl.startsWith('mxc://');
        const gifImageUrl = isExternal ? mxcUrl : (mxcUrl && mxcToHttpDownload ? mxcToHttpDownload(mxcUrl) : mxcUrl);
        return {
            id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
            timestamp: event.getTs(), type: 'gif' as const,
            body: content.body || 'GIF',
            imageUrl: gifImageUrl,
            imageWidth: info.w || 300,
            imageHeight: info.h || 200,
            replyToEventId,
            replyToSender,
            replyToBody,
        };
    }

    if (content['dev.uplink.code_context']) {
        return {
            id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
            timestamp: event.getTs(), type: 'code',
            body,
            codeContext: content['dev.uplink.code_context'],
        };
    }

    return {
        id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
        timestamp: event.getTs(),
        type: content.msgtype === 'm.image' ? 'image' : content.msgtype === 'm.file' ? 'file' : 'text',
        body,
        formattedBody: content.formatted_body,
        imageUrl,
        thumbnailUrl,
        fileUrl,
        fileSize: info.size,
        mimetype: info.mimetype,
        imageWidth: info.w,
        imageHeight: info.h,
        replyToEventId,
        replyToSender,
        replyToBody,
    };
}
