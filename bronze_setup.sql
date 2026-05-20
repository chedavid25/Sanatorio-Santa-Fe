-- ============================================================
-- Setup de Esquemas Base y Tablas Bronze
-- Sanatorio Santa Fe - Proyecto BI
-- ============================================================

-- 1. Crear Esquemas
CREATE SCHEMA IF NOT EXISTS diagnostico_imagenes;
CREATE SCHEMA IF NOT EXISTS logs;
CREATE SCHEMA IF NOT EXISTS gold;

-- 2. Tabla de Logs de Sincronización
CREATE TABLE IF NOT EXISTS logs.log_sincronizacion (
    id                BIGSERIAL PRIMARY KEY,
    timestamp         TIMESTAMPTZ DEFAULT NOW(),
    departamento      TEXT,
    servicio          TEXT,
    filas_insertadas  INTEGER,
    estado            TEXT, -- OK / ERROR
    mensaje_error     TEXT
);

-- 3. Tablas Bronze (Diagnóstico por Imágenes)
-- Estas tablas reciben los datos crudos de la API

-- Videoendoscopía
CREATE TABLE IF NOT EXISTS diagnostico_imagenes.bronze_videoendoscopia (
    id              BIGSERIAL PRIMARY KEY,
    servicio        TEXT,
    intermediaria   TEXT,
    obra_social     TEXT,
    anio            INTEGER,
    mes             INTEGER,
    cantidad        INTEGER,
    sync_timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- Tomografía
CREATE TABLE IF NOT EXISTS diagnostico_imagenes.bronze_tomografia (
    id              BIGSERIAL PRIMARY KEY,
    servicio        TEXT,
    intermediaria   TEXT,
    obra_social     TEXT,
    anio            INTEGER,
    mes             INTEGER,
    cantidad        INTEGER,
    sync_timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- Resonancia
CREATE TABLE IF NOT EXISTS diagnostico_imagenes.bronze_resonancia (
    id              BIGSERIAL PRIMARY KEY,
    servicio        TEXT,
    intermediaria   TEXT,
    obra_social     TEXT,
    anio            INTEGER,
    mes             INTEGER,
    cantidad        INTEGER,
    sync_timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- Ecografía
CREATE TABLE IF NOT EXISTS diagnostico_imagenes.bronze_ecografia (
    id              BIGSERIAL PRIMARY KEY,
    servicio        TEXT,
    intermediaria   TEXT,
    obra_social     TEXT,
    anio            INTEGER,
    mes             INTEGER,
    cantidad        INTEGER,
    sync_timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Permisos Básicos
GRANT USAGE ON SCHEMA diagnostico_imagenes TO service_role;
GRANT USAGE ON SCHEMA logs TO service_role;
GRANT USAGE ON SCHEMA gold TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA diagnostico_imagenes TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA logs TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA gold TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA diagnostico_imagenes TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA logs TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA gold TO service_role;
