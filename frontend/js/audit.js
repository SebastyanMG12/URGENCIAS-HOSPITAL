// audit.js
// NOTA: logAudit fue desactivado — la auditoría ahora se registra
// automáticamente en PostgreSQL desde el backend.
// getAudit se conserva como fallback para compatibilidad.
(function () {
    const s = window.eseb && window.eseb.storage;
    const utils = window.eseb && window.eseb.utils;
    if (!s || !utils) {
        window.eseb = window.eseb || {};
        window.eseb.audit = { getAudit: () => [], logAudit: () => {} };
        return;
    }

    function getAudit() {
        return s.read(s.STORAGE_KEYS.AUDIT) || [];
    }

    function logAudit() {
        // Desactivado — auditoría manejada por el backend
    }

    window.eseb = window.eseb || {};
    window.eseb.audit = { getAudit, logAudit };
})();