import { toggleFilter } from '../lib/state'

const activeCharts = {};

function destroyChartInstance(key) {
    if (activeCharts[key]) {
        try {
            activeCharts[key].destroy();
        } catch (e) {
            console.warn(`[DetalleCharts] Error destruyendo gráfico '${key}':`, e);
        }
        activeCharts[key] = null;
    }
}

export function renderPracticasChart(containerId, practicas, filters) {
    const container = document.getElementById(containerId);
    if (!container) return;

    destroyChartInstance('practicas');

    if (!practicas.labels.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de prácticas disponibles.</p>';
        return;
    }

    let options;
    // Comparison mode: grouped horizontal bars
    if (practicas.dataComp) {
        options = {
            series: [
                { name: 'Período actual', data: practicas.data },
                { name: 'Período anterior', data: practicas.dataComp },
            ],
            chart: {
                type: 'bar',
                height: Math.max(280, practicas.labels.length * 42),
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
            colors: ['#004884', '#adb5bd'],
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: { fontSize: '11px', fontFamily: 'Outfit, sans-serif', fontWeight: '600', colors: ['#374151'] },
                formatter: val => val > 0 ? val.toLocaleString() : '',
                offsetX: 4,
                dropShadow: { enabled: false },
            },
            xaxis: {
                categories: practicas.labels,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 220,
                    formatter: val => typeof val === 'string' && val.length > 30 ? val.slice(0, 30) + '...' : val,
                },
            },
            grid: {
                borderColor: '#eff2f7',
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: false } },
                padding: { left: 15, right: 15 },
            },
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
        };
    } else {
        // Normal mode: single series with click-to-filter
        const activeCodigo = filters?.practica ? filters.practica.valor : null;
        const colors = practicas.codigos.map(c => c === activeCodigo ? '#004884' : '#2a8ed2');

        options = {
            series: [{ name: 'Estudios', data: practicas.data }],
            chart: {
                type: 'bar',
                height: Math.max(280, practicas.labels.length * 28),
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
                events: {
                    dataPointSelection: (_e, _ctx, { dataPointIndex }) => {
                        const codigo = practicas.codigos[dataPointIndex];
                        const label = practicas.labels[dataPointIndex];
                        if (codigo) toggleFilter('practica', codigo, label);
                    },
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 3,
                    barHeight: '65%',
                    distributed: true,
                    dataLabels: { position: 'top' },
                },
            },
            colors,
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: { fontSize: '11px', fontFamily: 'Outfit, sans-serif', colors: ['#444'] },
                formatter: val => val.toLocaleString(),
                offsetX: 4,
            },
            xaxis: {
                categories: practicas.labels,
                labels: {
                    style: { colors: '#858d98', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    formatter: val => val.toLocaleString(),
                },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 220,
                    formatter: val => {
                        if (typeof val === 'string' && val.length > 30) {
                            return val.slice(0, 30) + '...';
                        }
                        return val;
                    }
                },
            },
            grid: {
                borderColor: '#eff2f7',
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: false } },
                padding: { left: 15, right: 15 },
            },
            legend: { show: false },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' estudios' },
                custom: ({ series, seriesIndex, dataPointIndex }) => {
                    const label = practicas.labels[dataPointIndex] || '';
                    const val = series[seriesIndex][dataPointIndex];
                    const codigo = practicas.codigos[dataPointIndex] || '';
                    return `<div class="apexcharts-tooltip-title" style="font-size:12px">${label}</div>
                            <div class="px-2 py-1"><b>${val.toLocaleString()}</b> estudios<br>
                            <small class="text-muted">${codigo}</small></div>`;
                },
            },
        };
    }

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['practicas'] = new ApexChartsObj(container, options);
        activeCharts['practicas'].render();
    }
}

export function renderDerivantesChart(containerId, derivantes, filters) {
    const container = document.getElementById(containerId);
    if (!container) return;

    destroyChartInstance('derivantes');

    if (!derivantes.labels.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">Sin datos de derivantes disponibles.</p>';
        return;
    }

    let options;
    // Comparison mode: grouped horizontal bars
    if (derivantes.dataComp) {
        options = {
            series: [
                { name: 'Período actual', data: derivantes.data },
                { name: 'Período anterior', data: derivantes.dataComp },
            ],
            chart: {
                type: 'bar',
                height: Math.max(280, derivantes.labels.length * 42),
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
            colors: ['#004884', '#adb5bd'],
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: { fontSize: '11px', fontFamily: 'Outfit, sans-serif', fontWeight: '600', colors: ['#374151'] },
                formatter: val => val > 0 ? val.toLocaleString() : '',
                offsetX: 4,
                dropShadow: { enabled: false },
            },
            xaxis: {
                categories: derivantes.labels,
                labels: { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 180,
                    formatter: val => typeof val === 'string' && val.length > 26 ? val.slice(0, 26) + '...' : val,
                },
            },
            grid: {
                borderColor: '#eff2f7',
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: false } },
                padding: { left: 15, right: 15 },
            },
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
                y: { formatter: val => val.toLocaleString() + ' derivaciones' },
            },
        };
    } else {
        // Normal mode: single series distributed bars with click-to-filter
        const activeDerivante = filters?.derivante ? filters.derivante.valor : null;
        const colors = derivantes.labels.map(label => label === activeDerivante ? '#004884' : '#2a8ed2');

        options = {
            series: [{ name: 'Derivaciones', data: derivantes.data }],
            chart: {
                type: 'bar',
                height: Math.max(280, derivantes.labels.length * 30),
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 },
                events: {
                    dataPointSelection: (_e, _ctx, { dataPointIndex }) => {
                        const label = derivantes.labels[dataPointIndex];
                        if (label) toggleFilter('derivante', label, label);
                    },
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 3,
                    barHeight: '65%',
                    distributed: true,
                    dataLabels: { position: 'top' },
                },
            },
            colors,
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: { fontSize: '11px', fontFamily: 'Outfit, sans-serif', colors: ['#444'] },
                formatter: val => val.toLocaleString(),
                offsetX: 4,
            },
            xaxis: {
                categories: derivantes.labels,
                labels: {
                    style: { colors: '#858d98', fontSize: '11px' },
                    formatter: val => val.toLocaleString(),
                },
            },
            yaxis: {
                labels: {
                    style: { colors: '#555', fontSize: '11px', fontFamily: 'Outfit, sans-serif' },
                    maxWidth: 180,
                    formatter: val => {
                        if (typeof val === 'string' && val.length > 26) {
                            return val.slice(0, 26) + '...';
                        }
                        return val;
                    }
                },
            },
            grid: {
                borderColor: '#eff2f7',
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: false } },
                padding: { left: 15, right: 15 },
            },
            legend: { show: false },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' derivaciones' },
            },
        };
    }

    container.innerHTML = '';
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        activeCharts['derivantes'] = new ApexChartsObj(container, options);
        activeCharts['derivantes'].render();
    }
}

