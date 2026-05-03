// storage.js
(function () {
    const utils = window.eseb && window.eseb.utils;
    if (!utils) throw new Error('utils.js must be loaded before storage.js');

    const STORAGE_KEYS = {
        USERS: 'eseb_usuarios',
        PATIENTS: 'eseb_pacientes',
        SESSION: 'eseb_session',
        ROOMS: 'eseb_rooms',
        DOCTORS: 'eseb_doctors',
        AUDIT: 'eseb_audit'
    };

    function read(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); }
        catch (e) { return null; }
    }
    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        // dispatch custom event for intra-page listeners
        window.dispatchEvent(new CustomEvent('eseb:storage', { detail: { key } }));
        // also dispatch native storage event for other tabs
        // note: native 'storage' fires only on other windows automatically
        return true;
    }

    // ensure defaults
    if (!read(STORAGE_KEYS.USERS)) write(STORAGE_KEYS.USERS, []);
    if (!read(STORAGE_KEYS.PATIENTS)) write(STORAGE_KEYS.PATIENTS, []);
    if (!read(STORAGE_KEYS.ROOMS)) write(STORAGE_KEYS.ROOMS, []); // rooms initialization delegated
    if (!read(STORAGE_KEYS.DOCTORS)) write(STORAGE_KEYS.DOCTORS, []);
    if (!read(STORAGE_KEYS.AUDIT)) write(STORAGE_KEYS.AUDIT, []);

    window.eseb = window.eseb || {};
    window.eseb.storage = {
        STORAGE_KEYS,
        read,
        write
    };

    // expose a convenience "on change" helper
    window.eseb.storage.onChange = function (handler) {
        window.addEventListener('eseb:storage', (ev) => handler(ev.detail));
        // also listen native storage to sync cross-tab
        window.addEventListener('storage', (ev) => {
            // normalize to { key: ev.key }
            handler({ key: ev.key });
        });
    };

})();