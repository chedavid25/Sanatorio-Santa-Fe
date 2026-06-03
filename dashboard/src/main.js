
console.log('--- main.js loaded version 1.2 ---');

import './style.css'
import { supabase, getUserProfile } from './lib/supabase'
import { setUser } from './lib/state'
import { renderLogin } from './Login'
import { renderRecoverPassword } from './RecoverPassword'
import { renderDashboard } from './Dashboard'
import { renderAdmin } from './Admin'
import { invalidateDataCache } from './lib/data'

const app = document.querySelector('#app')

let currentView = 'login'
let currentSessionUserId = null
let currentAdminSection = 'saneamiento'
let currentError = ''

async function handleRoute(session) {
    console.log('handleRoute called. Session:', session ? 'exists' : 'null');
    if (!session) {
        showView('login', currentError)
        currentError = ''
        return
    }

    try {
        const { data: profile, error } = await getUserProfile(session.user.id)
        if (error || !profile) {
            console.error('Error al cargar perfil:', error)
            await supabase.auth.signOut()
            currentError = 'Error de acceso. No se encontró tu perfil de usuario.'
            showView('login', currentError)
            currentError = ''
            return
        }

        if (!profile.activo) {
            console.warn('Usuario inactivo intentando acceder:', profile.email)
            await supabase.auth.signOut()
            currentError = 'Tu cuenta está registrada pero aún no ha sido activada por el administrador.'
            showView('login', currentError)
            currentError = ''
            return
        }

        // Guardar perfil en estado global
        setUser(profile)

        const route = window.location.hash
        const isAdmin = profile.rol === 'admin'
        const canSaneamiento = profile.modulos_permitidos?.includes('Saneamiento')

        let targetView = 'dashboard'
        let targetSection = 'saneamiento'

        if (route === '#admin' && (isAdmin || canSaneamiento)) {
            targetView = 'admin'
            targetSection = 'saneamiento'
        } else if (route === '#admin-usuarios' && isAdmin) {
            targetView = 'admin'
            targetSection = 'usuarios'
        } else if (route === '#admin' || route === '#admin-usuarios') {
            // Sin permiso: redirigir al dashboard
            window.location.hash = ''
        }

        // Si ya estamos en Admin y solo cambia la sección, navegar sin re-renderizar
        if (currentView === 'admin' && targetView === 'admin' &&
            currentSessionUserId === session.user.id && currentAdminSection !== targetSection) {
            currentAdminSection = targetSection
            window.__adminNavigateTo?.(targetSection)
            return
        }

        // Evitar renderizar si ya estamos en la vista correcta para el mismo usuario
        if (currentView !== targetView || currentSessionUserId !== session.user.id) {
            // Si volvemos al dashboard desde la administración, invalidamos la caché en memoria para ver datos actualizados
            if (targetView === 'dashboard' && currentView === 'admin') {
                invalidateDataCache();
            }
            currentSessionUserId = session.user.id
            currentView = targetView
            currentAdminSection = targetSection
            if (targetView === 'admin') {
                renderAdmin(app, session, targetSection)
            } else {
                renderDashboard(app, session)
            }
        }
    } catch (e) {
        console.error('Error en handleRoute:', e)
        await supabase.auth.signOut()
        showView('login', 'Ocurrió un error inesperado al iniciar sesión.')
    }
}

async function init() {
    console.log('Initializing main.js...');
    const { data: { session } } = await supabase.auth.getSession()
    await handleRoute(session)

    // Escuchar cambios de autenticación
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('onAuthStateChange fired. Event:', event, 'Has session:', !!session);
        if (event === 'SIGNED_OUT') {
            currentSessionUserId = null
            showView('login')
        } else if (event === 'SIGNED_IN' && session) {
            handleRoute(session)
        }
    })

    // Escuchar cambios de ruta
    window.addEventListener('hashchange', async () => {
        console.log('hashchange event fired. New hash:', window.location.hash);
        const { data: { session } } = await supabase.auth.getSession()
        await handleRoute(session)
    })
}

function showView(view, initialError = '') {
    console.log('showView called:', view);
    currentView = view
    currentSessionUserId = null
    if (view === 'login') {
        renderLogin(app, () => showView('recover'), initialError)
    } else if (view === 'recover') {
        renderRecoverPassword(app, () => showView('login'))
    }
}

init()
