-- ============================================================
-- silver_shared: schema de equivalencias compartidas
-- Ejecutar en Supabase Dashboard > Database > SQL Editor
-- Luego agregar 'silver_shared' al Extra Search Path en Settings > API
-- ============================================================

CREATE SCHEMA IF NOT EXISTS silver_shared;

-- --------------------------------------------------------
-- Códigos del nomenclador GECLISA + reglas de saneamiento
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver_shared.silver_codigos_nomenclador (
    id               BIGSERIAL PRIMARY KEY,
    codigo           INTEGER NOT NULL,
    nombre_original  TEXT NOT NULL,
    servicio         TEXT NOT NULL,
    es_estudio       BOOLEAN NOT NULL DEFAULT FALSE,
    excluir          BOOLEAN NOT NULL DEFAULT FALSE,
    nombre_unificado TEXT,
    UNIQUE (codigo, servicio)
);

-- --------------------------------------------------------
-- Sedes: nombre crudo del servicio → nombre limpio + sede física
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver_shared.silver_sedes_equivalencias (
    id              BIGSERIAL PRIMARY KEY,
    servicio_crudo  TEXT NOT NULL UNIQUE,
    servicio_limpio TEXT NOT NULL,
    sede            TEXT NOT NULL
);

-- --------------------------------------------------------
-- Obras sociales: nombre crudo → nombre limpio (se carga manualmente)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver_shared.silver_os_equivalencias (
    id              BIGSERIAL PRIMARY KEY,
    os_nombre_crudo TEXT NOT NULL UNIQUE,
    os_nombre_limpio TEXT NOT NULL
);

-- --------------------------------------------------------
-- Intermediarias: nombre crudo → nombre limpio (se carga manualmente)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS silver_shared.silver_intermediaria_equivalencias (
    id                    BIGSERIAL PRIMARY KEY,
    intermediaria_cruda   TEXT NOT NULL UNIQUE,
    intermediaria_limpia  TEXT NOT NULL
);

-- --------------------------------------------------------
-- Permisos para service_role
-- --------------------------------------------------------
GRANT USAGE ON SCHEMA silver_shared TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA silver_shared TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA silver_shared TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver_shared
    GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver_shared
    GRANT ALL ON SEQUENCES TO service_role;
