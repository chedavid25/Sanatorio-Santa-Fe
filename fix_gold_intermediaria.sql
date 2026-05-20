-- ============================================================
-- Fix: gold_vw_di_*_por_intermediaria para todos los modulos
--
-- Problema: DISTINCT ON (intermediaria) deduplica por nombre crudo,
-- pero DIRECTAS y CAJAS son dos crudos distintos que mapean al mismo
-- limpio (Red Medica), generando dos filas en el resultado.
--
-- Fix: envolver la dedup en un GROUP BY intermediaria_limpia y sumar.
-- ============================================================

-- VIDEO
CREATE OR REPLACE VIEW gold.gold_vw_di_video_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_videoendoscopia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;

-- TOMOGRAFIA
CREATE OR REPLACE VIEW gold.gold_vw_di_tomo_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_tomografia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;

-- RESONANCIA
CREATE OR REPLACE VIEW gold.gold_vw_di_resonancia_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_resonancia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;

-- ECO
CREATE OR REPLACE VIEW gold.gold_vw_di_eco_por_intermediaria AS
SELECT intermediaria_limpia, SUM(cantidad)::integer AS cantidad
FROM (
    SELECT DISTINCT ON (intermediaria)
        intermediaria_limpia,
        cantidad,
        sync_timestamp
    FROM diagnostico_imagenes.silver_ecografia
    WHERE tipo_fila = 'por_intermediaria'
    ORDER BY intermediaria, sync_timestamp DESC
) dedup
GROUP BY intermediaria_limpia
ORDER BY cantidad DESC;

GRANT SELECT ON gold.gold_vw_di_video_por_intermediaria     TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_tomo_por_intermediaria      TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_resonancia_por_intermediaria TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_eco_por_intermediaria       TO anon, service_role;
