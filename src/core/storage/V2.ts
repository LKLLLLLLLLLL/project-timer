import * as vscode from 'vscode';
import { getFolderName, getFolderParentPath, todayDate } from "../../utils";
import * as context from '../../utils/context';
import * as crypto from 'crypto';

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
    parentPath: string; // the parent of project folder
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
    // Case 1: equals
    if (matchInfoEq(old, current)) {
        return [true, false];
    }
    // Case 2: only add stronger info
    if (!old.gitRemotUrl && current.gitRemotUrl &&
        old.parentPath === current.parentPath &&
        old.folderName === current.folderName
    ) {
        return [true, true];
    }
    // Case 3: rename or move but keep the git remote url
    if (old.gitRemotUrl && current.gitRemotUrl &&
        old.gitRemotUrl === current.gitRemotUrl
    ) {
        return [true, true];
    }
    // Case 4: remane folder
    if (!(old.gitRemotUrl && current.gitRemotUrl && old.gitRemotUrl !== current.gitRemotUrl) &&
        old.parentPath === current.parentPath &&
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
    if (remote.gitRemotUrl && current.gitRemotUrl &&
        remote.gitRemotUrl === current.gitRemotUrl
    ) {
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

    displayName: string

    matchInfo: MatchInfo
    history: Record<string, DailyRecord> // date -> dailyRecord data
}

function getDeviceProjectDataKey(deviceId: string, projectUUID: string): string {
    return `timerStorageV2-${deviceId}-${projectUUID}`;
}

function migrageV1Data() {
}

export function init(): vscode.Disposable {
    console.log(`Migrating V1 data to V2...`);
    // TODO: scan and migrage V1Data
    console.log(`Migration complete. Delete old V1 data.`);
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
    for (const key of ctx.globalState.keys()) {
        if (key.startsWith(`timerStorageV2-${deviceId}-`)) {
            let data = ctx.globalState.get(key) as DeviceProjectData;
            const [isMatch, needUpdate] = matchLocal(data.matchInfo, matchInfo);
            if (isMatch) {
                if (needUpdate) {
                    data.matchInfo = matchInfo;
                    data.displayName = matchInfo.folderName;
                    set(data);
                }
                return data;
            }
        }
    }
    // not found, create new one
    const projectUUID = crypto.randomUUID();
    const data: DeviceProjectData = {
        deviceId: deviceId,
        projectUUID: projectUUID,
        displayName: matchInfo.folderName, // TODO: support more name option
        matchInfo: matchInfo,
        history: {}
    };
    set(data);
    return data;
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

export function importAll(data: Record<string, DeviceProjectData>) {
    const ctx = context.get();
    for (const [key, value] of Object.entries(data)) {
        ctx.globalState.update(key, value);
        ctx.globalState.setKeysForSync([key]);
    }
}