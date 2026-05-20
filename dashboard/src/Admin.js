
import { supabase } from './lib/supabase'
import { DEPARTAMENTOS } from './config'

let currentData = { codigos: [], os: [], int: [], sedes: [] };
let masterNames = [];
let sortConfig = { key: 'codigo', direction: 'asc' };
let activeTab = 'codigos';
let selectedIds = new Set();
let choicesInstances = []; // Para limpiar instancias de Choices.js

export async function renderAdmin(container, session) {
    const role = session.user.app_metadata?.role;
    
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
                            <span class="d-none d-xl-inline-block ms-1 fw-medium">${session.user.email}</span>
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

        <div class="vertical-menu">
            <div data-simplebar class="h-100">
                <div id="sidebar-menu">
                    <ul class="metismenu list-unstyled" id="side-menu">
                        <li><a href="/" class="waves-effect"><i class="bx bx-arrow-back"></i><span>Volver al Dashboard</span></a></li>
                        <li class="mm-active">
                            <a href="javascript: void(0);" class="has-arrow waves-effect"><i class="bx bx-shield-quarter"></i><span>Gestión Admin</span></a>
                            <ul class="sub-menu" aria-expanded="true">
                                <li class="mm-active"><a href="#" id="admin-saneamiento">Saneamiento de datos</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="main-content">
            <div class="page-content">
                <div class="container-fluid">
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
                                            <label class="form-label">Departamento</label>
                                            <select class="form-select" id="filter-dept"><option value="DI">Diagnóstico por Imágenes</option></select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Buscador global</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="bx bx-search"></i></span>
                                                <input type="text" class="form-control" id="search-input" placeholder="Buscar por código o nombre...">
                                            </div>
                                        </div>
                                        <div class="col-md-6 text-end">
                                            <button class="btn btn-primary" onclick="window.showMasterNamesModal()">
                                                <i class="bx bx-list-ul"></i> Gestionar Nombres Unificados
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
                                    </ul>

                                    <div class="tab-content p-3 text-muted">
                                        <div class="tab-pane active" id="tab-codigos"><div id="admin-codigos-content"></div></div>
                                        <div class="tab-pane" id="tab-os"><div id="admin-os-content"></div></div>
                                        <div class="tab-pane" id="tab-int"><div id="admin-int-content"></div></div>
                                        <div class="tab-pane" id="tab-sedes"><div id="admin-sedes-content"></div></div>
                                    </div>
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
    `;

    updateMasterDatalist();

    if (window.jQuery) {
        window.jQuery('#side-menu').metisMenu();
        document.getElementById('vertical-menu-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('sidebar-enable');
        });
        document.getElementById('logout-btn')?.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.reload(); });

        document.getElementById('nav-codigos')?.addEventListener('click', () => { activeTab = 'codigos'; window.clearSelection(); loadCodigosNomenclador(); });
        document.getElementById('nav-os')?.addEventListener('click', () => { activeTab = 'os'; window.clearSelection(); loadOS(); });
        document.getElementById('nav-int')?.addEventListener('click', () => { activeTab = 'int'; window.clearSelection(); loadIntermediarias(); });
        document.getElementById('nav-sedes')?.addEventListener('click', () => { activeTab = 'sedes'; window.clearSelection(); loadSedes(); });

        document.getElementById('search-input')?.addEventListener('input', (e) => filterData(e.target.value));
    }

    await loadCodigosNomenclador();
}

function initTableChoices() {
    // Limpiar instancias previas para evitar fugas de memoria
    choicesInstances.forEach(instance => instance.destroy());
    choicesInstances = [];

    // Inicializar selectores en la tabla
    const selects = document.querySelectorAll('.choices-unified-name');
    selects.forEach(select => {
        const instance = new Choices(select, {
            searchEnabled: true,
            removeItemButton: true,
            placeholder: true,
            placeholderValue: 'Seleccionar...',
            noResultsText: 'No se encontraron resultados',
            noChoicesText: 'No hay opciones disponibles',
            itemSelectText: '', // Quitar frase "Presiona para seleccionar"
            classNames: {
                containerInner: 'form-control form-control-sm',
            }
        });
        
        select.addEventListener('change', (e) => {
            const codigo = select.getAttribute('data-codigo');
            window.updateNombreUnificado(codigo, e.target.value);
        });

        choicesInstances.push(instance);
    });

    // Inicializar selector masivo si existe
    const bulkSelect = document.getElementById('bulk-unified-name');
    if (bulkSelect && !bulkSelect.classList.contains('choices__input')) {
        const bulkInstance = new Choices(bulkSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Asignar nombre unificado...',
            noResultsText: 'No encontrado',
            itemSelectText: '', // Quitar frase "Presiona para seleccionar"
        });
        choicesInstances.push(bulkInstance);
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
    await supabase.schema('silver_shared').from('silver_codigos_nomenclador').update({ nombre_unificado: name }).in('codigo', ids);
    window.clearSelection();
    loadCodigosNomenclador();
};

// Main Table Logic
async function loadCodigosNomenclador() {
    const content = document.getElementById('admin-codigos-content');
    content.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';
    const { data } = await supabase.schema('silver_shared').from('silver_codigos_nomenclador').select('*');
    currentData.codigos = data || [];
    renderCodigosTable(content, currentData.codigos);
    initTableChoices(); // Inicializar tras cargar
}

function filterData(query) {
    const q = query.toLowerCase();
    if (activeTab === 'codigos') {
        const filtered = currentData.codigos.filter(item => 
            item.codigo.toString().includes(q) || item.nombre_original.toLowerCase().includes(q) || 
            (item.nombre_unificado && item.nombre_unificado.toLowerCase().includes(q)) || item.servicio.toLowerCase().includes(q)
        );
        renderCodigosTable(document.getElementById('admin-codigos-content'), filtered);
        initTableChoices(); // Re-inicializar tras filtrar
    }
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
                ${sorted.map(item => `
                    <tr class="${item.es_estudio === null ? 'table-warning' : (item.es_estudio ? 'table-success' : 'table-danger')}">
                        <td><input type="checkbox" class="row-checkbox" value="${item.codigo}" ${selectedIds.has(item.codigo.toString()) ? 'checked' : ''} onclick="window.toggleSelection(this.value)"></td>
                        <td>${item.es_estudio === null ? '⚠️' : (item.es_estudio ? '✅' : '❌')}</td>
                        <td>${item.servicio}</td>
                        <td><code>${item.codigo}</code></td>
                        <td>${item.nombre_original}</td>
                        <td>
                            <select class="form-select form-select-sm" onchange="window.updateClasificacion('${item.codigo}', this.value)">
                                <option value="null" ${item.es_estudio === null ? 'selected' : ''}>Pendiente</option>
                                <option value="true" ${item.es_estudio === true ? 'selected' : ''}>✅ Es estudio</option>
                                <option value="false" ${item.es_estudio === false ? 'selected' : ''}>❌ Excluir</option>
                            </select>
                        </td>
                        <td>
                            <select class="form-select form-select-sm choices-unified-name" data-codigo="${item.codigo}">
                                <option value="">Sin unificar</option>
                                ${masterNames.map(m => `
                                    <option value="${m.nombre}" ${item.nombre_unificado === m.nombre ? 'selected' : ''}>${m.nombre}</option>
                                `).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
}

window.sortData = (key) => {
    if (sortConfig.key === key) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.direction = 'asc'; }
    renderCodigosTable(document.getElementById('admin-codigos-content'), currentData.codigos);
    initTableChoices(); // Re-inicializar tras ordenar
};

// Tabs
async function loadOS() { const { data } = await supabase.schema('silver_shared').from('silver_os_equivalencias').select('*'); currentData.os = data || []; renderOSTable(document.getElementById('admin-os-content'), currentData.os); }
async function loadIntermediarias() { const { data } = await supabase.schema('silver_shared').from('silver_intermediaria_equivalencias').select('*'); currentData.int = data || []; renderIntTable(document.getElementById('admin-int-content'), currentData.int); }
async function loadSedes() { const { data } = await supabase.schema('silver_shared').from('silver_sedes_equivalencias').select('*'); currentData.sedes = data || []; renderSedesTable(document.getElementById('admin-sedes-content'), currentData.sedes); }

function renderOSTable(container, data) {
    container.innerHTML = `<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Estado</th><th>Nombre crudo</th><th>Nombre completo</th></tr></thead>
    <tbody>${data.map(item => `<tr><td>${item.os_nombre_limpio ? '✅' : '⚠️'}</td><td>${item.os_nombre_crudo}</td><td><input type="text" class="form-control form-control-sm" value="${item.os_nombre_limpio || ''}" onblur="window.updateOSCompleto('${item.os_nombre_crudo}', this.value)"></td></tr>`).join('')}</tbody></table></div>`;
}
function renderIntTable(container, data) {
    container.innerHTML = `<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>GECLISA</th><th>Limpio</th></tr></thead><tbody>
    ${data.map(i => `<tr><td>${i.intermediaria_cruda}</td><td><input type="text" class="form-control form-control-sm" value="${i.intermediaria_limpia || ''}" onblur="window.updateIntLimpia(${i.id}, this.value)"></td></tr>`).join('')}</tbody></table></div>`;
}
function renderSedesTable(container, data) {
    container.innerHTML = `<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Servicio</th><th>Sede</th></tr></thead><tbody>
    ${data.map(i => `<tr><td>${i.servicio_crudo}</td><td><input type="text" class="form-control form-control-sm" value="${i.sede || ''}" onblur="window.updateSedeLimpia(${i.id}, this.value)"></td></tr>`).join('')}</tbody></table></div>`;
}

// Updates
window.updateClasificacion = async (codigo, value) => { const es_estudio = value === 'null' ? null : (value === 'true'); await supabase.schema('silver_shared').from('silver_codigos_nomenclador').update({ es_estudio }).eq('codigo', codigo); loadCodigosNomenclador(); };
window.updateNombreUnificado = async (codigo, value) => { 
    await supabase.schema('silver_shared').from('silver_codigos_nomenclador').update({ nombre_unificado: value }).eq('codigo', codigo);
    // Si es un nombre nuevo, lo agregamos al maestro automáticamente
    if (value && !masterNames.find(m => m.nombre === value)) {
        await supabase.schema('silver_shared').from('master_nombres_unificados').insert([{ nombre: value }]);
        await loadMasterNames();
        updateMasterDatalist();
    }
};
window.updateOSCompleto = async (nombre_crudo, value) => { await supabase.schema('silver_shared').from('silver_os_equivalencias').update({ os_nombre_limpio: value }).eq('os_nombre_crudo', nombre_crudo); };
window.updateIntLimpia = async (id, value) => { await supabase.schema('silver_shared').from('silver_intermediaria_equivalencias').update({ intermediaria_limpia: value }).eq('id', id); };
window.updateSedeLimpia = async (id, value) => { await supabase.schema('silver_shared').from('silver_sedes_equivalencias').update({ sede: value }).eq('id', id); };
