-- ============================================================
-- Vistas Gold de apoyo para cross-filtering en el dashboard
-- Utilizan la capa Silver para nombres saneados y unificados.
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Prácticas agrupadas por (modulo, codigo, nombre) — para el chart de top prácticas
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_practicas_agg CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_practicas_agg CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_practicas_agg AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica_limpio AS nombre_practica,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND es_estudio = true
GROUP BY modulo, codigo_practica, nombre_practica_limpio;

CREATE INDEX IF NOT EXISTS idx_mv_practicas_agg_total ON gold.gold_vw_di_practicas_agg (total_estudios DESC);

-- Derivantes agrupados por (modulo, matricula, nombre) — para el chart de top derivantes
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_derivantes_agg CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_derivantes_agg CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_derivantes_agg AS
SELECT
    modulo,
    matricula_solicitante,
    nombre_solicitante_limpio AS nombre_solicitante,
    COUNT(*)::integer AS total_derivaciones
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
GROUP BY modulo, matricula_solicitante, nombre_solicitante_limpio;

CREATE INDEX IF NOT EXISTS idx_mv_derivantes_agg_total ON gold.gold_vw_di_derivantes_agg (total_derivaciones DESC);

-- Prácticas por OS (click en práctica → top obras sociales de esa práctica)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_os AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica_limpio AS nombre_practica,
    nombre_os,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND nombre_os IS NOT NULL
  AND es_estudio = true
GROUP BY modulo, codigo_practica, nombre_practica_limpio, nombre_os
ORDER BY modulo, codigo_practica, total_estudios DESC;

-- Prácticas por Intermediaria (click en práctica → top intermediarias de esa práctica)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_intermediaria AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica_limpio AS nombre_practica,
    intermediaria_limpia,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND intermediaria_limpia IS NOT NULL
  AND es_estudio = true
GROUP BY modulo, codigo_practica, nombre_practica_limpio, intermediaria_limpia
ORDER BY modulo, codigo_practica, total_estudios DESC;

-- Prácticas por Mes (click en práctica → tendencia mensual de esa práctica)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_mes_backup AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica_limpio AS nombre_practica,
    anio,
    mes,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND es_estudio = true
GROUP BY modulo, codigo_practica, nombre_practica_limpio, anio, mes
ORDER BY modulo, codigo_practica, anio, mes;

-- ============================================================
-- Sede views for cross-filtering
-- ============================================================

-- 1. Resumen mensual de estudios por sede (ya materializado en gold_views, mantenido por compatibilidad)
-- 2. Prácticas por sede
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_practica CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_practica CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_practica AS
SELECT
    modulo,
    sede,
    codigo_practica,
    nombre_practica_limpio AS nombre_practica,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND es_estudio = true
GROUP BY modulo, sede, codigo_practica, nombre_practica_limpio;

CREATE INDEX idx_mv_sede_practica ON gold.gold_vw_di_sede_por_practica (sede, total_estudios DESC);

-- 3. Derivantes por sede
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_derivante CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_derivante AS
SELECT
    modulo,
    sede,
    nombre_solicitante_limpio AS nombre_solicitante,
    COUNT(*)::integer AS total_derivaciones
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
GROUP BY modulo, sede, nombre_solicitante_limpio;

CREATE INDEX idx_mv_sede_derivante ON gold.gold_vw_di_sede_por_derivante (sede, total_derivaciones DESC);

-- 4. Obras sociales por sede
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_os CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_os CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_os AS
SELECT
    modulo,
    sede,
    nombre_os,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_os IS NOT NULL
GROUP BY modulo, sede, nombre_os;

CREATE INDEX idx_mv_sede_os ON gold.gold_vw_di_sede_por_os (sede, total_estudios DESC);

-- 5. Intermediarias por sede
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_sede_por_intermediaria CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_sede_por_intermediaria CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_sede_por_intermediaria AS
SELECT
    modulo,
    sede,
    intermediaria_limpia,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE intermediaria_limpia IS NOT NULL
GROUP BY modulo, sede, intermediaria_limpia;

CREATE INDEX idx_mv_sede_intermediaria ON gold.gold_vw_di_sede_por_intermediaria (sede, total_estudios DESC);

-- 6. Resumen de estudios por servicio unificado del derivante
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_derivantes_por_servicio CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_derivantes_por_servicio CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_derivantes_por_servicio AS
SELECT
    modulo,
    COALESCE(derivante_servicio_unificado, 'Sin Servicio Asignado') AS servicio_unificado,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
GROUP BY modulo, COALESCE(derivante_servicio_unificado, 'Sin Servicio Asignado');

CREATE INDEX idx_mv_derivantes_por_servicio ON gold.gold_vw_di_derivantes_por_servicio (servicio_unificado);

-- 7. Médicos derivantes filtrados por servicio unificado
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_servicio_por_derivante CASCADE;
DROP VIEW IF EXISTS gold.gold_vw_di_servicio_por_derivante CASCADE;
CREATE MATERIALIZED VIEW gold.gold_vw_di_servicio_por_derivante AS
SELECT
    modulo,
    COALESCE(derivante_servicio_unificado, 'Sin Servicio Asignado') AS servicio_unificado,
    nombre_solicitante_limpio AS nombre_solicitante,
    COUNT(*)::integer AS total_derivaciones
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
GROUP BY modulo, COALESCE(derivante_servicio_unificado, 'Sin Servicio Asignado'), nombre_solicitante_limpio;

CREATE INDEX idx_mv_servicio_por_derivante ON gold.gold_vw_di_servicio_por_derivante (servicio_unificado, total_derivaciones DESC);

-- Permisos
GRANT SELECT ON gold.gold_vw_di_practicas_agg             TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_derivantes_agg            TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_practicas_por_os          TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_practicas_por_intermediaria TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_practica          TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_derivante         TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_os                TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_sede_por_intermediaria     TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_derivantes_por_servicio   TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_servicio_por_derivante     TO anon, service_role;
