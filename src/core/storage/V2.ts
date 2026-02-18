import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as os from 'os';
import { ProjectTimeInfo } from './V1';
import { getFolderName, getFolderParentPath, todayDate, strictEq } from "../../utils";
import * as context from '../../utils/context';

/**
 * @module storage/V2
 * The version 2 of data structure and storage functions.
 */

/**
 * Metadata for project matching.
 */
interface MatchInfo {
    // Priority from high to low
    gitRemotUrl?: string;
    parentPath?: string; // allow undefined only for V1-migrated data
    folderName: string;
}

function matchInfoEq(left: MatchInfo, right: MatchInfo): boolean {
    if (left.gitRemotUrl !== right.gitRemotUrl) {
        return false;
    }
    if (left.parentPath !== right.parentPath) {
        return false;
    }
    if (left.folderName !== right.folderName) {
        return false;
    }
    return true;
}

/**
 * Check if data matched the current info in a strict way.
 * If matched, check if there are difference that need to be update.
 * Call it when you want to check if current project 'is' the old project from same device (local).
 * @returns [isMatch, needUpdate]
 */
function matchLocal(old: MatchInfo, current: MatchInfo): [boolean, boolean] {
    // Case 1: V1 compatible
    if (old.parentPath === undefined && old.gitRemotUrl === undefined) {
        // old is V1 migrated data
        if (old.folderName === current.folderName) {
            return [true, true];
        }
        // cannot confirm if they are the same project
        return [false, false];
    }
    // Case 2: equals
    if (matchInfoEq(old, current)) {
        return [true, false];
    }
    // Case 3: only add stronger info
    if (!old.gitRemotUrl && current.gitRemotUrl &&
        strictEq(old.parentPath, current.parentPath) &&
        old.folderName === current.folderName
    ) {
        return [true, true];
    }
    // Case 4: rename or move but keep the git remote url
    if (old.gitRemotUrl && current.gitRemotUrl &&
        old.gitRemotUrl === current.gitRemotUrl
    ) {
        return [true, true];
    }
    // Case 5: remane folder
    if (!(old.gitRemotUrl && current.gitRemotUrl && old.gitRemotUrl !== current.gitRemotUrl) &&
        strictEq(old.parentPath, current.parentPath) &&
        old.folderName !== current.folderName
    ) {
        return [true, true];
    }
    // Others: keep the old data
    return [false, false];
}

/**
 * Check if data matched the current info in a loose way.
 * Call it when you want to check if data from other device (remote) can be counted as the same project.
 */
function matchRemote(remote: MatchInfo, current: MatchInfo): boolean {
    if (strictEq(remote.gitRemotUrl, current.gitRemotUrl)) {
        return true;
    }
    // Avoid compare absolute path throught different devices
    if (remote.folderName === current.folderName) {
        return true;
    }
    return false;
}

function getCurrentMatchInfo(): MatchInfo {
    const folderName = getFolderName();
    if (!folderName) {
        throw new Error("No folder name found.");
    }
    const parentPath = getFolderParentPath();
    if (!parentPath) {
        throw new Error("No folder parent path found.");
    }
    // TODO: support full match info
    return {
        folderName: folderName,
        parentPath: parentPath,
        gitRemotUrl: undefined
    };
}

/**
 * Record data in single day.
 */
interface DailyRecord {
    seconds: number; // Only store the seconds on this device
    languages: Record<string, number>;
    files: Record<string, number>;
}

export function constructDailyRecord(): DailyRecord {
    return { seconds: 0, languages: {}, files: {} };
}

/**
 * The self descriped data structure of data produced by one device and related to one project.
 * It should be atomic and has no relation with other key-value pairs, in order to gurantee consistancy and atomicity.
 * This data structure does not support multi-root workspaces.
 * 
 * Storaged at globalState[`timerStorageV2-{deviceId}-{projectUUID}`]
 */
interface DeviceProjectData {
    readonly deviceId: string;
    readonly projectUUID: string;

    displayName: string;
    deviceName?: string;

    matchInfo: MatchInfo;
    history: Record<string, DailyRecord>; // date -> dailyRecord data
}

function getDeviceProjectDataKey(deviceId: string, projectUUID: string): string {
    return `timerStorageV2-${deviceId}-${projectUUID}`;
}

function mergeHistory(a: Record<string, DailyRecord>, b: Record<string, DailyRecord>): Record<string, DailyRecord> {
    const merged: Record<string, DailyRecord> = JSON.parse(JSON.stringify(a));
    for (const [date, sourceRecord] of Object.entries(b)) {
        if (!merged[date]) {
            merged[date] = constructDailyRecord();
        }
        const targetRecord = merged[date];
        targetRecord.seconds += sourceRecord.seconds;

        // merge languages
        for (const [lang, sec] of Object.entries(sourceRecord.languages)) {
            targetRecord.languages[lang] = (targetRecord.languages[lang] || 0) + sec;
        }

        // merge files
        for (const [file, sec] of Object.entries(sourceRecord.files)) {
            targetRecord.files[file] = (targetRecord.files[file] || 0) + sec;
        }
    }
    return merged;
}

function migrateV1Data(V1data: ProjectTimeInfo) {
    const projectUUID = crypto.randomUUID();
    const deviceId = vscode.env.machineId;
    const deviceProjectData: DeviceProjectData = {
        deviceId: deviceId,
        projectUUID: projectUUID,
        displayName: V1data.project_name,
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
    console.log(`Migrating V1 data to V2...`);
    const ctx = context.get();
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorage-`)) {
            const data = ctx.globalState.get<ProjectTimeInfo>(key);
            if (data) {
                const deviceProjectData = migrateV1Data(data);
                set(deviceProjectData);
            }
        }
    }
    console.log(`Migration complete. Delete old V1 data.`);
    removeAllV1Data();
    console.log(`Delete success.`);
    return {
        dispose: () => { } // nothing todo for now
    };
}

/**
 * Get data for current project, current device.
 */
export function get(): DeviceProjectData {
    const matchInfo = getCurrentMatchInfo();
    const deviceId = vscode.env.machineId;
    const ctx = context.get();
    // traverse all v2 data in globalstate to find the match one
    const matched: DeviceProjectData[] = [];
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-${deviceId}-`)) {
            let data = ctx.globalState.get(key) as DeviceProjectData;
            const [isMatch, needUpdate] = matchLocal(data.matchInfo, matchInfo);
            if (isMatch) {
                if (data.deviceName === undefined || data.deviceName !== os.hostname()) {
                    data.deviceName = os.hostname();
                    set(data);
                }
                if (needUpdate) {
                    data.matchInfo = matchInfo;
                    data.displayName = matchInfo.folderName;
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
            displayName: matchInfo.folderName,
            deviceName: os.hostname(),
            matchInfo: matchInfo,
            history: {}
        };
        set(data);
        return data;
    }
    else if (matched.length === 1) {
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
            const key = getDeviceProjectDataKey(matched[i].deviceId, matched[i].projectUUID);
            const ctx = context.get();
            ctx.globalState.update(key, undefined);
        }
        // 3. update match info
        merged.matchInfo = getCurrentMatchInfo();
        merged.displayName = getCurrentMatchInfo().folderName;
        set(merged);
        return merged;
    }
}

export function set(data: DeviceProjectData) {
    const ctx = context.get();
    const key = getDeviceProjectDataKey(data.deviceId, data.projectUUID);
    ctx.globalState.update(key, data);
    ctx.globalState.setKeysForSync([key]);
}

export function flush() {
    // Do nothing for now
}

/** 
 * Get total seconds for current project 
 * Accumulate all data from different devices.
 */
export function getTotalSeconds(): number {
    const ctx = context.get();
    const matchInfo = getCurrentMatchInfo();
    let total = 0;
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-`)) {
            const data = ctx.globalState.get(key) as DeviceProjectData;
            if (!matchRemote(data.matchInfo, matchInfo)) {
                continue;
            }
            for (const dailyRecord of Object.values(data.history)) {
                total += dailyRecord.seconds;
            }
        }
    }
    return total;
}

/** Get today seconds for current project */
export function getTodaySeconds(): number {
    const ctx = context.get();
    const matchInfo = getCurrentMatchInfo();
    let total = 0;
    const today = todayDate();
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-`)) {
            const data = ctx.globalState.get(key) as DeviceProjectData;
            if (!matchRemote(data.matchInfo, matchInfo)) {
                continue;
            }
            const dailyRecord = data.history[today];
            if (dailyRecord) {
                total += dailyRecord.seconds;
            }
        }
    }
    return total;
}

export function deleteAll() {
    const ctx = context.get();
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-`)) {
            ctx.globalState.update(key, undefined);
        }
    }
}

export function exportAll() {
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
export function importAll(data: Record<string, DeviceProjectData | ProjectTimeInfo>) {
    const ctx = context.get();
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(`timerStorage-`)) { // V1
            const deviceProjectData = migrateV1Data(value as ProjectTimeInfo);
            const newKey = getDeviceProjectDataKey(deviceProjectData.deviceId, deviceProjectData.projectUUID);
            ctx.globalState.update(newKey, deviceProjectData);
            ctx.globalState.setKeysForSync([newKey]);
        } else if (key.startsWith(`timerStorageV2-`)) { // V2
            ctx.globalState.update(key, value);
            ctx.globalState.setKeysForSync([key]);
        } else {
            throw Error(`Unexpected key: ${key}`);
        }
    }
}