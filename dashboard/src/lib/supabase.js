import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://akheyrrqstgsrfnpzxbx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iRoypNemPW9QorlHlv8eDg_eVy8tdvQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Obtener el perfil del usuario actual
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    return { data, error };
}

// Obtener todos los perfiles de usuario (para admins)
export async function getAllUserProfiles() {
    const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('*')
        .order('fecha_creacion', { ascending: false });
    return { data, error };
}

// Actualizar un perfil de usuario (para admins)
export async function updateUserProfile(profileId, updates) {
    const { data, error } = await supabase
        .from('perfiles_usuario')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();
    return { data, error };
}
