import * as sdk from 'matrix-js-sdk';

/**
 * Парсинг и форматирование сообщений Matrix.
 * Обрабатывает текст, code snippets, encrypted, изображения, файлы.
 */
export class MessageFormatter {

    /** Распарсить MatrixEvent в структуру для UI. */
    static parseEvent(event: sdk.MatrixEvent): ParsedMessage | null {
        const type = event.getType();
        if (type !== 'm.room.message' && type !== 'm.room.encrypted') {
            return null;
        }

        // Encrypted: не расшифровано
        if (type === 'm.room.encrypted' && !event.isDecryptionFailure() && !event.getClearContent()) {
            return {
                id: event.getId()!,
                sender: event.getSender()!,
                timestamp: event.getTs(),
                type: 'encrypted',
                body: '🔒 Расшифровка...',
            };
        }

        if (event.isDecryptionFailure()) {
            return {
                id: event.getId()!,
                sender: event.getSender()!,
                timestamp: event.getTs(),
                type: 'encrypted',
                body: '🔒 Не удалось расшифровать сообщение',
            };
        }

        const content = event.getContent();
        const msgtype = content.msgtype;

        // Uplink code snippet
        if (content['dev.uplink.code_context']) {
            return {
                id: event.getId()!,
                sender: event.getSender()!,
                timestamp: event.getTs(),
                type: 'code',
                body: content.body || '',
                codeContext: content['dev.uplink.code_context'],
            };
        }

        switch (msgtype) {
            case 'm.text':
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'text',
                    body: content.body || '',
                    formattedBody: content.formatted_body,
                };

            case 'm.image':
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'image',
                    body: content.body || 'Изображение',
                    url: content.url,
                };

            case 'm.file':
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'file',
                    body: content.body || 'Файл',
                    url: content.url,
                    fileSize: content.info?.size,
                };

            default:
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'text',
                    body: content.body || `[${msgtype}]`,
                };
        }
    }
}

export interface ParsedMessage {
    id: string;
    sender: string;
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
    url?: string;
    fileSize?: number;
}
