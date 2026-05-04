// procedures.js
// NOTA: addProcedure y editProcedure fueron desactivados —
// los procedimientos ahora se gestionan desde el backend via api.js.
(function () {
    function addProcedure() {
        console.warn('procedures.js: addProcedure desactivado — usar api.addProcedure');
    }

    function editProcedure() {
        console.warn('procedures.js: editProcedure desactivado — usar api desde staff-panel.js');
    }

    window.eseb = window.eseb || {};
    window.eseb.procedures = { addProcedure, editProcedure };
})();