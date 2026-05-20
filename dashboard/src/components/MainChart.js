const COLOR_MAP = {
    Total: '#004884',
    Video: '#004884',
    Tomo: '#0072bc',
    Resonancia: '#56abe8',
    Eco: '#2a8ed2',
};

export function renderMainChart(containerId, trend, _filter) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const series = trend.series || [];
    const isComparison = series.length >= 2;

    let options;

    if (isComparison) {
        // Extract module key from "Actual (2026)" → "Total"
        const rawName = series[0]?.name?.replace(/\s*\(.*\)/, '').trim() || 'Total';
        const mainColor = COLOR_MAP[rawName] || '#004884';

        options = {
            series,
            chart: {
                type: 'line',
                height: 340,
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: { enabled: true, speed: 500 },
            },
            colors: [mainColor, '#adb5bd'],
            stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 6] },
            markers: {
                size: [4, 3],
                colors: ['#fff', '#fff'],
                strokeColors: [mainColor, '#adb5bd'],
                strokeWidth: 2,
                hover: { size: 6 },
            },
            fill: { opacity: 1 },
            dataLabels: { enabled: false },
            xaxis: {
                categories: trend.labels || [],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: '#858d98', fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
                },
            },
            yaxis: {
                labels: {
                    style: { colors: '#858d98', fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
                    formatter: val => val.toLocaleString(),
                },
            },
            grid: {
                borderColor: '#eff2f7',
                strokeDashArray: 4,
                padding: { top: 20, right: 20, bottom: 0, left: 10 },
            },
            legend: {
                show: true,
                position: 'top',
                horizontalAlign: 'right',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '12px',
                labels: { colors: '#555' },
                markers: { width: 20, height: 3, radius: 0 },
            },
            tooltip: {
                theme: 'light',
                shared: true,
                intersect: false,
                y: { formatter: val => val.toLocaleString() + ' estudios' },
            },
        };
    } else {
        const seriesName = series[0]?.name || 'Total';
        const color = COLOR_MAP[seriesName] || '#004884';
        const data = series[0]?.data || [];

        options = {
            series: [{ name: seriesName, data }],
            chart: {
                type: 'area',
                height: 340,
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: { enabled: true, speed: 500 },
            },
            colors: [color],
            dataLabels: {
                enabled: true,
                formatter: val => val > 0 ? val.toLocaleString() : '',
                style: {
                    fontSize: '11px',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: '600',
                    colors: [color],
                },
                background: { enabled: false },
                offsetY: -10,
            },
            stroke: { curve: 'smooth', width: 3 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: false,
                    opacityFrom: 0.35,
                    opacityTo: 0.02,
                    stops: [20, 100],
                },
            },
            markers: {
                size: 5,
                colors: ['#fff'],
                strokeColors: color,
                strokeWidth: 2,
                hover: { size: 7 },
            },
            xaxis: {
                categories: trend.labels || [],
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: '#858d98', fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
                },
            },
            yaxis: {
                labels: {
                    style: { colors: '#858d98', fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
                    formatter: val => val.toLocaleString(),
                },
            },
            grid: {
                borderColor: '#eff2f7',
                strokeDashArray: 4,
                padding: { top: 20, right: 20, bottom: 0, left: 10 },
            },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val.toLocaleString() + ' estudios' },
            },
            legend: { show: false },
        };
    }

    container.innerHTML = '';
    new ApexCharts(container, options).render();
}
