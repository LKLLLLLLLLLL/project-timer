import * as vscode from 'vscode';
import { begin_timer} from './timer';
import { activate_status_bar } from './statusbar';
import { delete_all_time_info, flush } from './storage';
import { openStatistics } from './statistic';
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

export function activate(context: vscode.ExtensionContext) {
	console.log('Start activate Project Timer extension...');
	// TODO: add commands:
	// - open statistics
	// - export statistics.json
	// - import statistics.json
	// TODO: add settings:
	// - sync statistics
	// - use workspace name / workspace folder / git repos as project
    set_context(context);
	vscode.commands.registerCommand('project-timer.delete_all_storage', () => delete_all_storage());
    vscode.commands.registerCommand('project-timer.openStatistics', () => openStatistics());
	begin_timer();
	activate_status_bar();
	console.log('Project Timer extension activated.');
}

export function deactivate() {
    flush();
}
