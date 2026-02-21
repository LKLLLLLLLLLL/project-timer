// @ts-nocheck

const chartDom = document.getElementById('chart-main');
// initialize without a built-in theme (some themes set a backgroundColor)
const myChart = echarts.init(chartDom);
// enforce transparent background on the DOM node as well
chartDom.style.background = 'transparent';

// secondary chart: language pie
const pieDom = document.getElementById('lang-pie');
const pieChart = echarts.init(pieDom);
pieDom.style.background = 'transparent';

window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'initData') {
        updateUI(message.payload);
    }
});

function secondsToHoursString(sec) {
    const h = Math.round(sec / 360) / 10; // one decimal
    return h + ' h';
}

function updateUI(data) {
    const history = data.history || {};
    const dates = Object.keys(history).sort();

    // compute totals
    let totalSeconds = 0;
    for (const d of dates) {
        totalSeconds += (history[d]?.seconds || 0);
    }
    const daysCount = dates.length || 0;
    const avgPerDayHours = daysCount ? (totalSeconds / daysCount / 3600) : 0;
    const todayKey = new Date().toLocaleDateString('sv').slice(0, 10);
    const todaySeconds = history[todayKey]?.seconds || 0;

    // update header and cards
    document.getElementById('subtitle').innerText = `Statistics for ${data.projectName || '—'} · ${dates.length} days`;
    document.getElementById('total-hours').innerText = (Math.round(totalSeconds / 360) / 10) + ' h';
    document.getElementById('avg-per-day').innerText = (Math.round(avgPerDayHours * 10) / 10) + ' h';
    document.getElementById('days-count').innerText = daysCount || '0';
    document.getElementById('today-hours').innerText = (Math.round(todaySeconds / 360) / 10) + ' h';

    // gather language keys across dates and aggregate totals
    const langTotals = {};
    const fileTotals = {};
    for (const d of dates) {
        const langs = history[d]?.languages || {};
        for (const [l, s] of Object.entries(langs)) { langTotals[l] = (langTotals[l] || 0) + s; }
        const files = history[d]?.files || {};
        for (const [f, s] of Object.entries(files)) { fileTotals[f] = (fileTotals[f] || 0) + s; }
    }
    const languages = Object.keys(langTotals).sort();

    // helper palette
    const palette = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#6366F1', '#EC4899', '#0EA5A4'
    ];

    // ensure we display at least 7 columns; pad left with empty slots if needed
    const minColumns = 7;
    const displayCount = Math.max(minColumns, dates.length);
    const pad = displayCount - dates.length;
    const paddedDates = Array.from({ length: pad }).map(() => '').concat(dates);

    // set chart sizing: align width to container while keeping a minWidth
    const colWidth = 96; // px per column (larger for readability)
    const chartWidth = Math.max(displayCount * colWidth, 720);
    // make chart fill container width but only enable horizontal scrolling
    // when the computed chartWidth exceeds the container width
    const containerEl = document.querySelector('.container');
    const containerWidth = containerEl ? containerEl.clientWidth : (chartDom.parentElement?.clientWidth || window.innerWidth);
    chartDom.style.width = '100%';
    chartDom.style.height = '520px';
    if (chartWidth > containerWidth) {
        chartDom.style.minWidth = chartWidth + 'px';
        if (chartDom.parentElement) {
            chartDom.parentElement.style.overflowX = 'auto';
        }
    } else {
        chartDom.style.minWidth = '0';
        if (chartDom.parentElement) {
            chartDom.parentElement.style.overflowX = 'hidden';
        }
    }

    // build series per-language (stacked) using paddedDates
    let series = [];
    if (languages.length > 0) {
        series = languages.map((lang, idx) => ({
            name: lang,
            type: 'bar',
            stack: 'total',
            emphasis: { focus: 'series' },
            itemStyle: { color: palette[idx % palette.length], borderRadius: [6, 6, 6, 6] },
            data: paddedDates.map(d => d === '' ? 0 : Math.round(((history[d]?.languages?.[lang] || 0) / 360)) / 10)
        }));
    } else {
        // fallback: single series using total seconds per day
        series = [{
            name: 'Hours',
            type: 'bar',
            data: paddedDates.map(d => d === '' ? 0 : Math.round((history[d]?.seconds || 0) / 360) / 10),
            itemStyle: { color: 'rgba(14,99,156,0.85)', borderRadius: [6, 6, 6, 6] }
        }];
    }

    // tooltip formatter to show breakdown and total
    // derive colors from CSS vars for consistent tooltip styling
    const cssVars = getComputedStyle(document.documentElement);
    const tooltipBg = (cssVars.getPropertyValue('--bg') || cssVars.getPropertyValue('--vscode-editor-background') || 'transparent').trim();
    const tooltipColor = (cssVars.getPropertyValue('--fg') || cssVars.getPropertyValue('--vscode-editor-foreground') || '#fff').trim();
    const tooltipBorder = 'rgba(255,255,255,0.06)';

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: tooltipBg,
            textStyle: { color: tooltipColor },
            borderColor: tooltipBorder,
            borderWidth: 1,
            extraCssText: 'box-shadow: 0 6px 18px rgba(0,0,0,0.5);',
            formatter: function (params) {
                if (!params || !params.length) {
                    return '';
                }
                let out = params[0].axisValue + '<br/>';
                let total = 0;
                params.forEach(p => {
                    out += `<span style="display:inline-block;margin-right:8px;border-radius:4px;width:10px;height:10px;background:${p.color}"></span> ${p.seriesName}: ${p.data} h<br/>`;
                    total += (Number(p.data) || 0);
                });
                out += `<b style="color:${tooltipColor}">Total: ${Math.round(total * 10) / 10} h</b>`;
                return out;
            }
        },
        legend: { top: 8, data: languages },
        backgroundColor: 'transparent',
        grid: { left: '6%', right: '4%', bottom: '18%', containLabel: true },
        xAxis: { type: 'category', data: paddedDates, axisLabel: { rotate: 45, interval: 'auto' } },
        yAxis: { type: 'value', name: 'hours', min: 0 },
        series: series
    };

    myChart.setOption(option);
    setTimeout(() => myChart.resize(), 120);

    // --- language pie chart ---
    const langEntries = Object.entries(langTotals).sort((a, b) => b[1] - a[1]);
    const pieData = langEntries.map(([k, v], i) => ({ name: k, value: Math.round(v / 3600 * 10) / 10, itemStyle: { color: palette[i % palette.length] } }));
    const legendColor = (getComputedStyle(document.documentElement).getPropertyValue('--vscode-editor-foreground') || getComputedStyle(document.body).color || '#ccc').trim();
    const pieOption = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} h ({d}%)',
            backgroundColor: tooltipBg,
            textStyle: { color: tooltipColor },
            borderColor: tooltipBorder,
            borderWidth: 1,
            extraCssText: 'box-shadow: 0 6px 18px rgba(0,0,0,0.5);'
        },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: true,
            label: {
                show: true,
                position: 'outside',
                formatter: '{b}: {c} h',
                color: legendColor,
                align: 'left'
            },
            labelLine: {
                show: true,
                length: 14,
                length2: 8,
                lineStyle: { color: 'auto', width: 1 }
            },
            emphasis: { label: { show: true, fontWeight: '600' } },
            data: pieData
        }]
    };
    pieChart.setOption(pieOption);
    pieChart.resize();

    // top files list
    const topFiles = Object.entries(fileTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topFilesEl = document.getElementById('top-files');
    topFilesEl.innerHTML = '';
    if (topFiles.length === 0) {
        topFilesEl.innerHTML = '<div style="color:var(--fg)">No file data</div>';
    }
    topFiles.forEach(([f, s]) => {
        const el = document.createElement('div');
        el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.padding = '6px 0'; el.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
        const name = document.createElement('div'); name.textContent = f;
        const val = document.createElement('div'); val.style.color = 'var(--fg)'; val.textContent = (Math.round(s / 360) / 10) + ' h';
        el.appendChild(name); el.appendChild(val); topFilesEl.appendChild(el);
    });
}

window.addEventListener('resize', () => myChart.resize());