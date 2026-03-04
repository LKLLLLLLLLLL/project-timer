import * as vscode from 'vscode';
import { inDebugMode } from '.';

let logger: vscode.LogOutputChannel;

export function init(): vscode.Disposable {
    logger = vscode.window.createOutputChannel('Project Timer', { log: true });
    logger.info('Logger initialized.');
    // logger.show(); 
    return logger;
}

export function debug(message: string) {
    if (inDebugMode()) {
        logger.debug(message);
    }
    console.debug(`[Project Timer] ${message}`);
}

export function log(message: string) {
    if (inDebugMode()) {
        logger.info(message);
    }
    console.log(`[Project Timer] ${message}`);
}

export function warn(message: string) {
    if (inDebugMode()) {
        logger.warn(message);
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
        logger.error(output);
    }
    console.error(`[Project Timer] ${output}`);
}
