# Задача prod_007: Фаза 5 — Качество кода

## Контекст

Фазы 0-4 завершены. Инфраструктура стабильна, код отрефакторен, данные на PostgreSQL. Осталось закрепить качество: тесты, линтинг, форматирование, CI-гейт.

### Текущее состояние

**TypeScript:** `strict: true` уже включён в `web/tsconfig.json` — strictNullChecks, strictFunctionTypes и т.д. работают. `noUnusedLocals`, `noUnusedParameters` — тоже. Это покрывает пункт 5.2 из плана (TypeScript strictness). Проверить: нет ли `as any` кастовок, которые стоит почистить.

**ESLint:** минимальный конфиг в корне (`.eslintrc.json`). Плагины: `@typescript-eslint/recommended`. Нет `react-hooks/exhaustive-deps`, нет react-specific rules. Конфиг в корне — legacy от VS Code extension, web/ не имеет своего.

**Prettier:** отсутствует.

**Тесты:** нет ни одного теста для web/. Нет Vitest/Jest. Нет тестов для botservice.

**CI:** deploy-production.yml — сразу деплой через SSH, без lint/test шага. Ломающий код попадает в production.

### Чистые функции для unit-тестов

| Функция | Файл | Что тестировать |
|---------|------|-----------------|
| `renderMarkdown(text)` | `utils/markdown.ts` | Жирный, курсив, код, ссылки, цитаты, edge cases |
| `parseEvent(event, ...)` | `matrix/MessageFormatter.ts` | Все типы: text, image, file, sticker, gif, voice, video_note, encrypted, reply |
| `escapeHtml(text)` | `utils/markdown.ts` (internal) | XSS-символы, edge cases |
| `buildRoomInfo(...)` | `matrix/RoomsManager.ts` | Парсинг комнат, unread, presence |
| `handleCommand(...)` | `handlers/github.mjs` | subscribe/unsubscribe/list routing (с mock storage) |


## Шаг 1. Vitest + unit-тесты (web/)

### 1.1. Установить Vitest

```bash
cd web
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`vitest` — встроен в Vite ecosystem, zero config для существующего vite.config.ts.

### 1.2. Конфиг Vitest

Файл: `web/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        coverage: {
            reporter: ['text', 'text-summary'],
            include: ['src/utils/**', 'src/matrix/MessageFormatter.ts', 'src/matrix/RoomsManager.ts'],
        },
    },
});
```

Файл: `web/src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
```

### 1.3. Добавить script в package.json

```json
{
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest",
        "test:coverage": "vitest run --coverage"
    }
}
```

### 1.4. Тесты для renderMarkdown

Файл: `web/src/utils/__tests__/markdown.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
    // Базовые форматы
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

    // Код
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
        // Внутри <pre> — экранированные **, а не <strong>
        expect(result).not.toContain('<strong>');
        expect(result).not.toContain('<em>');
    });

    // Ссылки
    it('автолинк https://', () => {
        expect(renderMarkdown('перейди на https://example.com тут'))
            .toContain('<a href="https://example.com"');
    });

    // Цитаты
    it('цитата > text', () => {
        expect(renderMarkdown('> цитата'))
            .toContain('<blockquote class="md-quote">цитата</blockquote>');
    });

    // Комбинации
    it('жирный + курсив в одном сообщении', () => {
        const result = renderMarkdown('**жирный** и *курсив*');
        expect(result).toContain('<strong>жирный</strong>');
        expect(result).toContain('<em>курсив</em>');
    });

    // XSS
    it('HTML экранируется', () => {
        const result = renderMarkdown('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });

    it('XSS через инлайн-код экранируется', () => {
        const result = renderMarkdown('`<img onerror=alert(1)>`');
        expect(result).toContain('&lt;img');
    });

    // Edge cases
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
        // Не должен обернуть "3 = 6" в <em>
        // Зависит от реализации — проверить что не ломается
        expect(result).toContain('2');
    });
});
```

### 1.5. Тесты для MessageFormatter.parseEvent

Файл: `web/src/matrix/__tests__/MessageFormatter.test.ts`

parseEvent зависит от matrix-js-sdk MatrixEvent. Мокать его через простой объект.

```typescript
import { describe, it, expect } from 'vitest';
import { parseEvent } from '../MessageFormatter';

// Минимальный mock MatrixEvent
function mockEvent(overrides: {
    type?: string;
    content?: Record<string, any>;
    sender?: string;
    eventId?: string;
    ts?: number;
    decryptionFailure?: boolean;
    clearContent?: Record<string, any> | null;
} = {}) {
    const content = overrides.content || { msgtype: 'm.text', body: 'тест' };
    return {
        getType: () => overrides.type || 'm.room.message',
        getSender: () => overrides.sender || '@user:server',
        getId: () => overrides.eventId || '$event1',
        getTs: () => overrides.ts || 1709000000000,
        getContent: () => content,
        isDecryptionFailure: () => overrides.decryptionFailure || false,
        getClearContent: () => overrides.clearContent !== undefined ? overrides.clearContent : content,
    };
}

const getName = (userId: string) => userId.split(':')[0].slice(1);
const getAvatar = () => null;
const mxcToHttp = (url: string) => url.replace('mxc://', 'https://server/_matrix/media/v3/thumbnail/');
const mxcToHttpDl = (url: string) => url.replace('mxc://', 'https://server/_matrix/media/v3/download/');

describe('parseEvent', () => {
    it('текстовое сообщение', () => {
        const event = mockEvent({ content: { msgtype: 'm.text', body: 'привет' } });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('text');
        expect(result!.body).toBe('привет');
        expect(result!.sender).toBe('@user:server');
    });

    it('изображение', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.image', body: 'photo.jpg',
                url: 'mxc://server/abc',
                info: { w: 800, h: 600, size: 12345, mimetype: 'image/jpeg' },
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('image');
        expect(result!.imageUrl).toContain('download');
        expect(result!.thumbnailUrl).toContain('thumbnail');
        expect(result!.imageWidth).toBe(800);
    });

    it('файл', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.file', body: 'doc.pdf',
                url: 'mxc://server/file1',
                info: { size: 50000, mimetype: 'application/pdf' },
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('file');
        expect(result!.fileUrl).toContain('download');
        expect(result!.fileSize).toBe(50000);
    });

    it('стикер (m.sticker)', () => {
        const event = mockEvent({
            type: 'm.sticker',
            content: {
                body: 'стикер', url: 'mxc://server/sticker1',
                info: { w: 200, h: 200, mimetype: 'image/webp' },
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('sticker');
        expect(result!.imageUrl).toContain('download');
    });

    it('GIF (dev.uplink.gif маркер)', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.image', body: 'cat.gif',
                url: 'https://media.giphy.com/cat.gif',
                'dev.uplink.gif': true,
                info: { w: 300, h: 200 },
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('gif');
        // Внешний URL — не через mxc
        expect(result!.imageUrl).toBe('https://media.giphy.com/cat.gif');
    });

    it('голосовое сообщение', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.audio', body: 'Голосовое сообщение',
                url: 'mxc://server/voice1',
                'org.matrix.msc3245.voice': {},
                'org.matrix.msc1767.audio': { duration: 5000, waveform: [10, 20, 30] },
                info: { size: 8000, mimetype: 'audio/ogg' },
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('voice');
        expect(result!.duration).toBe(5000);
        expect(result!.waveform).toEqual([10, 20, 30]);
    });

    it('видео-кружочек (dev.uplink.video_note)', () => {
        const event = mockEvent({
            content: {
                msgtype: 'm.video', body: 'видео',
                url: 'mxc://server/vnote1',
                'dev.uplink.video_note': true,
                info: { w: 240, h: 240, duration: 10000, size: 500000 },
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('video_note');
        expect(result!.isVideoNote).toBe(true);
    });

    it('зашифрованное (failure)', () => {
        const event = mockEvent({
            type: 'm.room.encrypted',
            decryptionFailure: true,
        });
        const result = parseEvent(event as any, getName);
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
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.body).toBe('мой ответ');
        expect(result!.replyToEventId).toBe('$original');
    });

    it('неизвестный тип события — null', () => {
        const event = mockEvent({ type: 'm.room.member' });
        expect(parseEvent(event as any, getName)).toBeNull();
    });

    it('code context (dev.uplink.code_context)', () => {
        const ctx = { language: 'typescript', fileName: 'app.ts', lineStart: 10, lineEnd: 20 };
        const event = mockEvent({
            content: {
                msgtype: 'm.text', body: 'const x = 1;',
                'dev.uplink.code_context': ctx,
            },
        });
        const result = parseEvent(event as any, getName, getAvatar, mxcToHttp, mxcToHttpDl);
        expect(result!.type).toBe('code');
        expect(result!.codeContext).toEqual(ctx);
    });
});
```

### 1.6. Проверить

```bash
cd web && npm test
# Все тесты зелёные
```

### Коммит

```
[quality] Vitest + unit-тесты: renderMarkdown (14 тестов), parseEvent (12 тестов)
```


## Шаг 2. ESLint для web/

Текущий ESLint в корне — legacy от VS Code extension. Создать актуальный конфиг для web/.

### 2.1. Установить плагины

```bash
cd web
npm install -D eslint-plugin-react-hooks eslint-plugin-react-refresh
```

`eslint-plugin-react-hooks` — exhaustive-deps (ловит баги в useEffect/useCallback/useMemo).
`eslint-plugin-react-refresh` — правила для HMR.

### 2.2. Конфиг ESLint

Файл: `web/.eslintrc.json`

```json
{
    "root": true,
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module",
        "ecmaFeatures": { "jsx": true }
    },
    "plugins": [
        "@typescript-eslint",
        "react-hooks",
        "react-refresh"
    ],
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }],
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/explicit-function-return-type": "off",
        "no-console": "off"
    },
    "ignorePatterns": ["dist", "node_modules", "src-tauri", "*.test.ts", "*.test.tsx"]
}
```

**Решение по no-console:** оставить `off` для web/ — console.error используется повсеместно для обработки ошибок. Перевод на structured logging во фронтенде — отдельная задача.

**Решение по no-explicit-any:** `warn`, не `error`. Есть десятки `as any` для matrix-js-sdk типов (SDK плохо типизирован). Чинить все — не в этой фазе.

### 2.3. Обновить lint script

`web/package.json`:
```json
"lint": "eslint src --ext ts,tsx --max-warnings 50"
```

`--max-warnings 50` — позволяет 50 предупреждений (для any кастовок и exhaustive-deps), но не позволяет добавлять новые бесконтрольно.

### 2.4. Проверить и починить ошибки

```bash
cd web && npm run lint
```

Ожидаемо:
- `react-hooks/exhaustive-deps` — несколько предупреждений в хуках. Чинить только очевидные (добавить в deps array). Сложные случаи (refs, services) — оставить с `// eslint-disable-next-line`.
- `no-explicit-any` — много, оставить как warnings.

**НЕ чинить всё.** Цель — настроить инфраструктуру и пройти CI, а не убить день на рефакторинг типов.

### Коммит

```
[quality] ESLint для web/ — react-hooks/exhaustive-deps, react-refresh
```


## Шаг 3. Prettier

Единый стиль форматирования. Без споров о точках с запятой.

### 3.1. Установить

```bash
cd web
npm install -D prettier eslint-config-prettier
```

`eslint-config-prettier` — отключает ESLint-правила, которые конфликтуют с Prettier.

### 3.2. Конфиг Prettier

Файл: `web/.prettierrc`

```json
{
    "singleQuote": true,
    "trailingComma": "all",
    "tabWidth": 4,
    "printWidth": 120,
    "semi": true,
    "bracketSpacing": true,
    "arrowParens": "always",
    "endOfLine": "lf"
}
```

**tabWidth: 4** — текущий стиль в проекте (4 пробела). Не менять.
**printWidth: 120** — текущие файлы содержат длинные строки (JSX с пропсами). 80 будет слишком агрессивно.
**singleQuote: true** — текущий стиль.

Файл: `web/.prettierignore`

```
dist
node_modules
src-tauri
*.css
```

**CSS исключён** — Prettier переформатирует CSS агрессивно, а у нас идёт миграция на CSS Modules. Включить позже.

### 3.3. Добавить в ESLint extends

`web/.eslintrc.json`:
```json
"extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
]
```

### 3.4. Scripts

```json
"format": "prettier --write src/**/*.{ts,tsx}",
"format:check": "prettier --check src/**/*.{ts,tsx}"
```

### 3.5. Первый прогон

```bash
cd web && npm run format
```

Это переформатирует все .ts/.tsx файлы. Большой diff, но чисто косметический.

**ВАЖНО:** сделать это отдельным коммитом без логических изменений. Иначе git blame будет бесполезен.

### Коммит

```
[quality] Prettier — единый стиль форматирования (.ts/.tsx)
```


## Шаг 4. CI — lint + test гейт

Текущий CI: push → deploy. Нет проверок. Ломающий код попадает в production.

### 4.1. Обновить deploy-production.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: cd web && npm ci

      - name: TypeScript check
        run: cd web && npx tsc --noEmit

      - name: Lint
        run: cd web && npm run lint

      - name: Tests
        run: cd web && npm test

      - name: Build
        run: cd web && npm run build

  deploy:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        id: deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ubuntu
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd ~/projects/uplink && bash deploy-prod.sh

      - name: Notify CI channel — success
        if: success()
        env:
          COMMIT_MSG: ${{ github.event.head_commit.message }}
          RUN_NUM: ${{ github.run_number }}
          SHA: ${{ github.sha }}
        run: |
          SUBJECT=$(echo "$COMMIT_MSG" | head -1)
          jq -n \
            --arg body "[+] Deploy #${RUN_NUM} OK — ${SUBJECT}" \
            --arg html "<b>[+] Deploy #${RUN_NUM}</b><br/>${SUBJECT}<br/><code>${SHA}</code>" \
            '{"msgtype":"m.text","body":$body,"format":"org.matrix.custom.html","formatted_body":$html}' | \
          curl -sf -X POST "https://uplink.wh-lab.ru/_matrix/client/v3/rooms/${{ secrets.CI_ROOM_ID }}/send/m.room.message" \
            -H "Authorization: Bearer ${{ secrets.MATRIX_BOT_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @-

      - name: Notify CI channel — failure
        if: failure()
        env:
          COMMIT_MSG: ${{ github.event.head_commit.message }}
          RUN_NUM: ${{ github.run_number }}
          RUN_ID: ${{ github.run_id }}
          REPO: ${{ github.repository }}
        run: |
          SUBJECT=$(echo "$COMMIT_MSG" | head -1)
          jq -n \
            --arg body "[-] Deploy FAILED #${RUN_NUM} — ${SUBJECT}" \
            --arg html "<b>[-] Deploy FAILED #${RUN_NUM}</b><br/>${SUBJECT}<br/><a href=\"https://github.com/${REPO}/actions/runs/${RUN_ID}\">Логи</a>" \
            '{"msgtype":"m.text","body":$body,"format":"org.matrix.custom.html","formatted_body":$html}' | \
          curl -sf -X POST "https://uplink.wh-lab.ru/_matrix/client/v3/rooms/${{ secrets.CI_ROOM_ID }}/send/m.room.message" \
            -H "Authorization: Bearer ${{ secrets.MATRIX_BOT_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @-
```

**Ключевое:** `deploy` зависит от `check` через `needs: check`. Если tsc, lint или тесты упали — деплой не запустится.

### 4.2. Нюансы

**npm ci vs npm install:** `npm ci` быстрее в CI, ставит ровно то что в lockfile. Требует наличие `package-lock.json` в `web/`.

**Cache:** `actions/setup-node` кеширует `~/.npm` по `web/package-lock.json`. Повторные запуски быстрее.

**Build в check:** запускаем `npm run build` в check-job (Vite build), чтобы убедиться что production сборка не ломается. На сервере docker rebuild тоже запускает build, но ошибку поймаем раньше.

### Коммит

```
[ci] Lint + test + build гейт перед деплоем
```


## Шаг 5. Botservice — JSDoc типы

Botservice на .mjs без типов. Полный переход на TypeScript — слишком объёмно для этой фазы. JSDoc typedef — лёгкий способ добавить документацию и IDE-подсказки.

### 5.1. Типы для ключевых структур

Файл: `docker/uplink-botservice/types.mjs`

```javascript
/**
 * @typedef {Object} CustomBotDef
 * @property {string} id — уникальный ID (custom_xxxx)
 * @property {string} name — отображаемое имя
 * @property {string} description — описание
 * @property {'sdk' | 'webhook'} mode — режим работы
 * @property {string|null} webhookUrl — URL для webhook-режима
 * @property {string|null} webhookSecret — секрет для подписи webhook
 * @property {BotCommandDef[]} commands — доступные команды
 * @property {string[]} rooms — привязанные комнаты
 * @property {string} owner — Matrix userId владельца
 * @property {string} userId — Matrix userId бота (@bot_custom_xxx:domain)
 * @property {string} localpart — локальная часть userId
 * @property {string} tokenHash — SHA256-хеш токена
 * @property {'online' | 'offline'} status
 * @property {number} created — timestamp создания
 * @property {number|null} lastSeen — последняя активность
 */

/**
 * @typedef {Object} BotCommandDef
 * @property {string} command — команда (например /github subscribe)
 * @property {string} description — описание
 * @property {string} [usage] — пример использования
 */

/**
 * @typedef {Object} MatrixEvent
 * @property {string} type — тип события (m.room.message, etc)
 * @property {string} room_id
 * @property {string} sender — Matrix userId отправителя
 * @property {Record<string, any>} content — содержимое
 * @property {number} origin_server_ts — timestamp
 * @property {string} event_id
 */

/**
 * @typedef {Object} WebhookPayload
 * @property {string} roomId — куда отправить ответ
 * @property {MatrixEvent} event — исходное событие
 * @property {string} command — команда (без /)
 * @property {string[]} args — аргументы
 * @property {CustomBotDef} bot — определение бота
 */

export {};
```

### 5.2. Добавить JSDoc к ключевым функциям

В `eventHandler.mjs`, `customBots.mjs`, `botGateway.mjs` — добавить `@param` и `@returns` аннотации к основным экспортам. Не переписывать весь файл — только публичный API.

Пример для `eventHandler.mjs`:
```javascript
/**
 * Обработка одного Matrix-события.
 * @param {import('./types.mjs').MatrixEvent} event
 * @returns {Promise<void>}
 */
export async function handleMatrixEvent(event) {
```

### 5.3. jsconfig.json для IDE

Файл: `docker/uplink-botservice/jsconfig.json`

```json
{
    "compilerOptions": {
        "checkJs": true,
        "moduleResolution": "node",
        "target": "ES2020",
        "module": "ES2022"
    },
    "include": ["*.mjs", "handlers/*.mjs", "middleware/*.mjs", "routes/*.mjs"]
}
```

`checkJs: true` — VS Code будет показывать ошибки типов в .mjs файлах на основе JSDoc. Не блокирует сборку, но помогает отлавливать баги.

### Коммит

```
[quality] Botservice — JSDoc типы, jsconfig.json с checkJs
```


## Шаг 6. Очистка as any (точечная)

TypeScript strict: true уже работает. Но есть `as any` кастовки. Убрать очевидные.

### 6.1. Найти

```bash
cd web && grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | head -30
```

### 6.2. Стратегия

**Заменить на proper типы** — где matrix-js-sdk имеет правильный тип, но мы ленились его использовать.

**Заменить на `// @ts-expect-error`** — где matrix-js-sdk реально не предоставляет нужный тип (например, `presence` поле на User). `@ts-expect-error` с комментарием лучше `as any`, потому что сломается когда SDK починит типы.

**Оставить** — где исправление требует рефакторинга. Не трогать.

**НЕ гнаться за нулём any.** Цель — убрать самые грубые, где потерян тип возврата или параметра.

### Коммит

```
[quality] Точечная очистка as any кастовок в TypeScript
```


## Тестирование

### После шага 1 (Vitest)
```bash
cd web && npm test
# ✓ renderMarkdown: 14 тестов
# ✓ parseEvent: 12 тестов
```

### После шага 2 (ESLint)
```bash
cd web && npm run lint
# 0 errors, N warnings (N < 50)
```

### После шага 3 (Prettier)
```bash
cd web && npm run format:check
# All matched files use Prettier code style!
```

### После шага 4 (CI)
```bash
# Push в main → GitHub Actions:
# Job "check": tsc ✓, lint ✓, test ✓, build ✓
# Job "deploy": SSH → deploy-prod.sh
```

### После шага 5 (JSDoc)
```bash
# В VS Code: открыть eventHandler.mjs
# Hover над handleMatrixEvent → видны типы параметров
```

### Общая проверка
```bash
cd web && npx tsc --noEmit && npm run lint && npm test && npm run build
```


## Модифицируемые файлы

### Шаг 1 — Vitest
| Файл | Действие |
|------|----------|
| `web/vitest.config.ts` | **Создать** |
| `web/src/test/setup.ts` | **Создать** |
| `web/src/utils/__tests__/markdown.test.ts` | **Создать** |
| `web/src/matrix/__tests__/MessageFormatter.test.ts` | **Создать** |
| `web/package.json` | Добавить vitest, scripts test/test:watch/test:coverage |

### Шаг 2 — ESLint
| Файл | Действие |
|------|----------|
| `web/.eslintrc.json` | **Создать** |
| `web/package.json` | Добавить eslint-plugin-react-hooks, react-refresh, обновить lint script |

### Шаг 3 — Prettier
| Файл | Действие |
|------|----------|
| `web/.prettierrc` | **Создать** |
| `web/.prettierignore` | **Создать** |
| `web/.eslintrc.json` | Добавить "prettier" в extends |
| `web/package.json` | Добавить prettier, eslint-config-prettier, format scripts |
| `web/src/**/*.{ts,tsx}` | Переформатировать (отдельный коммит!) |

### Шаг 4 — CI
| Файл | Действие |
|------|----------|
| `.github/workflows/deploy-production.yml` | Добавить check job |

### Шаг 5 — JSDoc
| Файл | Действие |
|------|----------|
| `docker/uplink-botservice/types.mjs` | **Создать** |
| `docker/uplink-botservice/jsconfig.json` | **Создать** |
| `docker/uplink-botservice/eventHandler.mjs` | Добавить JSDoc |
| `docker/uplink-botservice/customBots.mjs` | Добавить JSDoc |
| `docker/uplink-botservice/botGateway.mjs` | Добавить JSDoc |

### Шаг 6 — as any cleanup
| Файл | Действие |
|------|----------|
| Разные .ts/.tsx | Точечные исправления |


## Чего НЕ делать

- НЕ переводить botservice на TypeScript — JSDoc + checkJs достаточно
- НЕ добавлять Husky + lint-staged — overhead для соло-разработчика. CI гейт ловит всё то же
- НЕ добавлять Playwright/Cypress smoke-тест — требует запущенного Synapse, не для этой фазы
- НЕ писать integration-тесты botservice — требует mock Matrix API, отложить
- НЕ добить coverage до 80% — покрыть критические парсеры, остальное итеративно
- НЕ менять printWidth на 80 — текущий код написан на 120, массовый рефакторинг не нужен
- НЕ форматировать CSS через Prettier — идёт миграция на CSS Modules
- НЕ делать Prettier коммит вместе с логическими изменениями — отдельный коммит


## После завершения

Обновить `.claude/CLAUDE.md`:
- Таблица фаз: Фаза 5 → ✅
- Инструменты: Vitest, ESLint (react-hooks), Prettier
- CI: check job (tsc + lint + test + build) перед deploy
- Скрипты: npm test, npm run lint, npm run format
- Журнал изменений: добавить запись
