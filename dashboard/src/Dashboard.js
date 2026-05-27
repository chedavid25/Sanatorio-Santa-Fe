import { supabase } from './lib/supabase'
import { DEPARTAMENTOS } from './config'
import { fetchAllBaseData, fetchPracticaDetail, fetchSedeDetail, fetchServicioDetail, computeViewData, MODULO_LABELS, MODULOS } from './lib/data'
import { getFilters, toggleFilter, removeFilter, clearFilters, onFilterChange, getUser, hasPermission } from './lib/state'
import { renderKPICards } from './components/KPICards'
import { renderMainChart } from './components/MainChart'
import { renderPracticasChart, renderDerivantesChart } from './components/DetalleCharts'
import { renderDistributionCharts, renderServicioDerivante } from './components/DistributionCharts'


export function renderDashboard(container, session) {
    const activeDept = DEPARTAMENTOS.find(d => d.activo) || DEPARTAMENTOS[0];

    // Usar toISOString para obtener la fecha real (evita el desfase del reloj del sistema)
    const todayISO = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const currentYear = parseInt(todayISO.slice(0, 4), 10);
    const years = [];
    for (let y = currentYear - 1; y >= 2023; y--) {
        years.push(y);
    }

    container.innerHTML = `
    <div id="layout-wrapper">
        <header id="page-topbar">
            <div class="navbar-header">
                <div class="d-flex align-items-center">
                    <div class="navbar-brand-box">
                        <a href="/" class="logo logo-dark">
                            <span class="logo-sm"><span class="logo-txt">SF</span></span>
                            <span class="logo-lg">
                                <div class="logo-sidebar-text">
                                    <span class="line-1">SANATORIO</span>
                                    <span class="line-2">SANTA FE</span>
                                </div>
                            </span>
                        </a>
                        <a href="/" class="logo logo-light">
                            <span class="logo-sm"><span class="logo-txt">SF</span></span>
                            <span class="logo-lg">
                                <div class="logo-sidebar-text">
                                    <span class="line-1">SANATORIO</span>
                                    <span class="line-2">SANTA FE</span>
                                </div>
                            </span>
                        </a>
                    </div>

                    <button type="button" class="btn btn-sm px-3 font-size-16 header-item" id="vertical-menu-btn">
                        <i class="fa fa-fw fa-bars"></i>
                    </button>

                    <div class="ms-3 d-none d-sm-block align-self-center">
                        <h4 class="mb-0 font-size-18 fw-bold" id="active-dept-name" style="color:var(--ssf-blue-dark)">
                            ${activeDept.nombre}
                        </h4>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <!-- Filter badges container -->
                    <div id="filter-badges-container" class="d-flex align-items-center gap-1 flex-wrap"></div>

                    <!-- Comparación Switch -->
                    <div class="form-check form-switch d-flex align-items-center mb-0" style="padding-left: 2.3em;">
                        <input class="form-check-input" type="checkbox" id="compare-switch" style="cursor:pointer;">
                        <label class="form-check-label font-size-12 text-muted mb-0 ms-1" for="compare-switch" style="cursor:pointer; user-select:none; white-space:nowrap;">Comparar</label>
                    </div>

                    <!-- Comparación Año Select -->
                    <div class="d-none align-items-center" id="compare-year-wrap">
                        <select class="form-select form-select-sm rounded-pill" id="compare-year-select" style="width: 85px; font-size: 12px; height: 30px;">
                            ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Date range picker -->
                    <div class="d-flex align-items-center bg-light-subtle rounded-pill px-3 py-1 border">
                        <i class="bx bx-calendar me-2 text-primary"></i>
                        <input type="month" class="form-control form-control-sm border-0 bg-transparent p-0"
                               id="date-from" value="${currentYear}-01" style="width:100px;">
                        <span class="mx-2 text-muted">-</span>
                        <input type="month" class="form-control form-control-sm border-0 bg-transparent p-0"
                               id="date-to" value="${todayISO}" style="width:100px;">
                    </div>

                    <div class="dropdown d-none d-sm-inline-block">
                        <button type="button" class="btn header-item" id="mode-setting-btn">
                            <i data-feather="moon" class="icon-lg layout-mode-dark"></i>
                            <i data-feather="sun" class="icon-lg layout-mode-light"></i>
                        </button>
                    </div>

                    <div class="dropdown d-inline-block">
                        <button type="button" class="btn header-item bg-light-subtle border-start"
                                id="page-header-user-dropdown"
                                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            <img class="rounded-circle header-profile-user" src="/assets/images/users/avatar-1.jpg" alt="">
                            <span class="d-none d-xl-inline-block ms-1 fw-medium">${getUser()?.nombre || session.user.email.split('@')[0]}</span>
                            <i class="mdi mdi-chevron-down d-none d-xl-inline-block"></i>
                        </button>
                        <div class="dropdown-menu dropdown-menu-end shadow-sm">
                            <a class="dropdown-item" href="#"><i class="mdi mdi-face-man font-size-16 align-middle me-1"></i> Perfil</a>
                            <div class="dropdown-divider"></div>
                            <a class="dropdown-item text-danger" href="#" id="logout-btn">
                                <i class="mdi mdi-logout font-size-16 align-middle me-1"></i> Cerrar Sesión
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Sidebar -->
        <div class="vertical-menu" style="background:var(--ssf-bg-sidebar) !important;">
            <div data-simplebar class="h-100">
                <div id="sidebar-menu">
                    <ul class="metismenu list-unstyled" id="side-menu">
                        <li>
                            <a href="/" class="waves-effect">
                                <i class="bx bx-home-circle"></i>
                                <span>Resumen General</span>
                            </a>
                        </li>
                        <li class="menu-title" style="color:rgba(255,255,255,0.4) !important; text-transform:uppercase; letter-spacing:1px;">Unidades</li>
                        ${DEPARTAMENTOS.map(dept => `
                            <li class="${dept.activo ? '' : 'text-muted'}">
                                <a href="${dept.activo ? '#' : 'javascript:void(0);'}"
                                   class="waves-effect ${dept.activo ? '' : 'disabled'}">
                                    <i class="${dept.icono}"></i>
                                    <span>${dept.nombre}</span>
                                    ${!dept.activo ? '<span class="badge rounded-pill bg-dark-subtle text-white-50 float-end" style="font-size:0.6rem;">PROX.</span>' : ''}
                                </a>
                                ${dept.activo && dept.secciones?.length ? `
                                <ul class="sub-menu" aria-expanded="false">
                                    ${dept.secciones.map(sec => `<li><a href="#" data-section="${sec.id}">${sec.nombre}</a></li>`).join('')}
                                </ul>` : ''}
                            </li>
                        `).join('')}
                        ${(getUser()?.rol === 'admin' || hasPermission('Saneamiento')) ? `
                            <li class="menu-title" style="color:rgba(255,255,255,0.4) !important; text-transform:uppercase; letter-spacing:1px;">Administración</li>
                            <li>
                                <a href="javascript:void(0);" class="has-arrow waves-effect">
                                    <i class="bx bx-shield-quarter"></i>
                                    <span>Gestión Admin</span>
                                </a>
                                <ul class="sub-menu" aria-expanded="false">
                                    ${(getUser()?.rol === 'admin' || hasPermission('Saneamiento')) ? `<li><a href="#admin" id="menu-saneamiento">Saneamiento de datos</a></li>` : ''}
                                    ${getUser()?.rol === 'admin' ? `<li><a href="#admin-usuarios" id="menu-usuarios">Gestión de Usuarios</a></li>` : ''}
                                </ul>
                            </li>` : ''}
                    </ul>
                    <div class="sidebar-footer p-3 mt-auto border-top border-white-10">
                        <div class="text-center">
                            <p class="mb-0 font-size-11 text-white-50" id="last-sync-text">Cargando última sync...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <div class="page-content">
                <div class="container-fluid" id="dashboard-content">

                    <!-- KPI Cards -->
                    <div id="kpi-container"></div>

                    <!-- Tendencia Mensual -->
                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header align-items-center d-flex">
                                    <h4 class="card-title mb-0 flex-grow-1">Tendencia Mensual de Estudios</h4>
                                    <small class="text-muted" id="trend-chart-hint">Usá los gráficos o las tarjetas de arriba para filtrar</small>
                                </div>
                                <div class="card-body">
                                    <div id="main-trend-chart" class="apex-charts" dir="ltr"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Prácticas + Derivantes -->
                    <div class="row">
                        <div class="col-xl-8">
                            <div class="card">
                                <div class="card-header d-flex align-items-center">
                                    <h4 class="card-title mb-0 flex-grow-1">Top Prácticas</h4>
                                    <small class="text-muted">Hacé clic para alternar filtro de práctica</small>
                                </div>
                                <div class="card-body">
                                    <div id="practicas-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-4">
                            <div class="card">
                                <div class="card-header d-flex align-items-center">
                                    <h4 class="card-title mb-0 flex-grow-1">Top Médicos Derivantes</h4>
                                    <small class="text-muted">Hacé clic para alternar filtro de médico</small>
                                </div>
                                <div class="card-body">
                                    <div id="derivantes-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- OS + Intermediaria + Sede + Área -->
                    <div class="row">
                        <div class="col-xl-3 col-md-6">
                            <div class="card" style="min-height: 420px;">
                                <div class="card-header">
                                    <h4 class="card-title mb-0">Top Obras Sociales</h4>
                                </div>
                                <div class="card-body">
                                    <div id="os-distribution-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card" style="min-height: 420px;">
                                <div class="card-header">
                                    <h4 class="card-title mb-0">Distribución por Intermediaria</h4>
                                </div>
                                <div class="card-body">
                                    <div id="int-distribution-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card" style="min-height: 420px;">
                                <div class="card-header">
                                    <h4 class="card-title mb-0">Distribución por Sede</h4>
                                </div>
                                <div class="card-body">
                                    <div id="sede-distribution-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card" style="min-height: 420px;">
                                <div class="card-header">
                                    <h4 class="card-title mb-0">Distribución por Área</h4>
                                </div>
                                <div class="card-body">
                                    <div id="area-distribution-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fila Adicional: Servicio Médico Derivante -->
                    <div class="row">
                        <div class="col-xl-6 col-md-12">
                            <div class="card animate-fade-in" style="min-height: 420px;">
                                <div class="card-header d-flex align-items-center">
                                    <h4 class="card-title mb-0 flex-grow-1">Distribución por Servicio Médico Derivante</h4>
                                    <small class="text-muted">Hacé clic para ver los médicos del servicio</small>
                                </div>
                                <div class="card-body">
                                    <div id="serv-distribution-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <footer class="footer">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-sm-6">© ${new Date().getFullYear()} Sanatorio Santa Fe.</div>
                        <div class="col-sm-6">
                            <div class="text-sm-end d-none d-sm-block">
                                Desarrollado por <a href="#!" class="text-decoration-underline">Imalá</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    </div>`;

    // ── Sidebar / navbar plugins ───────────────────────────────
    if (window.jQuery) {
        window.jQuery('#side-menu').metisMenu();
        document.getElementById('vertical-menu-btn')?.addEventListener('click', e => {
            e.preventDefault();
            document.body.classList.toggle('sidebar-enable');
            if (window.innerWidth >= 992) {
                const sz = document.body.getAttribute('data-sidebar-size');
                document.body.setAttribute('data-sidebar-size', sz === 'sm' ? 'lg' : 'sm');
            }
        });
    }

    document.getElementById('logout-btn')?.addEventListener('click', async e => {
        e.preventDefault();
        await supabase.auth.signOut();
    });

    loadLastSync();

    // ── State ──────────────────────────────────────────────────
    let cachedBaseData = null;
    let cachedMinAnio = null;
    let cachedMaxAnio = null;
    let currentLoadGen = 0;
    let compararActivo = false;
    let anioComparacion = String(currentYear - 1);

    function getDateRange() {
        const fromEl = document.getElementById('date-from');
        const toEl = document.getElementById('date-to');
        if (!fromEl || !toEl) return null;
        return {
            dateFrom: fromEl.value,
            dateTo: toEl.value,
        };
    }

    // Traductor de nombres internos de filtros a etiquetas visuales
    const TIPO_LABELS = {
        modulo: 'Módulo',
        practica: 'Práctica',
        os: 'Obra Social',
        intermediaria: 'Intermediaria',
        sede: 'Sede',
        derivante: 'Médico',
    };

    function updateFilterBadges(filters) {
        const container = document.getElementById('filter-badges-container');
        if (!container) return;

        const activeKeys = Object.keys(filters).filter(k => filters[k] !== null);

        if (activeKeys.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = activeKeys.map(key => {
            const f = filters[key];
            const displayLabel = key === 'modulo' ? (MODULO_LABELS[f.valor] || f.valor) : (f.label || f.valor);
            const tipoLabel = TIPO_LABELS[key] || key;
            return `
                <span class="badge bg-primary d-flex align-items-center gap-1 px-3 py-2 font-size-12"
                      style="border-radius:20px; cursor:default;">
                    <i class="bx bx-filter-alt"></i>
                    <span>${tipoLabel}: ${displayLabel}</span>
                    <button class="btn-close btn-close-white ms-1 remove-filter-btn"
                            style="font-size:0.55rem;" data-filter-type="${key}" aria-label="Limpiar filtro"></button>
                </span>`;
        }).join('');

        // Vincular eventos de eliminación en los botones close
        container.querySelectorAll('.remove-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.currentTarget.getAttribute('data-filter-type');
                removeFilter(tipo);
            });
        });
    }

    function renderAll(baseData, filters) {
        const range = getDateRange();
        if (!range) return; // DOM desmontado, ignorar
        const { dateFrom, dateTo } = range;
        const permitidos = MODULOS.filter(mod => hasPermission(mod));
        const viewData = computeViewData(baseData, filters, dateFrom, dateTo, compararActivo, anioComparacion, permitidos);

        updateFilterBadges(filters);
        renderKPICards(document.getElementById('kpi-container'), viewData.kpi, filters);
        renderMainChart('main-trend-chart', viewData.trend, filters);
        renderPracticasChart('practicas-chart', viewData.practicas, filters);
        renderDerivantesChart('derivantes-chart', viewData.derivantes, filters);
        renderDistributionCharts(viewData.os, viewData.int, viewData.sede, viewData.area, filters);
        renderServicioDerivante(viewData.servicioDerivante, (servicio) => handleServicioFilter(servicio));
    }

    async function handleServicioFilter(servicio) {
        if (!servicio) return;
        try {
            const detail = await fetchServicioDetail(servicio);
            renderDerivantesChart('derivantes-chart', {
                labels: detail.derivantes.map(r => r.nombre_solicitante),
                data: detail.derivantes.map(r => r.total_derivaciones),
            }, getFilters());
            // Actualizar encabezado del card de derivantes
            const cardTitle = document.querySelector('#derivantes-chart')?.closest('.card')?.querySelector('.card-title');
            if (cardTitle) cardTitle.textContent = `Médicos Derivantes — ${servicio}`;
        } catch (err) {
            console.error('Error al cargar detalle de servicio', err);
        }
    }

    // ── Filter change listener ─────────────────────────────────
    const unsubscribe = onFilterChange(filters => {
        if (!cachedBaseData) return;
        renderAll(cachedBaseData, filters);
    });

    // ── Load base data ─────────────────────────────────────────
    function fetchYearRange() {
        const range = getDateRange();
        if (!range) return null;
        const { dateFrom, dateTo } = range;
        const fromAnio = Number(dateFrom.split('-')[0]);
        const toAnio   = Number(dateTo.split('-')[0]);
        const compAnio = compararActivo && anioComparacion ? Number(anioComparacion) : fromAnio;
        return { minAnio: Math.min(fromAnio, compAnio), maxAnio: toAnio };
    }

    async function loadBaseData() {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return; // DOM desmontado

        const yearRange = fetchYearRange();
        if (!yearRange) return; // DOM desmontado
        const { minAnio, maxAnio } = yearRange;

        if (cachedBaseData && cachedMinAnio <= minAnio && cachedMaxAnio >= maxAnio) {
            renderAll(cachedBaseData, getFilters());
            return;
        }

        const loadGen = ++currentLoadGen;

        try {
            kpiContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center py-5">
                    <div class="spinner-border text-primary me-3" role="status"></div>
                    <span class="text-muted">Cargando datos…</span>
                </div>`;

            const baseData = await fetchAllBaseData(minAnio, maxAnio);
            
            if (loadGen !== currentLoadGen) return;

            cachedBaseData = baseData;
            cachedMinAnio = minAnio;
            cachedMaxAnio = maxAnio;

            renderAll(cachedBaseData, getFilters());
        } catch (error) {
            if (loadGen !== currentLoadGen) return;
            console.error('Error al cargar datos', error);
            const kpi2 = document.getElementById('kpi-container');
            if (kpi2) kpi2.innerHTML = `<div class="alert alert-danger">Error al cargar datos: ${error.message}</div>`;
        }
    }

    // Date range changes → re-fetch from server with the new year range
    async function onDateChange() {
        await loadBaseData();
    }
    document.getElementById('date-from')?.addEventListener('change', onDateChange);
    document.getElementById('date-to')?.addEventListener('change', onDateChange);

    document.getElementById('compare-switch')?.addEventListener('change', async e => {
        compararActivo = e.target.checked;
        const wrap = document.getElementById('compare-year-wrap');
        if (wrap) {
            wrap.classList.toggle('d-none', !compararActivo);
            wrap.classList.toggle('d-flex', compararActivo);
        }
        await loadBaseData();
    });

    document.getElementById('compare-year-select')?.addEventListener('change', async e => {
        anioComparacion = e.target.value;
        if (compararActivo) await loadBaseData();
    });

    loadBaseData();
}

async function loadLastSync() {
    try {
        const { data } = await supabase
            .schema('logs')
            .from('log_sincronizacion')
            .select('ejecutado_en, estado')
            .order('ejecutado_en', { ascending: false })
            .limit(1)
            .single();

        const textEl = document.getElementById('last-sync-text');
        if (textEl && data) {
            const date = new Date(data.ejecutado_en);
            const formatted = date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
            textEl.innerHTML = `Última sync: ${formatted}${data.estado === 'ERROR' ? ' <i class="bx bx-error-circle text-danger"></i>' : ''}`;
        }
    } catch (e) {
        console.error('Error al cargar sync', e);
    }
}

