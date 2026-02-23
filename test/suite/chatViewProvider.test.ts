import * as assert from 'assert';
import { ChatViewProvider } from '../../src/providers/chatViewProvider';
import { MatrixService } from '../../src/matrix/client';

suite('ChatViewProvider Test Suite', () => {
    test('Модуль загружается', () => {
        assert.ok(ChatViewProvider, 'ChatViewProvider экспортирован');
    });

    test('Конструктор принимает extensionUri и MatrixService', () => {
        const matrixService = new MatrixService();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fakeUri = { fsPath: '/test' } as any;
        const provider = new ChatViewProvider(fakeUri, matrixService);
        assert.ok(provider, 'ChatViewProvider создан');
    });

    test('dispose не бросает ошибку без открытой панели', () => {
        const matrixService = new MatrixService();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fakeUri = { fsPath: '/test' } as any;
        const provider = new ChatViewProvider(fakeUri, matrixService);
        assert.doesNotThrow(() => provider.dispose(), 'dispose без панели не бросает');
    });
});
