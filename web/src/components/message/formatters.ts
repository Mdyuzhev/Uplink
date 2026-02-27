export function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const SENDER_COLORS = [
    '#f47067', '#c678dd', '#e5c07b', '#61afef',
    '#56b6c2', '#98c379', '#e06c75', '#d19a66',
];

export function getSenderColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

export function pluralReplies(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'ответ';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'ответа';
    return 'ответов';
}
