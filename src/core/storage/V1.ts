import * as vscode from 'vscode';
import * as context from '../../utils/context';

/**
 * @module storage/V1
 * The version 1 of data structure and storage functions.
 */

const cache = new Map<string, ProjectTimeInfo>(); // key -> timeInfo
let lastFlush = Date.now();

interface DailyRecord {
    seconds: number;
    languages: Record<string, number>;
    files: Record<string, number>;
}

export function constructDailyRecord(): DailyRecord {
    return { seconds: 0, languages: {}, files: {} };
}

/**
 * The core data structure to store records for single project.
 * CAUTION: This data sturcture does not support synchronization!
 * 
 * Storaged at globalState[`timerStorage-${projectName}`]
 */
interface ProjectTimeInfo {
    readonly projectName: string;
    history: Record<string, DailyRecord>;
}

export function init(): vscode.Disposable {
    return {
        dispose: () => {
            flush();
        }
    };
}

export function calculateTotalSeconds(info: ProjectTimeInfo): number {
    let total = 0;
    for (const record of Object.values(info.history)) {
        total += record.seconds;
    }
    return total;
}

export function get(projectName: string): ProjectTimeInfo {
    const ctx = context.get();
    const key = `timerStorage-${projectName}`;
    if (cache.has(key)) {
        return cache.get(key)!;
    }
    const timeInfo = ctx.globalState.get<ProjectTimeInfo>(key) || { projectName, history: {} };
    cache.set(key, timeInfo);
    return timeInfo;
}

export function set(projectName: string, timeInfo: ProjectTimeInfo) {
    const key = `timerStorage-${projectName}`;
    cache.set(key, timeInfo);
    if (Date.now() - lastFlush > 60 * 1000) { // flush every 5 seconds
        flush();
    }
}

export function flush() {
    for (const [key, timeInfo] of cache.entries()) {
        const ctx = context.get();
        ctx.globalState.update(key, timeInfo);
    }
    lastFlush = Date.now();
}

export function deleteAll() {
    // 1. delete cache
    cache.clear();
    lastFlush = Date.now();
    // 2. delete from global state
    const ctx = context.get();
    ctx.globalState.keys().forEach(key => {
        ctx.globalState.update(key, undefined);
    });
}

export function exportAll() {
    flush();
    const ctx = context.get();
    const allData: Record<string, ProjectTimeInfo> = {};
    ctx.globalState.keys().forEach(key => {
        const data = ctx.globalState.get<ProjectTimeInfo>(key);
        if (data) {
            allData[key] = data;
        }
    });
    return allData;
}

export function importAll(data: Record<string, ProjectTimeInfo>) {
    flush();
    cache.clear();
    const ctx = context.get();
    for (const [key, timeInfo] of Object.entries(data)) {
        ctx.globalState.update(key, timeInfo);
    }
}