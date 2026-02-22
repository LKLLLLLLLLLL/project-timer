import * as vscode from 'vscode';

let logger: vscode.LogOutputChannel;

export function init(): vscode.Disposable {
    logger = vscode.window.createOutputChannel('Project Timer', { log: true });
    logger.info('Logger initialized.');
    // logger.show(); 
    return logger;
}

export function log(message: string) {
    logger.info(message);
    console.log(`[Project Timer] ${message}`);
}

export function warn(message: string) {
    logger.warn(message);
    console.warn(`[Project Timer] ${message}`);
}

export function error(message: string) {
    logger.error(message);
    console.error(`[Project Timer] ${message}`);
}
