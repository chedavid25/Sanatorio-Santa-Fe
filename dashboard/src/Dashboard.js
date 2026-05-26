import { supabase } from './lib/supabase'
import { DEPARTAMENTOS } from './config'
import { fetchAllBaseData, fetchPracticaDetail, fetchSedeDetail, fetchServicioDetail, computeViewData, MODULO_LABELS, MODULOS } from './lib/data'
import { getFilter, setFilter, clearFilter, onFilterChange, getUser, hasPermission } from './lib/state'
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
                    <!-- Filter badge -->
                    <div id="filter-badge-wrap" class="d-none">
                        <span class="badge bg-primary d-flex align-items-center gap-1 px-3 py-2 font-size-12"
                              style="border-radius:20px; cursor:default;">
                            <i class="bx bx-filter-alt"></i>
                            <span id="filter-badge-text">Filtrando</span>
                            <button id="clear-filter-btn" class="btn-close btn-close-white ms-1"
                                    style="font-size:0.55rem;" aria-label="Limpiar filtro"></button>
                        </span>
                    </div>

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
                                    <small class="text-muted" id="trend-chart-hint">Usá las tarjetas de arriba para filtrar por módulo</small>
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
                                    <small class="text-muted">Hacé clic para filtrar todos los gráficos</small>
                                </div>
                                <div class="card-body">
                                    <div id="practicas-chart" class="apex-charts"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-4">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title mb-0">Top Médicos Derivantes</h4>
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

    function updateFilterBadge(filter) {
        const wrap = document.getElementById('filter-badge-wrap');
        const text = document.getElementById('filter-badge-text');
        const hint = document.getElementById('trend-chart-hint');
        if (!wrap || !text) return;
        if (filter.tipo) {
            const displayLabel = filter.tipo === 'modulo'
                ? (MODULO_LABELS[filter.valor] || filter.valor)
                : (filter.label || filter.valor);
            const tipoLabel = filter.tipo === 'modulo' 
                ? 'Módulo' 
                : (filter.tipo === 'intermediaria' 
                    ? 'Intermediaria' 
                    : (filter.tipo === 'sede' ? 'Sede' : 'Práctica'));
            text.textContent = `${tipoLabel}: ${displayLabel}`;
            wrap.classList.remove('d-none');
            if (hint) hint.textContent = 'Hacé clic en × para limpiar el filtro';
        } else {
            wrap.classList.add('d-none');
            if (hint) hint.textContent = 'Usá las tarjetas de arriba para filtrar por módulo';
        }
    }

    function renderAll(baseData, filter) {
        const range = getDateRange();
        if (!range) return; // DOM desmontado, ignorar
        const { dateFrom, dateTo } = range;
        const permitidos = MODULOS.filter(mod => hasPermission(mod));
        const viewData = computeViewData(baseData, filter, dateFrom, dateTo, compararActivo, anioComparacion, permitidos);

        updateFilterBadge(filter);
        renderKPICards(document.getElementById('kpi-container'), viewData.kpi, filter);
        renderMainChart('main-trend-chart', viewData.trend, filter);
        renderPracticasChart('practicas-chart', viewData.practicas, filter);
        renderDerivantesChart('derivantes-chart', viewData.derivantes);
        renderDistributionCharts(viewData.os, viewData.int, viewData.sede, viewData.area);
        renderServicioDerivante(viewData.servicioDerivante, (servicio) => handleServicioFilter(servicio));
    }

    async function handlePracticaFilter(filter) {
        if (!filter.tipo || !filter.valor) return;
        try {
            const { dateFrom, dateTo } = getDateRange();
            const [fromAnio, fromMes] = dateFrom.split('-').map(Number);
            const [toAnio, toMes] = dateTo.split('-').map(Number);
            const detail = await fetchPracticaDetail(filter.valor, fromAnio, toAnio);
            const fromVal = fromAnio * 100 + fromMes;
            const toVal = toAnio * 100 + toMes;

            const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const mesFiltrado = detail.mes.filter(r => {
                const v = r.anio * 100 + r.mes;
                return v >= fromVal && v <= toVal;
            });
            const sortedMes = [...mesFiltrado].sort((a, b) => (a.anio * 100 + a.mes) - (b.anio * 100 + b.mes));
            const trendLabels = sortedMes.map(r => `${MESES[r.mes - 1]} ${String(r.anio).slice(2)}`);
            const trendSeries = [{ name: filter.label || filter.valor, data: sortedMes.map(r => r.total_estudios) }];

            renderMainChart('main-trend-chart', { labels: trendLabels, series: trendSeries }, filter);
            // Calcular distribución de área para la práctica
            const moduloFiltroAct = getFilter().tipo === 'modulo' ? getFilter().valor : null;
            const permitidosAct = MODULOS.filter(mod => hasPermission(mod));
            const areaPracFiltrado = (cachedBaseData?.area_por_mes || []).filter(r => {
                const v = r.anio * 100 + r.mes;
                const matchFecha = v >= fromVal && v <= toVal;
                const matchModulo = permitidosAct.includes(r.modulo) && (!moduloFiltroAct || r.modulo === moduloFiltroAct);
                return matchFecha && matchModulo;
            });
            const areaPracMap = { Ambulatorio: 0, Internado: 0 };
            areaPracFiltrado.forEach(r => {
                if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
                    areaPracMap[r.area_tipo] += r.cantidad;
                }
            });
            let areaPracDataComp = null;
            if (compararActivo) {
                const diffYears = toAnio - Number(anioComparacion);
                const compFromVal = (fromAnio - diffYears) * 100 + fromMes;
                const compToVal   = (toAnio   - diffYears) * 100 + toMes;
                const areaPracCompFiltrado = (cachedBaseData?.area_por_mes || []).filter(r => {
                    const v = r.anio * 100 + r.mes;
                    const matchFecha = v >= compFromVal && v <= compToVal;
                    const matchModulo = permitidosAct.includes(r.modulo) && (!moduloFiltroAct || r.modulo === moduloFiltroAct);
                    return matchFecha && matchModulo;
                });
                const areaPracMapComp = { Ambulatorio: 0, Internado: 0 };
                areaPracCompFiltrado.forEach(r => {
                    if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
                        areaPracMapComp[r.area_tipo] += r.cantidad;
                    }
                });
                areaPracDataComp = [areaPracMapComp.Ambulatorio, areaPracMapComp.Internado];
            }

            renderDistributionCharts(
                { labels: detail.os.map(r => r.nombre_os), data: detail.os.map(r => r.total_estudios) },
                { labels: detail.int.map(r => r.intermediaria_limpia), data: detail.int.map(r => r.total_estudios) },
                null, // En filtro de práctica, el de sedes no se redefine o se limpia
                { labels: ['Ambulatorio', 'Internado'], data: [areaPracMap.Ambulatorio, areaPracMap.Internado], dataComp: areaPracDataComp }
            );
        } catch (err) {
            console.error('Error al cargar detalle de práctica', err);
        }
    }

    async function handleServicioFilter(servicio) {
        if (!servicio) return;
        try {
            // Actualizar badge de filtro visualmente (informativo)
            const wrap = document.getElementById('filter-badge-wrap');
            const text = document.getElementById('filter-badge-text');
            if (wrap && text) {
                text.textContent = `Servicio: ${servicio}`;
                wrap.classList.remove('d-none');
            }
            const detail = await fetchServicioDetail(servicio);
            renderDerivantesChart('derivantes-chart', {
                labels: detail.derivantes.map(r => r.nombre_solicitante),
                data: detail.derivantes.map(r => r.total_derivaciones),
            });
            // Actualizar encabezado del card de derivantes
            const cardTitle = document.querySelector('#derivantes-chart')?.closest('.card')?.querySelector('.card-title');
            if (cardTitle) cardTitle.textContent = `Médicos Derivantes — ${servicio}`;
        } catch (err) {
            console.error('Error al cargar detalle de servicio', err);
        }
    }

    async function handleSedeFilter(filter) {
        if (!filter.tipo || !filter.valor) return;
        try {
            const { dateFrom, dateTo } = getDateRange();
            const [fromAnio, fromMes] = dateFrom.split('-').map(Number);
            const [toAnio, toMes] = dateTo.split('-').map(Number);
            const detail = await fetchSedeDetail(filter.valor, fromAnio, toAnio);
            const fromVal = fromAnio * 100 + fromMes;
            const toVal = toAnio * 100 + toMes;

            const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const mesFiltrado = detail.mes.filter(r => {
                const v = r.anio * 100 + r.mes;
                return v >= fromVal && v <= toVal;
            });
            const sortedMes = [...mesFiltrado].sort((a, b) => (a.anio * 100 + a.mes) - (b.anio * 100 + b.mes));
            const trendLabels = sortedMes.map(r => `${MESES[r.mes - 1]} ${String(r.anio).slice(2)}`);
            const trendSeries = [{ name: filter.label || filter.valor, data: sortedMes.map(r => r.total_estudios) }];

            // Recalcular KPIs
            const modulosPermitidos = ['Video', 'Tomo', 'Resonancia', 'Eco'].filter(m => hasPermission(m));
            const kpiPorModulo = {};
            modulosPermitidos.forEach(m => {
                kpiPorModulo[m] = detail.mes
                    .filter(r => r.modulo === m)
                    .reduce((s, r) => s + r.total_estudios, 0);
            });
            const kpiTotal = Object.values(kpiPorModulo).reduce((a, b) => a + b, 0);

            // Sparklines
            const sparklines = { Total: sortedMes.map(() => 0) };
            modulosPermitidos.forEach(mod => {
                const byMonth = {};
                detail.mes.filter(r => r.modulo === mod).forEach(r => {
                    byMonth[`${r.anio}-${String(r.mes).padStart(2, '0')}`] = r.total_estudios;
                });
                const sortedKeys = sortedMes.map(r => `${r.anio}-${String(r.mes).padStart(2, '0')}`);
                sparklines[mod] = sortedKeys.map(k => byMonth[k] || 0);
            });
            sortedMes.forEach((_, i) => {
                sparklines.Total[i] = modulosPermitidos.reduce((s, m) => s + (sparklines[m][i] || 0), 0);
            });

            renderKPICards(document.getElementById('kpi-container'), { total: kpiTotal, porModulo: kpiPorModulo, sparklines }, filter);
            renderMainChart('main-trend-chart', { labels: trendLabels, series: trendSeries }, filter);

            // Calcular distribución de área filtrada por Sede
            const moduloFiltroSede = getFilter().tipo === 'modulo' ? getFilter().valor : null;
            const permitidosSede = MODULOS.filter(mod => hasPermission(mod));
            const areaSedeFiltrado = (cachedBaseData?.area_por_mes || []).filter(r => {
                const v = r.anio * 100 + r.mes;
                const matchFecha = v >= fromVal && v <= toVal;
                const matchModulo = permitidosSede.includes(r.modulo) && (!moduloFiltroSede || r.modulo === moduloFiltroSede);
                const matchSede = r.sede === filter.valor;
                return matchFecha && matchModulo && matchSede;
            });
            const areaSedeMap = { Ambulatorio: 0, Internado: 0 };
            areaSedeFiltrado.forEach(r => {
                if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
                    areaSedeMap[r.area_tipo] += r.cantidad;
                }
            });
            let areaSedeDataComp = null;
            if (compararActivo) {
                const diffYears = toAnio - Number(anioComparacion);
                const compFromVal = (fromAnio - diffYears) * 100 + fromMes;
                const compToVal   = (toAnio   - diffYears) * 100 + toMes;
                const areaSedeCompFiltrado = (cachedBaseData?.area_por_mes || []).filter(r => {
                    const v = r.anio * 100 + r.mes;
                    const matchFecha = v >= compFromVal && v <= compToVal;
                    const matchModulo = permitidosSede.includes(r.modulo) && (!moduloFiltroSede || r.modulo === moduloFiltroSede);
                    const matchSede = r.sede === filter.valor;
                    return matchFecha && matchModulo && matchSede;
                });
                const areaSedeMapComp = { Ambulatorio: 0, Internado: 0 };
                areaSedeCompFiltrado.forEach(r => {
                    if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
                        areaSedeMapComp[r.area_tipo] += r.cantidad;
                    }
                });
                areaSedeDataComp = [areaSedeMapComp.Ambulatorio, areaSedeMapComp.Internado];
            }

            renderDistributionCharts(
                { labels: detail.os.map(r => r.nombre_os), data: detail.os.map(r => r.total_estudios) },
                { labels: detail.int.map(r => r.intermediaria_limpia), data: detail.int.map(r => r.total_estudios) },
                { labels: [filter.valor], data: [kpiTotal] },
                { labels: ['Ambulatorio', 'Internado'], data: [areaSedeMap.Ambulatorio, areaSedeMap.Internado], dataComp: areaSedeDataComp }
            );

            renderPracticasChart('practicas-chart', {
                labels: detail.practicas.map(r => r.nombre_practica),
                data: detail.practicas.map(r => r.total_estudios),
                codigos: detail.practicas.map(r => r.codigo_practica),
            }, filter);

            renderDerivantesChart('derivantes-chart', {
                labels: detail.derivantes.map(r => r.nombre_solicitante),
                data: detail.derivantes.map(r => r.total_derivaciones),
            });
        } catch (err) {
            console.error('Error al cargar detalle de sede', err);
        }
    }

    // ── Filter change listener ─────────────────────────────────
    const unsubscribe = onFilterChange(filter => {
        if (!cachedBaseData) return;
        renderAll(cachedBaseData, filter);
        if (filter.tipo === 'practica') handlePracticaFilter(filter);
        if (filter.tipo === 'sede') handleSedeFilter(filter);
    });

    // ── Filter badge clear button ──────────────────────────────
    document.getElementById('clear-filter-btn')?.addEventListener('click', () => {
        clearFilter();
        // Restaurar título del card de derivantes
        const cardTitle = document.querySelector('#derivantes-chart')?.closest('.card')?.querySelector('.card-title');
        if (cardTitle) cardTitle.textContent = 'Top Médicos Derivantes';
    });

    // ── Load base data ─────────────────────────────────────────
    // fetchYearRange: computes [minAnio, maxAnio] to pass to fetchAllBaseData.
    // When comparison is active we extend the range down to cover the comparison year too.
    function fetchYearRange() {
        const range = getDateRange();
        if (!range) return null;
        const { dateFrom, dateTo } = range;
        const fromAnio = Number(dateFrom.split('-')[0]);
        const toAnio   = Number(dateTo.split('-')[0]);
        // If comparison is active, also cover the comparison year
        const compAnio = compararActivo && anioComparacion ? Number(anioComparacion) : fromAnio;
        return { minAnio: Math.min(fromAnio, compAnio), maxAnio: toAnio };
    }

    async function loadBaseData() {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return; // DOM desmontado
        try {
            kpiContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center py-5">
                    <div class="spinner-border text-primary me-3" role="status"></div>
                    <span class="text-muted">Cargando datos…</span>
                </div>`;

            const yearRange = fetchYearRange();
            if (!yearRange) return; // DOM desmontado
            const { minAnio, maxAnio } = yearRange;
            cachedBaseData = await fetchAllBaseData(minAnio, maxAnio);
            renderAll(cachedBaseData, getFilter());
        } catch (error) {
            console.error('Error al cargar datos', error);
            const kpi2 = document.getElementById('kpi-container');
            if (kpi2) kpi2.innerHTML = `<div class="alert alert-danger">Error al cargar datos: ${error.message}</div>`;
        }
    }

    // Date range changes → re-fetch from server with the new year range
    async function onDateChange() {
        await loadBaseData();
        const filter = getFilter();
        if (filter.tipo === 'practica') handlePracticaFilter(filter);
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
        // Re-fetch: activating comparison may extend the year range needed
        await loadBaseData();
    });

    document.getElementById('compare-year-select')?.addEventListener('change', async e => {
        anioComparacion = e.target.value;
        if (compararActivo) await loadBaseData();  // new year = different server filter
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
