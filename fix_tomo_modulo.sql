-- ============================================================
-- Fix: gold_vw_di_resumen_por_mes usaba 'Tomografia' como modulo
-- pero el dashboard y la tabla bronze_detalle_di usan 'Tomo'.
-- Se cambia 'Tomografia' → 'Tomo' para consistencia.
-- ============================================================

CREATE OR REPLACE VIEW gold.gold_vw_di_resumen_por_mes AS
WITH video AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Video' AS modulo,
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_videoendoscopia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
),
tomo AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Tomo' AS modulo,
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_tomografia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
),
resonancia AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Resonancia' AS modulo,
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_resonancia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
),
eco AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Eco' AS modulo,
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_ecografia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
)
SELECT modulo, servicio_limpio, sede, anio, mes, cantidad FROM video
UNION ALL
SELECT modulo, servicio_limpio, sede, anio, mes, cantidad FROM tomo
UNION ALL
SELECT modulo, servicio_limpio, sede, anio, mes, cantidad FROM resonancia
UNION ALL
SELECT modulo, servicio_limpio, sede, anio, mes, cantidad FROM eco
ORDER BY anio, mes, modulo, servicio_limpio;

GRANT SELECT ON gold.gold_vw_di_resumen_por_mes TO anon, authenticated, service_role;
