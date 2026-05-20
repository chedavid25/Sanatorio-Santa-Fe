
import { supabase } from './lib/supabase'

export function renderLogin(container, onRecover) {
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
                                        <img src="/assets/images/logo-gsf.png" alt="Sanatorio Santa Fe" height="100">
                                    </a>
                                </div>
                                <div class="auth-content my-auto mx-auto" style="max-width: 420px; width: 100%;">
                                    <div class="text-center">
                                        <h4 class="mb-0 fw-bold">Sistema BI</h4>
                                        <p class="text-muted mt-2">Ingresa tus credenciales para acceder al panel de Sanatorio Santa Fe.</p>
                                    </div>
                                    <form class="mt-4 pt-2" id="login-form">
                                        <div class="mb-3">
                                            <label class="form-label font-size-14 fw-semibold text-secondary">Correo Electrónico</label>
                                            <input type="email" class="form-control form-control-lg" id="email" placeholder="ejemplo@sanatoriosantafe.com.ar" required style="font-size: 1rem; padding: 0.75rem 1rem;">
                                        </div>
                                        <div class="mb-3">
                                            <div class="d-flex align-items-start">
                                                <div class="flex-grow-1">
                                                    <label class="form-label font-size-14 fw-semibold text-secondary">Contraseña</label>
                                                </div>
                                                <div class="flex-shrink-0">
                                                    <a href="#" id="recover-pw-link" class="text-muted font-size-13">¿Olvidaste tu contraseña?</a>
                                                </div>
                                            </div>
                                            
                                            <div class="input-group auth-pass-inputgroup">
                                                <input type="password" class="form-control form-control-lg" id="password" placeholder="Tu contraseña" aria-label="Password" aria-describedby="password-addon" required style="font-size: 1rem; padding: 0.75rem 1rem;">
                                                <button class="btn btn-light shadow-none ms-0" type="button" id="password-toggle"><i class="mdi mdi-eye-outline"></i></button>
                                            </div>
                                        </div>
                                        <div class="row mb-4">
                                            <div class="col">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="remember-check" checked style="width: 1.1rem; height: 1.1rem;">
                                                    <label class="form-check-label font-size-14 ms-1" for="remember-check">
                                                        Mantener sesión iniciada
                                                    </label>
                                                </div>  
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <button class="btn btn-primary w-100 waves-effect waves-light py-3 fw-bold font-size-16" type="submit" id="login-btn" style="letter-spacing: 1px; background-color: #185FA5; border-color: #185FA5;">
                                                <span class="spinner-border spinner-border-sm d-none me-2" id="login-spinner" role="status" aria-hidden="true"></span>
                                                INICIAR SESIÓN
                                            </button>
                                        </div>
                                        <div id="login-error" class="alert alert-danger d-none mt-3 font-size-14" role="alert"></div>
                                    </form>
                                </div>
                                <div class="mt-4 mt-md-5 text-center">
                                    <p class="mb-0 font-size-14 text-muted">© ${new Date().getFullYear()} Sanatorio Santa Fe. <br> <span class="fw-medium">Inteligencia de Negocios por Imalá</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xxl-9 col-lg-8 col-md-7">
                    <div class="auth-bg pt-md-5 p-4 d-flex">
                        <div class="bg-overlay" style="background: linear-gradient(135deg, rgba(24, 95, 165, 0.95) 0%, rgba(93, 202, 165, 0.85) 100%);"></div>
                        <ul class="bg-bubbles">
                            <li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li>
                        </ul>
                        <div class="row justify-content-center align-items-center w-100 h-100">
                            <div class="col-xl-7">
                                <div class="p-0 p-sm-4 px-xl-0">
                                    <div id="reviewcarouselIndicators" class="carousel slide" data-bs-ride="carousel">
                                        <div class="carousel-indicators carousel-indicators-rounded justify-content-start ms-0 mb-0">
                                            <button type="button" data-bs-target="#reviewcarouselIndicators" data-bs-slide-to="0" class="active" aria-current="true"></button>
                                            <button type="button" data-bs-target="#reviewcarouselIndicators" data-bs-slide-to="1"></button>
                                            <button type="button" data-bs-target="#reviewcarouselIndicators" data-bs-slide-to="2"></button>
                                        </div>
                                        <div class="carousel-inner">
                                            <div class="carousel-item active">
                                                <div class="testi-contain text-white">
                                                    <i class="bx bxs-quote-alt-left text-success display-6"></i>
                                                    <h3 class="mt-4 fw-medium lh-base text-white">“Visualiza el rendimiento de cada departamento en tiempo real con datos precisos y actualizados.”</h3>
                                                    <div class="mt-4 pt-3 pb-5">
                                                        <div class="d-flex align-items-start">
                                                            <div class="flex-shrink-0">
                                                                <div class="avatar-lg bg-white-50 rounded-circle d-flex align-items-center justify-content-center">
                                                                    <i class="bx bx-stats font-size-36 text-white"></i>
                                                                </div>
                                                            </div>
                                                            <div class="flex-grow-1 ms-3 mb-4">
                                                                <h5 class="font-size-20 text-white">Métricas Operativas</h5>
                                                                <p class="mb-0 text-white-50">Diagnóstico por Imágenes</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="carousel-item">
                                                <div class="testi-contain text-white">
                                                    <i class="bx bxs-quote-alt-left text-success display-6"></i>
                                                    <h3 class="mt-4 fw-medium lh-base text-white">“Analiza la distribución por obra social e intermediaria para optimizar la toma de decisiones.”</h3>
                                                    <div class="mt-4 pt-3 pb-5">
                                                        <div class="d-flex align-items-start">
                                                            <div class="flex-shrink-0">
                                                                <div class="avatar-lg bg-white-50 rounded-circle d-flex align-items-center justify-content-center">
                                                                    <i class="bx bx-pie-chart-alt font-size-36 text-white"></i>
                                                                </div>
                                                            </div>
                                                            <div class="flex-grow-1 ms-3 mb-4">
                                                                <h5 class="font-size-20 text-white">Análisis de Mercado</h5>
                                                                <p class="mb-0 text-white-50">Sanatorio Santa Fe</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `

    const form = document.getElementById('login-form')
    const passwordToggle = document.getElementById('password-toggle')
    const passwordInput = document.getElementById('password')
    const loginError = document.getElementById('login-error')
    const loginBtn = document.getElementById('login-btn')
    const loginSpinner = document.getElementById('login-spinner')
    const recoverLink = document.getElementById('recover-pw-link')

    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
        passwordInput.setAttribute('type', type)
        const icon = passwordToggle.querySelector('i')
        if (type === 'text') {
            icon.classList.replace('mdi-eye-outline', 'mdi-eye-off-outline')
        } else {
            icon.classList.replace('mdi-eye-off-outline', 'mdi-eye-outline')
        }
    })

    recoverLink.addEventListener('click', (e) => {
        e.preventDefault()
        onRecover()
    })

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value

        loginError.classList.add('d-none')
        loginBtn.disabled = true
        loginSpinner.classList.remove('d-none')

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error
            
            window.location.reload()
        } catch (error) {
            loginError.textContent = error.message === 'Invalid login credentials' ? 'Credenciales de acceso incorrectas.' : error.message
            loginError.classList.remove('d-none')
        } finally {
            loginBtn.disabled = false
            loginSpinner.classList.add('d-none')
        }
    })
}
