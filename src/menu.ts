import * as vscode from 'vscode';
import { get_project_name } from './utils';
import { calculate_total_seconds, get_project_time_info } from './storage';

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
        return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
}

export function get_menu(current_session_seconds: number) {
    const project_name = get_project_name() || 'Unknown';
    const time_info = get_project_time_info(project_name);

    const today_key = new Date().toISOString().split('T')[0];
    const today_record = time_info.history[today_key] || { seconds: 0, languages: {}, files: {} };

    const total_seconds = calculate_total_seconds(time_info);
    const formatted_total = formatDuration(total_seconds);
    const formatted_today = formatDuration(today_record.seconds);
    const tooltip = new vscode.MarkdownString('', true); // 第二个参数设为 true 启用 trusted/html
    tooltip.supportHtml = true;
    tooltip.isTrusted = true;

    // header
    const header = `
## Project Timer
**Current project:**  <span style="color:var(--vscode-textLink-foreground);">${project_name}</span>

---
    `;
    tooltip.appendMarkdown(header);

    // summary row
    const summary = `
<span style="color:var(--vscode-descriptionForeground);">Today:</span> **${formatted_today}** &nbsp;&nbsp;|&nbsp;&nbsp; <span style="color:var(--vscode-descriptionForeground);">Total:</span> **${formatted_total}** 

    `;
    tooltip.appendMarkdown(summary);

    // Top Languages Bar Chart
    const sorted_langs = Object.entries(today_record.languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
    if (sorted_langs.length > 0) {
        // calculate percentage
        const total_session = Object.values(today_record.languages).reduce((a, b) => a + b, 0) || 1;

        tooltip.appendMarkdown(`\n**Top Languages**\n\n`);

        sorted_langs.forEach(([lang, secs], index) => {
            const percent = Math.round((secs / total_session) * 100);

            tooltip.appendMarkdown(`- **${lang}**: ${percent}%\n\n`);
        });
    }

    // Top file chart
    const sorted_files = Object.entries(today_record.files)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
    if (sorted_files.length > 0) {
        // calculate percentage
        const total_session_files = Object.values(today_record.files).reduce((a, b) => a + b, 0) || 1;

        tooltip.appendMarkdown(`\n**Top Files**\n\n`);

        sorted_files.forEach(([file, secs], index) => {
            const percent = Math.round((secs / total_session_files) * 100);

            tooltip.appendMarkdown(`- **${file}**: ${percent}%\n\n`);
        });
    }

    // bottom
    const bottom = `
---
$(graph) [View Detailed Statistics](command:project-timer.openStatistics)
    `;
    tooltip.appendMarkdown(bottom);

    return tooltip;
}