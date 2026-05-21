const _listeners = new Set();
let _state = { tipo: null, valor: null, label: null };
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

export function getFilter() {
    return { ..._state };
}

export function setFilter(tipo, valor, label) {
    if (_state.tipo === tipo && _state.valor === valor) {
        _state = { tipo: null, valor: null, label: null };
    } else {
        _state = { tipo, valor, label };
    }
    _listeners.forEach(fn => fn({ ..._state }));
}

export function clearFilter() {
    _state = { tipo: null, valor: null, label: null };
    _listeners.forEach(fn => fn({ ..._state }));
}

export function onFilterChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
