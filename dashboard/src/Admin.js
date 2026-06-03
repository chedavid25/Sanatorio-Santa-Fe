
import { supabase } from './lib/supabase'
import { DEPARTAMENTOS } from './config'
import { getUser, hasPermission } from './lib/state'

let currentData = { codigos: [], os: [], int: [], sedes: [], derivantes: [] };
let masterNames = [];
let sortConfig = { key: 'codigo', direction: 'asc' };
let activeTab = 'codigos';
let selectedIds = new Set();

let activeAdminSection = 'saneamiento'; // 'saneamiento' o 'usuarios'
let usersList = [];

let derivantesPage = 1;
const derivantesPageSize = 100;

let codigosPage = 1;
const codigosPageSize = 50;

let osPage = 1;
const osPageSize = 50;

let filterService = 'Todos';
let filterStatus = 'Todos';

// Función de navegación interna expuesta al enrutador (main.js)
function adminNavigateTo(section) {
    activeAdminSection = section;
    const secSaneamiento = document.getElementById('section-saneamiento');
    const secUsuarios = document.getElementById('section-usuarios');
    const btnSaneamiento = document.getElementById('sidebar-saneamiento-btn');
    const btnUsuarios = document.getElementById('sidebar-usuarios-btn');
    const liSaneamiento = document.getElementById('sidebar-saneamiento-li');
    const liUsuarios = document.getElementById('sidebar-usuarios-li');

    if (section === 'usuarios') {
        secSaneamiento?.classList.add('d-none');
        secUsuarios?.classList.remove('d-none');
        liSaneamiento?.classList.remove('mm-active');
        btnSaneamiento?.classList.remove('active');
        liUsuarios?.classList.add('mm-active');
        btnUsuarios?.classList.add('active');
        loadUsers();
    } else {
        secSaneamiento?.classList.remove('d-none');
        secUsuarios?.classList.add('d-none');
        liSaneamiento?.classList.add('mm-active');
        btnSaneamiento?.classList.add('active');
        liUsuarios?.classList.remove('mm-active');
        btnUsuarios?.classList.remove('active');
    }
}

export async function renderAdmin(container, session, initialSection = 'saneamiento') {
    activeAdminSection = initialSection;
    window.__adminNavigateTo = adminNavigateTo;
    const userProfile = getUser();
    const isAdmin = userProfile?.rol === 'admin';
    const canSaneamiento = isAdmin || hasPermission('Saneamiento');

    // Carga inicial
    await loadMasterNames();
    
    container.innerHTML = `
    <div id="layout-wrapper">
        <header id="page-topbar">
            <div class="navbar-header">
                <div class="d-flex">
                    <div class="navbar-brand-box">
                        <a href="/" class="logo logo-dark">
                            <span class="logo-sm">
                                <span class="logo-txt">SF</span>
                            </span>
                            <span class="logo-lg">
                                <div class="logo-sidebar-text">
                                    <span class="line-1">SANATORIO</span>
                                    <span class="line-2">SANTA FE</span>
                                </div>
                            </span>
                        </a>
                        <a href="/" class="logo logo-light">
                            <span class="logo-sm">
                                <span class="logo-txt">SF</span>
                            </span>
                            <span class="logo-lg">
                                <div class="logo-sidebar-text">
                                    <span class="line-1">SANATORIO</span>
                                    <span class="line-2">SANTA FE</span>
                                </div>
                            </span>
                        </a>
                    </div>
                    <button type="button" class="btn btn-sm px-3 font-size-16 header-item" id="vertical-menu-btn"><i class="fa fa-fw fa-bars"></i></button>
                </div>
                <div class="d-flex">
                    <div class="dropdown d-inline-block">
                        <button type="button" class="btn header-item bg-light-subtle border-start" data-bs-toggle="dropdown">
                            <span class="d-none d-xl-inline-block ms-1 fw-medium">${userProfile?.nombre || session.user.email}</span>
                            <i class="mdi mdi-chevron-down d-none d-xl-inline-block"></i>
                        </button>
                        <div class="dropdown-menu dropdown-menu-end shadow-sm">
                            <a class="dropdown-item" href="/"><i class="mdi mdi-home font-size-16 align-middle me-1"></i> Ir al Dashboard</a>
                            <div class="dropdown-divider"></div>
                            <a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="mdi mdi-logout font-size-16 align-middle me-1"></i> Cerrar Sesión</a>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <div class="vertical-menu" style="background:var(--ssf-bg-sidebar) !important;">
            <div data-simplebar class="h-100">
                <div id="sidebar-menu">
                    <ul class="metismenu list-unstyled" id="side-menu">
                        <li><a href="/" class="waves-effect"><i class="bx bx-arrow-back custom-sidebar-icon"></i><span>Volver al Dashboard</span></a></li>
                        <li class="menu-title" style="color:rgba(255,255,255,0.4) !important; text-transform:uppercase; letter-spacing:1px;">Administración</li>
                        
                         ${canSaneamiento ? `
                        <li class="${activeAdminSection === 'saneamiento' ? 'mm-active' : ''}" id="sidebar-saneamiento-li">
                            <a href="javascript:void(0);" id="sidebar-saneamiento-btn" class="waves-effect ${activeAdminSection === 'saneamiento' ? 'active' : ''}">
                                <i class="bx bx-data custom-sidebar-icon"></i>
                                <span>Saneamiento de datos</span>
                            </a>
                        </li>` : ''}
                        
                        ${isAdmin ? `
                        <li class="${activeAdminSection === 'usuarios' ? 'mm-active' : ''}" id="sidebar-usuarios-li">
                            <a href="javascript:void(0);" id="sidebar-usuarios-btn" class="waves-effect ${activeAdminSection === 'usuarios' ? 'active' : ''}">
                                <i class="bx bx-user custom-sidebar-icon"></i>
                                <span>Gestión de Usuarios</span>
                            </a>
                        </li>` : ''}
                    </ul>
                </div>
            </div>
        </div>

        <div class="main-content">
            <div class="page-content">
                <div class="container-fluid">
                    
                    <!-- SECCIÓN: SANEAMIENTO -->
                    <div id="section-saneamiento" class="${activeAdminSection === 'saneamiento' ? '' : 'd-none'}">
                        <div class="row">
                            <div class="col-12">
                                <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                                    <h4 class="mb-sm-0 font-size-18">🗂️ Saneamiento de datos</h4>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-12">
                                <div class="card shadow-sm">
                                    <div class="card-body">
                                        <!-- Toolbar -->
                                        <div class="row mb-4 align-items-end">
                                            <div class="col-md-3">
                                                <label class="form-label">Servicio</label>
                                                <select class="form-select" id="filter-service">
                                                    <option value="Todos">Todos los servicios</option>
                                                    <option value="Video">Videoendoscopía</option>
                                                    <option value="Tomo">Tomografía</option>
                                                    <option value="Resonancia">Resonancia</option>
                                                    <option value="Eco">Ecografía</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Estado / Clasificación</label>
                                                <select class="form-select" id="filter-status">
                                                    <option value="Todos">Todos los estados</option>
                                                    <option value="null">⚠️ Pendientes</option>
                                                    <option value="true">✅ Es estudio</option>
                                                    <option value="false">❌ Excluidos</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Buscador global</label>
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bx bx-search"></i></span>
                                                    <input type="text" class="form-control" id="search-input" placeholder="Buscar...">
                                                </div>
                                            </div>
                                            <div class="col-md-3 text-end">
                                                <button class="btn btn-primary" onclick="window.showMasterNamesModal()">
                                                    <i class="bx bx-list-ul"></i> Nombres Unificados
                                                </button>
                                            </div>
                                        </div>

                                        <!-- Acciones Masivas -->
                                        <div id="bulk-actions-bar" class="alert alert-info d-none mb-3 d-flex justify-content-between align-items-center" style="overflow: visible;">
                                            <div><strong id="selected-count">0</strong> seleccionados</div>
                                            <div class="d-flex gap-2 align-items-center">
                                                <div style="width: 300px;">
                                                    <select id="bulk-unified-name" class="form-select form-select-sm">
                                                        <option value="">Asignar nombre unificado...</option>
                                                        ${masterNames.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('')}
                                                    </select>
                                                </div>
                                                <button class="btn btn-sm btn-success" onclick="window.applyBulkUpdate()">Aplicar masivamente</button>
                                                <button class="btn btn-sm btn-outline-secondary" onclick="window.clearSelection()">Cancelar</button>
                                            </div>
                                        </div>

                                        <ul class="nav nav-tabs nav-tabs-custom nav-success nav-justified" role="tablist">
                                            <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tab-codigos" id="nav-codigos">Códigos de estudio</a></li>
                                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-os" id="nav-os">Obras sociales</a></li>
                                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-int" id="nav-int">Intermediarias</a></li>
                                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-sedes" id="nav-sedes">Sedes</a></li>
                                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-derivantes" id="nav-derivantes">Médicos derivantes</a></li>
                                        </ul>

                                        <div class="tab-content p-3 text-muted">
                                            <div class="tab-pane active" id="tab-codigos"><div id="admin-codigos-content"></div></div>
                                            <div class="tab-pane" id="tab-os"><div id="admin-os-content"></div></div>
                                            <div class="tab-pane" id="tab-int"><div id="admin-int-content"></div></div>
                                            <div class="tab-pane" id="tab-sedes"><div id="admin-sedes-content"></div></div>
                                            <div class="tab-pane" id="tab-derivantes"><div id="admin-derivantes-content"></div></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN: GESTIÓN DE USUARIOS -->
                    <div id="section-usuarios" class="${activeAdminSection === 'usuarios' ? '' : 'd-none'}">
                        <div class="row">
                            <div class="col-12">
                                <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center gap-2">
                                        <h4 class="mb-0 font-size-18">👥 Gestión de Usuarios</h4>
                                        <button type="button"
                                                class="btn btn-sm btn-light rounded-circle p-0 d-flex align-items-center justify-content-center"
                                                id="roles-help-btn"
                                                title="Ver descripción de roles"
                                                style="width:28px; height:28px; border:1.5px solid #cdd3d8;">
                                            <i class="bx bx-help-circle font-size-16 text-muted"></i>
                                        </button>
                                    </div>
                                    <div>
                                        <button class="btn btn-success waves-effect waves-light" onclick="window.showCreateUserModal()">
                                            <i class="bx bx-user-plus me-1"></i> Nuevo Usuario
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-12">
                                <div class="card shadow-sm">
                                    <div class="card-body">
                                        <div class="row mb-3">
                                            <div class="col-md-4">
                                                <div class="input-group">
                                                    <span class="input-group-text"><i class="bx bx-search"></i></span>
                                                    <input type="text" class="form-control" id="search-users-input" placeholder="Buscar por nombre o correo...">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div id="users-table-container">
                                            <!-- Se renderiza vía JS -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal ayuda de roles -->
                    <div class="modal fade" id="rolesHelpModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content border-0 shadow-lg">
                                <div class="modal-header" style="background: linear-gradient(135deg, #004884 0%, #0072bc 100%);">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bx bx-shield-quarter font-size-22 text-white"></i>
                                        <h5 class="modal-title text-white mb-0">Descripción de Roles del Sistema</h5>
                                    </div>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body p-4">

                                    <!-- Administrador -->
                                    <div class="card border-0 mb-3" style="background: #f0f5ff; border-left: 4px solid #004884 !important; border-radius: 10px;">
                                        <div class="card-body p-3">
                                            <div class="d-flex align-items-start gap-3">
                                                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                     style="width:42px; height:42px; background:#004884;">
                                                    <i class="bx bx-crown font-size-20 text-white"></i>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <h6 class="fw-bold mb-1" style="color:#004884;">Administrador</h6>
                                                    <p class="text-muted mb-2 font-size-13">Acceso completo a todas las funcionalidades del sistema.</p>
                                                    <div class="d-flex flex-wrap gap-2">
                                                        <span class="badge bg-primary rounded-pill"><i class="bx bx-check me-1"></i>Videoendoscopía</span>
                                                        <span class="badge bg-primary rounded-pill"><i class="bx bx-check me-1"></i>Tomografía</span>
                                                        <span class="badge bg-primary rounded-pill"><i class="bx bx-check me-1"></i>Resonancia</span>
                                                        <span class="badge bg-primary rounded-pill"><i class="bx bx-check me-1"></i>Ecografía</span>
                                                        <span class="badge bg-primary rounded-pill"><i class="bx bx-check me-1"></i>Saneamiento de datos</span>
                                                        <span class="badge bg-primary rounded-pill"><i class="bx bx-check me-1"></i>Gestión de Usuarios</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Coordinador de Datos -->
                                    <div class="card border-0 mb-3" style="background: #f0faf5; border-left: 4px solid #198754 !important; border-radius: 10px;">
                                        <div class="card-body p-3">
                                            <div class="d-flex align-items-start gap-3">
                                                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                     style="width:42px; height:42px; background:#198754;">
                                                    <i class="bx bx-data font-size-20 text-white"></i>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <h6 class="fw-bold mb-1" style="color:#198754;">Coordinador de Datos</h6>
                                                    <p class="text-muted mb-2 font-size-13">Puede visualizar estadísticas de los módulos habilitados y acceder al panel de saneamiento de datos.</p>
                                                    <div class="d-flex flex-wrap gap-2">
                                                        <span class="badge rounded-pill" style="background:#198754;"><i class="bx bx-check me-1"></i>Módulos asignados</span>
                                                        <span class="badge rounded-pill" style="background:#198754;"><i class="bx bx-check me-1"></i>Saneamiento de datos</span>
                                                        <span class="badge bg-secondary rounded-pill"><i class="bx bx-x me-1"></i>Gestión de Usuarios</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Visualizador General -->
                                    <div class="card border-0 mb-3" style="background: #fffbf0; border-left: 4px solid #fd7e14 !important; border-radius: 10px;">
                                        <div class="card-body p-3">
                                            <div class="d-flex align-items-start gap-3">
                                                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                     style="width:42px; height:42px; background:#fd7e14;">
                                                    <i class="bx bx-bar-chart-alt-2 font-size-20 text-white"></i>
                                                </div>
                                                <div class="flex-grow-1">
                                                    <h6 class="fw-bold mb-1" style="color:#fd7e14;">Visualizador General</h6>
                                                    <p class="text-muted mb-2 font-size-13">Solo puede ver el dashboard con los módulos que le fueron habilitados. No tiene acceso a ningún panel de administración.</p>
                                                    <div class="d-flex flex-wrap gap-2">
                                                        <span class="badge rounded-pill" style="background:#fd7e14;"><i class="bx bx-check me-1"></i>Módulos asignados</span>
                                                        <span class="badge bg-secondary rounded-pill"><i class="bx bx-x me-1"></i>Saneamiento de datos</span>
                                                        <span class="badge bg-secondary rounded-pill"><i class="bx bx-x me-1"></i>Gestión de Usuarios</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Nota sobre módulos -->
                                    <div class="alert alert-light border d-flex gap-2 align-items-start mb-0" style="border-radius: 10px;">
                                        <i class="bx bx-info-circle font-size-18 text-primary mt-1 flex-shrink-0"></i>
                                        <div class="font-size-13">
                                            <strong>¿Cómo funcionan los módulos?</strong><br>
                                            Los módulos disponibles son: <strong>Videoendoscopía, Tomografía, Resonancia y Ecografía</strong>.
                                            Podés tildar o destildar cada uno directamente desde la tabla de usuarios para controlar qué secciones del dashboard puede ver cada persona.
                                            Los usuarios con rol <strong>Administrador</strong> tienen acceso a todos los módulos de forma automática y sus casillas no son editables.
                                        </div>
                                    </div>

                                </div>
                                <div class="modal-footer border-0 pt-0">
                                    <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Entendido</button>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    </div>

    <!-- Modal Nombres Maestros -->
    <div class="modal fade" id="masterNamesModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Maestro de Nombres Unificados</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="input-group mb-3">
                        <input type="text" id="new-master-name" class="form-control" placeholder="Agregar nuevo nombre...">
                        <button class="btn btn-success" onclick="window.addMasterName()">Agregar</button>
                    </div>
                    <div class="table-responsive" style="max-height: 400px;">
                        <table class="table table-sm table-hover align-middle">
                            <thead class="table-light"><tr><th>Nombre</th><th class="text-end">Acciones</th></tr></thead>
                            <tbody id="master-names-list-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Nuevo Usuario -->
    <div class="modal fade" id="createUserModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Registrar Nuevo Usuario</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="create-user-form">
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Nombre Completo</label>
                            <input type="text" id="new-user-name" class="form-control" placeholder="Ej. Juan Pérez" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Correo Electrónico</label>
                            <input type="email" id="new-user-email" class="form-control" placeholder="juan.perez@sanatoriosantafe.com.ar" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contraseña Temporal</label>
                            <input type="password" id="new-user-password" class="form-control" placeholder="Min. 6 caracteres" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Rol del Usuario</label>
                            <select id="new-user-role" class="form-select">
                                <option value="visualizador_general">Visualizador General</option>
                                <option value="coordinador_datos">Coordinador de Datos</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div id="create-user-error" class="alert alert-danger d-none" role="alert"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-success" id="btn-save-new-user">
                            <span class="spinner-border spinner-border-sm d-none me-2" id="new-user-spinner" role="status" aria-hidden="true"></span>
                            Crear Usuario
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    updateMasterDatalist();

    if (window.jQuery) {
        window.jQuery('#side-menu').metisMenu();
        
        document.getElementById('vertical-menu-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('sidebar-enable');
        });
        
        document.getElementById('logout-btn')?.addEventListener('click', async () => { 
            await supabase.auth.signOut(); 
            window.location.reload(); 
        });

        // Eventos de navegación lateral
        document.getElementById('sidebar-saneamiento-btn')?.addEventListener('click', () => {
            activeAdminSection = 'saneamiento';
            document.getElementById('section-saneamiento').classList.remove('d-none');
            document.getElementById('section-usuarios').classList.add('d-none');
            
            document.getElementById('sidebar-saneamiento-li').classList.add('mm-active');
            document.getElementById('sidebar-saneamiento-btn').classList.add('active');
            document.getElementById('sidebar-usuarios-li')?.classList.remove('mm-active');
            document.getElementById('sidebar-usuarios-btn')?.classList.remove('active');
        });

        document.getElementById('sidebar-usuarios-btn')?.addEventListener('click', () => {
            activeAdminSection = 'usuarios';
            document.getElementById('section-saneamiento').classList.add('d-none');
            document.getElementById('section-usuarios').classList.remove('d-none');
            
            document.getElementById('sidebar-saneamiento-li').classList.remove('mm-active');
            document.getElementById('sidebar-saneamiento-btn').classList.remove('active');
            document.getElementById('sidebar-usuarios-li').classList.add('mm-active');
            document.getElementById('sidebar-usuarios-btn').classList.add('active');
            
            loadUsers();
        });

        document.getElementById('roles-help-btn')?.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('rolesHelpModal'));
            modal.show();
        });

        document.getElementById('nav-codigos')?.addEventListener('click', () => { activeTab = 'codigos'; window.clearSelection(); loadCodigosNomenclador(); });
        document.getElementById('nav-os')?.addEventListener('click', () => { activeTab = 'os'; window.clearSelection(); loadOS(); });
        document.getElementById('nav-int')?.addEventListener('click', () => { activeTab = 'int'; window.clearSelection(); loadIntermediarias(); });
        document.getElementById('nav-sedes')?.addEventListener('click', () => { activeTab = 'sedes'; window.clearSelection(); loadSedes(); });
        document.getElementById('nav-derivantes')?.addEventListener('click', () => { activeTab = 'derivantes'; window.clearSelection(); loadDerivantes(); });

        document.getElementById('search-input')?.addEventListener('input', (e) => filterData(e.target.value));
        document.getElementById('filter-service')?.addEventListener('change', (e) => {
            filterService = e.target.value;
            codigosPage = 1;
            applyAndRenderCodigos();
        });
        document.getElementById('filter-status')?.addEventListener('change', (e) => {
            filterStatus = e.target.value;
            codigosPage = 1;
            applyAndRenderCodigos();
        });

        // Evento búsqueda de usuarios
        document.getElementById('search-users-input')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = usersList.filter(u => 
                u.email.toLowerCase().includes(q) || 
                (u.nombre && u.nombre.toLowerCase().includes(q))
            );
            renderUsersTable(document.getElementById('users-table-container'), filtered);
        });

        // Submit del formulario de creación de usuario
        const createForm = document.getElementById('create-user-form');
        if (createForm) {
            createForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('new-user-name').value.trim();
                const email = document.getElementById('new-user-email').value.trim();
                const password = document.getElementById('new-user-password').value;
                const role = document.getElementById('new-user-role').value;
                
                const errorDiv = document.getElementById('create-user-error');
                const spinner = document.getElementById('new-user-spinner');
                const btn = document.getElementById('btn-save-new-user');
                
                errorDiv.classList.add('d-none');
                spinner.classList.remove('d-none');
                btn.disabled = true;
                
                try {
                    // Módulos por defecto según rol
                    const modulos = role === 'admin' 
                        ? ['Video', 'Tomo', 'Resonancia', 'Eco', 'Saneamiento'] 
                        : ['Eco']; // Inicialización simple

                    const { data, error } = await supabase.rpc('admin_crear_usuario', {
                        p_email: email,
                        p_password: password,
                        p_nombre: name,
                        p_rol: role,
                        p_modulos: modulos
                    });
                    
                    if (error) throw error;
                    
                    // Cerrar modal
                    const modalEl = document.getElementById('createUserModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                    
                    createForm.reset();
                    loadUsers();
                } catch (err) {
                    errorDiv.textContent = err.message;
                    errorDiv.classList.remove('d-none');
                } finally {
                    spinner.classList.add('d-none');
                    btn.disabled = false;
                }
            });
        }
    }

    if (initialSection === 'usuarios') {
        loadUsers();
    } else {
        await loadCodigosNomenclador();
    }
}



// Data Loaders
async function loadMasterNames() {
    const { data } = await supabase.schema('silver_shared').from('master_nombres_unificados').select('*').order('nombre');
    masterNames = data || [];
}

function updateMasterDatalist() {
    // Ya no usamos datalist, se actualizan los selects al re-renderizar la tabla
}

// Modal logic
window.showMasterNamesModal = async () => {
    await loadMasterNames(); // Asegurar datos frescos
    const modal = new bootstrap.Modal(document.getElementById('masterNamesModal'));
    modal.show();
    renderMasterNamesTable();
};

function renderMasterNamesTable() {
    const body = document.getElementById('master-names-list-body');
    if (!body) return;
    if (masterNames.length === 0) {
        body.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No hay nombres cargados.</td></tr>';
    } else {
        body.innerHTML = masterNames.map(m => `
            <tr>
                <td><input type="text" class="form-control form-control-sm" value="${m.nombre}" onblur="window.updateMasterName(${m.id}, this.value)"></td>
                <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="window.deleteMasterName(${m.id})"><i class="bx bx-trash"></i></button></td>
            </tr>
        `).join('');
    }
}

window.addMasterName = async () => {
    const input = document.getElementById('new-master-name');
    const nombre = input.value.trim();
    if (!nombre) return;
    await supabase.schema('silver_shared').from('master_nombres_unificados').insert([{ nombre }]);
    input.value = '';
    await loadMasterNames();
    renderMasterNamesTable();
    updateMasterDatalist();
};

window.updateMasterName = async (id, value) => {
    if (!value) return;
    await supabase.schema('silver_shared').from('master_nombres_unificados').update({ nombre: value }).eq('id', id);
    await loadMasterNames();
    updateMasterDatalist();
};

window.deleteMasterName = async (id) => {
    if (!confirm("¿Eliminar este nombre?")) return;
    await supabase.schema('silver_shared').from('master_nombres_unificados').delete().eq('id', id);
    await loadMasterNames();
    renderMasterNamesTable();
    updateMasterDatalist();
};

// Selection logic
window.toggleSelection = (id) => {
    if (selectedIds.has(id.toString())) selectedIds.delete(id.toString());
    else selectedIds.add(id.toString());
    updateBulkUI();
};

window.toggleAll = (source) => {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(c => {
        c.checked = source.checked;
        if (source.checked) selectedIds.add(c.value.toString());
        else selectedIds.delete(c.value.toString());
    });
    updateBulkUI();
};

function updateBulkUI() {
    const bar = document.getElementById('bulk-actions-bar');
    const count = document.getElementById('selected-count');
    if (bar && count) {
        if (selectedIds.size > 0) {
            bar.classList.remove('d-none');
            count.innerText = selectedIds.size;
        } else {
            bar.classList.add('d-none');
        }
    }
}

window.clearSelection = () => {
    selectedIds.clear();
    updateBulkUI();
    const allCheck = document.getElementById('check-all');
    if (allCheck) allCheck.checked = false;
    document.querySelectorAll('.row-checkbox').forEach(c => c.checked = false);
};

window.applyBulkUpdate = async () => {
    const bulkSelect = document.getElementById('bulk-unified-name');
    const name = bulkSelect.value;
    if (!name) return alert("Elegí un nombre unificado");
    const ids = Array.from(selectedIds);
    for (const idStr of ids) {
        const [codigo, servicio] = idStr.split('|');
        await supabase.schema('silver_shared').from('silver_codigos_nomenclador')
            .update({ nombre_unificado: name })
            .eq('codigo', codigo)
            .eq('servicio', servicio);
    }
    try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); }
    window.clearSelection();
    loadCodigosNomenclador();
};

// Main Table Logic
async function loadCodigosNomenclador() {
    const content = document.getElementById('admin-codigos-content');
    content.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';
    const { data } = await supabase.schema('silver_shared').from('silver_codigos_nomenclador').select('*');
    currentData.codigos = data || [];
    applyAndRenderCodigos();
}

function applyAndRenderCodigos() {
    const queryEl = document.getElementById('search-input');
    const q = (queryEl?.value || '').toLowerCase();
    
    let filtered = currentData.codigos;

    // Filtro por Servicio
    if (filterService !== 'Todos') {
        filtered = filtered.filter(item => {
            const s = item.servicio.toLowerCase();
            if (filterService === 'Video' && s.includes('video')) return true;
            if (filterService === 'Tomo' && (s.includes('tomo') || s.includes('tac'))) return true;
            if (filterService === 'Resonancia' && (s.includes('reso') || s.includes('rmn'))) return true;
            if (filterService === 'Eco' && s.includes('eco')) return true;
            return false;
        });
    }

    // Filtro por Clasificación / Estado
    if (filterStatus !== 'Todos') {
        filtered = filtered.filter(item => {
            if (filterStatus === 'null') return item.es_estudio === null;
            if (filterStatus === 'true') return item.es_estudio === true;
            if (filterStatus === 'false') return item.es_estudio === false;
            return true;
        });
    }

    // Filtro por buscador de texto
    if (q) {
        filtered = filtered.filter(item => 
            item.codigo.toString().includes(q) || 
            item.nombre_original.toLowerCase().includes(q) || 
            (item.nombre_unificado && item.nombre_unificado.toLowerCase().includes(q))
        );
    }

    renderCodigosTable(document.getElementById('admin-codigos-content'), filtered);
}

function filterData(query) {
    if (activeTab === 'codigos') {
        codigosPage = 1;
        applyAndRenderCodigos();
    } else if (activeTab === 'derivantes') {
        const q = query.toLowerCase();
        const filtered = currentData.derivantes.filter(item => 
            item.nombre_original.toLowerCase().includes(q) || 
            item.nombre_unificado.toLowerCase().includes(q) || 
            (item.servicio_unificado && item.servicio_unificado.toLowerCase().includes(q))
        );
        renderDerivantesTable(document.getElementById('admin-derivantes-content'), filtered);
    } else if (activeTab === 'os') {
        osPage = 1;
        applyAndRenderOS();
    }
}

function applyAndRenderOS() {
    const queryEl = document.getElementById('search-input');
    const q = (queryEl?.value || '').toLowerCase();
    
    let filtered = currentData.os;

    if (q) {
        filtered = filtered.filter(item => 
            item.os_nombre_crudo.toLowerCase().includes(q) || 
            (item.os_nombre_limpio && item.os_nombre_limpio.toLowerCase().includes(q))
        );
    }

    renderOSTable(document.getElementById('admin-os-content'), filtered);
}

function renderCodigosTable(container, data) {
    if (!container) return;
    const sorted = [...data].sort((a, b) => {
        let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / codigosPageSize) || 1;
    if (codigosPage > totalPages) codigosPage = totalPages;
    if (codigosPage < 1) codigosPage = 1;

    const startIdx = (codigosPage - 1) * codigosPageSize;
    const paginatedData = sorted.slice(startIdx, startIdx + codigosPageSize);

    container.innerHTML = `
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th style="width: 40px"><input type="checkbox" id="check-all" onclick="window.toggleAll(this)"></th>
                    <th style="cursor:pointer" onclick="window.sortData('es_estudio')">Estado <i class="bx bx-sort-alt-2 ms-1 text-muted"></i></th>
                    <th style="cursor:pointer" onclick="window.sortData('servicio')">Servicio <i class="bx bx-sort-alt-2 ms-1 text-muted"></i></th>
                    <th style="cursor:pointer" onclick="window.sortData('codigo')">Código <i class="bx bx-sort-alt-2 ms-1 text-muted"></i></th>
                    <th style="cursor:pointer" onclick="window.sortData('nombre_original')">Nombre Original <i class="bx bx-sort-alt-2 ms-1 text-muted"></i></th>
                    <th>Clasificación</th>
                    <th style="width: 250px">Nombre Unificado</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedData.map(item => `
                    <tr class="${item.es_estudio === null ? 'table-warning' : (item.es_estudio ? 'table-success' : 'table-danger')}">
                        <td><input type="checkbox" class="row-checkbox" value="${item.codigo}|${item.servicio}" ${selectedIds.has(item.codigo.toString() + '|' + item.servicio) ? 'checked' : ''} onclick="window.toggleSelection(this.value)"></td>
                        <td>${item.es_estudio === null ? '⚠️' : (item.es_estudio ? '✅' : '❌')}</td>
                        <td>${item.servicio}</td>
                        <td><code>${item.codigo}</code></td>
                        <td>${item.nombre_original}</td>
                        <td>
                            <select class="form-select form-select-sm" onchange="window.updateClasificacion('${item.codigo}', '${item.servicio}', this.value)">
                                <option value="null" ${item.es_estudio === null ? 'selected' : ''}>Pendiente</option>
                                <option value="true" ${item.es_estudio === true ? 'selected' : ''}>✅ Es estudio</option>
                                <option value="false" ${item.es_estudio === false ? 'selected' : ''}>❌ Excluir</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm" 
                                   list="master-names-list" 
                                   value="${item.nombre_unificado || ''}" 
                                   placeholder="Sin unificar..." 
                                   onblur="window.updateNombreUnificado('${item.codigo}', '${item.servicio}', this.value)">
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    <!-- Paginación de Códigos -->
    <div class="d-flex justify-content-between align-items-center mt-3 px-2">
        <div class="text-muted font-size-13">
            Mostrando <strong>${startIdx + 1}</strong> a <strong>${Math.min(startIdx + paginatedData.length, sorted.length)}</strong> de <strong>${sorted.length}</strong> códigos
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" ${codigosPage === 1 ? 'disabled' : ''} onclick="window.changeCodigosPage(-1)">Anterior</button>
            <span class="align-self-center">Página <strong>${codigosPage}</strong> de <strong>${totalPages}</strong></span>
            <button class="btn btn-sm btn-outline-secondary" ${codigosPage === totalPages ? 'disabled' : ''} onclick="window.changeCodigosPage(1)">Siguiente</button>
        </div>
    </div>
    
    <!-- Datalist global para autocompletado nativo -->
    <datalist id="master-names-list">
        ${masterNames.map(m => `<option value="${m.nombre}"></option>`).join('')}
    </datalist>`;
}

window.sortData = (key) => {
    if (sortConfig.key === key) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.direction = 'asc'; }
    if (activeTab === 'codigos') {
        applyAndRenderCodigos();
    } else {
        renderCodigosTable(document.getElementById('admin-codigos-content'), currentData.codigos);
    }
};

window.changeCodigosPage = (delta) => {
    codigosPage += delta;
    applyAndRenderCodigos();
};

// Tabs
async function loadOS() {
    const content = document.getElementById('admin-os-content');
    content.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const { data: equivData, error: err1 } = await supabase
            .schema('silver_shared')
            .from('silver_os_equivalencias')
            .select('*');
        if (err1) throw err1;
        
        let rawOS = [];
        let fromRaw = 0;
        let toRaw = 999;
        while (true) {
            const { data, error } = await supabase
                .rpc('get_unique_os_from_detail')
                .range(fromRaw, toRaw);
            if (error) throw error;
            rawOS = rawOS.concat(data);
            if (data.length < 1000) break;
            fromRaw += 1000;
            toRaw += 1000;
        }

        const equivMap = new Map();
        (equivData || []).forEach(item => {
            equivMap.set(item.os_nombre_crudo.trim().toUpperCase(), item.os_nombre_limpio);
        });

        const combined = [];
        (equivData || []).forEach(item => {
            combined.push({
                os_nombre_crudo: item.os_nombre_crudo.trim(),
                os_nombre_limpio: item.os_nombre_limpio || '',
                registrado: true
            });
        });

        (rawOS || []).forEach(r => {
            if (r.nombre_os && !equivMap.has(r.nombre_os.trim().toUpperCase())) {
                combined.push({
                    os_nombre_crudo: r.nombre_os.trim(),
                    os_nombre_limpio: '',
                    registrado: false
                });
            }
        });

        combined.sort((a, b) => a.os_nombre_crudo.localeCompare(b.os_nombre_crudo));

        currentData.os = combined;
        osPage = 1;
        applyAndRenderOS();
    } catch (err) {
        console.error('Error cargando obras sociales:', err);
        content.innerHTML = `<div class="alert alert-danger">Error al cargar obras sociales: ${err.message || err}</div>`;
    }
}
async function loadIntermediarias() { const { data } = await supabase.schema('silver_shared').from('silver_intermediaria_equivalencias').select('*'); currentData.int = data || []; renderIntTable(document.getElementById('admin-int-content'), currentData.int); }
async function loadSedes() { const { data } = await supabase.schema('silver_shared').from('silver_sedes_equivalencias').select('*'); currentData.sedes = data || []; renderSedesTable(document.getElementById('admin-sedes-content'), currentData.sedes); }
async function loadDerivantes() {
    derivantesPage = 1;
    const content = document.getElementById('admin-derivantes-content');
    content.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';
    
    try {
        // Traer TODOS los registros de equivalencias paginados en bucle por el límite de 1000 de Supabase
        let equivData = [];
        let fromEq = 0;
        let toEq = 999;
        while (true) {
            const { data, error } = await supabase.schema('silver_shared')
                .from('silver_derivantes_equivalencias')
                .select('*')
                .range(fromEq, toEq);
            if (error) throw error;
            equivData = equivData.concat(data);
            if (data.length < 1000) break;
            fromEq += 1000;
            toEq += 1000;
        }
        
        // Traer TODOS los derivantes únicos del detalle paginados en bucle
        let rawSol = [];
        let fromRaw = 0;
        let toRaw = 999;
        while (true) {
            const { data, error } = await supabase
                .rpc('get_unique_derivantes_from_detail')
                .range(fromRaw, toRaw);
            if (error) throw error;
            rawSol = rawSol.concat(data);
            if (data.length < 1000) break;
            fromRaw += 1000;
            toRaw += 1000;
        }
        
        console.log('equivData:', equivData);
        console.log('rawSol:', rawSol);

        const equivMap = new Map();
        (equivData || []).forEach(item => {
            equivMap.set(item.nombre_original, {
                id: item.id,
                nombre_unificado: item.nombre_unificado,
                servicio_unificado: item.servicio_unificado
            });
        });

        const combined = [];
        // Agregar todos los existentes de la tabla de equivalencias
        (equivData || []).forEach(item => {
            combined.push({
                nombre_original: item.nombre_original,
                nombre_unificado: item.nombre_unificado,
                servicio_unificado: item.servicio_unificado || '',
                registrado: true
            });
        });

        // Agregar los que están en el detalle de transacciones pero no tienen equivalencia configurada
        (rawSol || []).forEach(r => {
            if (r.nombre_solicitante && !equivMap.has(r.nombre_solicitante)) {
                combined.push({
                    nombre_original: r.nombre_solicitante,
                    nombre_unificado: '',
                    servicio_unificado: '',
                    registrado: false
                });
            }
        });

        // Ordenar alfabéticamente por nombre original
        combined.sort((a, b) => a.nombre_original.localeCompare(b.nombre_original));

        currentData.derivantes = combined;
        renderDerivantesTable(content, combined);
    } catch (err) {
        console.error('Error cargando derivantes:', err);
        content.innerHTML = `<div class="alert alert-danger">Error al cargar médicos derivantes: ${err.message || err}</div>`;
    }
}

function renderDerivantesTable(container, data) {
    if (!container) return;

    const totalPages = Math.ceil(data.length / derivantesPageSize) || 1;
    if (derivantesPage > totalPages) derivantesPage = totalPages;
    if (derivantesPage < 1) derivantesPage = 1;

    const startIdx = (derivantesPage - 1) * derivantesPageSize;
    const paginatedData = data.slice(startIdx, startIdx + derivantesPageSize);
    
    // Servicios unificados disponibles para asignar (extraídos del Excel de profesionales)
    const servicios = [
        "Médico Externo",
        "Acompañamiento Terapeutico",
        "Actividad Fisica Controlada",
        "Adolescencia",
        "Alergia",
        "Alergia Infantil",
        "Anestesiología",
        "Auditoria Medica",
        "Bioquimico",
        "Cardiología",
        "Cardiología Infantil",
        "Cirugía Bariátrica",
        "Cirugía Cardiovascular",
        "Cirugía Cardiovascular Infantil",
        "Cirugía Cardiovascular Infantil (Recuparación)",
        "Cirugía De Cabeza Y Cuello",
        "Cirugía Estética",
        "Cirugía General",
        "Cirugía Maxilofacial",
        "Cirugía Maxilofacial Infantil",
        "Cirugía Pediátrica",
        "Cirugía Plástica Y Reparadora",
        "Cirugía Plástica Y Reparadora Infantil",
        "Cirugía Torácica",
        "Cirugía Vascular Periférica",
        "Clinica Medica",
        "Cosmiatria",
        "Densitometria Osea",
        "Dermatocosmiatra",
        "Dermatología",
        "Dermatología Infantil",
        "Diabetologia",
        "Diabetologia Infantil",
        "Diagnostico Por Imágenes Infantil",
        "Ecodoppler Cardiaco",
        "Ecodoppler Cardiaco Infantil",
        "Ecografias Y Ecodoppler",
        "Educacion En Diabetes",
        "Electroencefalografia",
        "Electrofisiologia",
        "Electromiografia",
        "Endocrinologia",
        "Endoscopia Respiratoria Infantil",
        "Enfermedad Pulmonar Intersticial",
        "Ergometria",
        "Estetica Medica",
        "Fisiokinesioterapia",
        "Fisiokinesioterapia Infantil",
        "Flebologia",
        "Fonoaudiología",
        "Fonoaudiología Infantil",
        "Gastroenterologia Infantil",
        "Gastroenterología",
        "Genetica Infantil",
        "Genetica Reproductiva",
        "Ginecologia",
        "Ginecologia Infantojuvenil",
        "Ginecologia Regenerativa Y Estetica",
        "Ginecologia Y Obstetricia",
        "Guardia",
        "Guardia Pediatrica",
        "Hematologia",
        "Hemodinamia Infantil",
        "Holter",
        "Infectologia",
        "Infectologia Infantil",
        "Inmunologia Infantil",
        "Intensivismo",
        "Intensivismo Pediatrico",
        "Intervencionismo",
        "Intervencionismo Cardiovascular",
        "Intervencionismo Neurovascular",
        "Intesivismo Pediatrico",
        "Lic. En Obstetricia",
        "Licenciado En Familia",
        "Mapa",
        "Mastologia",
        "Medicina Del Deporte",
        "Medicina Generalista Y De Familia",
        "Medicina Laboral",
        "Medicina Nuclear",
        "Medicina Reproductiva",
        "Menopausia Y Climaterio",
        "Nefrologia",
        "Nefrologia Infantil",
        "Neonatologia",
        "Neumonología",
        "Neumonología Infantil",
        "Neurocirugia",
        "Neurocirugia Infantil",
        "Neurologia",
        "Neurología Infantil",
        "Nutrición",
        "Nutrición Infantil",
        "Odontologia",
        "Oftalmologia",
        "Oftalmologia Infantil",
        "Oftalmología",
        "Oncoginecologia",
        "Oncohematlogia Infantil",
        "Oncologia",
        "Otorrinolaringologia",
        "Otorrinolaringologia Infantil",
        "Parkinson Y Trastornos Del Movimiento",
        "Pediatria",
        "Perfusionista",
        "Perioperatorio",
        "Piso Pelviano",
        "Podologia",
        "Psicología",
        "Psicología Infantil",
        "Psicopedagogia",
        "Psicopedagogia Infantil",
        "Psiquiatria",
        "Psiquiatria Infantil",
        "Puericultura",
        "Rehabilitacion Cardio Pulmonar",
        "Rehabilitacion De Piso Pelviano",
        "Rehabilitacion Vestibular",
        "Rehabilitacion Y Estimulacion Neurocignitivo",
        "Residencia Cardiología",
        "Residencia Cirugia General",
        "Residencia Clinica Medica",
        "Residencia Diagnostico Por Imagenes",
        "Residencia Ginecologia",
        "Residencia Kinesiologia",
        "Residencia Neumonología",
        "Residencia Neurologia",
        "Residencia Pediatria",
        "Residencia Traumatologia",
        "Residencia Traumatologia Y Ortopedia",
        "Resonancia Magnetica",
        "Reumatologia",
        "Reumatologia Infantojuvenil",
        "Seguimiento Internacion Neurológica",
        "Sexologia",
        "Soporte Nutricional",
        "Soporte Nutricional Infantil",
        "Terapia Ocupacional",
        "Terapia Ocupacional Infantil",
        "Test Neuro Cognitivo", "Tilt Test", "Tomografia",
        "Tratamiento Del Dolor", "Traumatologia Infantil",
        "Traumatologia Y Ortopedia", "Traumatología Y Ortopedia",
        "Urodinamia", "Urologia", "Urologia Infantil",
        "Videocolposcopia", "Videoendoscopia", "Videonistagmografia"
    ];

    container.innerHTML = `
    <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light" style="position: sticky; top: 0; z-index: 10;">
                <tr>
                    <th>Estado</th>
                    <th>Nombre Original (Detalle)</th>
                    <th>Nombre Unificado (Médico)</th>
                    <th>Servicio Asignado</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedData.map(item => `
                    <tr>
                        <td>${item.nombre_unificado ? '✅' : '⚠️'}</td>
                        <td><strong>${item.nombre_original}</strong></td>
                        <td>
                            <input type="text" class="form-control form-control-sm" 
                                   value="${item.nombre_unificado}" 
                                   placeholder="Escriba nombre unificado..."
                                   onblur="window.updateDerivanteUnificado('${item.nombre_original.replace(/'/g, "\\'")}', this.value)">
                        </td>
                        <td>
                            <select class="form-select form-select-sm" 
                                    onchange="window.updateDerivanteServicio('${item.nombre_original.replace(/'/g, "\\'")}', this.value)">
                                <option value="">Sin servicio...</option>
                                ${servicios.map(s => `
                                    <option value="${s}" ${item.servicio_unificado === s ? 'selected' : ''}>${s}</option>
                                `).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    <!-- Paginación de Derivantes -->
    <div class="d-flex justify-content-between align-items-center mt-3 px-2">
        <div class="text-muted font-size-13">
            Mostrando <strong>${startIdx + 1}</strong> a <strong>${Math.min(startIdx + paginatedData.length, data.length)}</strong> de <strong>${data.length}</strong> médicos
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" ${derivantesPage === 1 ? 'disabled' : ''} onclick="window.changeDerivantesPage(-1)">Anterior</button>
            <span class="align-self-center">Página <strong>${derivantesPage}</strong> de <strong>${totalPages}</strong></span>
            <button class="btn btn-sm btn-outline-secondary" ${derivantesPage === totalPages ? 'disabled' : ''} onclick="window.changeDerivantesPage(1)">Siguiente</button>
        </div>
    </div>`;
}

window.changeDerivantesPage = (delta) => {
    derivantesPage += delta;
    const query = document.getElementById('search-input')?.value || '';
    filterData(query);
};

function renderOSTable(container, data) {
    if (!container) return;

    const totalPages = Math.ceil(data.length / osPageSize) || 1;
    if (osPage > totalPages) osPage = totalPages;
    if (osPage < 1) osPage = 1;

    const startIdx = (osPage - 1) * osPageSize;
    const paginatedData = data.slice(startIdx, startIdx + osPageSize);

    container.innerHTML = `
    <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light" style="position: sticky; top: 0; z-index: 10;">
                <tr>
                    <th style="width: 80px;">Estado</th>
                    <th>Nombre Crudo (Transacciones)</th>
                    <th>Nombre Completo (Saneado)</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedData.map(item => `
                    <tr>
                        <td>${item.os_nombre_limpio ? '✅' : '⚠️'}</td>
                        <td><strong>${item.os_nombre_crudo}</strong></td>
                        <td>
                            <input type="text" class="form-control form-control-sm" 
                                   value="${item.os_nombre_limpio}" 
                                   placeholder="Escriba nombre unificado..."
                                   onblur="window.updateOSCompleto('${item.os_nombre_crudo.replace(/'/g, "\\'")}', this.value)">
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    <!-- Paginación de Obras Sociales -->
    <div class="d-flex justify-content-between align-items-center mt-3 px-2">
        <div class="text-muted font-size-13">
            Mostrando <strong>${startIdx + 1}</strong> a <strong>${Math.min(startIdx + paginatedData.length, data.length)}</strong> de <strong>${data.length}</strong> obras sociales
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" ${osPage === 1 ? 'disabled' : ''} onclick="window.changeOSPage(-1)">Anterior</button>
            <span class="align-self-center">Página <strong>${osPage}</strong> de <strong>${totalPages}</strong></span>
            <button class="btn btn-sm btn-outline-secondary" ${osPage === totalPages ? 'disabled' : ''} onclick="window.changeOSPage(1)">Siguiente</button>
        </div>
    </div>`;
}

window.changeOSPage = (delta) => {
    osPage += delta;
    applyAndRenderOS();
};
function renderIntTable(container, data) {
    container.innerHTML = `<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>GECLISA</th><th>Limpio</th></tr></thead><tbody>
    ${data.map(i => `<tr><td>${i.intermediaria_cruda}</td><td><input type="text" class="form-control form-control-sm" value="${i.intermediaria_limpia || ''}" onblur="window.updateIntLimpia(${i.id}, this.value)"></td></tr>`).join('')}</tbody></table></div>`;
}
function renderSedesTable(container, data) {
    container.innerHTML = `<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Servicio</th><th>Sede</th></tr></thead><tbody>
    ${data.map(i => `<tr><td>${i.servicio_crudo}</td><td><input type="text" class="form-control form-control-sm" value="${i.sede || ''}" onblur="window.updateSedeLimpia(${i.id}, this.value)"></td></tr>`).join('')}</tbody></table></div>`;
}

// Updates
window.updateClasificacion = async (codigo, servicio, value) => { const es_estudio = value === 'null' ? null : (value === 'true'); await supabase.schema('silver_shared').from('silver_codigos_nomenclador').update({ es_estudio }).eq('codigo', codigo).eq('servicio', servicio); try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); } loadCodigosNomenclador(); };
window.updateNombreUnificado = async (codigo, servicio, value) => { 
    await supabase.schema('silver_shared').from('silver_codigos_nomenclador').update({ nombre_unificado: value }).eq('codigo', codigo).eq('servicio', servicio);
    // Si es un nombre nuevo, lo agregamos al maestro automáticamente
    if (value && !masterNames.find(m => m.nombre === value)) {
        await supabase.schema('silver_shared').from('master_nombres_unificados').insert([{ nombre: value }]);
        await loadMasterNames();
        updateMasterDatalist();
    }
    try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); }
};
window.updateOSCompleto = async (nombre_crudo, value) => {
    nombre_crudo = nombre_crudo.trim();
    const val = value.trim();
    
    const item = currentData.os.find(o => o.os_nombre_crudo === nombre_crudo);
    if (item) {
        item.os_nombre_limpio = val;
    }

    try {
        if (!val) {
            await supabase.schema('silver_shared').from('silver_os_equivalencias').delete().eq('os_nombre_crudo', nombre_crudo);
        } else {
            const { data } = await supabase.schema('silver_shared').from('silver_os_equivalencias').select('id').eq('os_nombre_crudo', nombre_crudo).maybeSingle();
            if (data) {
                await supabase.schema('silver_shared').from('silver_os_equivalencias').update({ os_nombre_limpio: val }).eq('id', data.id);
            } else {
                await supabase.schema('silver_shared').from('silver_os_equivalencias').insert([{ os_nombre_crudo: nombre_crudo, os_nombre_limpio: val }]);
            }
        }
        
        const rows = document.querySelectorAll('#admin-os-content tbody tr');
        for (const row of rows) {
            const origCell = row.cells[1];
            if (origCell && origCell.textContent.trim() === nombre_crudo.trim()) {
                row.cells[0].textContent = val ? '✅' : '⚠️';
                break;
            }
        }
        
        try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); }
    } catch (err) {
        console.error('Error al unificar obra social:', err);
    }
};
window.updateIntLimpia = async (id, value) => { await supabase.schema('silver_shared').from('silver_intermediaria_equivalencias').update({ intermediaria_limpia: value }).eq('id', id); try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); } };
window.updateSedeLimpia = async (id, value) => { await supabase.schema('silver_shared').from('silver_sedes_equivalencias').update({ sede: value }).eq('id', id); try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); } };

window.updateDerivanteUnificado = async (nombre_original, value) => {
    const val = value.trim();
    
    // Actualizar datos locales en memoria
    const item = currentData.derivantes.find(d => d.nombre_original === nombre_original);
    if (item) {
        item.nombre_unificado = val;
    }

    try {
        if (!val) {
            // Si borramos el unificado, eliminamos la equivalencia
            await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').delete().eq('nombre_original', nombre_original);
        } else {
            // Buscamos si ya existe la fila para hacer update, sino insert
            const { data } = await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').select('id').eq('nombre_original', nombre_original).maybeSingle();
            if (data) {
                await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').update({ nombre_unificado: val }).eq('id', data.id);
            } else {
                await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').insert([{ nombre_original, nombre_unificado: val }]);
            }
        }
        
        // Actualizar icono de estado en la fila correspondiente en el DOM
        const rows = document.querySelectorAll('#admin-derivantes-content tbody tr');
        for (const row of rows) {
            const origCell = row.cells[1];
            if (origCell && origCell.textContent.trim() === nombre_original.trim()) {
                row.cells[0].textContent = val ? '✅' : '⚠️';
                break;
            }
        }
        try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); }
    } catch (err) {
        console.error('Error al unificar derivante:', err);
    }
};

window.updateDerivanteServicio = async (nombre_original, value) => {
    const val = value || null;
    
    // Actualizar datos locales en memoria
    const item = currentData.derivantes.find(d => d.nombre_original === nombre_original);
    if (item) {
        item.servicio_unificado = val;
    }

    try {
        const { data } = await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').select('id, nombre_unificado').eq('nombre_original', nombre_original).maybeSingle();
        if (data) {
            await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').update({ servicio_unificado: val }).eq('id', data.id);
        } else {
            // Si no tiene nombre unificado pero le asignamos servicio, usamos el original como unificado por defecto
            await supabase.schema('silver_shared').from('silver_derivantes_equivalencias').insert([{ 
                nombre_original, 
                nombre_unificado: nombre_original, 
                servicio_unificado: val 
            }]);
            
            // Si insertó una equivalencia por defecto, actualizar el input y estado en el DOM
            const rows = document.querySelectorAll('#admin-derivantes-content tbody tr');
            for (const row of rows) {
                const origCell = row.cells[1];
                if (origCell && origCell.textContent.trim() === nombre_original.trim()) {
                    const input = row.cells[2].querySelector('input');
                    if (input && !input.value) {
                        input.value = nombre_original;
                    }
                    row.cells[0].textContent = '✅';
                    if (item) item.nombre_unificado = nombre_original;
                    break;
                }
            }
        }
        try { await supabase.rpc('refresh_multidimensional_view'); } catch (e) { console.error(e); }
    } catch (err) {
        console.error('Error al actualizar servicio del derivante:', err);
    }
};

// --- FUNCIONES GESTIÓN DE USUARIOS ---
async function loadUsers() {
    const container = document.getElementById('users-table-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';
    
    const { data, error } = await supabase
        .schema('public')
        .from('perfiles_usuario')
        .select('*')
        .order('email');
    
    if (error) {
        container.innerHTML = `<div class="alert alert-danger">Error al cargar usuarios: ${error.message}</div>`;
        return;
    }
    
    usersList = data || [];
    renderUsersTable(container, usersList);
}

function renderUsersTable(container, users) {
    if (!container) return;
    if (users.length === 0) {
        container.innerHTML = '<div class="text-center p-4 text-muted">No se encontraron usuarios.</div>';
        return;
    }
    
    container.innerHTML = `
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th class="text-center">Video</th>
                    <th class="text-center">Tomo</th>
                    <th class="text-center">Resonancia</th>
                    <th class="text-center">Eco</th>
                    <th class="text-center">Saneamiento</th>
                    <th class="text-center">Activo</th>
                    <th class="text-end">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => {
                    const modPerm = u.modulos_permitidos || [];
                    const isAdmin = u.rol === 'admin';
                    return `
                    <tr>
                        <td><strong>${u.nombre || 'Sin nombre'}</strong></td>
                        <td><code>${u.email}</code></td>
                        <td>
                            <select class="form-select form-select-sm" onchange="window.updateUserRole('${u.id}', this.value)" style="width: 170px;">
                                <option value="visualizador_general" ${u.rol === 'visualizador_general' ? 'selected' : ''}>Visualizador General</option>
                                <option value="coordinador_datos" ${u.rol === 'coordinador_datos' ? 'selected' : ''}>Coordinador de Datos</option>
                                <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                            </select>
                        </td>
                        <td class="text-center">
                            <input class="form-check-input permission-chk" type="checkbox" data-user-id="${u.id}" data-permission="Video" ${isAdmin || modPerm.includes('Video') ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} onchange="window.toggleUserPermission('${u.id}', 'Video', this.checked)">
                        </td>
                        <td class="text-center">
                            <input class="form-check-input permission-chk" type="checkbox" data-user-id="${u.id}" data-permission="Tomo" ${isAdmin || modPerm.includes('Tomo') ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} onchange="window.toggleUserPermission('${u.id}', 'Tomo', this.checked)">
                        </td>
                        <td class="text-center">
                            <input class="form-check-input permission-chk" type="checkbox" data-user-id="${u.id}" data-permission="Resonancia" ${isAdmin || modPerm.includes('Resonancia') ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} onchange="window.toggleUserPermission('${u.id}', 'Resonancia', this.checked)">
                        </td>
                        <td class="text-center">
                            <input class="form-check-input permission-chk" type="checkbox" data-user-id="${u.id}" data-permission="Eco" ${isAdmin || modPerm.includes('Eco') ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} onchange="window.toggleUserPermission('${u.id}', 'Eco', this.checked)">
                        </td>
                        <td class="text-center">
                            <input class="form-check-input permission-chk" type="checkbox" data-user-id="${u.id}" data-permission="Saneamiento" ${isAdmin || modPerm.includes('Saneamiento') ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} onchange="window.toggleUserPermission('${u.id}', 'Saneamiento', this.checked)">
                        </td>
                        <td class="text-center">
                            <div class="form-check form-switch d-inline-block">
                                <input class="form-check-input" type="checkbox" ${u.activo ? 'checked' : ''} onchange="window.toggleUserActive('${u.id}', this.checked)" style="cursor: pointer;">
                            </div>
                        </td>
                        <td class="text-end">
                            <div class="d-flex gap-1 justify-content-end">
                                <button class="btn btn-sm btn-outline-info" title="Forzar Cierre de Sesión" onclick="window.forceLogoutUser('${u.user_id}', '${u.email}')">
                                    <i class="bx bx-log-out"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning" title="Cambiar Contraseña" onclick="window.changeUserPasswordModal('${u.user_id}', '${u.email}')">
                                    <i class="bx bx-key"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" title="Eliminar Usuario" onclick="window.deleteUser('${u.user_id}', '${u.email}')">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </div>
    `;
}

window.showCreateUserModal = () => {
    const errorDiv = document.getElementById('create-user-error');
    if (errorDiv) errorDiv.classList.add('d-none');
    const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
    modal.show();
};

window.updateUserRole = async (userId, role) => {
    const { error } = await supabase
        .schema('public')
        .from('perfiles_usuario')
        .update({ rol: role })
        .eq('id', userId);
    
    if (error) {
        alert('Error al cambiar el rol: ' + error.message);
    }
    loadUsers(); // Recargar para actualizar los checkboxes deshabilitados
};

window.toggleUserPermission = async (userId, permission, checked) => {
    const user = usersList.find(u => u.id === userId);
    if (!user) return;
    
    let perms = [...(user.modulos_permitidos || [])];
    if (checked) {
        if (!perms.includes(permission)) perms.push(permission);
    } else {
        perms = perms.filter(p => p !== permission);
    }
    
    const { error } = await supabase
        .schema('public')
        .from('perfiles_usuario')
        .update({ modulos_permitidos: perms })
        .eq('id', userId);
        
    if (error) {
        alert('Error al actualizar permisos: ' + error.message);
        loadUsers();
    } else {
        user.modulos_permitidos = perms;
    }
};

window.toggleUserActive = async (userId, active) => {
    const { error } = await supabase
        .schema('public')
        .from('perfiles_usuario')
        .update({ activo: active })
        .eq('id', userId);
        
    if (error) {
        alert('Error al cambiar estado activo: ' + error.message);
        loadUsers();
    } else {
        const user = usersList.find(u => u.id === userId);
        if (user) user.activo = active;
    }
};

window.changeUserPasswordModal = async (userId, email) => {
    const newPass = prompt(`Introduce la nueva contraseña para ${email} (mínimo 6 caracteres):`);
    if (newPass === null) return;
    if (newPass.trim().length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    
    const { error } = await supabase.rpc('admin_cambiar_password', {
        p_user_id: userId,
        p_new_password: newPass.trim()
    });
    
    if (error) {
        alert('Error al cambiar contraseña: ' + error.message);
    } else {
        alert('Contraseña actualizada con éxito.');
    }
};

window.deleteUser = async (userId, email) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${email}? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    const { error } = await supabase.rpc('admin_eliminar_usuario', {
        p_user_id: userId
    });
    
    if (error) {
        alert('Error al eliminar usuario: ' + error.message);
    } else {
        alert('Usuario eliminado con éxito.');
        loadUsers();
    }
};

window.forceLogoutUser = async (userId, email) => {
    if (!confirm(`¿Estás seguro de que deseas forzar el cierre de sesión de ${email}? El usuario deberá volver a iniciar sesión para que se apliquen sus nuevos permisos en el token.`)) {
        return;
    }
    
    const { error } = await supabase.rpc('admin_forzar_logout', {
        p_user_id: userId
    });
    
    if (error) {
        alert('Error al forzar el cierre de sesión: ' + error.message);
    } else {
        alert('Cierre de sesión forzado con éxito para ' + email + '.');
    }
};
