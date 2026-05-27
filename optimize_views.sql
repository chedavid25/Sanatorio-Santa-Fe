-- ============================================================
-- Conversión de vistas normales a Vistas Materializadas para Gold
-- Evita timeouts (error 57014) y habilita el filtrado dinámico veloz.
-- Utiliza la capa Silver para nombres saneados y unificados.
-- ============================================================

-- 1. Prácticas por Mes
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_practicas_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_practicas_por_mes AS
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
GROUP BY modulo, codigo_practica, nombre_practica_limpio, anio, mes;

CREATE INDEX idx_mv_practicas_por_mes_modulo_fecha ON gold.gold_vw_di_practicas_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_practicas_por_mes TO anon, authenticated, service_role;

-- 2. Derivantes por Mes
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_derivantes_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_derivantes_por_mes AS
SELECT
    modulo,
    nombre_solicitante_limpio AS nombre_solicitante,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
GROUP BY
    modulo,
    nombre_solicitante_limpio,
    anio,
    mes;

CREATE INDEX idx_mv_derivantes_por_mes_modulo_fecha ON gold.gold_vw_di_derivantes_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_derivantes_por_mes TO anon, authenticated, service_role;

-- 3. Obras Sociales por Mes
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_os_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_os_por_mes AS
SELECT
    modulo,
    nombre_os AS os_nombre_limpio,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_os IS NOT NULL
GROUP BY
    modulo,
    nombre_os,
    anio,
    mes;

CREATE INDEX idx_mv_os_por_mes_modulo_fecha ON gold.gold_vw_di_os_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_os_por_mes TO anon, authenticated, service_role;

-- 4. Intermediaria por Mes
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_intermediaria_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_intermediaria_por_mes AS
SELECT
    modulo,
    intermediaria_limpia,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE intermediaria_limpia IS NOT NULL
GROUP BY
    modulo,
    intermediaria_limpia,
    anio,
    mes;

CREATE INDEX idx_mv_int_por_mes_modulo_fecha ON gold.gold_vw_di_intermediaria_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_intermediaria_por_mes TO anon, authenticated, service_role;

-- 5. Distribución por Área por Mes
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_area_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_area_por_mes AS
SELECT
    modulo,
    sede,
    anio,
    mes,
    CASE 
        WHEN area = 'I' OR area IS NULL OR TRIM(area) = '' THEN 'Internado'
        ELSE 'Ambulatorio'
    END AS area_tipo,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
GROUP BY modulo, sede, anio, mes, 
         CASE WHEN area = 'I' OR area IS NULL OR TRIM(area) = '' THEN 'Internado' ELSE 'Ambulatorio' END;

CREATE INDEX idx_mv_area_por_mes_modulo_fecha ON gold.gold_vw_di_area_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_area_por_mes TO anon, authenticated, service_role;
