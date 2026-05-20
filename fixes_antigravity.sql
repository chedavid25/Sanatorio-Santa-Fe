-- ============================================================
-- Correcciones estructurales - Ejecutar en SQL Editor
-- ============================================================

-- 1. UNIQUE constraints en silver_shared
--    Previenen duplicados si load_silver_shared.py se vuelve a ejecutar.
--    Las tablas ya estan limpias (deduplicacion hecha via Python).

ALTER TABLE silver_shared.silver_codigos_nomenclador
    ADD CONSTRAINT uq_codigos_nomenclador UNIQUE (codigo, servicio);

ALTER TABLE silver_shared.silver_sedes_equivalencias
    ADD CONSTRAINT uq_sedes_equivalencias UNIQUE (servicio_crudo);

ALTER TABLE silver_shared.silver_os_equivalencias
    ADD CONSTRAINT uq_os_equivalencias UNIQUE (os_nombre_crudo);

ALTER TABLE silver_shared.silver_intermediaria_equivalencias
    ADD CONSTRAINT uq_intermediaria_equivalencias UNIQUE (intermediaria_cruda);


-- 2. Columnas de rango en log_sincronizacion
--    El sync script ahora registra que periodo consulto en cada ejecucion.

ALTER TABLE logs.log_sincronizacion
    ADD COLUMN IF NOT EXISTS fecha_desde DATE,
    ADD COLUMN IF NOT EXISTS fecha_hasta DATE;
