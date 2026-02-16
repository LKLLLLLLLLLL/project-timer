import * as vscode from 'vscode';
import * as Context from './context';

/** 
 * Get folder name of current window.
 * If no folder is opened, return undefined.
 * If in a multi-root workspace, return first folder name.
 */
export function getFolderName(): string | undefined {
    const workspace_folders = vscode.workspace.workspaceFolders;
    if (workspace_folders === undefined || workspace_folders.length === 0) {
        console.log('No workspace folders found.');
        return;
    }
    return workspace_folders?.[0].name;
}

// export function isMultiRootWorkspace(): boolean {
//     const workspace_folders = vscode.workspace.workspaceFolders;
//     if (workspace_folders === undefined || workspace_folders.length === 0) {
//         return false;
//     }
//     return workspace_folders.length > 1;
// }

/**
 * Get the absolte path of the parent of current folder.
 */
export function getFolderParentPath(): string | undefined {
    const workspace_folders = vscode.workspace.workspaceFolders;
    if (workspace_folders === undefined || workspace_folders.length === 0) {
        return;
    }
    const folderPath = workspace_folders?.[0].uri.fsPath;
    if (!folderPath) {
        return;
    }
    const lastSlashIndex = folderPath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
        return;
    }
    return folderPath.substring(0, lastSlashIndex);
}
// export function getGitRemoteUrl(): string | undefined {
//     const gitExtension = vscode.extensions.getExtension('vscode.git');
//     if (!gitExtension) {
//         return undefined;
//     }
//     const git = gitExtension.exports.getAPI(1);
//     if (git.repositories.length === 0) {
//         return undefined;
//     }
//     const repository = git.repositories[0];
//     const remote = repository.state.remotes.find((r: any) => r.name === 'origin');
//     return remote?.fetchUrl || remote?.pushUrl;
// }

export function todayDate(): string {
    return new Date().toISOString().slice(0, 10);
}

export function getCurrentLanguage(): string | undefined {
    return vscode.window.activeTextEditor?.document.languageId;
}

/** Return the relative path from current work folder root. */
export function getCurrentFile(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }
    return vscode.workspace.asRelativePath(editor.document.uri);
}

/** 
 * Register callback function to all event related to user activities.
 * "Actives" include windows state change, for example, focus or unfocus.
 */
export function onActive(callback: () => void): vscode.Disposable {
    const activityEvents = [
        vscode.workspace.onDidChangeTextDocument,
        vscode.workspace.onDidSaveTextDocument,
        vscode.window.onDidChangeActiveTextEditor,
        vscode.window.onDidChangeTextEditorSelection,
        vscode.window.onDidChangeTextEditorVisibleRanges,
        vscode.window.onDidChangeWindowState,
    ];

    const disposables: vscode.Disposable[] = [];
    activityEvents.forEach(event => {
        const disposable = event(callback);
        disposables.push(disposable);
    });
    return {
        dispose: () => {
            disposables.forEach(d => d.dispose());
        }
    };
}

export function addCleanup(disposable: vscode.Disposable | Array<vscode.Disposable>) {
    const context = Context.get();
    if (Array.isArray(disposable)) {
        context.subscriptions.push(...disposable);
    } else {
        context.subscriptions.push(disposable);
    }
}