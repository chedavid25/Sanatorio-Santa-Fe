-- Vistas Gold con dimensión de fecha para OS e Intermediaria
-- Permite filtrar por período en el dashboard (usa bronze_detalle_di)

DROP VIEW IF EXISTS gold.gold_vw_di_os_por_mes CASCADE;
CREATE OR REPLACE VIEW gold.gold_vw_di_os_por_mes AS
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
GROUP BY d.modulo, COALESCE(os.os_nombre_limpio, TRIM(d.nombre_os)), anio, mes;

DROP VIEW IF EXISTS gold.gold_vw_di_intermediaria_por_mes CASCADE;
CREATE OR REPLACE VIEW gold.gold_vw_di_intermediaria_por_mes AS
SELECT
    d.modulo,
    COALESCE(i.intermediaria_limpia, TRIM(d.intermediaria)) AS intermediaria_limpia,
    EXTRACT(YEAR  FROM d.me_fecha::date)::integer AS anio,
    EXTRACT(MONTH FROM d.me_fecha::date)::integer AS mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.bronze_detalle_di d
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(d.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda))
WHERE d.me_fecha IS NOT NULL AND d.intermediaria IS NOT NULL
GROUP BY d.modulo, COALESCE(i.intermediaria_limpia, TRIM(d.intermediaria)), anio, mes;

-- 3. Derivantes por mes (date-aware) — reemplaza derivantes_agg sin dimensión de fecha
DROP VIEW IF EXISTS gold.gold_vw_di_derivantes_por_mes CASCADE;
CREATE OR REPLACE VIEW gold.gold_vw_di_derivantes_por_mes AS
SELECT
    modulo,
    nombre_solicitante_limpio AS nombre_solicitante,
    anio,
    mes,
    COUNT(*)::integer AS cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante_limpio IS NOT NULL
GROUP BY modulo, nombre_solicitante_limpio, anio, mes;

GRANT SELECT ON gold.gold_vw_di_os_por_mes TO anon, authenticated, service_role;
GRANT SELECT ON gold.gold_vw_di_intermediaria_por_mes TO anon, authenticated, service_role;
GRANT SELECT ON gold.gold_vw_di_derivantes_por_mes TO anon, authenticated, service_role;
