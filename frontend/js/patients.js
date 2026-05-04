// patients.js
// NOTA: todas las funciones fueron desactivadas — los pacientes
// ahora se gestionan desde el backend via api.js.
(function () {
    function getPatients() { return []; }
    function savePatients() {}
    function createPatient() {
        console.warn('patients.js: createPatient desactivado — usar api.registerPatient');
    }
    function updatePatient() {
        console.warn('patients.js: updatePatient desactivado — usar api.updatePatient');
    }
    function findByPublicCode() { return null; }

    window.eseb = window.eseb || {};
    window.eseb.patients = {
        getPatients,
        savePatients,
        createPatient,
        updatePatient,
        findByPublicCode
    };
})();