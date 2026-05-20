-- ============================================================
-- Fix: permisos completos para roles anon y authenticated
--
-- Las vistas Gold usan SECURITY INVOKER (default de PostgreSQL),
-- por lo que el rol que hace la consulta necesita SELECT en TODA
-- la cadena: gold → silver → bronze.
-- Los bronze de ECO y Detalle solo tenían GRANT a service_role.
-- ============================================================

-- 1. Acceso a los schemas
GRANT USAGE ON SCHEMA diagnostico_imagenes TO anon, authenticated;
GRANT USAGE ON SCHEMA silver_shared        TO anon, authenticated;
GRANT USAGE ON SCHEMA gold                 TO anon, authenticated;
GRANT USAGE ON SCHEMA logs                 TO anon, authenticated;

-- 2. Todas las tablas y vistas en diagnostico_imagenes
GRANT SELECT ON ALL TABLES IN SCHEMA diagnostico_imagenes TO anon, authenticated;

-- 3. Todas las tablas de silver_shared (lookup tables para joins)
GRANT SELECT ON ALL TABLES IN SCHEMA silver_shared TO anon, authenticated;

-- 4. Todas las vistas en gold
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO anon, authenticated;

-- 5. Log de sincronización (sidebar "Última sync")
GRANT SELECT ON ALL TABLES IN SCHEMA logs TO anon, authenticated;

-- 6. Asegurar futuros objetos con DEFAULT PRIVILEGES
ALTER DEFAULT PRIVILEGES IN SCHEMA diagnostico_imagenes GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver_shared        GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold                 GRANT SELECT ON TABLES TO anon, authenticated;
