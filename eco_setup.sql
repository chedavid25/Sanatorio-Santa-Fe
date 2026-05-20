-- ============================================================
-- ECO: Bronze + Silver + Gold
-- Ejecutar en Supabase Dashboard > Database > SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. BRONZE — tabla cruda
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostico_imagenes.bronze_ecografia (
    id              BIGSERIAL PRIMARY KEY,
    servicio        TEXT,
    intermediaria   TEXT,
    obra_social     TEXT,
    anio            INTEGER,
    mes             INTEGER,
    cantidad        INTEGER,
    sync_timestamp  TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON diagnostico_imagenes.bronze_ecografia TO service_role;
GRANT ALL ON diagnostico_imagenes.bronze_ecografia_id_seq TO service_role;


-- ─────────────────────────────────────────────
-- 2. SILVER — vista normalizada
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW diagnostico_imagenes.silver_ecografia AS
SELECT
    b.id,
    b.sync_timestamp,

    TRIM(b.servicio)    AS servicio,
    b.intermediaria,
    b.obra_social,
    b.anio,
    b.mes,
    b.cantidad,

    COALESCE(s.servicio_limpio,      TRIM(b.servicio))        AS servicio_limpio,
    s.sede,
    COALESCE(os.os_nombre_limpio,    TRIM(b.obra_social))     AS os_nombre_limpio,
    COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria))   AS intermediaria_limpia,

    CASE
        WHEN b.anio > 0 AND b.mes > 0              THEN 'por_periodo'
        WHEN b.servicio IS NOT NULL AND b.anio = 0  THEN 'total_por_fecha'
        WHEN b.intermediaria IS NOT NULL             THEN 'por_intermediaria'
        WHEN b.obra_social   IS NOT NULL             THEN 'por_os'
        ELSE 'otro'
    END AS tipo_fila

FROM diagnostico_imagenes.bronze_ecografia b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_os_equivalencias os
    ON TRIM(UPPER(b.obra_social)) = TRIM(UPPER(os.os_nombre_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda));

GRANT SELECT ON diagnostico_imagenes.silver_ecografia TO anon, service_role;


-- ─────────────────────────────────────────────
-- 3. GOLD — vistas de consumo
-- ─────────────────────────────────────────────

-- Mensual: una fila por (servicio, sede, anio, mes)
CREATE OR REPLACE VIEW gold.gold_vw_di_eco_por_mes AS
WITH dedup AS (
    SELECT DISTINCT ON (servicio, anio, mes)
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
SELECT servicio_limpio, sede, anio, mes, cantidad
FROM dedup
ORDER BY anio, mes, servicio_limpio;

-- Por obra social
CREATE OR REPLACE VIEW gold.gold_vw_di_eco_por_os AS
WITH dedup AS (
    SELECT DISTINCT ON (obra_social)
        os_nombre_limpio,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_ecografia
    WHERE tipo_fila = 'por_os'
    ORDER BY obra_social, sync_timestamp DESC
)
SELECT os_nombre_limpio, cantidad
FROM dedup
ORDER BY cantidad DESC;

-- Por intermediaria
CREATE OR REPLACE VIEW gold.gold_vw_di_eco_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_ecografia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;

-- Por sede (exclusivo ECO — viene de /total-por-ubicacion)
-- tipo_fila = 'total_por_fecha' + sede IS NOT NULL
CREATE OR REPLACE VIEW gold.gold_vw_di_eco_por_sede AS
WITH dedup AS (
    SELECT DISTINCT ON (servicio)
        servicio_limpio,
        sede,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_ecografia
    WHERE tipo_fila = 'total_por_fecha'
      AND sede IS NOT NULL
    ORDER BY servicio, sync_timestamp DESC
)
SELECT servicio_limpio, sede, cantidad
FROM dedup
ORDER BY cantidad DESC;

GRANT SELECT ON gold.gold_vw_di_eco_por_mes           TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_os            TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_intermediaria TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_sede          TO anon, service_role;


-- ─────────────────────────────────────────────
-- 4. RESUMEN CRUZADO — actualizar para incluir ECO
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW gold.gold_vw_di_resumen_por_mes AS
WITH video AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Video' AS modulo,
        servicio_limpio, sede, anio, mes, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_videoendoscopia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
),
tomo AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Tomografia' AS modulo,
        servicio_limpio, sede, anio, mes, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_tomografia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
),
resonancia AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Resonancia' AS modulo,
        servicio_limpio, sede, anio, mes, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_resonancia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
),
eco AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        'Eco' AS modulo,
        servicio_limpio, sede, anio, mes, cantidad, sync_timestamp
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

GRANT SELECT ON gold.gold_vw_di_resumen_por_mes TO anon, service_role;
