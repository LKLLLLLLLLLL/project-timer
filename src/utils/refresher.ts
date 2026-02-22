import * as vscode from 'vscode';
import { FORCE_REFRESH_AFTER_STARTUP_MS } from '../constants';

const callbacks: Array<() => void> = [];

export function onRefresh(callback: () => void) {
    callbacks.push(callback);
}

export function init(): vscode.Disposable {
    const timeout = setTimeout(() => {
        callbacks.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('Error in refresh callback:', e);
            }
        });
    }, FORCE_REFRESH_AFTER_STARTUP_MS);
    return {
        dispose: () => {
            clearTimeout(timeout);
        }
    };
}