
console.log('--- main.js loaded version 1.2 ---');

import './style.css'
import { supabase } from './lib/supabase'
import { renderLogin } from './Login'
import { renderRecoverPassword } from './RecoverPassword'
import { renderDashboard } from './Dashboard'
import { renderAdmin } from './Admin'

const app = document.querySelector('#app')

let currentView = 'login'
let currentSessionUserId = null

async function handleRoute(session) {
    console.log('handleRoute called. Session:', session ? 'exists' : 'null');
    if (!session) {
        showView('login')
        return
    }

    const route = window.location.hash
    const targetView = route === '#admin' ? 'admin' : 'dashboard'

    console.log('handleRoute status:', {
        currentView,
        targetView,
        currentSessionUserId,
        sessionUserId: session.user.id,
        willRender: (currentView !== targetView || currentSessionUserId !== session.user.id)
    });

    // Evitar renderizar si ya estamos en la vista correcta para el mismo usuario
    if (currentView !== targetView || currentSessionUserId !== session.user.id) {
        currentSessionUserId = session.user.id
        currentView = targetView
        if (targetView === 'admin') {
            console.log('Rendering Admin view');
            renderAdmin(app, session)
        } else {
            console.log('Rendering Dashboard view');
            renderDashboard(app, session)
        }
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

function showView(view) {
    console.log('showView called:', view);
    currentView = view
    currentSessionUserId = null
    if (view === 'login') {
        renderLogin(app, () => showView('recover'))
    } else if (view === 'recover') {
        renderRecoverPassword(app, () => showView('login'))
    }
}

init()
