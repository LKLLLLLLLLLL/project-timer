import * as vscode from 'vscode';
import * as timer from '../core/timer';
import { getFolderName } from '../utils';
import * as config from '../utils/config';
import * as storage from '../core/storage';
import { addMenu } from './menu';
import { STATUS_BAR_UPDATE_INTERVAL_MS } from '../constants';

type Precision = 'second' | 'minute' | 'hour';

let lastStatusBarText = '';
let statusBarItem: vscode.StatusBarItem;
let lastPrecision: Precision | undefined;
let statusBarTimeout: NodeJS.Timeout | undefined;

/** 
 * Get 'displayPrecision' from config and convert it into Precision.
 * This will automatically calculate 'auto' to concrete precision type.
 */
function getPrecision(seconds: number): Precision {
    const cfg = config.get();
    if (cfg.statusBar.displayPrecision === "auto") {
        if (seconds < 3600) {
            return "second";
        } else {
            return "minute";
        }
    }
    return cfg.statusBar.displayPrecision;
}

function formatSeconds(seconds: number): string {
    let displayPrecision = getPrecision(seconds);
    let buf = '';
    switch (displayPrecision) {
        case "second": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs.toFixed(0)}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            if (mins > 0) {
                buf += `${mins.toFixed(0)}m `;
            }
            const secs = seconds % 60;
            buf += `${secs.toFixed(0)}s`; // last digit must be displayed
            return buf.trim();
        }
        case "minute": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs.toFixed(0)}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            buf += `${mins.toFixed(0)}m `; // last digit must be displayed
            return buf.trim();
        }
        case "hour": {
            const hrs = Math.floor(seconds / 3600);
            return `${hrs.toFixed(0)}h`;
        }
        default: {
            console.error(`Unknown display precision: ${config.get().statusBar.displayPrecision}`);
            throw new Error(`Unknown display precision: ${config.get().statusBar.displayPrecision}`);
        }
    }
}

function update() {
    if (getFolderName() === undefined) { // no folder is opened
        console.log("No project folder opened");
        statusBarItem.hide();
        return;
    }
    const cfg = config.get();
    if (!cfg.statusBar.enabled) {
        statusBarItem.hide();
        return;
    };
    // 1. update status bar text
    let statusBarText = '';
    if (cfg.statusBar.displayProjectName) {
        const project_name = storage.getProjectName();
        statusBarText += `${project_name}: `;
    }
    switch (cfg.statusBar.displayTimeMode) {
        case "today": {
            const todaySeconds = storage.getTodayLocalSeconds();
            statusBarText += `${formatSeconds(todaySeconds)}`;
            break;
        }
        case "total": {
            const totalSeconds = storage.getTotalSeconds();
            statusBarText += `${formatSeconds(totalSeconds)}`;
            break;
        }
        case "both": {
            const totalSeconds = storage.getTotalSeconds();
            const todaySeconds = storage.getTodayLocalSeconds();
            statusBarText += `${formatSeconds(todaySeconds)} / ${formatSeconds(totalSeconds)}`;
            break;
        }
    }
    if (timer.isRunning()) {
        statusBarText = `$(clockface) ${statusBarText}`;
    } else {
        statusBarText = `$(coffee) ${statusBarText}`;
    }
    if (statusBarText !== lastStatusBarText) {
        lastStatusBarText = statusBarText;
        statusBarItem.text = statusBarText;
    }
    // 2. update hover menu
    addMenu(statusBarItem);
    // 3. add click event
    statusBarItem.command = 'project-timer.openStatistics';
    statusBarItem.show();
}

function registerInterval(precision: Precision) {
    update(); // update for the first time
    if (statusBarTimeout) {
        clearTimeout(statusBarTimeout);
    }
    let refreshInterval: number; // in milisecond
    switch (precision) {
        case 'hour': {
            refreshInterval = STATUS_BAR_UPDATE_INTERVAL_MS.hour;
            break;
        }
        case 'minute': {
            refreshInterval = STATUS_BAR_UPDATE_INTERVAL_MS.minute;
            break;
        }
        case 'second': {
            refreshInterval = STATUS_BAR_UPDATE_INTERVAL_MS.second;
            break;
        }
        default: {
            throw new Error(`Unknown display precision: ${precision}`);
        }
    }
    statusBarTimeout = setInterval(() => {
        update();
        const currentPrecision = getPrecision(Math.min(storage.getTotalSeconds(), storage.getTodayLocalSeconds()));
        if (lastPrecision === undefined) {
            lastPrecision = currentPrecision;
        } else { // check if precision changed, if changed update interval
            if (currentPrecision !== lastPrecision) {
                console.log(`Display precision changed from ${lastPrecision} to ${currentPrecision}`);
                lastPrecision = currentPrecision;
                registerInterval(currentPrecision);
                return;
            }
        }
    }, refreshInterval);
}

export function activate(): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    // 1. create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        200
    );
    disposables.push(statusBarItem);
    // 2. register updater
    // update when config is changed
    disposables.push(vscode.workspace.onDidChangeConfiguration(change => { // listen config change
        if (change.affectsConfiguration('project-timer.statusBar')) {
            registerInterval(getPrecision(Math.min(storage.getTotalSeconds(), storage.getTodayLocalSeconds())));
        }
    }));
    // update when running state changed
    disposables.push(timer.onDidChangeRunningState(() => {
        update();
    }));
    // update periodically
    registerInterval(getPrecision(Math.min(storage.getTotalSeconds(), storage.getTodayLocalSeconds())));
    disposables.push({
        dispose: () => {
            if (statusBarTimeout) {
                clearTimeout(statusBarTimeout);
            }
        }
    });
    return vscode.Disposable.from(...disposables);
}