import * as sdk from 'matrix-js-sdk';

export interface ParsedMessage {
    id: string;
    sender: string;
    senderDisplayName: string;
    senderAvatarUrl?: string | null;
    timestamp: number;
    type: 'text' | 'code' | 'image' | 'file' | 'encrypted';
    body: string;
    formattedBody?: string;
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
}

export function parseEvent(event: sdk.MatrixEvent, getDisplayName: (userId: string) => string, getAvatarUrl?: (userId: string) => string | null): ParsedMessage | null {
    const type = event.getType();
    if (type !== 'm.room.message' && type !== 'm.room.encrypted') return null;

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

    if (content['dev.uplink.code_context']) {
        return {
            id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
            timestamp: event.getTs(), type: 'code',
            body: content.body || '',
            codeContext: content['dev.uplink.code_context'],
        };
    }

    return {
        id: event.getId()!, sender, senderDisplayName, senderAvatarUrl,
        timestamp: event.getTs(),
        type: content.msgtype === 'm.image' ? 'image' : content.msgtype === 'm.file' ? 'file' : 'text',
        body: content.body || '',
        formattedBody: content.formatted_body,
    };
}
