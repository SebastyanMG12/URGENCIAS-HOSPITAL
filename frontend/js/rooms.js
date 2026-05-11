// rooms.js
// NOTA: desactivado — las habitaciones ahora se gestionan
// desde el backend via api.js (GET /rooms/, PATCH /rooms/beds/{id}/assign)
(function () {
    window.eseb = window.eseb || {};
    window.eseb.rooms = {
        getRooms: () => [],
        assignBed: () => console.warn('rooms.js: usar api.assignBed'),
        releaseBed: () => console.warn('rooms.js: usar api.releaseBed'),
    };
})();