const _listeners = new Set();
let _state = { tipo: null, valor: null, label: null };

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
