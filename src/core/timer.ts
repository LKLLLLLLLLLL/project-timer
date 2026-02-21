import * as vscode from 'vscode';
import * as storage from './storage';
import { getCurrentFile, getCurrentLanguage, todayDate, onActive } from '../utils';
import * as config from '../utils/config';

let lastUpdate: number | undefined; // timestamp in milliseconds
const TIMER_TICK_MS = 1000; // interval between timer update
let lastActive: number = Date.now();
let lastFocused: number = Date.now();
let _isRunning = false;

const runningStateEmitter = new vscode.EventEmitter<boolean>();
export const onDidChangeRunningState = runningStateEmitter.event;

function updateRunningState(newState: boolean) {
    if (_isRunning !== newState) {
        _isRunning = newState;
        runningStateEmitter.fire(newState);
    }
}

function update() {
    if (lastUpdate === undefined) {
        lastUpdate = Date.now();
        return;
    }
    if (!checkRunning()) {
        lastUpdate = undefined;
        updateRunningState(false);
        return;
    } else {
        updateRunningState(true);
    }
    const duration = Date.now() - lastUpdate;
    lastUpdate = Date.now();
    const data = storage.get();
    // update time info
    const date = todayDate();
    if (data.history[date] === undefined) {
        data.history[date] = storage.constructDailyRecord();
    }
    // 1. update seconds
    data.history[date].seconds += duration / 1000; // convert back to seconds
    // 2. update languages
    const currentLanguage = getCurrentLanguage();
    if (currentLanguage !== undefined) {
        data.history[date].languages[currentLanguage] = (data.history[date].languages[currentLanguage] || 0) + duration / 1000;
    }
    // 3. update files
    const fileName = getCurrentFile();
    if (fileName !== undefined && !fileName.startsWith('/')) { // avoid absolute path
        data.history[date].files[fileName] = (data.history[date].files[fileName] || 0) + duration / 1000;
    }
    storage.set(data);
}

/** Detect if timer should be running */
function checkRunning(): boolean {
    // 1. check focuse
    const cfg = config.get();
    if (cfg.timer.pauseWhenUnfocused) {
        let unfocusedThresholdMs = cfg.timer.unfocusedThreshold * 60 * 1000;
        if (unfocusedThresholdMs < TIMER_TICK_MS) {
            unfocusedThresholdMs = TIMER_TICK_MS;
        }
        if (Date.now() - lastFocused > unfocusedThresholdMs) {
            return false;
        }
    }
    // 2. check idle
    if (cfg.timer.pauseWhenIdle) {
        let idleThresholdMs = cfg.timer.idleThreshold * 60 * 1000;
        if (idleThresholdMs < TIMER_TICK_MS) {
            idleThresholdMs = TIMER_TICK_MS;
        }
        if (Date.now() - lastActive > idleThresholdMs) {
            return false;
        }
    }
    return true;
}

/** Init and begin timer */
export function init(): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    const interval = setInterval(() => update(), TIMER_TICK_MS); // update every second
    disposables.push({ dispose: () => clearInterval(interval) });
    // register event listener for activity
    disposables.push(onActive(() => {
        lastActive = Date.now();
        if (vscode.window.state.focused) {
            lastFocused = Date.now();
        }
    }));
    return vscode.Disposable.from(...disposables);
}

export function isRunning(): boolean {
    return _isRunning;
}
