// utils.js
(function () {
    window.eseb = window.eseb || {};

    function $(selector, ctx = document) { return ctx.querySelector(selector); }
    function $$(selector, ctx = document) { return Array.from((ctx || document).querySelectorAll(selector)); }

    function uid(prefix = 'id') {
        return prefix + '-' + Math.random().toString(36).slice(2, 9);
    }
    function now() {
        return (new Date()).toISOString();
    }
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]); });
    }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    window.eseb.utils = {
        $, $$, uid, now, escapeHtml, clamp
    };
})();