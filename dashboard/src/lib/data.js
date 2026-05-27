import { supabase } from './supabase'

export const MODULOS = ['Video', 'Tomo', 'Resonancia', 'Eco'];
export const MODULO_COLORS = ['#004884', '#0072bc', '#56abe8', '#2a8ed2'];
export const MODULO_LABELS = {
    Video:      'Videoendoscopía',
    Tomo:       'Tomografía',
    Resonancia: 'Resonancia',
    Eco:        'Ecografía',
};
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const g = (view, cols) => () => supabase.schema('gold').from(view).select(cols);
const gMes = (view, cols, fromAnio, toAnio) => async () => {
    let allData = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
        const res = await supabase.schema('gold').from(view)
            .select(cols)
            .gte('anio', fromAnio)
            .lte('anio', toAnio)
            .range(from, to);

        if (res.error) {
            throw res.error;
        }

        const data = res.data || [];
        allData = allData.concat(data);
        if (data.length < 1000) {
            hasMore = false;
        } else {
            from += 1000;
            to += 1000;
        }
    }
    return { data: allData };
};

// Helper robusto para ejecutar consultas con reintentos y retroceso exponencial
async function withRetry(queryFn, retries = 3, delayMs = 600) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await queryFn();
            if (res && res.error) {
                throw res.error;
            }
            return res.data || [];
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`[Supabase Query] Falló, reintentando en ${delayMs}ms... (Intento ${i + 1}/${retries}). Error:`, err);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 1.8; // Backoff exponencial
        }
    }
}

export async function fetchAllBaseData(fromAnio = 2023, toAnio = parseInt(new Date().toISOString().slice(0, 4), 10)) {
    // Definimos las 9 consultas como funciones diferidas
    const queries = {
        resumen:                 gMes('gold_vw_di_resumen_por_mes',       'modulo,anio,mes,cantidad',                                     fromAnio, toAnio),
        os_por_mes:              gMes('gold_vw_di_os_por_mes',             'modulo,os_nombre_limpio,anio,mes,cantidad',                   fromAnio, toAnio),
        int_por_mes:             gMes('gold_vw_di_intermediaria_por_mes',  'modulo,intermediaria_limpia,anio,mes,cantidad',               fromAnio, toAnio),
        practicas_por_mes:       gMes('gold_vw_di_practicas_por_mes',      'modulo,codigo_practica,nombre_practica,anio,mes,total_estudios', fromAnio, toAnio),
        derivantes_por_mes:      gMes('gold_vw_di_derivantes_por_mes',     'modulo,nombre_solicitante,anio,mes,cantidad',                 fromAnio, toAnio),
        os_por_intermediaria:    g('gold_vw_di_os_por_intermediaria',      'modulo,intermediaria_limpia,nombre_os,total_estudios'),
        resumen_sede:            gMes('gold_vw_di_resumen_por_sede_mes',   'modulo,sede,anio,mes,total_estudios',                         fromAnio, toAnio),
        area_por_mes:            gMes('gold_vw_di_area_por_mes',           'modulo,sede,anio,mes,area_tipo,cantidad',                     fromAnio, toAnio),
        derivantes_por_servicio: g('gold_vw_di_derivantes_por_servicio',   'modulo,servicio_unificado,total_estudios'),
    };

    // Estructuramos la carga en lotes paralelos (máximo 3 consultas concurrentes)
    // para no saturar las conexiones de Supabase/PostgREST.
    const runBatch = async (batchQueries) => {
        const batchKeys = Object.keys(batchQueries);
        const batchPromises = batchKeys.map(key => 
            withRetry(batchQueries[key])
                .then(data => ({ key, status: 'fulfilled', value: data }))
                .catch(err => {
                    console.error(`Error crítico cargando vista '${key}':`, err);
                    return { key, status: 'rejected', reason: err, value: [] };
                })
        );
        return Promise.all(batchPromises);
    };

    // Lote 1: Datos críticos mensuales
    const batch1Results = await runBatch({
        resumen: queries.resumen,
        os_por_mes: queries.os_por_mes,
        int_por_mes: queries.int_por_mes,
    });

    // Lote 2: Detalles de prácticas, derivantes y sedes
    const batch2Results = await runBatch({
        practicas_por_mes: queries.practicas_por_mes,
        derivantes_por_mes: queries.derivantes_por_mes,
        resumen_sede: queries.resumen_sede,
    });

    // Lote 3: Vistas estáticas y auxiliares
    const batch3Results = await runBatch({
        os_por_intermediaria: queries.os_por_intermediaria,
        area_por_mes: queries.area_por_mes,
        derivantes_por_servicio: queries.derivantes_por_servicio,
    });

    // Combinar todos los resultados en un único mapa
    const resultsMap = {};
    [...batch1Results, ...batch2Results, ...batch3Results].forEach(res => {
        resultsMap[res.key] = res.value;
    });

    // Si la vista crítica resumen falló tras los reintentos, lanzamos error general
    const resumenRes = batch1Results.find(r => r.key === 'resumen');
    if (resumenRes && resumenRes.status === 'rejected') {
        throw resumenRes.reason;
    }

    return {
        resumen:                 resultsMap.resumen,
        os_por_mes:              resultsMap.os_por_mes,
        int_por_mes:             resultsMap.int_por_mes,
        practicas_por_mes:       resultsMap.practicas_por_mes,
        derivantes_por_mes:      resultsMap.derivantes_por_mes,
        os_por_intermediaria:    resultsMap.os_por_intermediaria,
        resumen_sede:            resultsMap.resumen_sede,
        area_por_mes:            resultsMap.area_por_mes,
        derivantes_por_servicio: resultsMap.derivantes_por_servicio,
    };
}

export async function fetchPracticaDetail(codigoPractica, fromAnio = null, toAnio = null) {
    // Build the por_mes query with optional server-side year filter
    let mesMesQuery = supabase.schema('gold').from('gold_vw_di_practicas_por_mes')
        .select('anio,mes,total_estudios')
        .eq('codigo_practica', codigoPractica);
    if (fromAnio) mesMesQuery = mesMesQuery.gte('anio', fromAnio);
    if (toAnio)   mesMesQuery = mesMesQuery.lte('anio', toAnio);

    const [osRes, intRes, mesRes] = await Promise.all([
        supabase.schema('gold').from('gold_vw_di_practicas_por_os')
            .select('nombre_os,total_estudios')
            .eq('codigo_practica', codigoPractica)
            .order('total_estudios', { ascending: false })
            .limit(10),
        supabase.schema('gold').from('gold_vw_di_practicas_por_intermediaria')
            .select('intermediaria_limpia,total_estudios')
            .eq('codigo_practica', codigoPractica)
            .order('total_estudios', { ascending: false })
            .limit(10),
        mesMesQuery,
    ]);
    return {
        os: osRes.data || [],
        int: intRes.data || [],
        mes: mesRes.data || [],
    };
}

export async function fetchSedeDetail(sede, fromAnio = null, toAnio = null) {
    let mesMesQuery = supabase.schema('gold').from('gold_vw_di_resumen_por_sede_mes')
        .select('modulo,anio,mes,total_estudios')
        .eq('sede', sede);
    if (fromAnio) mesMesQuery = mesMesQuery.gte('anio', fromAnio);
    if (toAnio)   mesMesQuery = mesMesQuery.lte('anio', toAnio);

    const [osRes, intRes, practicasRes, derivantesRes, mesRes] = await Promise.all([
        supabase.schema('gold').from('gold_vw_di_sede_por_os')
            .select('nombre_os,total_estudios')
            .eq('sede', sede)
            .order('total_estudios', { ascending: false })
            .limit(10),
        supabase.schema('gold').from('gold_vw_di_sede_por_intermediaria')
            .select('intermediaria_limpia,total_estudios')
            .eq('sede', sede)
            .order('total_estudios', { ascending: false })
            .limit(10),
        supabase.schema('gold').from('gold_vw_di_sede_por_practica')
            .select('modulo,codigo_practica,nombre_practica,total_estudios')
            .eq('sede', sede)
            .order('total_estudios', { ascending: false })
            .limit(15),
        supabase.schema('gold').from('gold_vw_di_sede_por_derivante')
            .select('modulo,nombre_solicitante,total_derivaciones')
            .eq('sede', sede)
            .order('total_derivaciones', { ascending: false })
            .limit(10),
        mesMesQuery
    ]);
    return {
        os: osRes.data || [],
        int: intRes.data || [],
        practicas: practicasRes.data || [],
        derivantes: derivantesRes.data || [],
        mes: mesRes.data || [],
    };
}

export async function fetchServicioDetail(servicioUnificado) {
    // Obtener los derivantes específicos asociados a ese servicio unificado
    const { data: derivantes } = await supabase.schema('gold').from('gold_vw_di_servicio_por_derivante')
        .select('modulo,nombre_solicitante,total_derivaciones')
        .eq('servicio_unificado', servicioUnificado)
        .order('total_derivaciones', { ascending: false })
        .limit(20);
    return {
        derivantes: derivantes || []
    };
}

export function computeViewData(baseData, filters, dateFrom, dateTo, compararActivo = false, anioComparacion = null, permitidos = MODULOS) {
    const [fromAnio, fromMes] = dateFrom.split('-').map(Number);
    const [toAnio, toMes] = dateTo.split('-').map(Number);
    const fromVal = fromAnio * 100 + fromMes;
    const toVal = toAnio * 100 + toMes;

    // Helper para verificar filtros comunes
    const matchesCommonFilters = (row, excludeFilterKey = null) => {
        // Rango de fechas
        const v = row.anio * 100 + row.mes;
        if (v < fromVal || v > toVal) return false;

        // Permisos de módulo
        if (!permitidos.includes(row.modulo)) return false;

        // Filtro de Módulo
        if (excludeFilterKey !== 'modulo' && filters.modulo) {
            if (row.modulo !== filters.modulo.valor) return false;
        }

        // Filtro de Sede
        if (excludeFilterKey !== 'sede' && filters.sede) {
            if (row.sede !== filters.sede.valor) return false;
        }

        // Filtro de Práctica
        if (excludeFilterKey !== 'practica' && filters.practica) {
            // Nota: En las tablas mensuales el código de práctica se llama codigo_practica
            const cod = row.codigo_practica || row.codigo;
            if (cod && String(cod) !== String(filters.practica.valor)) return false;
        }

        // Filtro de Obra Social
        if (excludeFilterKey !== 'os' && filters.os) {
            const osVal = row.os_nombre_limpio || row.nombre_os;
            if (osVal && osVal !== filters.os.valor) return false;
        }

        // Filtro de Intermediaria
        if (excludeFilterKey !== 'intermediaria' && filters.intermediaria) {
            const intVal = row.intermediaria_limpia;
            if (intVal && intVal !== filters.intermediaria.valor) return false;
        }

        // Filtro de Médico Derivante
        if (excludeFilterKey !== 'derivante' && filters.derivante) {
            const derVal = row.nombre_solicitante || row.derivante;
            if (derVal && derVal !== filters.derivante.valor) return false;
        }

        return true;
    };

    // Helper para verificar filtros comunes en el período comparado
    const diffYears = compararActivo && anioComparacion ? (toAnio - Number(anioComparacion)) : 0;
    const compFromVal = (fromAnio - diffYears) * 100 + fromMes;
    const compToVal   = (toAnio   - diffYears) * 100 + toMes;

    const matchesCommonFiltersComp = (row, excludeFilterKey = null) => {
        const v = row.anio * 100 + row.mes;
        if (v < compFromVal || v > compToVal) return false;

        if (!permitidos.includes(row.modulo)) return false;

        if (excludeFilterKey !== 'modulo' && filters.modulo) {
            if (row.modulo !== filters.modulo.valor) return false;
        }
        if (excludeFilterKey !== 'sede' && filters.sede) {
            if (row.sede !== filters.sede.valor) return false;
        }
        if (excludeFilterKey !== 'practica' && filters.practica) {
            const cod = row.codigo_practica || row.codigo;
            if (cod && String(cod) !== String(filters.practica.valor)) return false;
        }
        if (excludeFilterKey !== 'os' && filters.os) {
            const osVal = row.os_nombre_limpio || row.nombre_os;
            if (osVal && osVal !== filters.os.valor) return false;
        }
        if (excludeFilterKey !== 'intermediaria' && filters.intermediaria) {
            const intVal = row.intermediaria_limpia;
            if (intVal && intVal !== filters.intermediaria.valor) return false;
        }
        if (excludeFilterKey !== 'derivante' && filters.derivante) {
            const derVal = row.nombre_solicitante || row.derivante;
            if (derVal && derVal !== filters.derivante.valor) return false;
        }

        return true;
    };

    // ── Resumen Filtrado (para KPIs y Gráfico de Tendencia) ────────────────
    // Si estamos en un filtro de práctica, derivante, etc., debemos usar los datos de sus respectivas tablas de origen para el KPI
    // ya que la tabla "resumen" no tiene columnas de OS, Práctica o Derivante.
    let kpiDataRows = [];
    let kpiDataRowsComp = [];

    if (filters.practica) {
        kpiDataRows = (baseData.practicas_por_mes || []).filter(r => matchesCommonFilters(r));
        if (compararActivo) kpiDataRowsComp = (baseData.practicas_por_mes || []).filter(r => matchesCommonFiltersComp(r));
    } else if (filters.derivante) {
        kpiDataRows = (baseData.derivantes_por_mes || []).filter(r => matchesCommonFilters(r));
        if (compararActivo) kpiDataRowsComp = (baseData.derivantes_por_mes || []).filter(r => matchesCommonFiltersComp(r));
    } else if (filters.os) {
        kpiDataRows = (baseData.os_por_mes || []).filter(r => matchesCommonFilters(r));
        if (compararActivo) kpiDataRowsComp = (baseData.os_por_mes || []).filter(r => matchesCommonFiltersComp(r));
    } else if (filters.intermediaria) {
        kpiDataRows = (baseData.int_por_mes || []).filter(r => matchesCommonFilters(r));
        if (compararActivo) kpiDataRowsComp = (baseData.int_por_mes || []).filter(r => matchesCommonFiltersComp(r));
    } else if (filters.sede) {
        kpiDataRows = (baseData.resumen_sede || []).filter(r => matchesCommonFilters(r));
        if (compararActivo) kpiDataRowsComp = (baseData.resumen_sede || []).filter(r => matchesCommonFiltersComp(r));
    } else {
        kpiDataRows = (baseData.resumen || []).filter(r => matchesCommonFilters(r));
        if (compararActivo) kpiDataRowsComp = (baseData.resumen || []).filter(r => matchesCommonFiltersComp(r));
    }

    // Sorted list of months in the current range
    const monthSet = new Set(kpiDataRows.map(r => `${r.anio}-${String(r.mes).padStart(2, '0')}`));
    const sortedMonths = Array.from(monthSet).sort();

    // ── Trend labels & series ──────────────────────────────────────
    let trendLabels;
    if (compararActivo) {
        trendLabels = sortedMonths.map(k => {
            const [, m] = k.split('-');
            return MESES[parseInt(m) - 1];
        });
    } else {
        trendLabels = sortedMonths.map(k => {
            const [y, m] = k.split('-');
            return `${MESES[parseInt(m) - 1]} ${y.slice(2)}`;
        });
    }

    const trendByMonth = {};
    kpiDataRows.forEach(r => {
        const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
        const cant = r.cantidad !== undefined ? r.cantidad : (r.total_estudios !== undefined ? r.total_estudios : 0);
        trendByMonth[k] = (trendByMonth[k] || 0) + cant;
    });

    let trendSeries = [];
    if (compararActivo) {
        const trendByMonthComp = {};
        kpiDataRowsComp.forEach(r => {
            const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
            const cant = r.cantidad !== undefined ? r.cantidad : (r.total_estudios !== undefined ? r.total_estudios : 0);
            trendByMonthComp[k] = (trendByMonthComp[k] || 0) + cant;
        });

        const actualData = sortedMonths.map(k => trendByMonth[k] || 0);
        const compData = sortedMonths.map(k => {
            const [y, m] = k.split('-');
            const compKey = `${Number(y) - diffYears}-${m}`;
            return trendByMonthComp[compKey] || 0;
        });

        trendSeries = [
            { name: `Actual (${toAnio})`, data: actualData },
            { name: `Comparado (${anioComparacion})`, data: compData }
        ];
    } else {
        const trendName = filters.modulo ? filters.modulo.valor : 'Total';
        trendSeries = [{ name: trendName, data: sortedMonths.map(k => trendByMonth[k] || 0) }];
    }

    // ── KPI totals (current + comparison) ─────────────────────────
    const kpiPorModulo = {};
    permitidos.forEach(m => {
        kpiPorModulo[m] = kpiDataRows
            .filter(r => r.modulo === m)
            .reduce((s, r) => s + (r.cantidad !== undefined ? r.cantidad : (r.total_estudios !== undefined ? r.total_estudios : 0)), 0);
    });
    const kpiTotal = Object.values(kpiPorModulo).reduce((a, b) => a + b, 0);

    const kpiPorModuloComp = {};
    let kpiTotalComp = 0;
    if (compararActivo) {
        permitidos.forEach(m => {
            kpiPorModuloComp[m] = kpiDataRowsComp
                .filter(r => r.modulo === m)
                .reduce((s, r) => s + (r.cantidad !== undefined ? r.cantidad : (r.total_estudios !== undefined ? r.total_estudios : 0)), 0);
        });
        kpiTotalComp = Object.values(kpiPorModuloComp).reduce((a, b) => a + b, 0);
    }

    // ── Sparklines ────────────────────────────────────────────────
    const sparklines = { Total: sortedMonths.map(() => 0) };
    permitidos.forEach(mod => {
        const modRows = kpiDataRows.filter(r => r.modulo === mod);
        const byMonth = {};
        modRows.forEach(r => {
            const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
            const cant = r.cantidad !== undefined ? r.cantidad : (r.total_estudios !== undefined ? r.total_estudios : 0);
            byMonth[k] = (byMonth[k] || 0) + cant;
        });
        sparklines[mod] = sortedMonths.map(k => byMonth[k] || 0);
    });
    sortedMonths.forEach((_, i) => {
        sparklines.Total[i] = permitidos.reduce((s, m) => s + (sparklines[m][i] || 0), 0);
    });

    // ── OS distribution ───────────────────────────────────────────
    let osEntries, osCompMap = {};
    const osFiltrado = (baseData.os_por_mes || []).filter(r => matchesCommonFilters(r, 'os'));
    const osMap = {};
    osFiltrado.forEach(r => {
        if (r.os_nombre_limpio) osMap[r.os_nombre_limpio] = (osMap[r.os_nombre_limpio] || 0) + r.cantidad;
    });
    osEntries = Object.entries(osMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (compararActivo) {
        (baseData.os_por_mes || []).filter(r => matchesCommonFiltersComp(r, 'os')).forEach(r => {
            if (r.os_nombre_limpio) osCompMap[r.os_nombre_limpio] = (osCompMap[r.os_nombre_limpio] || 0) + r.cantidad;
        });
    }

    // ── INT distribution ──────────────────────────────────────────
    const intFiltrado = (baseData.int_por_mes || []).filter(r => matchesCommonFilters(r, 'intermediaria'));
    const intMap = {};
    intFiltrado.forEach(r => {
        if (r.intermediaria_limpia) intMap[r.intermediaria_limpia] = (intMap[r.intermediaria_limpia] || 0) + r.cantidad;
    });
    const intEntries = Object.entries(intMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const intCompMap = {};
    if (compararActivo) {
        (baseData.int_por_mes || []).filter(r => matchesCommonFiltersComp(r, 'intermediaria')).forEach(r => {
            if (r.intermediaria_limpia) intCompMap[r.intermediaria_limpia] = (intCompMap[r.intermediaria_limpia] || 0) + r.cantidad;
        });
    }

    // ── Sede distribution ──────────────────────────────────────────
    const sedeFiltrado = (baseData.resumen_sede || []).filter(r => matchesCommonFilters(r, 'sede'));
    const sedeMap = {};
    sedeFiltrado.forEach(r => {
        if (r.sede) sedeMap[r.sede] = (sedeMap[r.sede] || 0) + r.total_estudios;
    });
    const sedeEntries = Object.entries(sedeMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const sedeCompMap = {};
    if (compararActivo) {
        (baseData.resumen_sede || []).filter(r => matchesCommonFiltersComp(r, 'sede')).forEach(r => {
            if (r.sede) sedeCompMap[r.sede] = (sedeCompMap[r.sede] || 0) + r.total_estudios;
        });
    }

    // ── Top Prácticas ─────────────────────────────────────────────
    const practicasFiltradas = (baseData.practicas_por_mes || []).filter(r => matchesCommonFilters(r, 'practica'));
    const practicasMap = {};
    practicasFiltradas.forEach(r => {
        if (!r.codigo_practica) return;
        if (!practicasMap[r.codigo_practica]) {
            practicasMap[r.codigo_practica] = { nombre_practica: r.nombre_practica, total: 0 };
        }
        practicasMap[r.codigo_practica].total += r.total_estudios;
    });
    const topPracticas = Object.entries(practicasMap)
        .map(([codigo, v]) => ({ codigo_practica: codigo, nombre_practica: v.nombre_practica, total_estudios: v.total }))
        .sort((a, b) => b.total_estudios - a.total_estudios)
        .slice(0, 15);

    const practicasCompMap = {};
    if (compararActivo) {
        (baseData.practicas_por_mes || []).filter(r => matchesCommonFiltersComp(r, 'practica')).forEach(r => {
            if (r.codigo_practica) practicasCompMap[r.codigo_practica] = (practicasCompMap[r.codigo_practica] || 0) + r.total_estudios;
        });
    }

    // ── Top Derivantes ────────────────────────────────────────────
    const derivantesFiltrados = (baseData.derivantes_por_mes || []).filter(r => matchesCommonFilters(r, 'derivante'));
    const derivantesMap = {};
    derivantesFiltrados.forEach(r => {
        if (!r.nombre_solicitante) return;
        derivantesMap[r.nombre_solicitante] = (derivantesMap[r.nombre_solicitante] || 0) + r.cantidad;
    });
    const topDerivantes = Object.entries(derivantesMap)
        .map(([nombre, cantidad]) => ({ nombre_solicitante: nombre, total_derivaciones: cantidad }))
        .sort((a, b) => b.total_derivaciones - a.total_derivaciones)
        .slice(0, 10);

    const derivantesCompMap = {};
    if (compararActivo) {
        (baseData.derivantes_por_mes || []).filter(r => matchesCommonFiltersComp(r, 'derivante')).forEach(r => {
            if (r.nombre_solicitante) derivantesCompMap[r.nombre_solicitante] = (derivantesCompMap[r.nombre_solicitante] || 0) + r.cantidad;
        });
    }

    // ── Derivantes por servicio unificado ─────────────────────────
    const servFiltrado = (baseData.derivantes_por_servicio || []).filter(r => {
        return permitidos.includes(r.modulo) && (!filters.modulo || r.modulo === filters.modulo.valor);
    });
    const servMap = {};
    servFiltrado.forEach(r => {
        if (r.servicio_unificado) servMap[r.servicio_unificado] = (servMap[r.servicio_unificado] || 0) + r.total_estudios;
    });
    const servEntries = Object.entries(servMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // ── Área distribution (Ambulatorio vs Internado) ──────────────────────
    const areaFiltrado = (baseData.area_por_mes || []).filter(r => matchesCommonFilters(r));
    const areaMap = { Ambulatorio: 0, Internado: 0 };
    areaFiltrado.forEach(r => {
        if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
            areaMap[r.area_tipo] += r.cantidad;
        }
    });

    const areaLabels = ['Ambulatorio', 'Internado'];
    const areaData = [areaMap.Ambulatorio, areaMap.Internado];

    let areaDataComp = null;
    if (compararActivo) {
        const areaCompFiltrado = (baseData.area_por_mes || []).filter(r => matchesCommonFiltersComp(r));
        const areaMapComp = { Ambulatorio: 0, Internado: 0 };
        areaCompFiltrado.forEach(r => {
            if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
                areaMapComp[r.area_tipo] += r.cantidad;
            }
        });
        areaDataComp = [areaMapComp.Ambulatorio, areaMapComp.Internado];
    }

    return {
        trend: { labels: trendLabels, series: trendSeries },
        kpi: {
            total: kpiTotal,
            porModulo: kpiPorModulo,
            sparklines,
            compararActivo,
            anioComparacion,
            totalComp: kpiTotalComp,
            porModuloComp: kpiPorModuloComp
        },
        os: {
            labels: osEntries.map(e => e[0]),
            data: osEntries.map(e => e[1]),
            dataComp: compararActivo ? osEntries.map(e => osCompMap[e[0]] || 0) : null,
        },
        int: {
            labels: intEntries.map(e => e[0]),
            data: intEntries.map(e => e[1]),
            dataComp: compararActivo ? intEntries.map(e => intCompMap[e[0]] || 0) : null,
        },
        sede: {
            labels: sedeEntries.map(e => e[0]),
            data: sedeEntries.map(e => e[1]),
            dataComp: compararActivo ? sedeEntries.map(e => sedeCompMap[e[0]] || 0) : null,
        },
        servicioDerivante: {
            labels: servEntries.map(e => e[0]),
            data: servEntries.map(e => e[1])
        },
        practicas: {
            labels: topPracticas.map(p => p.nombre_practica),
            data: topPracticas.map(p => p.total_estudios),
            codigos: topPracticas.map(p => p.codigo_practica),
            dataComp: compararActivo ? topPracticas.map(p => practicasCompMap[p.codigo_practica] || 0) : null,
        },
        derivantes: {
            labels: topDerivantes.map(d => d.nombre_solicitante),
            data: topDerivantes.map(d => d.total_derivaciones),
            dataComp: compararActivo ? topDerivantes.map(d => derivantesCompMap[d.nombre_solicitante] || 0) : null,
        },
        area: {
            labels: areaLabels,
            data: areaData,
            dataComp: areaDataComp
        }
    };
}

function aggregateByMonth(rows) {
    const map = {};
    rows.forEach(r => {
        const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
        const cant = r.cantidad !== undefined ? r.cantidad : (r.total_estudios !== undefined ? r.total_estudios : 0);
        map[k] = (map[k] || 0) + cant;
    });
    return map;
}
