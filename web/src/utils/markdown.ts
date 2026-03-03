/**
 * Легковесный markdown-рендер для сообщений.
 * Без внешних библиотек — регулярки + escapeHtml.
 * Покрывает: жирный, курсив, зачёркнутый, инлайн-код, блоки кода, ссылки, цитаты.
 */

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function renderMarkdown(text: string): string {
    // Извлечь блоки кода перед escapeHtml, чтобы содержимое не обрабатывалось
    const codeBlocks: string[] = [];
    let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push(
            `<pre class="md-code-block" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code)}</code></pre>`
        );
        return `\x00CODEBLOCK_${idx}\x00`;
    });

    // Извлечь инлайн-код до escapeHtml
    const inlineCodes: string[] = [];
    processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
        const idx = inlineCodes.length;
        inlineCodes.push(`<code class="md-inline-code">${escapeHtml(code)}</code>`);
        return `\x00INLINE_${idx}\x00`;
    });

    // Теперь безопасно экранируем HTML
    processed = escapeHtml(processed);

    // Жирный
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Курсив (после жирного)
    // eslint-disable-next-line no-useless-escape
    processed = processed.replace(/(?<!\*)\*([^\*\n]+)\*(?!\*)/g, '<em>$1</em>');
    processed = processed.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');

    // Зачёркнутый
    processed = processed.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Цитата (строка начинающаяся с &gt;)
    processed = processed.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');

    // Ссылки (автодетект URL)
    processed = processed.replace(
        /(https?:\/\/[^\s<&]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Вернуть блоки кода и инлайн-код (используем \x00 как sentinel — eslint-disable намеренно)
    // eslint-disable-next-line no-control-regex
    processed = processed.replace(/\x00INLINE_(\d+)\x00/g, (_, idx) => inlineCodes[Number(idx)]);
    // eslint-disable-next-line no-control-regex
    processed = processed.replace(/\x00CODEBLOCK_(\d+)\x00/g, (_, idx) => codeBlocks[Number(idx)]);

    return processed;
}
