import { supabase } from './supabase'

export const MODULOS = ['Video', 'Tomo', 'Resonancia', 'Eco'];
export const MODULO_COLORS = ['#004884', '#0072bc', '#56abe8', '#2a8ed2'];
export const MODULO_LABELS = {
    Video:      'Videoendoscopia Digestiva',
    Tomo:       'Tomografia Computada',
    Resonancia: 'Resonancia Magnetica',
    Eco:        'Ecografias y Eco Doppler',
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

let globalCachedBaseData = null;
let globalCachedMinAnio = null;
let globalCachedMaxAnio = null;

export function invalidateDataCache() {
    globalCachedBaseData = null;
    globalCachedMinAnio = null;
    globalCachedMaxAnio = null;
}

export async function fetchAllBaseData(fromAnio = 2023, toAnio = parseInt(new Date().toISOString().slice(0, 4), 10), forceRefresh = false) {
    if (forceRefresh) {
        invalidateDataCache();
    }
    if (globalCachedBaseData && globalCachedMinAnio <= fromAnio && globalCachedMaxAnio >= toAnio) {
        return globalCachedBaseData;
    }
    const query = gMes('gold_vw_di_multidimensional_saneado', '*', fromAnio, toAnio);
    const data = await withRetry(query);
    const result = {
        multidimensional: data
    };
    globalCachedBaseData = result;
    globalCachedMinAnio = fromAnio;
    globalCachedMaxAnio = toAnio;
    return result;
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
    // Obtener los derivantes específicos asociados a ese servicio unificado (puede ser un string o un array de variantes)
    const isArray = Array.isArray(servicioUnificado);
    let query = supabase.schema('gold').from('gold_vw_di_servicio_por_derivante')
        .select('modulo,nombre_solicitante,total_derivaciones');
    
    if (isArray) {
        query = query.in('servicio_unificado', servicioUnificado);
    } else {
        query = query.eq('servicio_unificado', servicioUnificado);
    }

    const { data: derivantes } = await query;
    
    if (!derivantes) return { derivantes: [] };

    // Agrupar por nombre_solicitante para unificar si aparecen en distintas variantes de servicio
    const grouped = {};
    derivantes.forEach(r => {
        const name = r.nombre_solicitante;
        if (!grouped[name]) {
            grouped[name] = { modulo: r.modulo, nombre_solicitante: name, total_derivaciones: 0 };
        }
        grouped[name].total_derivaciones += r.total_derivaciones;
    });

    const sorted = Object.values(grouped)
        .sort((a, b) => b.total_derivaciones - a.total_derivaciones)
        .slice(0, 20);

    return {
        derivantes: sorted
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
            if (row.nombre_practica !== filters.practica.valor) return false;
        }

        // Filtro de Obra Social
        if (excludeFilterKey !== 'os' && filters.os) {
            if (row.nombre_os !== filters.os.valor) return false;
        }

        // Filtro de Intermediaria
        if (excludeFilterKey !== 'intermediaria' && filters.intermediaria) {
            if (row.intermediaria_limpia !== filters.intermediaria.valor) return false;
        }

        // Filtro de Médico Derivante
        if (excludeFilterKey !== 'derivante' && filters.derivante) {
            if (row.nombre_solicitante !== filters.derivante.valor) return false;
        }

        // Filtro de Servicio Médico Derivante
        if (excludeFilterKey !== 'servicioDerivante' && filters.servicioDerivante) {
            if (row.servicio_unificado !== filters.servicioDerivante.valor) return false;
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
            if (row.nombre_practica !== filters.practica.valor) return false;
        }
        if (excludeFilterKey !== 'os' && filters.os) {
            if (row.nombre_os !== filters.os.valor) return false;
        }
        if (excludeFilterKey !== 'intermediaria' && filters.intermediaria) {
            if (row.intermediaria_limpia !== filters.intermediaria.valor) return false;
        }
        if (excludeFilterKey !== 'derivante' && filters.derivante) {
            if (row.nombre_solicitante !== filters.derivante.valor) return false;
        }
        if (excludeFilterKey !== 'servicioDerivante' && filters.servicioDerivante) {
            if (row.servicio_unificado !== filters.servicioDerivante.valor) return false;
        }

        return true;
    };

    const currentRows = baseData.multidimensional.filter(r => matchesCommonFilters(r));
    const compRows = compararActivo ? baseData.multidimensional.filter(r => matchesCommonFiltersComp(r)) : [];

    // Sorted list of months in the current range
    const monthSet = new Set(currentRows.map(r => `${r.anio}-${String(r.mes).padStart(2, '0')}`));
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
    currentRows.forEach(r => {
        const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
        trendByMonth[k] = (trendByMonth[k] || 0) + r.cantidad;
    });

    let trendSeries = [];
    if (compararActivo) {
        const trendByMonthComp = {};
        compRows.forEach(r => {
            const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
            trendByMonthComp[k] = (trendByMonthComp[k] || 0) + r.cantidad;
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
        kpiPorModulo[m] = currentRows
            .filter(r => r.modulo === m)
            .reduce((s, r) => s + r.cantidad, 0);
    });
    const kpiTotal = Object.values(kpiPorModulo).reduce((a, b) => a + b, 0);

    const kpiPorModuloComp = {};
    let kpiTotalComp = 0;
    if (compararActivo) {
        permitidos.forEach(m => {
            kpiPorModuloComp[m] = compRows
                .filter(r => r.modulo === m)
                .reduce((s, r) => s + r.cantidad, 0);
        });
        kpiTotalComp = Object.values(kpiPorModuloComp).reduce((a, b) => a + b, 0);
    }

    // ── Sparklines ────────────────────────────────────────────────
    const sparklines = { Total: sortedMonths.map(() => 0) };
    permitidos.forEach(mod => {
        const modRows = currentRows.filter(r => r.modulo === mod);
        const byMonth = {};
        modRows.forEach(r => {
            const k = `${r.anio}-${String(r.mes).padStart(2, '0')}`;
            byMonth[k] = (byMonth[k] || 0) + r.cantidad;
        });
        sparklines[mod] = sortedMonths.map(k => byMonth[k] || 0);
    });
    sortedMonths.forEach((_, i) => {
        sparklines.Total[i] = permitidos.reduce((s, m) => s + (sparklines[m][i] || 0), 0);
    });

    // ── OS distribution ───────────────────────────────────────
    const osRows = baseData.multidimensional.filter(r => matchesCommonFilters(r, 'os'));
    const osMap = {};
    osRows.forEach(r => {
        if (r.nombre_os) osMap[r.nombre_os] = (osMap[r.nombre_os] || 0) + r.cantidad;
    });
    const osEntries = Object.entries(osMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    let osCompMap = {};
    if (compararActivo) {
        const osRowsComp = baseData.multidimensional.filter(r => matchesCommonFiltersComp(r, 'os'));
        osRowsComp.forEach(r => {
            if (r.nombre_os) osCompMap[r.nombre_os] = (osCompMap[r.nombre_os] || 0) + r.cantidad;
        });
    }

    // ── INT distribution ──────────────────────────────────────────
    const intRows = baseData.multidimensional.filter(r => matchesCommonFilters(r, 'intermediaria'));
    const intMap = {};
    intRows.forEach(r => {
        if (r.intermediaria_limpia) intMap[r.intermediaria_limpia] = (intMap[r.intermediaria_limpia] || 0) + r.cantidad;
    });
    const intEntries = Object.entries(intMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const intCompMap = {};
    if (compararActivo) {
        const intRowsComp = baseData.multidimensional.filter(r => matchesCommonFiltersComp(r, 'intermediaria'));
        intRowsComp.forEach(r => {
            if (r.intermediaria_limpia) intCompMap[r.intermediaria_limpia] = (intCompMap[r.intermediaria_limpia] || 0) + r.cantidad;
        });
    }

    // ── Sede distribution ──────────────────────────────────────────
    const sedeRows = baseData.multidimensional.filter(r => matchesCommonFilters(r, 'sede'));
    const sedeMap = {};
    sedeRows.forEach(r => {
        if (r.sede) sedeMap[r.sede] = (sedeMap[r.sede] || 0) + r.cantidad;
    });
    const sedeEntries = Object.entries(sedeMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const sedeCompMap = {};
    if (compararActivo) {
        const sedeRowsComp = baseData.multidimensional.filter(r => matchesCommonFiltersComp(r, 'sede'));
        sedeRowsComp.forEach(r => {
            if (r.sede) sedeCompMap[r.sede] = (sedeCompMap[r.sede] || 0) + r.cantidad;
        });
    }

    // ── Top Prácticas ─────────────────────────────────────────────
    const practicasRows = baseData.multidimensional.filter(r => matchesCommonFilters(r, 'practica'));
    const practicasMap = {};
    practicasRows.forEach(r => {
        if (!r.nombre_practica) return;
        if (!practicasMap[r.nombre_practica]) {
            practicasMap[r.nombre_practica] = { codigo_practica: r.codigo_practica, total: 0 };
        }
        practicasMap[r.nombre_practica].total += r.cantidad;
    });
    const topPracticas = Object.entries(practicasMap)
        .map(([nombre, v]) => ({ codigo_practica: nombre, nombre_practica: nombre, codigo_display: v.codigo_practica, total_estudios: v.total }))
        .sort((a, b) => b.total_estudios - a.total_estudios)
        .slice(0, 15);

    const practicasCompMap = {};
    if (compararActivo) {
        const practicasRowsComp = baseData.multidimensional.filter(r => matchesCommonFiltersComp(r, 'practica'));
        practicasRowsComp.forEach(r => {
            if (r.nombre_practica) {
                practicasCompMap[r.nombre_practica] = (practicasCompMap[r.nombre_practica] || 0) + r.cantidad;
            }
        });
    }

    // ── Top Derivantes ────────────────────────────────────────────
    const derivantesRows = baseData.multidimensional.filter(r => matchesCommonFilters(r, 'derivante'));
    const derivantesMap = {};
    derivantesRows.forEach(r => {
        if (!r.nombre_solicitante) return;
        derivantesMap[r.nombre_solicitante] = (derivantesMap[r.nombre_solicitante] || 0) + r.cantidad;
    });
    const topDerivantes = Object.entries(derivantesMap)
        .map(([nombre, cantidad]) => ({ nombre_solicitante: nombre, total_derivaciones: cantidad }))
        .sort((a, b) => b.total_derivaciones - a.total_derivaciones)
        .slice(0, 10);

    const derivantesCompMap = {};
    if (compararActivo) {
        const derivantesRowsComp = baseData.multidimensional.filter(r => matchesCommonFiltersComp(r, 'derivante'));
        derivantesRowsComp.forEach(r => {
            if (r.nombre_solicitante) derivantesCompMap[r.nombre_solicitante] = (derivantesCompMap[r.nombre_solicitante] || 0) + r.cantidad;
        });
    }

    // Helper local para normalizar nombres quitando acentos y formateando espacios/mayúsculas
    const normalizeName = (str) => {
        if (!str) return '';
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ');
    };

    // ── Derivantes por servicio unificado ─────────────────────────
    const servRows = baseData.multidimensional.filter(r => matchesCommonFilters(r));
    const servMap = {};
    servRows.forEach(r => {
        if (r.servicio_unificado) {
            const rawName = r.servicio_unificado;
            const norm = normalizeName(rawName);
            if (!servMap[norm]) {
                servMap[norm] = {
                    original: rawName,
                    variantes: new Set([rawName]),
                    total: 0
                };
            } else {
                servMap[norm].variantes.add(rawName);
                // Preferir mostrar el nombre que tiene tildes/acentos
                const currentHasAccents = rawName !== rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const savedHasAccents = servMap[norm].original !== servMap[norm].original.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (currentHasAccents && !savedHasAccents) {
                    servMap[norm].original = rawName;
                }
            }
            servMap[norm].total += r.cantidad;
        }
    });
    const servEntries = Object.values(servMap)
        .map(e => ({
            original: e.original,
            variantes: Array.from(e.variantes),
            total: e.total
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    // ── Área distribution (Ambulatorio vs Internado) ──────────────────────
    const areaRows = baseData.multidimensional.filter(r => matchesCommonFilters(r));
    const areaMap = { Ambulatorio: 0, Internado: 0 };
    areaRows.forEach(r => {
        if (r.area_tipo === 'Ambulatorio' || r.area_tipo === 'Internado') {
            areaMap[r.area_tipo] += r.cantidad;
        }
    });

    const areaLabels = ['Ambulatorio', 'Internado'];
    const areaData = [areaMap.Ambulatorio, areaMap.Internado];

    let areaDataComp = null;
    if (compararActivo) {
        const areaRowsComp = baseData.multidimensional.filter(r => matchesCommonFiltersComp(r));
        const areaMapComp = { Ambulatorio: 0, Internado: 0 };
        areaRowsComp.forEach(r => {
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
            labels: servEntries.map(e => e.original),
            data: servEntries.map(e => e.total),
            variantes: servEntries.map(e => e.variantes)
        },
        practicas: {
            labels: topPracticas.map(p => p.nombre_practica),
            data: topPracticas.map(p => p.total_estudios),
            codigos: topPracticas.map(p => p.codigo_practica),
            codigosDisplay: topPracticas.map(p => p.codigo_display),
            dataComp: compararActivo ? topPracticas.map(p => practicasCompMap[p.nombre_practica] || 0) : null,
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
