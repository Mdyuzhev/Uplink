import * as sdk from 'matrix-js-sdk';

export interface ParsedMessage {
    id: string;
    sender: string;
    senderDisplayName: string;
    senderAvatarUrl?: string | null;
    timestamp: number;
    type: 'text' | 'code' | 'image' | 'file' | 'video' | 'encrypted' | 'sticker' | 'gif' | 'voice' | 'video_note';
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
    // Voice
    duration?: number;
    waveform?: number[];
    // Video note
    isVideoNote?: boolean;
    // Reply
    replyToEventId?: string;
    replyToSender?: string;
    replyToBody?: string;
    // Mentions
    mentionedUserIds?: string[];
    // Inline-кнопки от SDK-бота
    buttons?: Array<Array<{ label: string; callback: string }>>;
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

    // Mentions (m.mentions)
    const mentions = content['m.mentions'];
    const mentionedUserIds: string[] | undefined = mentions?.user_ids?.length ? mentions.user_ids : undefined;

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
            mentionedUserIds,
        };
    }

    // Голосовое сообщение (m.audio с маркером voice)
    if (content.msgtype === 'm.audio') {
        const isVoice = content['org.matrix.msc3245.voice'] !== undefined
            || content['dev.uplink.voice'] === true;
        const audioInfo = content['org.matrix.msc1767.audio'] || {};
        const audioUrl = mxcUrl && mxcToHttpDownload ? mxcToHttpDownload(mxcUrl) : null;

        return {
            id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
            timestamp: event.getTs(),
            type: isVoice ? 'voice' as const : 'file' as const,
            body: body || (isVoice ? 'Голосовое сообщение' : 'Аудио'),
            fileUrl: audioUrl,
            fileSize: info.size,
            mimetype: info.mimetype,
            duration: audioInfo.duration || info.duration,
            waveform: audioInfo.waveform,
            replyToEventId, replyToSender, replyToBody, mentionedUserIds,
        };
    }

    // Видео-кружочек (m.video с маркером video_note) или обычное видео
    if (content.msgtype === 'm.video') {
        const isVideoNote = content['dev.uplink.video_note'] === true;
        const videoUrl = mxcUrl && mxcToHttpDownload ? mxcToHttpDownload(mxcUrl) : null;
        const thumbUrl = info.thumbnail_url && mxcToHttp ? mxcToHttp(info.thumbnail_url, 480) : null;

        if (isVideoNote) {
            return {
                id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
                timestamp: event.getTs(),
                type: 'video_note' as const,
                body: body || 'Видеосообщение',
                fileUrl: videoUrl,
                thumbnailUrl: thumbUrl,
                fileSize: info.size,
                mimetype: info.mimetype,
                duration: info.duration,
                imageWidth: info.w || 240,
                imageHeight: info.h || 240,
                isVideoNote: true,
                replyToEventId, replyToSender, replyToBody, mentionedUserIds,
            };
        }

        // Обычное видео — inline-плеер с кнопкой скачать
        return {
            id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
            timestamp: event.getTs(),
            type: 'video' as const,
            body: body || 'Видео',
            fileUrl: videoUrl,
            thumbnailUrl: thumbUrl,
            fileSize: info.size,
            mimetype: info.mimetype,
            imageWidth: info.w,
            imageHeight: info.h,
            duration: info.duration,
            replyToEventId, replyToSender, replyToBody, mentionedUserIds,
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

    // Inline-кнопки от SDK-бота (uplink.buttons)
    const rawButtons = content['uplink.buttons'];
    let buttons: Array<Array<{ label: string; callback: string }>> | undefined;
    if (Array.isArray(rawButtons)) {
        buttons = (rawButtons as unknown[])
            .slice(0, 5)
            .map((row: unknown) =>
                Array.isArray(row)
                    ? (row as unknown[])
                          .slice(0, 4)
                          .filter(
                              (btn: unknown): btn is { label: string; callback: string } =>
                                  typeof btn === 'object' && btn !== null &&
                                  typeof (btn as Record<string, unknown>).label === 'string' &&
                                  typeof (btn as Record<string, unknown>).callback === 'string',
                          )
                          .map((btn) => ({
                              label: String(btn.label).slice(0, 64),
                              callback: String(btn.callback).slice(0, 256),
                          }))
                    : [],
            )
            .filter((row) => row.length > 0);
        if (buttons.length === 0) buttons = undefined;
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
        mentionedUserIds,
        buttons,
    };
}
