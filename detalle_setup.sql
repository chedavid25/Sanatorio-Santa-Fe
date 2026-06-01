-- ============================================================
-- DETALLE: Bronze + Silver + Gold
-- Datos a nivel de estudio individual (por paciente)
-- Ejecutar en Supabase Dashboard > Database > SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. BRONZE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostico_imagenes.bronze_detalle_di (
    id                    BIGSERIAL PRIMARY KEY,
    modulo                TEXT        NOT NULL,   -- Video / Tomo / Resonancia / Eco
    serv_id               INTEGER     NOT NULL,
    ubic_id               INTEGER     NOT NULL,
    me_id                 INTEGER     NOT NULL,
    me_fecha              DATE,
    me_edad               INTEGER,
    area                  TEXT,
    hora_atencion         TEXT,
    sexo_paciente         TEXT,
    localidad_paciente    TEXT,
    siglas_os             TEXT,
    nombre_os             TEXT,
    intermediaria         TEXT,
    matricula_solicitante TEXT,
    nombre_solicitante    TEXT,
    codigo_practica       TEXT,
    nombre_practica       TEXT,
    cantidad_practica     INTEGER,
    servicio              TEXT,
    consultorio           TEXT,
    mp_efector            INTEGER,
    nombre_efector        TEXT,
    sync_timestamp        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (me_id, serv_id, ubic_id)
);

GRANT ALL ON diagnostico_imagenes.bronze_detalle_di               TO service_role;
GRANT ALL ON diagnostico_imagenes.bronze_detalle_di_id_seq        TO service_role;


-- ─────────────────────────────────────────────
-- 2. SILVER
-- ─────────────────────────────────────────────
-- Nota: nombre_os ya viene completo desde la API (/detalle devuelve nombreObraSocial
-- sin truncar), por lo que no se une a silver_os_equivalencias.
CREATE OR REPLACE VIEW diagnostico_imagenes.silver_detalle_di AS
WITH desglosado AS (
    SELECT 
        b.id,
        b.sync_timestamp,
        b.modulo,
        b.serv_id,
        b.ubic_id,
        b.me_id,
        b.me_fecha,
        EXTRACT(YEAR FROM b.me_fecha)::integer AS anio,
        EXTRACT(MONTH FROM b.me_fecha)::integer AS mes,
        b.me_edad,
        b.area,
        b.sexo_paciente,
        b.localidad_paciente,
        b.nombre_os,
        b.intermediaria,
        b.matricula_solicitante,
        b.nombre_solicitante,
        b.cantidad_practica,
        TRIM(b.servicio) AS servicio,
        b.consultorio,
        b.mp_efector,
        b.nombre_efector,
        TRIM(unnest(string_to_array(COALESCE(b.codigo_practica, ''), ','))) AS codigo_practica_individual,
        unnest(string_to_array(COALESCE(b.nombre_practica, ''), '/')) AS nombre_practica_individual,
        CASE 
            WHEN b.codigo_practica IS NULL OR TRIM(b.codigo_practica) = '' THEN 0
            ELSE array_length(string_to_array(b.codigo_practica, ','), 1)
        END AS num_practicas
    FROM diagnostico_imagenes.bronze_detalle_di b
)
SELECT
    d.id,
    d.sync_timestamp,
    d.modulo,
    d.serv_id,
    d.ubic_id,
    d.me_id,
    d.me_fecha,
    d.anio,
    d.mes,
    d.me_edad,
    CASE
        WHEN d.me_edad IS NULL   THEN 'Sin dato'
        WHEN d.me_edad < 18      THEN '0-17'
        WHEN d.me_edad < 30      THEN '18-29'
        WHEN d.me_edad < 45      THEN '30-44'
        WHEN d.me_edad < 60      THEN '45-59'
        WHEN d.me_edad < 75      THEN '60-74'
        ELSE '75+'
    END AS rango_edad,
    d.area,
    d.sexo_paciente,
    d.localidad_paciente,
    COALESCE(os.os_nombre_limpio,    d.nombre_os)              AS nombre_os,
    d.intermediaria,
    d.matricula_solicitante,
    d.nombre_solicitante,
    d.codigo_practica_individual AS codigo_practica,
    TRIM(d.nombre_practica_individual) AS nombre_practica,
    CASE 
        WHEN d.num_practicas <= 1 THEN d.cantidad_practica
        ELSE 1
    END AS cantidad_practica,
    d.servicio,
    d.consultorio,
    d.mp_efector,
    d.nombre_efector,
    COALESCE(s.servicio_limpio,      TRIM(d.servicio))         AS servicio_limpio,
    s.sede,
    COALESCE(i.intermediaria_limpia, TRIM(d.intermediaria))    AS intermediaria_limpia,
    COALESCE(dev.nombre_unificado,   TRIM(d.nombre_solicitante)) AS nombre_solicitante_limpio,
    dev.servicio_unificado                                     AS derivante_servicio_unificado,
    COALESCE(n.nombre_unificado,     TRIM(d.nombre_practica_individual))  AS nombre_practica_limpio,
    CASE
        -- Excluir estudios mamarios (punción mamaria, mamografía, ecografía mamaria) realizados en Sanatorio Santa Fe (o sedes que no sean GENERAL PAZ, ESPERANZA, SANTO TOME)
        WHEN (
            LOWER(COALESCE(n.nombre_unificado, d.nombre_practica_individual)) LIKE '%mama%' OR 
            LOWER(COALESCE(n.nombre_unificado, d.nombre_practica_individual)) LIKE '%mamo%' OR 
            LOWER(COALESCE(n.nombre_unificado, d.nombre_practica_individual)) LIKE '%punci%mamar%'
        ) AND COALESCE(s.sede, 'OTRA') NOT IN ('GENERAL PAZ', 'ESPERANZA', 'SANTO TOME') THEN false
        WHEN d.codigo_practica_individual IS NULL OR TRIM(d.codigo_practica_individual) = '' THEN false
        ELSE COALESCE(n.es_estudio AND NOT n.excluir, true)
    END AS es_estudio

FROM desglosado d
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(d.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(d.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda))
LEFT JOIN silver_shared.silver_derivantes_equivalencias dev
    ON TRIM(UPPER(d.nombre_solicitante)) = TRIM(UPPER(dev.nombre_original))
LEFT JOIN silver_shared.silver_codigos_nomenclador n 
    ON (CASE WHEN TRIM(d.codigo_practica_individual) ~ '^\d+$' THEN CAST(TRIM(d.codigo_practica_individual) AS integer) ELSE NULL END) = n.codigo
    AND n.servicio = CASE d.modulo
        WHEN 'Video' THEN 'VIDEO'
        WHEN 'Tomo' THEN 'TAC'
        WHEN 'Resonancia' THEN 'RESO'
        WHEN 'Eco' THEN 'ECO'
        ELSE NULL
    END
LEFT JOIN silver_shared.silver_os_equivalencias os
    ON TRIM(UPPER(d.nombre_os)) = TRIM(UPPER(os.os_nombre_crudo));

GRANT SELECT ON diagnostico_imagenes.silver_detalle_di TO anon, service_role;


-- ─────────────────────────────────────────────
-- 3. GOLD
-- ─────────────────────────────────────────────

-- Top prácticas por módulo y servicio
CREATE OR REPLACE VIEW gold.gold_vw_di_practicas_top AS
SELECT
    modulo,
    servicio_limpio,
    sede,
    codigo_practica,
    nombre_practica,
    COUNT(*)                    AS total_estudios,
    SUM(cantidad_practica)      AS total_cantidad
FROM diagnostico_imagenes.silver_detalle_di
WHERE codigo_practica IS NOT NULL
GROUP BY modulo, servicio_limpio, sede, codigo_practica, nombre_practica
ORDER BY modulo, total_estudios DESC;

-- Top médicos derivantes
CREATE OR REPLACE VIEW gold.gold_vw_di_derivantes_top AS
SELECT
    modulo,
    servicio_limpio,
    sede,
    matricula_solicitante,
    nombre_solicitante,
    COUNT(*) AS total_derivaciones
FROM diagnostico_imagenes.silver_detalle_di
WHERE nombre_solicitante IS NOT NULL
GROUP BY modulo, servicio_limpio, sede, matricula_solicitante, nombre_solicitante
ORDER BY modulo, total_derivaciones DESC;

-- Distribución por localidad del paciente
CREATE OR REPLACE VIEW gold.gold_vw_di_por_localidad AS
SELECT
    modulo,
    localidad_paciente,
    COUNT(*) AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
WHERE localidad_paciente IS NOT NULL
GROUP BY modulo, localidad_paciente
ORDER BY modulo, total_estudios DESC;

-- Demográficos: distribución por sexo y rango de edad
CREATE OR REPLACE VIEW gold.gold_vw_di_demograficos AS
SELECT
    modulo,
    servicio_limpio,
    sede,
    sexo_paciente,
    rango_edad,
    COUNT(*) AS total_estudios
FROM diagnostico_imagenes.silver_detalle_di
GROUP BY modulo, servicio_limpio, sede, sexo_paciente, rango_edad
ORDER BY modulo, servicio_limpio, sexo_paciente, rango_edad;

GRANT SELECT ON gold.gold_vw_di_practicas_top  TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_derivantes_top TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_por_localidad  TO anon, service_role;
GRANT SELECT ON gold.gold_vw_di_demograficos   TO anon, service_role;
