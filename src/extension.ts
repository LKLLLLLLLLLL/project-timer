import * as vscode from 'vscode';
import { begin_timer, end_timer } from './timer';
import { activate_status_bar } from './statusbar';
import { delete_all_time_info } from './storage';
import { openStatistics } from './statistic';

function delete_all_storage(context: vscode.ExtensionContext) {
	// pop up windows for second confirm
	vscode.window.showWarningMessage(
		"Are you sure you want to delete all storage? This action cannot be undone.",
		{ modal: true },
		"Yes"
	).then(answer => {
		if (answer === "Yes") {
			delete_all_time_info(context);
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
	vscode.commands.registerCommand('project-timer.delete_all_storage', () => delete_all_storage(context));
    vscode.commands.registerCommand('project-timer.openStatistics', () => openStatistics(context));
	begin_timer(context);
	activate_status_bar(context);
	console.log('Project Timer extension activated.');
}

export function deactivate() {
	end_timer();
}
