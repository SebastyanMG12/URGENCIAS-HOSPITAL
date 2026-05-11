// doctors.js
// NOTA: desactivado — los médicos ahora se gestionan
// desde el backend via api.js (GET /doctors/)
(function () {
    window.eseb = window.eseb || {};
    window.eseb.doctors = {
        getDoctors: () => [],
        assignPatientToDoctor: () => console.warn('doctors.js: usar api.getDoctors'),
        removePatientFromDoctor: () => {},
        getDoctorCounts: () => [],
        getDoctorById: () => null,
    };
})();