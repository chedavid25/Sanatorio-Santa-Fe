-- ============================================================
-- Vistas Gold de apoyo para cross-filtering en el dashboard
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Prácticas agrupadas por (modulo, codigo, nombre) — para el chart de top prácticas
DROP VIEW IF EXISTS gold.gold_vw_di_practicas_agg CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_practicas_agg CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_practicas_agg AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di
WHERE codigo_practica IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica;

CREATE INDEX IF NOT EXISTS idx_mv_practicas_agg_total ON gold.gold_vw_di_practicas_agg (total_estudios DESC);

-- Derivantes agrupados por (modulo, matricula, nombre) — para el chart de top derivantes
DROP VIEW IF EXISTS gold.gold_vw_di_derivantes_agg CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_derivantes_agg CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_derivantes_agg AS
SELECT
    modulo,
    matricula_solicitante,
    nombre_solicitante,
    COUNT(*)::integer AS total_derivaciones
FROM diagnostico_imagenes.bronze_detalle_di
WHERE nombre_solicitante IS NOT NULL
GROUP BY modulo, matricula_solicitante, nombre_solicitante;

CREATE INDEX IF NOT EXISTS idx_mv_derivantes_agg_total ON gold.gold_vw_di_derivantes_agg (total_derivaciones DESC);

-- Prácticas por OS (click en práctica → top obras sociales de esa práctica)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_os AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    nombre_os,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di
WHERE codigo_practica IS NOT NULL
  AND nombre_os IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica, nombre_os
ORDER BY modulo, codigo_practica, total_estudios DESC;

-- Prácticas por Intermediaria (click en práctica → top intermediarias de esa práctica)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_intermediaria AS
SELECT
    b.modulo,
    b.codigo_practica,
    b.nombre_practica,
    COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)) AS intermediaria_limpia,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda))
WHERE b.codigo_practica IS NOT NULL
  AND COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria)) IS NOT NULL
GROUP BY b.modulo, b.codigo_practica, b.nombre_practica, COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria))
ORDER BY b.modulo, b.codigo_practica, total_estudios DESC;

-- Prácticas por Mes (click en práctica → tendencia mensual de esa práctica)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_mes AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    EXTRACT(YEAR FROM me_fecha)::integer AS anio,
    EXTRACT(MONTH FROM me_fecha)::integer AS mes,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.bronze_detalle_di
WHERE codigo_practica IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica, EXTRACT(YEAR FROM me_fecha), EXTRACT(MONTH FROM me_fecha)
ORDER BY modulo, codigo_practica, anio, mes;

-- ============================================================
-- Sede views for cross-filtering
-- ============================================================

-- 1. Resumen mensual de estudios por sede
DROP VIEW IF EXISTS gold.gold_vw_di_resumen_por_sede_mes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_resumen_por_sede_mes CASCADE;
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

-- 2. Prácticas por sede
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_practica CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_practica CASCADE;
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

-- 3. Derivantes por sede
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante CASCADE;
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

-- 4. Obras sociales por sede
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_os CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_os CASCADE;
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

-- 5. Intermediarias por sede
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_intermediaria CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_intermediaria CASCADE;
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

-- Permisos
GRANT SELECT ON gold.gold_vw_di_practicas_agg             TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_derivantes_agg            TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_practicas_por_os          TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_practicas_por_intermediaria TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_practicas_por_mes         TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_resumen_por_sede_mes      TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_practica          TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_derivante         TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_os                TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_intermediaria     TO anon, service_role;
