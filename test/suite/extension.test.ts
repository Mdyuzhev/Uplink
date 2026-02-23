import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Uplink Extension Test Suite', () => {
    test('Extension should be present', () => {
        const ext = vscode.extensions.getExtension('rostelecom-qa.uplink');
        assert.ok(ext, 'Расширение должно быть установлено');
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('uplink.openChat'), 'openChat зарегистрирована');
        assert.ok(commands.includes('uplink.sendSnippet'), 'sendSnippet зарегистрирована');
        assert.ok(commands.includes('uplink.startCall'), 'startCall зарегистрирована');
        assert.ok(commands.includes('uplink.disconnect'), 'disconnect зарегистрирована');
    });
});
