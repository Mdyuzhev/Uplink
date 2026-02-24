# 016: Отправка и отображение медиа в чатах (картинки, файлы)

## Цель

Добавить возможность отправлять и просматривать изображения и файлы в чатах. Кнопка «скрепка» рядом с полем ввода, drag-and-drop, превью картинок в ленте, скачивание файлов.

### Сейчас

- В чатах можно отправлять **только текст**
- `MessageFormatter` уже парсит типы `image` и `file`, но `MessageBubble` их не рендерит
- Synapse уже настроен хранить медиа (`media_store_path`, `max_upload_size: 50M`)

### Как должно быть

- Кнопка 📎 в MessageInput — выбор файла с диска
- Drag-and-drop файла в область чата
- Картинки (PNG, JPG, GIF, WebP) — отображаются inline как превью
- Файлы (PDF, DOCX, ZIP и т.д.) — иконка + имя + размер + кнопка скачать
- Прогресс-бар при загрузке

### Целевой UI

```
┌─────────────────────────────────────┐
│ Alice                    10:30      │
│ Посмотри этот скриншот              │
│ ┌──────────────────────┐            │
│ │                      │            │
│ │   [превью картинки]  │            │
│ │                      │            │
│ └──────────────────────┘            │
│                                     │
│ Bob                      10:32      │
│ 📄 report-q4.pdf (2.3 МБ)  [⬇]    │
│                                     │
│ Alice                    10:33      │
│ Получила, спасибо!                  │
├─────────────────────────────────────┤
│ [📎] [Написать в #general...]  [↑] │
└─────────────────────────────────────┘
```

## Зависимости

- Веб-приложение работает, сообщения отправляются/принимаются
- Synapse хранит медиа (media_store_path настроен)

## Текущие файлы

```
web/src/
├── matrix/
│   ├── MatrixService.ts       # sendMessage (только текст)
│   └── MessageFormatter.ts    # parseEvent — уже парсит m.image/m.file
├── hooks/
│   └── useMessages.ts         # sendMessage (только текст)
├── components/
│   ├── MessageInput.tsx       # textarea + кнопка отправки (только текст)
│   ├── MessageBubble.tsx      # рендер сообщения (text, code, encrypted — НЕТ image/file)
│   └── MessageList.tsx        # список сообщений
└── styles/
    └── chat.css
```

---

## ЧАСТЬ 1: Методы отправки медиа в MatrixService

### ШАГ 1.1. Добавить методы в MatrixService.ts

Файл: `E:\Uplink\web\src\matrix\MatrixService.ts`

Добавить в класс `MatrixService`:

```typescript
    /**
     * Загрузить файл на сервер и отправить как сообщение.
     * Автоматически определяет тип: изображение → m.image, остальное → m.file.
     */
    async sendFile(roomId: string, file: File): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');

        // 1. Загрузить файл на Matrix media repo → получить mxc:// URL
        const uploadResponse = await this.client.uploadContent(file, {
            type: file.type,
        });
        const mxcUrl = uploadResponse.content_uri;

        // 2. Определить тип сообщения
        const isImage = file.type.startsWith('image/');

        if (isImage) {
            // Для изображений — получить размеры
            const dimensions = await this.getImageDimensions(file);

            await this.client.sendMessage(roomId, {
                msgtype: 'm.image',
                body: file.name,
                url: mxcUrl,
                info: {
                    mimetype: file.type,
                    size: file.size,
                    w: dimensions.width,
                    h: dimensions.height,
                },
            } as any);
        } else {
            await this.client.sendMessage(roomId, {
                msgtype: 'm.file',
                body: file.name,
                url: mxcUrl,
                info: {
                    mimetype: file.type,
                    size: file.size,
                },
            } as any);
        }
    }

    /**
     * Конвертировать mxc:// URL в HTTP URL для браузера.
     */
    mxcToHttp(mxcUrl: string, width?: number, height?: number): string | null {
        if (!this.client || !mxcUrl) return null;
        if (width && height) {
            return this.client.mxcUrlToHttp(mxcUrl, width, height, 'scale') || null;
        }
        return this.client.mxcUrlToHttp(mxcUrl) || null;
    }

    /**
     * Получить размеры изображения из File.
     */
    private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => {
                resolve({ width: 0, height: 0 });
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    }
```

---

## ЧАСТЬ 2: Обновить MessageFormatter — извлекать URL медиа

### ШАГ 2.1. Расширить ParsedMessage

Файл: `E:\Uplink\web\src\matrix\MessageFormatter.ts`

Добавить поля в интерфейс `ParsedMessage`:

```typescript
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
    // Медиа-поля (НОВОЕ)
    imageUrl?: string | null;      // HTTP URL картинки (полный размер)
    thumbnailUrl?: string | null;  // HTTP URL превью (уменьшенное)
    fileUrl?: string | null;       // HTTP URL для скачивания файла
    fileSize?: number;             // размер файла в байтах
    mimetype?: string;             // MIME-тип
    imageWidth?: number;           // ширина картинки
    imageHeight?: number;          // высота картинки
}
```

### ШАГ 2.2. Обновить parseEvent — заполнять медиа-поля

В функции `parseEvent`, обновить финальный return:

```typescript
    const content = event.getContent();
    const info = content.info || {};
    const mxcUrl = content.url;

    // Функция конвертации mxc → http (передаётся четвёртым аргументом)
    // Если не передана — оставить null

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let fileUrl: string | null = null;

    if (mxcUrl && mxcToHttp) {
        if (content.msgtype === 'm.image') {
            imageUrl = mxcToHttp(mxcUrl);
            // Превью — ограничиваем размер
            thumbnailUrl = mxcToHttp(mxcUrl, 400, 400);
        }
        if (content.msgtype === 'm.file' || content.msgtype === 'm.image') {
            fileUrl = mxcToHttp(mxcUrl);
        }
    }

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
        type: content.msgtype === 'm.image' ? 'image'
            : content.msgtype === 'm.file' ? 'file'
            : 'text',
        body: content.body || '',
        formattedBody: content.formatted_body,
        imageUrl,
        thumbnailUrl,
        fileUrl,
        fileSize: info.size,
        mimetype: info.mimetype,
        imageWidth: info.w,
        imageHeight: info.h,
    };
```

### ШАГ 2.3. Обновить сигнатуру parseEvent

Добавить параметр `mxcToHttp`:

```typescript
export function parseEvent(
    event: sdk.MatrixEvent,
    getDisplayName: (userId: string) => string,
    getAvatarUrl?: (userId: string) => string | null,
    mxcToHttp?: (mxcUrl: string, width?: number, height?: number) => string | null,
): ParsedMessage | null {
```

### ШАГ 2.4. Обновить вызов в useMessages.ts

Файл: `E:\Uplink\web\src\hooks\useMessages.ts`

Добавить `mxcToHttp` при вызове `parseEvent`:

```typescript
    const mxcToHttp = (url: string, w?: number, h?: number) => matrixService.mxcToHttp(url, w, h);
    const parsed = events
        .map(e => parseEvent(e, getDisplayName, getAvatarUrl, mxcToHttp))
        .filter((m): m is ParsedMessage => m !== null);
```

---

## ЧАСТЬ 3: Обновить MessageBubble — рендер картинок и файлов

### ШАГ 3.1. Обновить MessageBubble.tsx

Файл: `E:\Uplink\web\src\components\MessageBubble.tsx`

Заменить содержимое рендера body в JSX:

```tsx
                {message.type === 'code' ? (
                    <CodeSnippet body={message.body} codeContext={message.codeContext} />
                ) : message.type === 'encrypted' ? (
                    <div className="message-bubble__encrypted">{message.body}</div>
                ) : message.type === 'image' ? (
                    <div className="message-bubble__image">
                        <a href={message.imageUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <img
                                src={message.thumbnailUrl || message.imageUrl || ''}
                                alt={message.body}
                                className="message-bubble__image-img"
                                loading="lazy"
                                style={{
                                    maxWidth: Math.min(message.imageWidth || 400, 400),
                                    maxHeight: 300,
                                }}
                            />
                        </a>
                    </div>
                ) : message.type === 'file' ? (
                    <div className="message-bubble__file">
                        <span className="message-bubble__file-icon">📄</span>
                        <div className="message-bubble__file-info">
                            <span className="message-bubble__file-name">{message.body}</span>
                            <span className="message-bubble__file-size">
                                {message.fileSize ? formatFileSize(message.fileSize) : ''}
                            </span>
                        </div>
                        {message.fileUrl && (
                            <a
                                href={message.fileUrl}
                                download={message.body}
                                className="message-bubble__file-download"
                                title="Скачать"
                            >
                                ⬇
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="message-bubble__body">{message.body}</div>
                )}
```

Добавить функцию форматирования размера файла (вне компонента):

```typescript
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
```

---

## ЧАСТЬ 4: Обновить MessageInput — кнопка прикрепления и drag-and-drop

### ШАГ 4.1. Обновить MessageInput.tsx

Файл: `E:\Uplink\web\src\components\MessageInput.tsx`

Полная замена:

```tsx
import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
    onSend: (body: string) => void;
    onSendFile: (file: File) => void;
    roomName?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendFile, roomName }) => {
    const [text, setText] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adjustHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    }, []);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // === Прикрепление файла ===

    const handleFileSelect = async (file: File) => {
        if (uploading) return;

        // Проверка размера (50 МБ — лимит Synapse)
        if (file.size > 50 * 1024 * 1024) {
            alert('Максимальный размер файла — 50 МБ');
            return;
        }

        setUploading(true);
        try {
            await onSendFile(file);
        } catch (err) {
            console.error('Ошибка отправки файла:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        // Сбросить input чтобы можно было выбрать тот же файл повторно
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // === Drag & Drop ===

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    // === Вставка из буфера (Ctrl+V картинки) ===

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleFileSelect(file);
                return;
            }
        }
    };

    return (
        <div
            className={`message-input ${isDragOver ? 'message-input--drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragOver && (
                <div className="message-input__drop-overlay">
                    Отпустите чтобы отправить файл
                </div>
            )}

            {uploading && (
                <div className="message-input__uploading">
                    Загрузка файла...
                </div>
            )}

            <div className="message-input__wrapper">
                <button
                    className="message-input__attach"
                    onClick={handleAttachClick}
                    disabled={uploading}
                    title="Прикрепить файл"
                >
                    📎
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />
                <textarea
                    ref={textareaRef}
                    className="message-input__textarea"
                    value={text}
                    onChange={e => { setText(e.target.value); adjustHeight(); }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={roomName ? `Написать в ${roomName}...` : 'Написать сообщение...'}
                    rows={1}
                />
                <button
                    className="message-input__send"
                    onClick={handleSend}
                    disabled={!text.trim() || uploading}
                >
                    &#8593;
                </button>
            </div>
        </div>
    );
};
```

---

## ЧАСТЬ 5: Обновить useMessages — добавить sendFile

### ШАГ 5.1. Обновить useMessages.ts

Файл: `E:\Uplink\web\src\hooks\useMessages.ts`

Добавить `sendFile` рядом с `sendMessage`:

```typescript
    const sendFile = useCallback(async (file: File) => {
        if (!roomId) return;
        await matrixService.sendFile(roomId, file);
    }, [roomId]);

    return { messages, sendMessage, sendFile, loadMore };
```

---

## ЧАСТЬ 6: Обновить ChatLayout — передать sendFile в MessageInput

### ШАГ 6.1. Обновить ChatLayout.tsx

Файл: `E:\Uplink\web\src\components\ChatLayout.tsx`

Деструктуризация useMessages — добавить `sendFile`:

```tsx
    const { messages, sendMessage, sendFile, loadMore } = useMessages(activeRoomId);
```

В JSX — передать `onSendFile` в MessageInput:

```tsx
    <MessageInput
        onSend={sendMessage}
        onSendFile={sendFile}
        roomName={activeRoom.name}
    />
```

---

## ЧАСТЬ 7: Стили

### ШАГ 7.1. Добавить стили медиа-сообщений в chat.css

Файл: `E:\Uplink\web\src\styles\chat.css`

```css
/* === Image message === */
.message-bubble__image {
    margin-top: 4px;
}

.message-bubble__image-img {
    border-radius: 8px;
    cursor: pointer;
    display: block;
    object-fit: contain;
    transition: opacity 0.15s;
}

.message-bubble__image-img:hover {
    opacity: 0.9;
}

/* === File message === */
.message-bubble__file {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--uplink-bg-tertiary, #353840);
    border-radius: 8px;
    padding: 10px 14px;
    margin-top: 4px;
    max-width: 350px;
}

.message-bubble__file-icon {
    font-size: 28px;
    flex-shrink: 0;
}

.message-bubble__file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.message-bubble__file-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--uplink-text-primary, #fff);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.message-bubble__file-size {
    font-size: 12px;
    color: var(--uplink-text-muted, #888);
}

.message-bubble__file-download {
    font-size: 20px;
    text-decoration: none;
    color: var(--uplink-accent, #5865f2);
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.15s;
    flex-shrink: 0;
}

.message-bubble__file-download:hover {
    background: var(--uplink-bg-primary, #1a1d23);
}

/* === Attach button === */
.message-input__attach {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    opacity: 0.6;
    transition: opacity 0.15s;
    flex-shrink: 0;
}

.message-input__attach:hover {
    opacity: 1;
}

.message-input__attach:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* === Drag & Drop overlay === */
.message-input--drag-over {
    position: relative;
}

.message-input__drop-overlay {
    position: absolute;
    inset: -100px 0 0 0;
    background: rgba(88, 101, 242, 0.15);
    border: 2px dashed var(--uplink-accent, #5865f2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--uplink-accent, #5865f2);
    font-size: 16px;
    font-weight: 600;
    z-index: 10;
    pointer-events: none;
}

/* === Upload indicator === */
.message-input__uploading {
    padding: 6px 12px;
    font-size: 13px;
    color: var(--uplink-text-muted, #888);
    text-align: center;
    animation: pulse 1.5s ease-in-out infinite;
}
```

---

## ЧАСТЬ 8: Проверка

### ШАГ 8.1. Отправка картинки через кнопку

1. Открыть http://192.168.1.74:5174
2. Залогиниться как Alice → #general
3. Нажать 📎 → выбрать PNG/JPG с диска
4. «Загрузка файла...» → картинка появляется в ленте как превью
5. Клик по картинке → открывается в полном размере (новая вкладка)
6. Bob (вторая вкладка) видит картинку в ленте в real-time

### ШАГ 8.2. Drag & Drop

1. Перетащить картинку из проводника прямо в область чата
2. Появляется синий overlay «Отпустите чтобы отправить файл»
3. Отпустить → загрузка → превью в ленте

### ШАГ 8.3. Ctrl+V (вставка скриншота)

1. Сделать скриншот (PrintScreen / Snipping Tool)
2. В области ввода нажать Ctrl+V
3. Скриншот загружается и появляется как картинка в ленте

### ШАГ 8.4. Отправка файла

1. Нажать 📎 → выбрать PDF или ZIP файл
2. В ленте: 📄 + имя файла + размер + кнопка ⬇
3. Нажать ⬇ → файл скачивается
4. Bob видит файл и тоже может скачать

### ШАГ 8.5. Лимит размера

1. Попробовать отправить файл > 50 МБ
2. Алерт: «Максимальный размер файла — 50 МБ»
3. Файл не отправляется

### ШАГ 8.6. DM

1. Alice → DM с Bob → отправить картинку
2. Bob видит картинку в DM

---

## Критерии приёмки

- [ ] Кнопка 📎 в MessageInput — выбор файла с диска
- [ ] Drag-and-drop файла в область чата
- [ ] Ctrl+V — вставка изображения из буфера обмена
- [ ] Изображения отображаются как превью в ленте (с ограничением размера)
- [ ] Клик по картинке — открывает полный размер
- [ ] Файлы отображаются: иконка + имя + размер + кнопка скачать
- [ ] Скачивание файла по клику на ⬇
- [ ] «Загрузка файла...» индикатор при отправке
- [ ] Лимит 50 МБ с предупреждением
- [ ] Real-time: получатель видит медиа сразу
- [ ] Работает в каналах и DM
- [ ] Задеплоено на сервер

## Коммит

```
[web] Медиа в чатах: отправка/отображение картинок и файлов

- MatrixService: sendFile, mxcToHttp, getImageDimensions
- MessageFormatter: извлечение imageUrl, fileUrl, fileSize из mxc://
- MessageBubble: рендер inline-картинок и карточек файлов
- MessageInput: кнопка 📎, drag-and-drop, Ctrl+V вставка
- useMessages: sendFile
```
