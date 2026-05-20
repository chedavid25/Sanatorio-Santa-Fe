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
SELECT
    b.id,
    b.sync_timestamp,
    b.modulo,
    b.serv_id,
    b.ubic_id,
    b.me_id,
    b.me_fecha,
    EXTRACT(YEAR  FROM b.me_fecha)::integer AS anio,
    EXTRACT(MONTH FROM b.me_fecha)::integer AS mes,
    b.me_edad,
    CASE
        WHEN b.me_edad IS NULL   THEN 'Sin dato'
        WHEN b.me_edad < 18      THEN '0-17'
        WHEN b.me_edad < 30      THEN '18-29'
        WHEN b.me_edad < 45      THEN '30-44'
        WHEN b.me_edad < 60      THEN '45-59'
        WHEN b.me_edad < 75      THEN '60-74'
        ELSE '75+'
    END AS rango_edad,
    b.area,
    b.sexo_paciente,
    b.localidad_paciente,
    b.nombre_os,
    b.intermediaria,
    b.matricula_solicitante,
    b.nombre_solicitante,
    b.codigo_practica,
    b.nombre_practica,
    b.cantidad_practica,
    TRIM(b.servicio) AS servicio,
    b.consultorio,
    b.mp_efector,
    b.nombre_efector,

    -- Normalizados
    COALESCE(s.servicio_limpio,      TRIM(b.servicio))         AS servicio_limpio,
    s.sede,
    COALESCE(i.intermediaria_limpia, TRIM(b.intermediaria))    AS intermediaria_limpia

FROM diagnostico_imagenes.bronze_detalle_di b
LEFT JOIN silver_shared.silver_sedes_equivalencias s
    ON TRIM(UPPER(b.servicio)) = TRIM(UPPER(s.servicio_crudo))
LEFT JOIN silver_shared.silver_intermediaria_equivalencias i
    ON TRIM(UPPER(b.intermediaria)) = TRIM(UPPER(i.intermediaria_cruda));

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
