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

const g = (view, cols) => supabase.schema('gold').from(view).select(cols);
// Helper: query a _por_mes view with a server-side year range filter.
// This bypasses the PostgREST max-rows limit (usually 1000) entirely:
// instead of fetching everything and slicing client-side, we only fetch
// the rows that fall within [fromAnio, toAnio] (inclusive).
const gMes = (view, cols, fromAnio, toAnio) =>
    supabase.schema('gold').from(view).select(cols)
        .gte('anio', fromAnio)
        .lte('anio', toAnio)
        .limit(50000);   // safety cap; never reached in practice

export async function fetchAllBaseData(fromAnio = 2023, toAnio = parseInt(new Date().toISOString().slice(0, 4), 10)) {
    const queries = [
        gMes('gold_vw_di_resumen_por_mes',       'modulo,anio,mes,cantidad',                                     fromAnio, toAnio),
        gMes('gold_vw_di_os_por_mes',             'modulo,os_nombre_limpio,anio,mes,cantidad',                   fromAnio, toAnio),
        gMes('gold_vw_di_intermediaria_por_mes',  'modulo,intermediaria_limpia,anio,mes,cantidad',               fromAnio, toAnio),
        gMes('gold_vw_di_practicas_por_mes',      'modulo,codigo_practica,nombre_practica,anio,mes,total_estudios', fromAnio, toAnio),
        gMes('gold_vw_di_derivantes_por_mes',     'modulo,nombre_solicitante,anio,mes,cantidad',                 fromAnio, toAnio),
        g('gold_vw_di_os_por_intermediaria',      'modulo,intermediaria_limpia,nombre_os,total_estudios'),
        gMes('gold_vw_di_resumen_por_sede_mes',   'modulo,sede,anio,mes,total_estudios',                         fromAnio, toAnio),
    ];

    const results = await Promise.allSettled(queries);

    // Log errors for any failed view (silently continue with empty arrays)
    const VIEW_NAMES = [
        'resumen_por_mes', 'os_por_mes', 'intermediaria_por_mes',
        'practicas_por_mes', 'derivantes_por_mes', 'os_por_intermediaria', 'resumen_por_sede_mes'
    ];
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.warn(`[fetchAllBaseData] Vista '${VIEW_NAMES[i]}' falló:`, r.reason);
        } else if (r.value?.error) {
            console.warn(`[fetchAllBaseData] Vista '${VIEW_NAMES[i]}' retornó error:`, r.value.error);
        }
    });

    // If the critical resumen view fails, throw so the UI shows an error
    if (results[0].status === 'rejected' || results[0].value?.error) {
        throw results[0].reason || results[0].value?.error;
    }

    const rows = results.map(r => r.status === 'fulfilled' ? (r.value.data || []) : []);

    const [
        resumen,
        os_por_mes,
        int_por_mes,
        practicas_por_mes,
        derivantes_por_mes,
        os_por_intermediaria,
        resumen_sede,
    ] = rows;

    return { resumen, os_por_mes, int_por_mes, practicas_por_mes, derivantes_por_mes, os_por_intermediaria, resumen_sede };
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

export function computeViewData(baseData, filter, dateFrom, dateTo, compararActivo = false, anioComparacion = null, permitidos = MODULOS) {
    const [fromAnio, fromMes] = dateFrom.split('-').map(Number);
    const [toAnio, toMes] = dateTo.split('-').map(Number);
    const fromVal = fromAnio * 100 + fromMes;
    const toVal = toAnio * 100 + toMes;

    const resumenFiltrado = (baseData.resumen || []).filter(r => {
        const v = r.anio * 100 + r.mes;
        return v >= fromVal && v <= toVal && permitidos.includes(r.modulo);
    });

    const moduloFiltro = filter.tipo === 'modulo' ? filter.valor : null;

    // Sorted list of months in the current range
    const monthSet = new Set(resumenFiltrado.map(r => `${r.anio}-${String(r.mes).padStart(2, '0')}`));
    const sortedMonths = Array.from(monthSet).sort();

    // Comparison period boundaries
    const diffYears = compararActivo && anioComparacion ? (toAnio - Number(anioComparacion)) : 0;
    const compFromVal = (fromAnio - diffYears) * 100 + fromMes;
    const compToVal   = (toAnio   - diffYears) * 100 + toMes;

    const resumenComparado = compararActivo
        ? (baseData.resumen || []).filter(r => {
            const v = r.anio * 100 + r.mes;
            return v >= compFromVal && v <= compToVal && permitidos.includes(r.modulo);
          })
        : [];

    // ── Trend labels ──────────────────────────────────────────────
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

    // ── Trend series ──────────────────────────────────────────────
    const trendRows = moduloFiltro
        ? resumenFiltrado.filter(r => r.modulo === moduloFiltro)
        : resumenFiltrado;
    const trendByMonth = aggregateByMonth(trendRows);

    let trendSeries = [];
    if (compararActivo) {
        const trendRowsComp = moduloFiltro
            ? resumenComparado.filter(r => r.modulo === moduloFiltro)
            : resumenComparado;
        const trendByMonthComp = aggregateByMonth(trendRowsComp);

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
        trendSeries = [{ name: moduloFiltro || 'Total', data: sortedMonths.map(k => trendByMonth[k] || 0) }];
    }

    // ── KPI totals (current + comparison) ─────────────────────────
    const kpiPorModulo = {};
    permitidos.forEach(m => {
        kpiPorModulo[m] = resumenFiltrado
            .filter(r => r.modulo === m)
            .reduce((s, r) => s + r.cantidad, 0);
    });
    const kpiTotal = Object.values(kpiPorModulo).reduce((a, b) => a + b, 0);

    const kpiPorModuloComp = {};
    let kpiTotalComp = 0;
    if (compararActivo) {
        permitidos.forEach(m => {
            kpiPorModuloComp[m] = resumenComparado
                .filter(r => r.modulo === m)
                .reduce((s, r) => s + r.cantidad, 0);
        });
        kpiTotalComp = Object.values(kpiPorModuloComp).reduce((a, b) => a + b, 0);
    }

    // ── Sparklines ────────────────────────────────────────────────
    const sparklines = { Total: sortedMonths.map(() => 0) };
    permitidos.forEach(mod => {
        const byMonth = aggregateByMonth(resumenFiltrado.filter(r => r.modulo === mod));
        sparklines[mod] = sortedMonths.map(k => byMonth[k] || 0);
    });
    sortedMonths.forEach((_, i) => {
        sparklines.Total[i] = permitidos.reduce((s, m) => s + (sparklines[m][i] || 0), 0);
    });

    // ── OS distribution ───────────────────────────────────────────
    let osEntries, osCompMap = {};
    if (filter.tipo === 'intermediaria') {
        // Cross-filter: OS que corresponden a la intermediaria seleccionada (all-time)
        const filtered = (baseData.os_por_intermediaria || [])
            .filter(r => r.intermediaria_limpia === filter.valor);
        const combined = {};
        filtered.forEach(r => {
            if (r.nombre_os) combined[r.nombre_os] = (combined[r.nombre_os] || 0) + r.total_estudios;
        });
        osEntries = Object.entries(combined).sort((a, b) => b[1] - a[1]).slice(0, 10);
    } else {
        const osFiltrado = (baseData.os_por_mes || []).filter(r => {
            const v = r.anio * 100 + r.mes;
            return v >= fromVal && v <= toVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
        });
        const osMap = {};
        osFiltrado.forEach(r => {
            if (r.os_nombre_limpio) osMap[r.os_nombre_limpio] = (osMap[r.os_nombre_limpio] || 0) + r.cantidad;
        });
        osEntries = Object.entries(osMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (compararActivo) {
            (baseData.os_por_mes || []).filter(r => {
                const v = r.anio * 100 + r.mes;
                return v >= compFromVal && v <= compToVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
            }).forEach(r => {
                if (r.os_nombre_limpio) osCompMap[r.os_nombre_limpio] = (osCompMap[r.os_nombre_limpio] || 0) + r.cantidad;
            });
        }
    }

    // ── INT distribution ──────────────────────────────────────────
    const intFiltrado = (baseData.int_por_mes || []).filter(r => {
        const v = r.anio * 100 + r.mes;
        return v >= fromVal && v <= toVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
    });
    const intMap = {};
    intFiltrado.forEach(r => {
        if (r.intermediaria_limpia) intMap[r.intermediaria_limpia] = (intMap[r.intermediaria_limpia] || 0) + r.cantidad;
    });
    const intEntries = Object.entries(intMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const intCompMap = {};
    if (compararActivo) {
        (baseData.int_por_mes || []).filter(r => {
            const v = r.anio * 100 + r.mes;
            return v >= compFromVal && v <= compToVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
        }).forEach(r => {
            if (r.intermediaria_limpia) intCompMap[r.intermediaria_limpia] = (intCompMap[r.intermediaria_limpia] || 0) + r.cantidad;
        });
    }

    // ── Sede distribution ──────────────────────────────────────────
    const sedeFiltrado = (baseData.resumen_sede || []).filter(r => {
        const v = r.anio * 100 + r.mes;
        return v >= fromVal && v <= toVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
    });
    const sedeMap = {};
    sedeFiltrado.forEach(r => {
        if (r.sede) sedeMap[r.sede] = (sedeMap[r.sede] || 0) + r.total_estudios;
    });
    const sedeEntries = Object.entries(sedeMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const sedeCompMap = {};
    if (compararActivo) {
        (baseData.resumen_sede || []).filter(r => {
            const v = r.anio * 100 + r.mes;
            return v >= compFromVal && v <= compToVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
        }).forEach(r => {
            if (r.sede) sedeCompMap[r.sede] = (sedeCompMap[r.sede] || 0) + r.total_estudios;
        });
    }

    // ── Top Prácticas ─────────────────────────────────────────────
    const practicasFiltradas = (baseData.practicas_por_mes || []).filter(r => {
        const v = r.anio * 100 + r.mes;
        return v >= fromVal && v <= toVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
    });
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
        (baseData.practicas_por_mes || []).filter(r => {
            const v = r.anio * 100 + r.mes;
            return v >= compFromVal && v <= compToVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
        }).forEach(r => {
            if (r.codigo_practica) practicasCompMap[r.codigo_practica] = (practicasCompMap[r.codigo_practica] || 0) + r.total_estudios;
        });
    }

    // ── Top Derivantes ────────────────────────────────────────────
    const derivantesFiltrados = (baseData.derivantes_por_mes || []).filter(r => {
        const v = r.anio * 100 + r.mes;
        return v >= fromVal && v <= toVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
    });
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
        (baseData.derivantes_por_mes || []).filter(r => {
            const v = r.anio * 100 + r.mes;
            return v >= compFromVal && v <= compToVal && permitidos.includes(r.modulo) && (!moduloFiltro || r.modulo === moduloFiltro);
        }).forEach(r => {
            if (r.nombre_solicitante) derivantesCompMap[r.nombre_solicitante] = (derivantesCompMap[r.nombre_solicitante] || 0) + r.cantidad;
        });
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
            dataComp: compararActivo && filter.tipo !== 'intermediaria'
                ? osEntries.map(e => osCompMap[e[0]] || 0)
                : null,
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
    };
}

function aggregateByMonth(rows) {
    const map = {};
    rows.forEach(r => {
        const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
        map[k] = (map[k] || 0) + r.cantidad;
    });
    return map;
}
