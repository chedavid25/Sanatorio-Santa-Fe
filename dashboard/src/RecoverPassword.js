
import { supabase } from './lib/supabase'

export function renderRecoverPassword(container, onBack) {
    container.className = "";
    
    container.innerHTML = `
    <div class="auth-page">
        <div class="container-fluid p-0">
            <div class="row g-0">
                <div class="col-xxl-3 col-lg-4 col-md-5">
                    <div class="auth-full-page-content d-flex p-sm-5 p-4">
                        <div class="w-100">
                            <div class="d-flex flex-column h-100">
                                <div class="mb-4 mb-md-5 text-center">
                                    <a href="/" class="d-block auth-logo">
                                        <img src="/assets/images/logo-gsf.png" alt="Sanatorio Santa Fe" height="80"> 
                                        <div class="mt-3">
                                            <span class="logo-txt fw-bold text-primary" style="font-size: 1.4rem;">Sanatorio Santa Fe</span>
                                        </div>
                                    </a>
                                </div>
                                <div class="auth-content my-auto">
                                    <div class="text-center">
                                        <h5 class="mb-0">Recuperar Contraseña</h5>
                                        <p class="text-muted mt-2">Ingresa tu email y te enviaremos las instrucciones.</p>
                                    </div>
                                    <div class="alert alert-success text-center mb-4 d-none" id="recover-success" role="alert">
                                        ¡Instrucciones enviadas! Revisa tu correo.
                                    </div>
                                    <form class="mt-4" id="recover-form">
                                        <div class="mb-3">
                                            <label class="form-label">Correo Electrónico</label>
                                            <input type="email" class="form-control" id="recover-email" placeholder="Ingresa tu email" required>
                                        </div>
                                        <div class="mb-3 mt-4">
                                            <button class="btn btn-primary w-100 waves-effect waves-light py-2 fw-bold" type="submit" id="recover-btn">
                                                <span class="spinner-border spinner-border-sm d-none me-2" id="recover-spinner" role="status" aria-hidden="true"></span>
                                                ENVIAR INSTRUCCIONES
                                            </button>
                                        </div>
                                        <div id="recover-error" class="alert alert-danger d-none mt-3" role="alert"></div>
                                    </form>

                                    <div class="mt-5 text-center">
                                        <p class="text-muted mb-0">¿Recordaste tu contraseña? <a href="#" id="back-to-login" class="text-primary fw-semibold"> Iniciar Sesión </a> </p>
                                    </div>
                                </div>
                                <div class="mt-4 mt-md-5 text-center">
                                    <p class="mb-0">© ${new Date().getFullYear()} Sanatorio Santa Fe</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xxl-9 col-lg-8 col-md-7">
                    <div class="auth-bg pt-md-5 p-4 d-flex">
                        <div class="bg-overlay" style="background: linear-gradient(135deg, rgba(24, 95, 165, 0.9) 0%, rgba(93, 202, 165, 0.8) 100%);"></div>
                        <ul class="bg-bubbles">
                            <li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `

    document.getElementById('back-to-login').addEventListener('click', (e) => {
        e.preventDefault()
        onBack()
    })

    const form = document.getElementById('recover-form')
    const recoverBtn = document.getElementById('recover-btn')
    const recoverSpinner = document.getElementById('recover-spinner')
    const recoverError = document.getElementById('recover-error')
    const recoverSuccess = document.getElementById('recover-success')

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = document.getElementById('recover-email').value

        recoverError.classList.add('d-none')
        recoverSuccess.classList.add('d-none')
        recoverBtn.disabled = true
        recoverSpinner.classList.remove('d-none')

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            })

            if (error) throw error
            
            recoverSuccess.classList.remove('d-none')
            form.reset()
        } catch (error) {
            recoverError.textContent = error.message || 'Error al enviar el link'
            recoverError.classList.remove('d-none')
        } finally {
            recoverBtn.disabled = false
            recoverSpinner.classList.add('d-none')
        }
    })
}
