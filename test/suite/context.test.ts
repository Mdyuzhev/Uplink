import * as assert from 'assert';

suite('CodeContext', () => {
    test('модуль загружается без ошибок', () => {
        const context = require('../../src/context/codeContext');
        assert.ok(context.getCodeContext);
    });
});

suite('GitContext', () => {
    test('модуль загружается без ошибок', () => {
        const context = require('../../src/context/gitContext');
        assert.ok(context.getGitInfo);
    });
});
