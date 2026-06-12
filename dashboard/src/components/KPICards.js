import { MODULOS, MODULO_COLORS, MODULO_LABELS } from '../lib/data'
import { toggleFilter, clearFilters, hasPermission } from '../lib/state'

let _renderGen = 0;
// Registro de sparklines activos de ApexCharts para su destrucción
let activeSparklines = {};

const MODULO_ICONS = {
    Video: 'bx bx-video',
    Tomo: 'bx bx-scan',
    Resonancia: 'bx bxs-magnet',
    Eco: 'bx bx-pulse',
    Nuclear: 'bx bx-atom',
    Densi: 'bx bx-bone',
    Odonto: 'bx bxs-smile',
    Radio: 'bx bx-images',
    Angio: 'bx bx-heart',
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

export function renderKPICards(container, kpi, filters) {
    const activeModulo   = filters?.modulo ? filters.modulo.valor : null;
    const activePractica = filters?.practica;
    const comparing      = !!kpi.compararActivo;

    const modulosPermitidos = MODULOS.filter(mod => hasPermission(mod));

    // Determinar clase de grid dinámicamente según la cantidad de columnas (Total + módulos permitidos)
    const colsCount = 1 + modulosPermitidos.length;
    const gridClass = `row row-cols-1 row-cols-md-2 row-cols-xl-${Math.min(colsCount, 5)} g-3 mb-3`;

    // Destruir formalmente todas las instancias de sparklines anteriores
    Object.keys(activeSparklines).forEach(key => {
        if (activeSparklines[key]) {
            try {
                activeSparklines[key].destroy();
            } catch (e) {
                console.warn(`[KPICards] Error al destruir sparkline '${key}':`, e);
            }
            activeSparklines[key] = null;
        }
    });
    activeSparklines = {};

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
    document.getElementById('kpi-card-total')?.addEventListener('click', () => clearFilters());
    modulosPermitidos.forEach(mod => {
        document.querySelector(`[data-modulo="${mod}"]`)?.addEventListener('click', () => {
            toggleFilter('modulo', mod, mod);
        });
    });

    // ── Sparklines — defer until after layout ─────────────────────
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (!ApexChartsObj) return;
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
    
    const ApexChartsObj = window.ApexCharts || globalThis.ApexCharts;
    if (ApexChartsObj) {
        const chart = new ApexChartsObj(el, {
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
        });
        chart.render();
        activeSparklines[id] = chart;
    }
}

