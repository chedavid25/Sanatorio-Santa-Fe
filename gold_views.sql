-- ============================================================
-- Capa Gold - schema: gold
-- Ejecutar en Supabase Dashboard > Database > SQL Editor
--
-- ANTES de ejecutar:
--   1. Agregar 'gold' a Exposed schemas en Settings > API
--
-- Deduplicacion: DISTINCT ON con sync_timestamp DESC
-- asegura que ejecuciones multiples del sync no dupliquen cantidades.
--
-- Permisos: service_role (sync script) + anon (dashboard)
-- ============================================================

-- Permisos base sobre el schema gold
GRANT USAGE ON SCHEMA gold TO service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL ON TABLES TO service_role;


-- ============================================================
-- VIDEO
-- ============================================================

-- Mensual: una fila por (servicio, sede, anio, mes)
CREATE OR REPLACE VIEW gold.gold_vw_di_video_por_mes AS
WITH dedup AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_videoendoscopia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
)
SELECT servicio_limpio, sede, anio, mes, cantidad
FROM dedup
ORDER BY anio, mes, servicio_limpio;

-- Por obra social: una fila por OS
CREATE OR REPLACE VIEW gold.gold_vw_di_video_por_os AS
WITH dedup AS (
    SELECT DISTINCT ON (obra_social)
        os_nombre_limpio,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_videoendoscopia
    WHERE tipo_fila = 'por_os'
    ORDER BY obra_social, sync_timestamp DESC
)
SELECT os_nombre_limpio, cantidad
FROM dedup
ORDER BY cantidad DESC;

-- Por intermediaria: agrupa por nombre limpio (varios crudos pueden mapear al mismo)
CREATE OR REPLACE VIEW gold.gold_vw_di_video_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_videoendoscopia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;


-- ============================================================
-- TOMOGRAFIA
-- ============================================================

CREATE OR REPLACE VIEW gold.gold_vw_di_tomo_por_mes AS
WITH dedup AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_tomografia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
)
SELECT servicio_limpio, sede, anio, mes, cantidad
FROM dedup
ORDER BY anio, mes;

CREATE OR REPLACE VIEW gold.gold_vw_di_tomo_por_os AS
WITH dedup AS (
    SELECT DISTINCT ON (obra_social)
        os_nombre_limpio,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_tomografia
    WHERE tipo_fila = 'por_os'
    ORDER BY obra_social, sync_timestamp DESC
)
SELECT os_nombre_limpio, cantidad
FROM dedup
ORDER BY cantidad DESC;

CREATE OR REPLACE VIEW gold.gold_vw_di_tomo_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_tomografia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;


-- ============================================================
-- RESONANCIA
-- ============================================================

CREATE OR REPLACE VIEW gold.gold_vw_di_resonancia_por_mes AS
WITH dedup AS (
    SELECT DISTINCT ON (servicio, anio, mes)
        servicio_limpio,
        sede,
        anio,
        mes,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_resonancia
    WHERE tipo_fila = 'por_periodo'
    ORDER BY servicio, anio, mes, sync_timestamp DESC
)
SELECT servicio_limpio, sede, anio, mes, cantidad
FROM dedup
ORDER BY anio, mes;

CREATE OR REPLACE VIEW gold.gold_vw_di_resonancia_por_os AS
WITH dedup AS (
    SELECT DISTINCT ON (obra_social)
        os_nombre_limpio,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_resonancia
    WHERE tipo_fila = 'por_os'
    ORDER BY obra_social, sync_timestamp DESC
)
SELECT os_nombre_limpio, cantidad
FROM dedup
ORDER BY cantidad DESC;

CREATE OR REPLACE VIEW gold.gold_vw_di_resonancia_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia, cantidad, sync_timestamp
    FROM diagnostico_imagenes.silver_resonancia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;


-- ============================================================
-- ECO
-- ============================================================

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

-- Por sede (exclusivo ECO — /total-por-ubicacion)
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


-- ============================================================
-- RESUMEN CRUZADO
-- Todos los modulos juntos - para overview del dashboard
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

-- Vista de mapeo entre Intermediaria y Obra Social para filtro cruzado dinámico (materializada para evitar timeouts)
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_os_por_intermediaria CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_os_por_intermediaria CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_os_por_intermediaria AS
SELECT
    b.modulo,
    COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)) AS intermediaria_limpia,
    b.nombre_os,
    COUNT(*)::integer AS total_estudios,
    SUM(b.cantidad_practica)::integer AS total_cantidad
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda))
WHERE b.nombre_os IS NOT NULL
  AND COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)) IS NOT NULL
GROUP BY b.modulo, COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)), b.nombre_os;

GRANT SELECT ON gold.gold_vw_di_os_por_intermediaria TO anon, service_role;

-- Vistas materializadas de Sede para filtro cruzado dinámico
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_resumen_por_sede_mes CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_resumen_por_sede_mes CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_resumen_por_sede_mes AS
SELECT
    b.modulo,
    COALESCE(s.sede, 'OTRA') AS sede,
    EXTRACT(YEAR FROM b.me_fecha)::integer AS anio,
    EXTRACT(MONTH FROM b.me_fecha)::integer AS mes,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
GROUP BY b.modulo, COALESCE(s.sede, 'OTRA'), EXTRACT(YEAR FROM b.me_fecha), EXTRACT(MONTH FROM b.me_fecha);

CREATE INDEX idx_mv_resumen_sede_mes ON gold.gold_vw_di_resumen_por_sede_mes (sede);
GRANT SELECT ON gold.gold_vw_di_resumen_por_sede_mes TO anon, service_role;

DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_practica CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_practica CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_practica AS
SELECT
    modulo,
    COALESCE(s.sede, 'OTRA') AS sede,
    codigo_practica,
    nombre_practica,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
WHERE codigo_practica IS NOT NULL
GROUP BY modulo, COALESCE(s.sede, 'OTRA'), codigo_practica, nombre_practica;

CREATE INDEX idx_mv_sede_practica ON gold.gold_vw_di_sede_por_practica (sede, total_estudios DESC);
GRANT SELECT ON gold.gold_vw_di_sede_por_practica TO anon, service_role;

DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_derivante AS
SELECT
    modulo,
    COALESCE(s.sede, 'OTRA') AS sede,
    nombre_solicitante,
    COUNT(*)::integer AS total_derivaciones
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
WHERE nombre_solicitante IS NOT NULL
GROUP BY modulo, COALESCE(s.sede, 'OTRA'), nombre_solicitante;

CREATE INDEX idx_mv_sede_derivante ON gold.gold_vw_di_sede_por_derivante (sede, total_derivaciones DESC);
GRANT SELECT ON gold.gold_vw_di_sede_por_derivante TO anon, service_role;

DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_os CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_os CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_os AS
SELECT
    modulo,
    COALESCE(s.sede, 'OTRA') AS sede,
    nombre_os,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
WHERE nombre_os IS NOT NULL
GROUP BY modulo, COALESCE(s.sede, 'OTRA'), nombre_os;

CREATE INDEX idx_mv_sede_os ON gold.gold_vw_di_sede_por_os (sede, total_estudios DESC);
GRANT SELECT ON gold.gold_vw_di_sede_por_os TO anon, service_role;

DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_intermediaria CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_intermediaria CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_intermediaria AS
SELECT
    b.modulo,
    COALESCE(s.sede, 'OTRA') AS sede,
    COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)) AS intermediaria_limpia,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda))
WHERE COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)) IS NOT NULL
GROUP BY b.modulo, COALESCE(s.sede, 'OTRA'), COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria));

CREATE INDEX idx_mv_sede_intermediaria ON gold.gold_vw_di_sede_por_intermediaria (sede, total_estudios DESC);
GRANT SELECT ON gold.gold_vw_di_sede_por_intermediaria TO anon, service_role;

-- Vista para distribución por área (Ambulatorio / Internado)
CREATE OR REPLACE VIEW gold.gold_vw_di_area_por_mes AS
SELECT
    modulo,
    COALESCE(s.sede, 'OTRA') AS sede,
    EXTRACT(YEAR FROM b.me_fecha)::integer AS anio,
    EXTRACT(MONTH FROM b.me_fecha)::integer AS mes,
    CASE 
        WHEN b.area = 'I' OR b.area IS NULL OR TRIM(b.area) = '' THEN 'Internado'
        ELSE 'Ambulatorio'
    END AS area_tipo,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
GROUP BY modulo, COALESCE(s.sede, 'OTRA'), EXTRACT(YEAR FROM b.me_fecha), EXTRACT(MONTH FROM b.me_fecha), 
         CASE WHEN b.area = 'I' OR b.area IS NULL OR TRIM(b.area) = '' THEN 'Internado' ELSE 'Ambulatorio' END;

GRANT SELECT ON gold.gold_vw_di_area_por_mes TO anon, service_role;

-- Permisos sobre las vistas recien creadas (por si ALTER DEFAULT no aplico)
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO anon, service_role;


