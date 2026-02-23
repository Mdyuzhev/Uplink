import * as vscode from 'vscode';

/**
 * Логгер Uplink. Пишет в Output Channel.
 */
class UplinkLogger {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('Uplink');
    }

    info(message: string) {
        this.channel.appendLine(`[INFO] ${new Date().toISOString()} ${message}`);
    }

    error(message: string, error?: Error) {
        this.channel.appendLine(`[ERROR] ${new Date().toISOString()} ${message}`);
        if (error?.stack) {
            this.channel.appendLine(error.stack);
        }
    }

    warn(message: string) {
        this.channel.appendLine(`[WARN] ${new Date().toISOString()} ${message}`);
    }

    show() {
        this.channel.show();
    }

    dispose() {
        this.channel.dispose();
    }
}

export const logger = new UplinkLogger();
