import * as vscode from 'vscode';

import { getFolderName, getFolderParentPath, getGitRemoteUrl, strictEq, addCleanup } from "../../../utils";

let _cache: MatchInfo | undefined;

/**
 * Metadata for project matching.
 */
export interface MatchInfo {
    // Priority from high to low
    gitRemotUrl?: string;
    parentPath?: string; // allow undefined only for V1-migrated data
    folderName: string;
}

export function matchInfoEq(left: MatchInfo, right: MatchInfo): boolean {
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
 * Call it when you want to check if current project 'is' the old project from same device (local).
 */
export function matchLocal(old: MatchInfo, current: MatchInfo): boolean {
    // Case 1: V1 compatible
    if (old.parentPath === undefined && old.gitRemotUrl === undefined) {
        // old is V1 migrated data
        if (old.folderName === current.folderName) {
            return true;
        }
        // cannot confirm if they are the same project
        return false;
    }
    // Case 2: equals
    if (matchInfoEq(old, current)) {
        return true;
    }
    // Case 3: only add stronger info
    if (!old.gitRemotUrl && current.gitRemotUrl &&
        strictEq(old.parentPath, current.parentPath) &&
        old.folderName === current.folderName
    ) {
        return true;
    }
    // Case 4: rename or move but keep the git remote url
    if (strictEq(old.gitRemotUrl, current.gitRemotUrl)) {
        return true;
    }
    // Others: keep the old data
    return false;
}

/**
 * Check if data matched the current info in a loose way.
 * Call it when you want to check if data from other device (remote) can be counted as the same project.
 */
export function matchRemote(remote: MatchInfo, current: MatchInfo): boolean {
    if (strictEq(remote.gitRemotUrl, current.gitRemotUrl)) {
        return true;
    }
    // Avoid compare absolute path throught different devices
    if (remote.folderName === current.folderName) {
        return true;
    }
    return false;
}

export function getCurrentMatchInfo(): MatchInfo {
    if (_cache) {
        return _cache;
    }
    const folderName = getFolderName();
    if (!folderName) {
        throw new Error("No folder name found.");
    }
    const parentPath = getFolderParentPath();
    if (!parentPath) {
        throw new Error("No folder parent path found.");
    }
    _cache = {
        folderName: folderName,
        parentPath: parentPath,
        gitRemotUrl: getGitRemoteUrl()
    };
    const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        _cache = undefined;
    });
    addCleanup(disposable);
    return _cache;
}
