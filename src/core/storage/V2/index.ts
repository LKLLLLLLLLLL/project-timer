import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as os from 'os';

import { ProjectTimeInfo } from '../V1';
import { copy } from '../../../utils';
import * as context from '../../../utils/context';

import { DeviceProjectData, mergeHistory, getDeviceProjectDataKey, constructDailyRecord } from './deviceProjectData';
import { getCurrentMatchInfo, matchInfoEq, matchLocal, init as matchInfoInit } from './matchInfo';
import { getTotalSeconds, getTodaySeconds, getTodayLocalSeconds } from './calculator';
import { FLUSH_INTERVAL_MS } from '../../../constants';

/**
 * @module storage/V2
 * The version 2 of data structure and storage functions.
 */

let _cache: DeviceProjectData | undefined;
let lastFlush: number = Date.now();

export { constructDailyRecord, getTodaySeconds, getTotalSeconds, getTodayLocalSeconds };

function migrateV1Data(V1data: ProjectTimeInfo) {
    const projectUUID = crypto.randomUUID();
    const deviceId = vscode.env.machineId;
    const deviceProjectData: DeviceProjectData = {
        deviceId: deviceId,
        projectUUID: projectUUID,
        displayName: undefined,
        deviceName: os.hostname(),
        matchInfo: {
            folderName: V1data.project_name,
            parentPath: undefined,
            gitRemotUrl: undefined
        },
        history: V1data.history
    };
    return deviceProjectData;
}

function removeAllV1Data() {
    const ctx = context.get();
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorage-`)) {
            ctx.globalState.update(key, undefined);
        }
    }
}

export function init(): vscode.Disposable {
    // 1. migrate V1 data
    console.log(`Migrating V1 data to V2...`);
    const ctx = context.get();
    let migratedCount = 0;
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorage-`)) {
            const data = ctx.globalState.get<ProjectTimeInfo>(key);
            if (data) {
                const deviceProjectData = migrateV1Data(data);
                set(deviceProjectData);
                migratedCount++;
            }
        }
    }
    if (migratedCount > 0) {
        console.log(`Migration complete. Migrated ${migratedCount} items.`);
        console.log(`Deleting old V1 data...`);
        removeAllV1Data();
        console.log(`Delete success.`);
    } else {
        console.log(`Nothing to migrate.`);
    }
    // 2. init match info cache
    const matchInfoDisposable = matchInfoInit();
    return {
        dispose: () => {
            flush();
            matchInfoDisposable.dispose();
        }
    };
}

function updateSyncKeys() {
    const ctx = context.get();
    const keys: string[] = [];
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-`)) {
            keys.push(key);
        }
    }
    ctx.globalState.setKeysForSync(keys);
}

/**
 * Get data for current project, current device.
 */
export function get(): DeviceProjectData {
    const matchInfo = getCurrentMatchInfo();
    // check cache
    if (_cache) {
        // cache hit
        const cacheMatchInfo = _cache.matchInfo;
        if (!matchLocal(cacheMatchInfo, matchInfo)) {
            throw new Error(`Cache mismatch: expected ${JSON.stringify(cacheMatchInfo)}, got ${JSON.stringify(matchInfo)}`);
        }
        if (!matchInfoEq(cacheMatchInfo, matchInfo)) {
            // need update match info
            _cache.matchInfo = matchInfo;
            set(_cache);
        }
        return _cache;
    }
    const deviceId = vscode.env.machineId;
    const ctx = context.get();
    // traverse all v2 data in globalstate to find the match one
    const matched: DeviceProjectData[] = [];
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-${deviceId}-`)) {
            let data = ctx.globalState.get(key) as DeviceProjectData;
            if (matchLocal(data.matchInfo, matchInfo)) {
                if (data.deviceName === undefined || data.deviceName !== os.hostname()) {
                    data.deviceName = os.hostname();
                    set(data);
                }
                if (!matchInfoEq(data.matchInfo, matchInfo)) {
                    // need update match info
                    data.matchInfo = matchInfo;
                    set(data);
                }
                matched.push(data);
            }
        }
    }
    if (matched.length === 0) {
        // not found, create new one
        const projectUUID = crypto.randomUUID();
        const data: DeviceProjectData = {
            deviceId: deviceId,
            projectUUID: projectUUID,
            displayName: undefined,
            deviceName: os.hostname(),
            matchInfo: matchInfo,
            history: {}
        };
        set(data);
        _cache = data;
        return data;
    }
    else if (matched.length === 1) {
        _cache = matched[0];
        return matched[0];
    } else {
        // found more than 1, need merge
        const merged = matched[0];
        // 1. merge all
        for (let i = 1; i < matched.length; i++) {
            merged.history = mergeHistory(merged.history, matched[i].history);
        }
        // 2. delete remains
        for (let i = 1; i < matched.length; i++) {
            const key = getDeviceProjectDataKey(matched[i]);
            const ctx = context.get();
            ctx.globalState.update(key, undefined);
        }
        // 3. update match info
        merged.matchInfo = getCurrentMatchInfo();
        merged.displayName = getCurrentMatchInfo().folderName;
        set(merged);
        _cache = merged;
        return merged;
    }
}

export function set(data: DeviceProjectData) {
    if (data.deviceId !== vscode.env.machineId) {
        throw new Error(`Device ID mismatch: expected ${vscode.env.machineId}, got ${data.deviceId}`);
    }
    _cache = data;
    if (Date.now() - lastFlush > FLUSH_INTERVAL_MS) {
        flush(); // Do not await to avoid color function problem
    }
}

export async function flush() {
    let data = _cache;
    if (!data) {
        console.warn(`Warning: No data to flush!`);
        return;
    }
    data = copy(data);
    const ctx = context.get();
    const key = getDeviceProjectDataKey(data);
    try {
        await ctx.globalState.update(key, data);
        updateSyncKeys();
        lastFlush = Date.now();
        _cache = undefined; // Force merge procedure on next get
        console.log(`Flush successfully!`);
    } catch (error: any) {
        console.error(`Error flushing V2 storage: ${error}`);
    }
}


export function getProjectName(): string {
    const data = get();
    return data.displayName || data.matchInfo.folderName;
}

export async function deleteAll() {
    // 1. delete cache
    _cache = undefined;
    // 2. delete from global state
    const ctx = context.get();
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-`)) {
            await ctx.globalState.update(key, undefined);
        }
    }
}

export async function exportAll() {
    await flush();
    const ctx = context.get();
    const data: Record<string, DeviceProjectData> = {};
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-`)) {
            data[key] = ctx.globalState.get(key) as DeviceProjectData;
        }
    }
    return data;
}

/**
 * This function should support both V1 and V2 json from user.
 * Multi import on V2 file is safe, the new one will replace the old one.
 * But on V1 file, all data may be merged together. 
 */
export async function importAll(data: Record<string, DeviceProjectData | ProjectTimeInfo>) {
    await flush();
    _cache = undefined;
    const ctx = context.get();
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(`timerStorage-`)) { // V1
            const deviceProjectData = migrateV1Data(value as ProjectTimeInfo);
            const newKey = getDeviceProjectDataKey(deviceProjectData);
            await ctx.globalState.update(newKey, deviceProjectData);
        } else if (key.startsWith(`timerStorageV2-`)) { // V2
            await ctx.globalState.update(key, value);
        } else {
            throw Error(`Unexpected key: ${key}`);
        }
    }
}

export async function renameCurrentProject(newName: string) {
    const data = get();
    if (data) {
        data.displayName = newName;
        set(data);
        flush();
    }
}