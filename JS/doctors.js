// doctors.js
(function () {
    const s = window.eseb && window.eseb.storage;
    const utils = window.eseb && window.eseb.utils;
    const audit = window.eseb && window.eseb.audit;
    if (!s || !utils || !audit) throw new Error('storage, utils and audit must be loaded before doctors.js');

    function initializeDoctors() {
        const existing = s.read(s.STORAGE_KEYS.DOCTORS);
        if (existing && Array.isArray(existing) && existing.length) return existing;
        const doctors = [
            { id: utils.uid('doc'), name: 'Ana María López Pérez', patients: [] },
            { id: utils.uid('doc'), name: 'Carlos Andrés Martínez Gómez', patients: [] },
            { id: utils.uid('doc'), name: 'Laura Valentina Ruiz Sánchez', patients: [] },
            { id: utils.uid('doc'), name: 'Diego Fernando Torres Ramírez', patients: [] },
            { id: utils.uid('doc'), name: 'María Fernanda Gómez Herrera', patients: [] }
        ];
        s.write(s.STORAGE_KEYS.DOCTORS, doctors);
        return doctors;
    }

    function getDoctors() { return s.read(s.STORAGE_KEYS.DOCTORS) || []; }
    function saveDoctors(list) { s.write(s.STORAGE_KEYS.DOCTORS, list || []); window.dispatchEvent(new CustomEvent('eseb:doctors:changed', {})); }

    /**
     * assignPatientToDoctor
     * - docId: id del doctor destino
     * - patientId: id del paciente a asignar
     *
     * Comportamiento:
     *  - remueve al paciente de cualquier otro doctor donde aparezca (previene duplicados)
     *  - añade el paciente al doctor destino (si no estaba)
     *  - guarda y registra auditoría
     */
    function assignPatientToDoctor(docId, patientId) {
        const docs = getDoctors();

        // Remove patient from any other doctor (defensive: avoids duplicados)
        let removedFrom = [];
        docs.forEach(d => {
            if (Array.isArray(d.patients) && d.patients.includes(patientId) && d.id !== docId) {
                d.patients = d.patients.filter(pid => pid !== patientId);
                removedFrom.push({ docId: d.id, docName: d.name });
                // audit removal
                audit.logAudit({ action: 'remove_doctor_patient_on_reassign', patientId, details: { removedFromDoctorId: d.id, removedFromDoctorName: d.name } });
            }
        });

        const doc = docs.find(d => d.id === docId);
        if (!doc) throw new Error('Doctor no encontrado');

        doc.patients = doc.patients || [];
        if (!doc.patients.includes(patientId)) doc.patients.push(patientId);

        saveDoctors(docs);
        audit.logAudit({ action: 'assign_doctor', patientId, details: { docId, docName: doc.name, removedFrom: removedFrom } });
        return true;
    }

    /**
     * removePatientFromDoctor
     * - docId: id del doctor
     * - patientId: id del paciente a remover
     */
    function removePatientFromDoctor(docId, patientId) {
        const docs = getDoctors();
        const doc = docs.find(d => d.id === docId);
        if (!doc) return false;
        const had = (doc.patients || []).includes(patientId);
        doc.patients = (doc.patients || []).filter(pid => pid !== patientId);
        saveDoctors(docs);
        if (had) {
            audit.logAudit({ action: 'remove_doctor_patient', patientId, details: { docId, docName: doc.name } });
        }
        return true;
    }

    function getDoctorCounts() {
        return getDoctors().map(d => ({ id: d.id, name: d.name, count: (d.patients || []).length }));
    }

    // helper opcional por si se necesita buscar doctor por id en otros módulos
    function getDoctorById(id) {
        if (!id) return null;
        return getDoctors().find(d => d.id === id) || null;
    }

    window.eseb = window.eseb || {};
    window.eseb.doctors = {
        initializeDoctors,
        getDoctors,
        saveDoctors,
        assignPatientToDoctor,
        removePatientFromDoctor,
        getDoctorCounts,
        getDoctorById
    };

    // initialize default doctors if missing
    initializeDoctors();
})();