const _listeners = new Set();
let _state = {
    modulo: null,
    practica: null,       // { valor: codigo, label: nombre }
    os: null,             // { valor: nombre }
    intermediaria: null,  // { valor: nombre }
    sede: null,           // { valor: nombre }
    derivante: null,      // { valor: nombre }
    servicioDerivante: null, // { valor: nombre }
};
let _user = null; // Almacenará el perfil { email, rol, modulos_permitidos, activo, nombre }

export function getUser() {
    return _user ? { ..._user } : null;
}

export function setUser(user) {
    _user = user ? { ...user } : null;
}

export function hasPermission(modulo) {
    if (!_user) return false;
    if (_user.rol === 'admin') return true; // El admin tiene acceso a todo
    return Array.isArray(_user.modulos_permitidos) && _user.modulos_permitidos.includes(modulo);
}

export function getFilters() {
    return { ..._state };
}

export function toggleFilter(tipo, valor, label = null) {
    if (_state[tipo] && _state[tipo].valor === valor) {
        _state[tipo] = null;
    } else {
        _state[tipo] = { valor, label: label || valor };
    }
    _listeners.forEach(fn => fn({ ..._state }));
}

export function removeFilter(tipo) {
    if (_state[tipo]) {
        _state[tipo] = null;
        _listeners.forEach(fn => fn({ ..._state }));
    }
}

export function clearFilters() {
    _state = {
        modulo: null,
        practica: null,
        os: null,
        intermediaria: null,
        sede: null,
        derivante: null,
        servicioDerivante: null,
    };
    _listeners.forEach(fn => fn({ ..._state }));
}

export function onFilterChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

