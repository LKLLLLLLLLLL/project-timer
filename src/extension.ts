import * as vscode from 'vscode';
import { begin_timer } from './timer';
import { activate_status_bar } from './statusbar';
import { delete_all_time_info, export_all_data_obj, flush, import_data_obj } from './storage';
import { openStatistics } from './statistics';
import { set_context } from './context';

function delete_all_storage() {
    // pop up windows for second confirm
    vscode.window.showWarningMessage(
        "Are you sure you want to delete all storage? This action cannot be undone.",
        { modal: true },
        "Yes"
    ).then(answer => {
        if (answer === "Yes") {
            delete_all_time_info();
        }
    });
}

function export_data() {
    vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        filters: {
            'JSON files': ['json']
        },
        saveLabel: 'Export Data'
    }).then(fileUri => {
        if (fileUri) {
            const data = export_all_data_obj();
            const content = Buffer.from(JSON.stringify(data, null, 2));
            vscode.workspace.fs.writeFile(fileUri, content).then(() => {
                vscode.window.showInformationMessage('Data exported successfully.');
            }, error => {
                vscode.window.showErrorMessage('Failed to export data.');
            });
        }
    });
}

function import_data() {
    vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        filters: {
            'JSON files': ['json']
        },
        openLabel: 'Import Data'
    }).then(fileUri => {
        if (fileUri && fileUri[0]) {
            vscode.workspace.fs.readFile(fileUri[0]).then(content => {
                try {
                    const data = JSON.parse(content.toString());
                    import_data_obj(data);
                    vscode.window.showInformationMessage('Data imported successfully.');
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to parse JSON file.');
                }
            });
        }
    });
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Start activate Project Timer extension...');
    // TODO: add settings:
    // - sync statistics
    // - use workspace name / workspace folder / git repos as project
    set_context(context);
    vscode.commands.registerCommand('project-timer.delete_all_storage', () => delete_all_storage());
    vscode.commands.registerCommand('project-timer.openStatistics', () => openStatistics());
    begin_timer();
    vscode.commands.registerCommand('project-timer.export_data', () => export_data());
    vscode.commands.registerCommand('project-timer.import_data', () => import_data());
    activate_status_bar();
    console.log('Project Timer extension activated.');
}

export function deactivate() {
    flush();
}
