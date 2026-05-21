-- 1. Crear la tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.perfiles_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT,
    rol TEXT NOT NULL DEFAULT 'visualizador' CHECK (rol IN ('admin', 'jefe_servicio', 'visualizador')),
    modulos_permitidos TEXT[] NOT NULL DEFAULT '{}',
    activo BOOLEAN NOT NULL DEFAULT false,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Conceder permisos sobre la tabla
GRANT ALL ON public.perfiles_usuario TO anon, authenticated, service_role;

-- 3. Crear la función del trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles_usuario (user_id, email, nombre, rol, modulos_permitidos, activo)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
        'visualizador',
        '{}',
        false -- Nuevos usuarios registrados serán inactivos por defecto
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el trigger para nuevos registros en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Sincronizar usuarios existentes en auth.users (para evitar que se queden bloqueados)
-- A los usuarios existentes les asignamos rol 'admin' y permisos totales por seguridad inicial.
INSERT INTO public.perfiles_usuario (user_id, email, nombre, rol, modulos_permitidos, activo)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nombre', split_part(email, '@', 1)),
    'admin',
    ARRAY['Video', 'Tomo', 'Resonancia', 'Eco', 'Saneamiento'],
    true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 6. Habilitar la seguridad RLS
ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;

-- 7. Definir políticas RLS
DROP POLICY IF EXISTS "Permitir lectura de perfil propio" ON public.perfiles_usuario;
CREATE POLICY "Permitir lectura de perfil propio" 
ON public.perfiles_usuario 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir lectura completa a administradores" ON public.perfiles_usuario;
CREATE POLICY "Permitir lectura completa a administradores" 
ON public.perfiles_usuario 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles_usuario 
        WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
);

DROP POLICY IF EXISTS "Permitir actualizaciones a administradores" ON public.perfiles_usuario;
CREATE POLICY "Permitir actualizaciones a administradores" 
ON public.perfiles_usuario 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles_usuario 
        WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.perfiles_usuario 
        WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
);
