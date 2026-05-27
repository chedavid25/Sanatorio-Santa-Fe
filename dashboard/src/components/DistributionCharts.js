import { toggleFilter } from '../lib/state'

const BLUES = ['#004884', '#0058a3', '#0072bc', '#2a8ed2', '#56abe8', '#82c7ff', '#ade4ff', '#d9f1ff', '#eef8ff', '#f0f8ff'];

const COMP_STYLES = {
    colors: ['#004884', '#adb5bd'],
    legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontFamily: 'Outfit, sans-serif',
        labels: { colors: '#555' },
    },
    tooltip: {
        theme: 'light',
        shared: true,
        intersect: false,
        y: { formatter: val => val.toLocaleString() + ' estudios' },
    },
    grid: { borderColor: '#eff2f7', xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } } },
    dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: { fontSize: '11px', fontFamily: 'Outfit, sans-serif', fontWeight: '600', colors: ['#374151'] },
        formatter: val => val > 0 ? val.toLocaleString() : '',
        offsetX: 4,
        dropShadow: { enabled: false },
    },
};

// Registro de instancias activas de ApexCharts en este módulo para su correcta destrucción
const activeCharts = {};

function destroyChartInstance(key) {
    if (activeCharts[key]) {
        try {
            activeCharts[key].destroy();
        } catch (e) {
            console.warn(`[DistributionCharts] Error destruyendo gráfico '${key}':`, e);
        }
        activeCharts[key] = null;
    }
}

export function renderDistributionCharts(os, int, sede, area, filters) {
    renderOSChart(os, filters);
    renderIntChart(int, filters);
    renderSedeChart(sede, filters);
    renderAreaChart(area, filters);
}

function renderOSChart(os, filters) {
    const container = document.getElementById('os-distribution-chart');
    if (!container) return;

    destroyChartInstance('os');

    if (!os || !os.labels || !os.labels.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de obras sociales.</p>';
        return;
    }

    let options;
    // Comparison mode: grouped horizontal bars
    if (os.dataComp) {
        options = {
            series: [
                { name: 'Período actual', data: os.data },
                { name: 'Período anterior', data: os.dataComp },
            ],
            chart: {
                type: 'bar',
                height: Math.max(300, os.labels.length * 52),
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 3,
                    barHeight: '70%',
                    dataLabels: { position: 'top' },
                },
            },
            xaxis: {
                categories: os.labels,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '10px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 260,
                },
            },
            ...COMP_STYLES,
        };
    } else {
        // Normal mode: horizontal bar with click-to-filter
        const activeOS = filters?.os ? filters.os.valor : null;
        const colors = os.labels.map(label => label === activeOS ? '#004884' : '#2a8ed2');

        const maxVal = Math.max(...os.data);
        options = {
            series: [{ name: 'Estudios', data: os.data }],
            chart: {
                type: 'bar',
                height: Math.max(300, os.labels.length * 36),
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
                events: {
                    dataPointSelection: (_event, _chartContext, config) => {
                        const idx = config.dataPointIndex;
                        if (idx !== undefined && idx !== -1) {
                            const label = os.labels[idx];
                            toggleFilter('os', label, label);
                        }
                    }
                }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    barHeight: '62%',
                    distributed: true,
                    dataLabels: { position: 'top' },
                },
            },
            colors,
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: {
                    fontSize: '12px',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: '600',
                    colors: ['#374151'],
                },
                formatter: val => val.toLocaleString(),
                offsetX: 6,
                dropShadow: { enabled: false },
            },
            xaxis: {
                categories: os.labels,
                max: maxVal * 1.18,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '10px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 260,
                },
            },
            grid: {
                borderColor: '#eff2f7',
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: false } },
                padding: { left: 20, right: 20 },
            },
            legend: { show: false },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' estudios' },
            },
        };
    }

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['os'] = new ApexChartsObj(container, options);
        activeCharts['os'].render();
    }
}

function renderIntChart(int, filters) {
    const container = document.getElementById('int-distribution-chart');
    if (!container) return;

    destroyChartInstance('int');

    if (!int || !int.labels || !int.labels.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de intermediarias.</p>';
        return;
    }

    let options;
    // Comparison mode: grouped horizontal bars
    if (int.dataComp) {
        options = {
            series: [
                { name: 'Período actual', data: int.data },
                { name: 'Período anterior', data: int.dataComp },
            ],
            chart: {
                type: 'bar',
                height: Math.max(280, int.labels.length * 52),
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 3,
                    barHeight: '70%',
                    dataLabels: { position: 'top' },
                },
            },
            xaxis: {
                categories: int.labels,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 200,
                },
            },
            ...COMP_STYLES,
        };
    } else {
        // Normal mode: donut with click-to-filter
        options = {
            series: int.data,
            chart: {
                type: 'donut',
                height: 340,
                animations: { enabled: true },
                events: {
                    dataPointSelection: (_event, _chartContext, config) => {
                        const idx = config.dataPointIndex;
                        if (idx !== undefined && idx !== -1) {
                            const label = int.labels[idx];
                            toggleFilter('intermediaria', label, label);
                        }
                    }
                }
            },
            labels: int.labels,
            colors: BLUES.slice(0, int.labels.length),
            legend: {
                position: 'bottom',
                fontSize: '12px',
                fontFamily: 'Outfit, sans-serif',
                labels: { colors: '#555' },
                formatter: (label, opts) => {
                    const val = opts.w.globals.series[opts.seriesIndex];
                    return `${label}: <b>${val.toLocaleString()}</b>`;
                },
                itemMargin: { horizontal: 6, vertical: 3 },
            },
            plotOptions: {
                customScale: 0.9,
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '13px', fontFamily: 'Outfit, sans-serif', color: '#858d98' },
                            value: {
                                show: true,
                                fontSize: '18px',
                                fontFamily: 'Outfit, sans-serif',
                                fontWeight: '700',
                                color: '#004884',
                                formatter: val => Number(val).toLocaleString(),
                            },
                            total: {
                                show: true,
                                showAlways: true,
                                label: 'Total',
                                fontSize: '13px',
                                fontFamily: 'Outfit, sans-serif',
                                color: '#858d98',
                                formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString(),
                            },
                        },
                    },
                },
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['#fff'] },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' estudios' },
            },
        };
    }

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['int'] = new ApexChartsObj(container, options);
        activeCharts['int'].render();
    }
}

function renderSedeChart(sede, filters) {
    const container = document.getElementById('sede-distribution-chart');
    if (!container) return;

    destroyChartInstance('sede');

    if (!sede || !sede.labels || !sede.labels.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de sedes.</p>';
        return;
    }

    let options;
    // Comparison mode: grouped horizontal bars (actual vs período anterior)
    if (sede.dataComp) {
        options = {
            series: [
                { name: 'Período actual', data: sede.data },
                { name: 'Período anterior', data: sede.dataComp },
            ],
            chart: {
                type: 'bar',
                height: Math.max(280, sede.labels.length * 52),
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 3,
                    barHeight: '70%',
                    dataLabels: { position: 'top' },
                },
            },
            xaxis: {
                categories: sede.labels,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 200,
                },
            },
            ...COMP_STYLES,
        };
    } else {
        // Normal mode: donut with click-to-filter
        options = {
            series: sede.data,
            chart: {
                type: 'donut',
                height: 340,
                animations: { enabled: true },
                events: {
                    dataPointSelection: (_event, _chartContext, config) => {
                        const idx = config.dataPointIndex;
                        if (idx !== undefined && idx !== -1) {
                            toggleFilter('sede', sede.labels[idx], sede.labels[idx]);
                        }
                    }
                }
            },
            labels: sede.labels,
            colors: BLUES.slice(0, sede.labels.length),
            legend: {
                position: 'bottom',
                fontSize: '12px',
                fontFamily: 'Outfit, sans-serif',
                labels: { colors: '#555' },
                formatter: (label, opts) => {
                    const val = opts.w.globals.series[opts.seriesIndex];
                    return `${label}: <b>${val.toLocaleString()}</b>`;
                },
                itemMargin: { horizontal: 6, vertical: 3 },
            },
            plotOptions: {
                customScale: 0.9,
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '13px', fontFamily: 'Outfit, sans-serif', color: '#858d98' },
                            value: {
                                show: true,
                                fontSize: '18px',
                                fontFamily: 'Outfit, sans-serif',
                                fontWeight: '700',
                                color: '#004884',
                                formatter: val => Number(val).toLocaleString(),
                            },
                            total: {
                                show: true,
                                showAlways: true,
                                label: 'Total',
                                fontSize: '13px',
                                fontFamily: 'Outfit, sans-serif',
                                color: '#858d98',
                                formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString(),
                            },
                        },
                    },
                },
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['#fff'] },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' estudios' },
            },
        };
    }

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['sede'] = new ApexChartsObj(container, options);
        activeCharts['sede'].render();
    }
}

function renderAreaChart(area, filters) {
    const container = document.getElementById('area-distribution-chart');
    if (!container) return;

    destroyChartInstance('area');

    if (!area || !area.labels || !area.labels.length || (!area.data[0] && !area.data[1])) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de áreas.</p>';
        return;
    }

    const AREA_COLORS = ['#0072bc', '#ef9f27'];
    let options;

    // Comparison mode: grouped horizontal bars
    if (area.dataComp) {
        options = {
            series: [
                { name: 'Período actual', data: area.data },
                { name: 'Período anterior', data: area.dataComp },
            ],
            chart: {
                type: 'bar',
                height: 280,
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 3,
                    barHeight: '70%',
                    dataLabels: { position: 'top' },
                },
            },
            xaxis: {
                categories: area.labels,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 200,
                },
            },
            colors: AREA_COLORS,
            ...COMP_STYLES,
        };
    } else {
        // Normal mode: donut
        options = {
            series: area.data,
            chart: {
                type: 'donut',
                height: 340,
                animations: { enabled: true }
            },
            labels: area.labels,
            colors: AREA_COLORS,
            legend: {
                position: 'bottom',
                fontSize: '12px',
                fontFamily: 'Outfit, sans-serif',
                labels: { colors: '#555' },
                formatter: (label, opts) => {
                    const val = opts.w.globals.series[opts.seriesIndex];
                    return `${label}: <b>${val.toLocaleString()}</b>`;
                },
                itemMargin: { horizontal: 6, vertical: 3 },
            },
            plotOptions: {
                customScale: 0.9,
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '13px', fontFamily: 'Outfit, sans-serif', color: '#858d98' },
                            value: {
                                show: true,
                                fontSize: '18px',
                                fontFamily: 'Outfit, sans-serif',
                                fontWeight: '700',
                                color: '#004884',
                                formatter: val => Number(val).toLocaleString(),
                            },
                            total: {
                                show: true,
                                showAlways: true,
                                label: 'Total',
                                fontSize: '13px',
                                fontFamily: 'Outfit, sans-serif',
                                color: '#858d98',
                                formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString(),
                            },
                        },
                    },
                },
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['#fff'] },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' estudios' },
            },
        };
    }

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['area'] = new ApexChartsObj(container, options);
        activeCharts['area'].render();
    }
}

export function renderServicioDerivante(serv, onClickServicio) {
    const container = document.getElementById('serv-distribution-chart');
    if (!container) return;

    destroyChartInstance('serv');

    if (!serv || !serv.labels || !serv.labels.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de servicios. Asigná servicios a los médicos derivantes en el panel de Saneamiento.</p>';
        return;
    }

    const maxVal = Math.max(...serv.data);

    const options = {
        series: [{ name: 'Estudios', data: serv.data }],
        chart: {
            type: 'bar',
            height: Math.max(300, serv.labels.length * 36),
            toolbar: { show: false },
            animations: { enabled: true, speed: 500 },
            events: {
                dataPointSelection: (_e, _ctx, { dataPointIndex }) => {
                    const servicio = serv.labels[dataPointIndex];
                    if (servicio && onClickServicio) onClickServicio(servicio);
                },
            },
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '62%',
                distributed: true,
                dataLabels: { position: 'top' },
            },
        },
        colors: BLUES.slice(0, serv.labels.length),
        dataLabels: {
            enabled: true,
            textAnchor: 'start',
            style: {
                fontSize: '12px',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: '600',
                colors: ['#374151'],
            },
            formatter: val => val.toLocaleString(),
            offsetX: 6,
            dropShadow: { enabled: false },
        },
        xaxis: {
            categories: serv.labels,
            max: maxVal * 1.18,
            labels: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#555', fontSize: '10px', fontFamily: 'Outfit, sans-serif' },
                maxWidth: 260,
            },
        },
        grid: {
            borderColor: '#eff2f7',
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: false } },
            padding: { left: 20, right: 20 },
        },
        legend: { show: false },
        tooltip: {
            theme: 'light',
            custom: ({ series, seriesIndex, dataPointIndex }) => {
                const label = serv.labels[dataPointIndex] || '';
                const val = series[seriesIndex][dataPointIndex];
                return `<div class="apexcharts-tooltip-title" style="font-size:12px">${label}</div>
                        <div class="px-2 py-1"><b>${val.toLocaleString()}</b> estudios<br>
                        <small class="text-muted">Clic para ver los médicos de este servicio</small></div>`;
            },
        },
    };

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['serv'] = new ApexChartsObj(container, options);
        activeCharts['serv'].render();
    }
}

