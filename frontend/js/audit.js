// audit.js
(function () {
    const s = window.eseb && window.eseb.storage;
    const utils = window.eseb && window.eseb.utils;
    if (!s || !utils) throw new Error('storage.js and utils.js must be loaded before audit.js');

    function getAudit() {
        return s.read(s.STORAGE_KEYS.AUDIT) || [];
    }

    function saveAudit(list) {
        s.write(s.STORAGE_KEYS.AUDIT, list || []);
    }

    function logAudit(entry) {
        const audits = getAudit();
        const record = Object.assign({
            id: utils.uid('audit'),
            time: utils.now()
        }, entry);
        audits.unshift(record);
        saveAudit(audits);
        // emit event
        window.dispatchEvent(new CustomEvent('eseb:audit:changed', { detail: record }));
        return record;
    }

    window.eseb = window.eseb || {};
    window.eseb.audit = {
        getAudit,
        logAudit
    };
})();