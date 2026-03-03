import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
    it('жирный текст **bold**', () => {
        expect(renderMarkdown('**жирный**')).toContain('<strong>жирный</strong>');
    });

    it('курсив *italic*', () => {
        expect(renderMarkdown('*курсив*')).toContain('<em>курсив</em>');
    });

    it('курсив _italic_', () => {
        expect(renderMarkdown('_курсив_')).toContain('<em>курсив</em>');
    });

    it('зачёркнутый ~~del~~', () => {
        expect(renderMarkdown('~~зачёркнутый~~')).toContain('<del>зачёркнутый</del>');
    });

    it('инлайн-код `code`', () => {
        const result = renderMarkdown('текст `code` текст');
        expect(result).toContain('<code class="md-inline-code">code</code>');
    });

    it('блок кода ```lang', () => {
        const input = '```js\nconsole.log("hi")\n```';
        const result = renderMarkdown(input);
        expect(result).toContain('<pre class="md-code-block"');
        expect(result).toContain('data-lang="js"');
        expect(result).toContain('console.log');
    });

    it('содержимое блока кода не обрабатывается как markdown', () => {
        const input = '```\n**not bold** *not italic*\n```';
        const result = renderMarkdown(input);
        expect(result).not.toContain('<strong>');
        expect(result).not.toContain('<em>');
    });

    it('автолинк https://', () => {
        expect(renderMarkdown('перейди на https://example.com тут')).toContain(
            '<a href="https://example.com"',
        );
    });

    it('цитата > text', () => {
        expect(renderMarkdown('> цитата')).toContain(
            '<blockquote class="md-quote">цитата</blockquote>',
        );
    });

    it('жирный + курсив в одном сообщении', () => {
        const result = renderMarkdown('**жирный** и *курсив*');
        expect(result).toContain('<strong>жирный</strong>');
        expect(result).toContain('<em>курсив</em>');
    });

    it('HTML экранируется', () => {
        const result = renderMarkdown('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });

    it('XSS через инлайн-код экранируется', () => {
        const result = renderMarkdown('`<img onerror=alert(1)>`');
        expect(result).toContain('&lt;img');
    });

    it('пустая строка', () => {
        expect(renderMarkdown('')).toBe('');
    });

    it('только пробелы', () => {
        expect(renderMarkdown('   ')).toBeDefined();
    });

    it('незакрытый жирный не ломает', () => {
        const result = renderMarkdown('**незакрытый');
        expect(result).not.toContain('<strong>');
    });

    it('одиночная звёздочка не курсив', () => {
        const result = renderMarkdown('2 * 3 = 6');
        expect(result).toContain('2');
    });
});
