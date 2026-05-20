-- ============================================================
-- 1. Permisos faltantes en vistas ECO (creadas sin GRANT)
-- ============================================================
GRANT SELECT ON gold.gold_vw_di_eco_por_os             TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_intermediaria  TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_mes            TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_sede           TO anon, service_role;

-- Por las dudas, re-aplicar sobre todo el schema gold
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO anon, service_role;


-- ============================================================
-- 2. Vistas de cross-filtering (nuevas)
-- ============================================================

-- Prácticas agrupadas por (modulo, codigo, nombre) — para el chart de top prácticas
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_agg AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica
ORDER BY modulo, total_estudios DESC;

-- Derivantes agrupados por (modulo, matricula, nombre)
CREATE OR REPLACE VIEW gold.gold_vw_di_derivantes_agg AS
SELECT
    modulo,
    matricula_solicitante,
    nombre_solicitante,
    COUNT(*)::integer AS total_derivaciones
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante IS NOT NULL
GROUP BY modulo, matricula_solicitante, nombre_solicitante
ORDER BY modulo, total_derivaciones DESC;

-- Prácticas por OS (click práctica → top OS)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_os AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    nombre_os,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND nombre_os IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica, nombre_os
ORDER BY modulo, codigo_practica, total_estudios DESC;

-- Prácticas por Intermediaria (click práctica → top intermediarias)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_intermediaria AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    intermediaria_limpia,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
  AND intermediaria_limpia IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica, intermediaria_limpia
ORDER BY modulo, codigo_practica, total_estudios DESC;

-- Prácticas por Mes (click práctica → tendencia mensual)
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_por_mes AS
SELECT
    modulo,
    codigo_practica,
    nombre_practica,
    anio,
    mes,
    COUNT(*)::integer AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
GROUP BY modulo, codigo_practica, nombre_practica, anio, mes
ORDER BY modulo, codigo_practica, anio, mes;

-- Permisos sobre todo lo creado
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO anon, service_role;
