import { MODULOS, MODULO_COLORS, MODULO_LABELS } from '../lib/data'
import { setFilter, clearFilter, hasPermission } from '../lib/state'

let _renderGen = 0;

const MODULO_ICONS = {
    Video: 'bx bx-video',
    Tomo: 'bx bx-scan',
    Resonancia: 'bx bxs-magnet',
    Eco: 'bx bx-pulse',
};

/** Render a compact variation badge inline under the KPI number.
 *  Uses Bootstrap badge + Minia colors: bg-success-subtle / bg-danger-subtle
 */
function variationBadge(current, previous) {
    if (!previous || previous === 0) return '';
    const pct = ((current - previous) / previous) * 100;
    const sign  = pct >= 0 ? '+' : '';
    const arrow = pct >= 0 ? '▲' : '▼';
    const cls   = pct >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
    return `
        <span class="badge ${cls} font-size-11 fw-semibold mt-1 d-inline-flex align-items-center gap-1"
              style="border-radius:8px; padding:3px 7px;">
            ${arrow} ${sign}${pct.toFixed(1)}%
            <span class="text-muted fw-normal ms-1" style="font-size:10px;">vs ${previous.toLocaleString()}</span>
        </span>`;
}

export function renderKPICards(container, kpi, filter) {
    const activeModulo   = filter?.tipo === 'modulo' ? filter.valor : null;
    const activePractica = filter?.tipo === 'practica';
    const comparing      = !!kpi.compararActivo;

    const modulosPermitidos = MODULOS.filter(mod => hasPermission(mod));

    // Determinar clase de grid dinámicamente según la cantidad de columnas (Total + módulos permitidos)
    const colsCount = 1 + modulosPermitidos.length;
    const gridClass = `row row-cols-1 row-cols-md-2 row-cols-xl-${Math.min(colsCount, 5)} g-3 mb-3`;

    container.innerHTML = `
    <div class="${gridClass}">

        <!-- Total -->
        <div class="col">
            <div class="card card-h-100 mb-0 ${!activeModulo && !activePractica ? 'border-primary border-2' : ''}"
                 style="cursor:pointer;" id="kpi-card-total">
                <div class="card-body p-3">
                    <p class="text-muted text-uppercase fw-semibold font-size-11 mb-1">Total Estudios</p>
                    <h3 class="mb-0 fw-bold" style="color:var(--ssf-blue-dark)">
                        ${kpi.total.toLocaleString()}
                    </h3>
                    ${comparing ? variationBadge(kpi.total, kpi.totalComp) : ''}
                    <div id="kpi-spark-total" class="mt-1"></div>
                    <p class="mb-0 mt-1 font-size-11 text-muted">todos los módulos</p>
                </div>
            </div>
        </div>

        ${modulosPermitidos.map(mod => {
            const originalIdx = MODULOS.indexOf(mod);
            const color = MODULO_COLORS[originalIdx] || '#ccc';
            return `
            <div class="col">
                <div class="card card-h-100 mb-0 ${activeModulo === mod ? 'border-2' : ''}"
                     style="cursor:pointer; ${activeModulo === mod ? `border-color:${color} !important;` : ''}"
                     data-modulo="${mod}">
                    <div class="card-body p-3">
                        <div class="d-flex align-items-center mb-1">
                            <span class="me-2"><i class="${MODULO_ICONS[mod] || 'bx bx-circle'} font-size-18"
                                  style="color:${color}"></i></span>
                            <p class="text-muted text-uppercase fw-semibold font-size-11 mb-0">${MODULO_LABELS[mod] || mod}</p>
                        </div>
                        <h3 class="mb-0 fw-bold" style="color:${color}">
                            ${(kpi.porModulo[mod] || 0).toLocaleString()}
                        </h3>
                        ${comparing ? variationBadge(kpi.porModulo[mod] || 0, kpi.porModuloComp?.[mod] || 0) : ''}
                        <div id="kpi-spark-${mod.toLowerCase()}" class="mt-1"></div>
                        <p class="mb-0 mt-1 font-size-11 text-muted">estudios en período</p>
                    </div>
                </div>
            </div>
            `;
        }).join('')}

    </div>`;

    // ── Click handlers ────────────────────────────────────────────
    document.getElementById('kpi-card-total')?.addEventListener('click', () => clearFilter());
    modulosPermitidos.forEach(mod => {
        document.querySelector(`[data-modulo="${mod}"]`)?.addEventListener('click', () => {
            setFilter('modulo', mod, mod);
        });
    });

    // ── Sparklines — defer until after layout ─────────────────────
    if (!window.ApexCharts) return;
    const gen = ++_renderGen;
    requestAnimationFrame(() => {
        if (gen !== _renderGen) return;
        renderSparkline('kpi-spark-total', kpi.sparklines.Total || [], '#004884');
        modulosPermitidos.forEach(mod => {
            const originalIdx = MODULOS.indexOf(mod);
            const color = MODULO_COLORS[originalIdx] || '#ccc';
            renderSparkline(`kpi-spark-${mod.toLowerCase()}`, kpi.sparklines[mod] || [], color);
        });
    });
}

function renderSparkline(id, data, color) {
    const el = document.getElementById(id);
    if (!el || !data.length || el.offsetWidth === 0) return;
    new window.ApexCharts(el, {
        chart: {
            type: 'line',
            height: 36,
            width: el.offsetWidth,
            sparkline: { enabled: true },
            animations: { enabled: false },
        },
        stroke: { curve: 'smooth', width: 2 },
        colors: [color],
        series: [{ data }],
        tooltip: { enabled: false },
    }).render();
}
