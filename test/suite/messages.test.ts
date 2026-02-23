import * as assert from 'assert';
import { MessageFormatter } from '../../src/matrix/messages';

suite('MessageFormatter', () => {
    test('parseEvent возвращает null для state event', () => {
        const mockEvent = {
            getType: () => 'm.room.member',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.strictEqual(MessageFormatter.parseEvent(mockEvent as any), null);
    });

    test('parseEvent парсит текстовое сообщение', () => {
        const mockEvent = {
            getType: () => 'm.room.message',
            getId: () => '$test1',
            getSender: () => '@user:domain',
            getTs: () => 1700000000000,
            isDecryptionFailure: () => false,
            getClearContent: () => null,
            getContent: () => ({
                msgtype: 'm.text',
                body: 'Hello World',
            }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = MessageFormatter.parseEvent(mockEvent as any);
        assert.ok(result);
        assert.strictEqual(result.type, 'text');
        assert.strictEqual(result.body, 'Hello World');
        assert.strictEqual(result.sender, '@user:domain');
    });

    test('parseEvent парсит code snippet', () => {
        const mockEvent = {
            getType: () => 'm.room.message',
            getId: () => '$test2',
            getSender: () => '@dev1:uplink.local',
            getTs: () => 1700000000000,
            isDecryptionFailure: () => false,
            getClearContent: () => null,
            getContent: () => ({
                msgtype: 'm.text',
                body: 'code here',
                'dev.uplink.code_context': {
                    language: 'typescript',
                    fileName: 'src/index.ts',
                    lineStart: 1,
                    lineEnd: 10,
                },
            }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = MessageFormatter.parseEvent(mockEvent as any);
        assert.ok(result);
        assert.strictEqual(result.type, 'code');
        assert.ok(result.codeContext);
        assert.strictEqual(result.codeContext.language, 'typescript');
    });

    test('parseEvent обрабатывает decryption failure', () => {
        const mockEvent = {
            getType: () => 'm.room.encrypted',
            getId: () => '$test3',
            getSender: () => '@user:domain',
            getTs: () => 1700000000000,
            isDecryptionFailure: () => true,
            getClearContent: () => null,
            getContent: () => ({}),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = MessageFormatter.parseEvent(mockEvent as any);
        assert.ok(result);
        assert.strictEqual(result.type, 'encrypted');
    });
});
