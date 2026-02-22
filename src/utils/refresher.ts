import * as vscode from 'vscode';
import * as logger from './logger';
import { FORCE_REFRESH_AFTER_STARTUP_MS } from '../constants';

const callbacks: Array<() => void> = [];

export function onRefresh(callback: () => void) {
    callbacks.push(callback);
}

export function init(): vscode.Disposable {
    const timeout = setTimeout(refresh, FORCE_REFRESH_AFTER_STARTUP_MS);
    return {
        dispose: () => {
            clearTimeout(timeout);
        }
    };
}

export function refresh() {
    callbacks.forEach(callback => {
        try {
            callback();
        } catch (e) {
            logger.error(`Error in refresh callback: ${e}`);
        }
    });
}
