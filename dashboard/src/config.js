
export const DEPARTAMENTOS = [
    {
        id: 'diagnostico_imagenes',
        nombre: 'Diagnóstico por Imágenes',
        icono: 'bx bx-scan',
        activo: true,
        secciones: [
            { id: 'cantidades', nombre: 'Cantidades' },
            { id: 'obras_sociales', nombre: 'Por Obra Social' },
            { id: 'intermediarias', nombre: 'Por Intermediaria' }
        ],
        vistas: {
            resumen_por_mes: 'gold_vw_di_resumen_por_mes',
            video_por_mes: 'gold_vw_di_video_por_mes',
            tomo_por_mes: 'gold_vw_di_tomo_por_mes',
            resonancia_por_mes: 'gold_vw_di_resonancia_por_mes',
            eco_por_mes: 'gold_vw_di_eco_por_mes',
            video_por_os: 'gold_vw_di_video_por_os',
            tomo_por_os: 'gold_vw_di_tomo_por_os',
            resonancia_por_os: 'gold_vw_di_resonancia_por_os',
            eco_por_os: 'gold_vw_di_eco_por_os',
            video_por_intermediaria: 'gold_vw_di_video_por_intermediaria',
            tomo_por_intermediaria: 'gold_vw_di_tomo_por_intermediaria',
            resonancia_por_intermediaria: 'gold_vw_di_resonancia_por_intermediaria',
            eco_por_intermediaria: 'gold_vw_di_eco_por_intermediaria',
            practicas_agg: 'gold_vw_di_practicas_agg',
            derivantes_agg: 'gold_vw_di_derivantes_agg',
            practicas_por_os: 'gold_vw_di_practicas_por_os',
            practicas_por_intermediaria: 'gold_vw_di_practicas_por_intermediaria',
            practicas_por_mes: 'gold_vw_di_practicas_por_mes',
            demograficos: 'gold_vw_di_demograficos',
        }
    },
    {
        id: 'laboratorio',
        nombre: 'Laboratorio',
        icono: 'bx bx-test-tube',
        activo: false,
        secciones: [],
        vistas: {}
    },
    {
        id: 'medicina_nuclear',
        nombre: 'Medicina Nuclear',
        icono: 'bx bx-atom',
        activo: false,
        secciones: [],
        vistas: {}
    },
    {
        id: 'plan_salud',
        nombre: 'Plan de Salud',
        icono: 'bx bx-plus-medical',
        activo: false,
        secciones: [],
        vistas: {}
    },
    {
        id: 'oncologia',
        nombre: 'Oncología',
        icono: 'bx bx-injection',
        activo: false,
        secciones: [],
        vistas: {}
    }
]
