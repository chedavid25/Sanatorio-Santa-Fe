-- ============================================================
-- Conversión de vistas normales a Vistas Materializadas para Gold
-- Evita timeouts (error 57014) y habilita el filtrado dinámico veloz.
-- ============================================================

-- 1. Prácticas por Mes
DROP VIEW IF EXISTS gold.gold_vw_di_practicas_por_mes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_practicas_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_practicas_por_mes AS
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

CREATE INDEX idx_mv_practicas_por_mes_modulo_fecha ON gold.gold_vw_di_practicas_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_practicas_por_mes TO anon, authenticated, service_role;

-- 2. Derivantes por Mes
DROP VIEW IF EXISTS gold.gold_vw_di_derivantes_por_mes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_derivantes_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_derivantes_por_mes AS
SELECT
    modulo,
    nombre_solicitante,
    EXTRACT(YEAR  FROM me_fecha::date)::integer AS anio,
    EXTRACT(MONTH FROM me_fecha::date)::integer AS mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.bronze_detalle_di
WHERE me_fecha IS NOT NULL
  AND nombre_solicitante IS NOT NULL
GROUP BY
    modulo,
    nombre_solicitante,
    EXTRACT(YEAR  FROM me_fecha::date),
    EXTRACT(MONTH FROM me_fecha::date);

CREATE INDEX idx_mv_derivantes_por_mes_modulo_fecha ON gold.gold_vw_di_derivantes_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_derivantes_por_mes TO anon, authenticated, service_role;

-- 3. Obras Sociales por Mes
DROP VIEW IF EXISTS gold.gold_vw_di_os_por_mes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_os_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_os_por_mes AS
SELECT
    d.modulo,
    COALESCE(os.os_nombre_limpio, TRIM(d.nombre_os)) AS os_nombre_limpio,
    EXTRACT(YEAR  FROM d.me_fecha::date)::integer AS anio,
    EXTRACT(MONTH FROM d.me_fecha::date)::integer AS mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.bronze_detalle_di d
LEFT JOIN silver_shared.silver_os_equivalencias os
    ON TRIM(UPPER(d.nombre_os)) = TRIM(UPPER(os.os_nombre_crudo))
WHERE d.me_fecha IS NOT NULL
GROUP BY
    d.modulo,
    COALESCE(os.os_nombre_limpio, TRIM(d.nombre_os)),
    EXTRACT(YEAR  FROM d.me_fecha::date),
    EXTRACT(MONTH FROM d.me_fecha::date);

CREATE INDEX idx_mv_os_por_mes_modulo_fecha ON gold.gold_vw_di_os_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_os_por_mes TO anon, authenticated, service_role;

-- 4. Intermediaria por Mes
DROP VIEW IF EXISTS gold.gold_vw_di_intermediaria_por_mes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_intermediaria_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_intermediaria_por_mes AS
SELECT
    d.modulo,
    COALESCE(i.intermediaria_limpia, TRIM(d.intermediaria)) AS intermediaria_limpia,
    EXTRACT(YEAR  FROM d.me_fecha::date)::integer AS anio,
    EXTRACT(MONTH FROM d.me_fecha::date)::integer AS mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.bronze_detalle_di d
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(d.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda))
WHERE d.me_fecha IS NOT NULL
  AND d.intermediaria IS NOT NULL
GROUP BY
    d.modulo,
    COALESCE(i.intermediaria_limpia, TRIM(d.intermediaria)),
    EXTRACT(YEAR  FROM d.me_fecha::date),
    EXTRACT(MONTH FROM d.me_fecha::date);

CREATE INDEX idx_mv_int_por_mes_modulo_fecha ON gold.gold_vw_di_intermediaria_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_intermediaria_por_mes TO anon, authenticated, service_role;

-- 5. Distribución por Área por Mes
DROP VIEW IF EXISTS gold.gold_vw_di_area_por_mes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gold.gold_vw_di_area_por_mes CASCADE;

CREATE MATERIALIZED VIEW gold.gold_vw_di_area_por_mes AS
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

CREATE INDEX idx_mv_area_por_mes_modulo_fecha ON gold.gold_vw_di_area_por_mes (modulo, anio, mes);
GRANT SELECT ON gold.gold_vw_di_area_por_mes TO anon, authenticated, service_role;
