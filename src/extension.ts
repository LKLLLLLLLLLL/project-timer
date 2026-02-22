import * as vscode from 'vscode';
import * as timer from './core/timer';
import * as statusBar from './ui/statusbar';
import * as storage from './core/storage';
import * as menu from './ui/menu';
import * as config from './utils/config';
import * as refresher from './utils/refresher';
import * as logger from './utils/logger';
import { openStatistics } from './ui/statistics';
import { set as setContext } from './utils/context';
import { addCleanup } from './utils';

async function deleteAllStorage() {
    // pop up windows for second confirm
    const answer = await vscode.window.showWarningMessage(
        "Are you sure you want to delete all storage? This action cannot be undone.",
        { modal: true },
        "Yes"
    );
    if (answer === "Yes") {
        await storage.deleteAll();
    }
}

async function exportData() {
    const fileUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        filters: {
            'JSON files': ['json']
        },
        saveLabel: 'Export Data'
    });
    if (fileUri) {
        const data = await storage.exportAll();
        const content = Buffer.from(JSON.stringify(data, null, 2));
        vscode.workspace.fs.writeFile(fileUri, content).then(() => {
            vscode.window.showInformationMessage('Data exported successfully.');
        }, error => {
            vscode.window.showErrorMessage(`Failed to export data. Error: ${error}`);
        });
    }
}

async function importData() {
    const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        filters: {
            'JSON files': ['json']
        },
        openLabel: 'Import Data'
    });
    if (fileUri && fileUri[0]) {
        const content = await vscode.workspace.fs.readFile(fileUri[0]);
        try {
            const data = JSON.parse(content.toString());
            await storage.importAll(data);
            vscode.window.showInformationMessage('Data imported successfully.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import JSON file. Error: ${error}`);
        }
    }
}

async function renameProject() {
    const currentName = storage.getProjectName();
    const newName = await vscode.window.showInputBox({
        prompt: "Enter the new display name for the current project",
        placeHolder: "Project Name",
        value: currentName,
        validateInput: text => {
            return text.trim() === '' ? 'Project name cannot be empty' : null;
        }
    });

    if (newName !== undefined) {
        await storage.renameCurrentProject(newName.trim());
        vscode.window.showInformationMessage(`Project renamed to: ${newName}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    const disposables: vscode.Disposable[] = [];
    disposables.push(logger.init());

    logger.log('Start activate Project Timer extension...');
    setContext(context);

    // query whether user want to enable synchronization
    const hasPrompted = context.globalState.get<boolean>('hasPromptedSync', false);
    if (!hasPrompted) {
        vscode.window.showInformationMessage(
            "Project Timer can sync your statistics across devices using VS Code Settings Sync. Would you like to enable synchronization?",
            "Yes",
            "No, keep it local"
        ).then(selection => {
            const enabled = selection === "Yes";
            if (enabled) { // default is false, only need to set if true
                vscode.workspace.getConfiguration('project-timer').update(
                    'synchronization.enabled',
                    true,
                    vscode.ConfigurationTarget.Global
                );
            }
            context.globalState.update('hasPromptedSync', true);
        });
    }

    // 1. register commands
    disposables.push(vscode.commands.registerCommand('project-timer.deleteAllStorage', () => deleteAllStorage()));
    disposables.push(vscode.commands.registerCommand('project-timer.openStatistics', () => openStatistics()));
    disposables.push(vscode.commands.registerCommand('project-timer.exportData', () => exportData()));
    disposables.push(vscode.commands.registerCommand('project-timer.importData', () => importData()));
    disposables.push(vscode.commands.registerCommand('project-timer.renameProject', () => renameProject()));
    // 2. init modules
    disposables.push(config.init());
    disposables.push(timer.init());
    disposables.push(storage.init());
    disposables.push(menu.init());
    disposables.push(refresher.init());
    // 3. add ui components
    disposables.push(statusBar.activate());

    addCleanup(disposables);
    logger.log('Project Timer extension activated.');
}

export async function deactivate() {
    await storage.flush();
}
