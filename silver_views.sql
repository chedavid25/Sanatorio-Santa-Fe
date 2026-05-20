-- ============================================================
-- Capa Silver — diagnostico_imagenes
-- Ejecutar en Supabase Dashboard > Database > SQL Editor
-- ============================================================
-- Qué hace cada vista:
--   1. TRIM del campo servicio (llega con espacios de GECLISA)
--   2. JOIN a silver_sedes_equivalencias  → servicio_limpio, sede
--   3. JOIN a silver_os_equivalencias     → os_nombre_limpio
--   4. JOIN a silver_intermediaria_equivalencias → intermediaria_limpia
--   5. Columna tipo_fila para que Gold pueda filtrar sin conocer los patrones de null
--
-- tipo_fila posibles valores:
--   'por_periodo'       → anio/mes con datos  (viene de /api/{Servicio})
--   'total_por_fecha'   → anio=0, mes=0, servicio filled  (de /total-por-fecha)
--   'por_intermediaria' → intermediaria filled  (de /total-por-intermediaria)
--   'por_os'            → obra_social filled  (de /total-por-os)
-- ============================================================


-- ------------------------------------------------------------
-- silver_videoendoscopia
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW diagnostico_imagenes.silver_videoendoscopia AS
SELECT
    b.id,
    b.sync_timestamp,

    -- Dimensiones crudas (preservadas para trazabilidad)
    TRIM(b.servicio)    AS servicio,
    b.intermediaria,
    b.obra_social,
    b.anio,
    b.mes,
    b.cantidad,

    -- Dimensiones normalizadas (COALESCE: si no hay mapping, usa el valor crudo)
    COALESCE(s.servicio_limpio,       TRIM(b.servicio))         AS servicio_limpio,
    s.sede,
    COALESCE(os.os_nombre_limpio,     TRIM(b.obra_social))     AS os_nombre_limpio,
    COALESCE(i.intermediaria_limpia,  TRIM(b.intermediaria))   AS intermediaria_limpia,

    -- Tipo de fila (para filtrar en Gold sin lógica de nulls)
    CASE
        WHEN b.anio > 0 AND b.mes > 0             THEN 'por_periodo'
        WHEN b.servicio IS NOT NULL AND b.anio = 0 THEN 'total_por_fecha'
        WHEN b.intermediaria IS NOT NULL            THEN 'por_intermediaria'
        WHEN b.obra_social   IS NOT NULL            THEN 'por_os'
        ELSE 'otro'
    END AS tipo_fila

FROM diagnostico_imagenes.bronze_videoendoscopia b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_os_equivalencias os
    ON TRIM(UPPER(b.obra_social)) = TRIM(UPPER(os.os_nombre_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda));


-- ------------------------------------------------------------
-- silver_tomografia
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW diagnostico_imagenes.silver_tomografia AS
SELECT
    b.id,
    b.sync_timestamp,
    TRIM(b.servicio)    AS servicio,
    b.intermediaria,
    b.obra_social,
    b.anio,
    b.mes,
    b.cantidad,
    COALESCE(s.servicio_limpio,       TRIM(b.servicio))         AS servicio_limpio,
    s.sede,
    COALESCE(os.os_nombre_limpio,     TRIM(b.obra_social))     AS os_nombre_limpio,
    COALESCE(i.intermediaria_limpia,  TRIM(b.intermediaria))   AS intermediaria_limpia,
    CASE
        WHEN b.anio > 0 AND b.mes > 0              THEN 'por_periodo'
        WHEN b.servicio IS NOT NULL AND b.anio = 0  THEN 'total_por_fecha'
        WHEN b.intermediaria IS NOT NULL             THEN 'por_intermediaria'
        WHEN b.obra_social   IS NOT NULL             THEN 'por_os'
        ELSE 'otro'
    END AS tipo_fila
FROM diagnostico_imagenes.bronze_tomografia b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_os_equivalencias os
    ON TRIM(UPPER(b.obra_social)) = TRIM(UPPER(os.os_nombre_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda));


-- ------------------------------------------------------------
-- silver_resonancia
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW diagnostico_imagenes.silver_resonancia AS
SELECT
    b.id,
    b.sync_timestamp,
    TRIM(b.servicio)    AS servicio,
    b.intermediaria,
    b.obra_social,
    b.anio,
    b.mes,
    b.cantidad,
    COALESCE(s.servicio_limpio,       TRIM(b.servicio))         AS servicio_limpio,
    s.sede,
    COALESCE(os.os_nombre_limpio,     TRIM(b.obra_social))     AS os_nombre_limpio,
    COALESCE(i.intermediaria_limpia,  TRIM(b.intermediaria))   AS intermediaria_limpia,
    CASE
        WHEN b.anio > 0 AND b.mes > 0              THEN 'por_periodo'
        WHEN b.servicio IS NOT NULL AND b.anio = 0  THEN 'total_por_fecha'
        WHEN b.intermediaria IS NOT NULL             THEN 'por_intermediaria'
        WHEN b.obra_social   IS NOT NULL             THEN 'por_os'
        ELSE 'otro'
    END AS tipo_fila
FROM diagnostico_imagenes.bronze_resonancia b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_os_equivalencias os
    ON TRIM(UPPER(b.obra_social)) = TRIM(UPPER(os.os_nombre_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda));


-- ------------------------------------------------------------
-- silver_ecografia
-- ------------------------------------------------------------
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
