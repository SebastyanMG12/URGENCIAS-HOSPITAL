// rooms.js
(function () {
    const s = window.eseb && window.eseb.storage;
    const utils = window.eseb && window.eseb.utils;
    const audit = window.eseb && window.eseb.audit;
    if (!s || !utils || !audit) throw new Error('storage, utils and audit must be loaded before rooms.js');

    function initializeRooms() {
        const existing = s.read(s.STORAGE_KEYS.ROOMS);
        if (existing && Array.isArray(existing) && existing.length) return existing;
        const rooms = [];
        for (let r = 201; r <= 205; r++) {
            const roomLabel = String(r);
            rooms.push({
                id: 'room-' + roomLabel,
                roomLabel,
                beds: [
                    { id: `bed-${roomLabel}-A`, label: `${roomLabel}-A`, occupiedBy: null },
                    { id: `bed-${roomLabel}-B`, label: `${roomLabel}-B`, occupiedBy: null }
                ]
            });
        }
        s.write(s.STORAGE_KEYS.ROOMS, rooms);
        return rooms;
    }

    function getRooms() { return s.read(s.STORAGE_KEYS.ROOMS) || []; }
    function saveRooms(list) { s.write(s.STORAGE_KEYS.ROOMS, list || []); window.dispatchEvent(new CustomEvent('eseb:room:changed', {})); }

    function findBed(bedId) {
        const rooms = getRooms();
        for (const r of rooms) {
            for (const b of r.beds) {
                if (b.id === bedId) return { room: r, bed: b };
            }
        }
        return null;
    }

    function isBedAvailable(bedId) {
        const found = findBed(bedId);
        return found && !found.bed.occupiedBy;
    }

    function assignBed(patientId, bedId) {
        const found = findBed(bedId);
        if (!found) throw new Error('Cama no encontrada');
        if (found.bed.occupiedBy) throw new Error('Cama ya ocupada');

        // release any existing bed occupied by patient
        const rooms = getRooms();
        rooms.forEach(r => r.beds.forEach(b => { if (b.occupiedBy === patientId) b.occupiedBy = null; }));

        // assign
        rooms.forEach(r => r.beds.forEach(b => { if (b.id === bedId) b.occupiedBy = patientId; }));
        saveRooms(rooms);
        audit.logAudit({ action: 'assign_bed', patientId, details: { bedId } });
        return true;
    }

    function releaseBed(bedId) {
        const rooms = getRooms();
        rooms.forEach(r => r.beds.forEach(b => { if (b.id === bedId) b.occupiedBy = null; }));
        saveRooms(rooms);
        audit.logAudit({ action: 'release_bed', details: { bedId } });
        return true;
    }

    window.eseb = window.eseb || {};
    window.eseb.rooms = {
        initializeRooms,
        getRooms,
        saveRooms,
        findBed,
        isBedAvailable,
        assignBed,
        releaseBed
    };

    // initialize automatically if missing
    initializeRooms();
})();