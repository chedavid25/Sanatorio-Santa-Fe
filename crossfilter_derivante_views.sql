-- ============================================================
-- Vistas Gold para Cross-Filtering por Médico Derivante
-- Permiten filtrar OS, Intermediaria, Sede y Área cuando el
-- usuario hace clic en un médico derivante en el dashboard.
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. OS por Derivante (mensual, para respetar el rango de fechas)
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_os_por_derivante CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_os_por_derivante AS
SELECT
    modulo,
    nombre_solicitante_limpio AS nombre_solicitante,
    nombre_os,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
  AND nombre_os IS NOT NULL
GROUP BY modulo, nombre_solicitante_limpio, nombre_os, anio, mes;

CREATE INDEX idx_mv_os_derivante
    ON gold.gold_vw_di_os_por_derivante (nombre_solicitante, anio, mes);

-- 2. Intermediaria por Derivante (mensual)
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_int_por_derivante CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_int_por_derivante AS
SELECT
    modulo,
    nombre_solicitante_limpio AS nombre_solicitante,
    intermediaria_limpia,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
  AND intermediaria_limpia IS NOT NULL
GROUP BY modulo, nombre_solicitante_limpio, intermediaria_limpia, anio, mes;

CREATE INDEX idx_mv_int_derivante
    ON gold.gold_vw_di_int_por_derivante (nombre_solicitante, anio, mes);

-- 3. Sede por Derivante (mensual)
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante_mes CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_derivante_mes AS
SELECT
    modulo,
    nombre_solicitante_limpio AS nombre_solicitante,
    sede,
    anio,
    mes,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
  AND sede IS NOT NULL
GROUP BY modulo, nombre_solicitante_limpio, sede, anio, mes;

CREATE INDEX idx_mv_sede_derivante_mes
    ON gold.gold_vw_di_sede_por_derivante_mes (nombre_solicitante, anio, mes);

-- 4. Área por Derivante (mensual)
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_area_por_derivante CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_area_por_derivante AS
SELECT
    modulo,
    nombre_solicitante_limpio AS nombre_solicitante,
    area_tipo,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
  AND area_tipo IS NOT NULL
GROUP BY modulo, nombre_solicitante_limpio, area_tipo, anio, mes;

CREATE INDEX idx_mv_area_derivante
    ON gold.gold_vw_di_area_por_derivante (nombre_solicitante, anio, mes);

-- Permisos
GRANT SELECT ON gold.gold_vw_di_os_por_derivante         TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_int_por_derivante        TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_derivante_mes   TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_area_por_derivante       TO anon, service_role;
