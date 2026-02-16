import * as vscode from 'vscode';
import { getFolderName, getDate } from "../../utils";
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
    absolutePath?: string;
    folderName: string;
}

/**
 * Return the match level of a deviceProjectData against given match info.
 * The level is a number from 0 to 3, where 3 is the highest match level, o indecates not match.
 */
function match(
    data: DeviceProjectData,
    info: MatchInfo
): number {
    const { gitRemotUrl, absolutePath, folderName } = info;
    if (gitRemotUrl && data.matchInfo.gitRemotUrl === gitRemotUrl) {
        return 3;
    }
    if (absolutePath && data.matchInfo.absolutePath === absolutePath) {
        return 2;
    }
    if (folderName && data.matchInfo.folderName === folderName) {
        return 1;
    }
    return 0;
}

function matchInfoEq(left: MatchInfo, right: MatchInfo): boolean {
    if (left.gitRemotUrl !== right.gitRemotUrl) {
        return false;
    }
    if (left.absolutePath !== right.absolutePath) {
        return false;
    }
    if (left.folderName !== right.folderName) {
        return false;
    }
    return true;
}

function getCurrentMatchInfo(): MatchInfo {
    const folderName = getFolderName();
    if (!folderName) {
        console.error(`Failed to get folder name.`);
        throw new Error("No folder name found.");
    }
    // TODO: support full match info
    return {
        folderName: folderName,
        absolutePath: undefined,
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
            const data = ctx.globalState.get(key) as DeviceProjectData;
            if (matchInfoEq(data.matchInfo, matchInfo)) {
                // TODO: support more generic compare
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

/** Get total seconds for current project */
export function getTotalSeconds(): number {
    console.warn(`Unimplemented: getTotalSeconds`);
    return 42;
}

/** Get today seconds for current project */
export function getTodaySeconds(): number {
    console.warn(`Unimplemented: getTodaySeconds`);
    return 67;
}

export function deleteAll() {
    console.log(`Unimplemented: deleteAll`);
}

export function exportAll() {
    console.log(`Unimplemented: exportAll`);
}

export function importAll(data: Record<string, DeviceProjectData>) {
    console.log(`Unimplemented: importAll with data: ${JSON.stringify(data, null, 2)}`);
}
