import * as vscode from 'vscode';
import { inDebugMode } from '.';

let channel: vscode.LogOutputChannel;

export function init(): vscode.Disposable {
    channel = vscode.window.createOutputChannel('Project Timer', { log: true });
    channel.info('Logger initialized.');
    return channel;
}

export function debug(message: string) {
    if (inDebugMode()) {
        channel.debug(message);
    }
    console.debug(`[Project Timer] ${message}`);
}

export function log(message: string) {
    if (inDebugMode()) {
        channel.info(message);
    }
    console.log(`[Project Timer] ${message}`);
}

export function warn(message: string) {
    if (inDebugMode()) {
        channel.warn(message);
    }
    console.warn(`[Project Timer] ${message}`);
}

export function error(message: string | Error) {
    let output: string;
    if (message instanceof Error) {
        output = `${message.message}\n${message.stack}`;
    } else {
        const stack = new Error().stack?.split('\n').slice(2).join('\n');
        output = `${message}\n${stack}`;
    }
    if (inDebugMode()) {
        channel.error(output);
    }
    console.error(`[Project Timer] ${output}`);
}
