import * as assert from 'assert';
import { MatrixService } from '../../src/matrix/client';

suite('MatrixService', () => {
    test('getRooms возвращает пустой массив до подключения', () => {
        const service = new MatrixService();
        assert.deepStrictEqual(service.getRooms(), []);
    });

    test('isConnected = false до подключения', () => {
        const service = new MatrixService();
        assert.strictEqual(service.isConnected, false);
    });

    test('matrixClient бросает ошибку до подключения', () => {
        const service = new MatrixService();
        assert.throws(() => service.matrixClient, /не инициализирован/);
    });

    test('getRoomTimeline возвращает пустой массив без клиента', () => {
        const service = new MatrixService();
        assert.deepStrictEqual(service.getRoomTimeline('!fake:room'), []);
    });

    test('getDisplayName возвращает userId без клиента', () => {
        const service = new MatrixService();
        assert.strictEqual(service.getDisplayName('@user:domain'), '@user:domain');
    });

    test('getPresence возвращает offline без клиента', () => {
        const service = new MatrixService();
        assert.strictEqual(service.getPresence('@user:domain'), 'offline');
    });
});
