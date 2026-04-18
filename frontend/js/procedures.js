// procedures.js
(function () {
    const patientsApi = window.eseb && window.eseb.patients;
    const audit = window.eseb && window.eseb.audit;
    const utils = window.eseb && window.eseb.utils;
    if (!patientsApi || !audit || !utils) throw new Error('patients, audit and utils must be loaded before procedures.js');

    function addProcedure(patientId, desc, performedBy) {
        if (!desc) throw new Error('Descripción requerida');
        const patients = patientsApi.getPatients();
        const p = patients.find(x => x.id === patientId);
        if (!p) throw new Error('Paciente no encontrado');

        const proc = { id: utils.uid('proc'), desc, performedBy: performedBy || (window.eseb.auth.currentSession() ? window.eseb.auth.currentSession().username : 'staff'), time: utils.now() };
        p.procedures = p.procedures || [];
        p.procedures.unshift(proc);

        patientsApi.savePatients(patients);

        audit.logAudit({ action: 'add_procedure', patientId, procedureId: proc.id, performedBy: proc.performedBy, details: { desc } });
        window.dispatchEvent(new CustomEvent('eseb:procedure:added', { detail: { patientId, procedure: proc } }));
        // also emit patient updated so all listeners refresh consistently
        try {
            window.dispatchEvent(new CustomEvent('eseb:patient:updated', { detail: p }));
        } catch (e) { }
        return proc;
    }

    function editProcedure(patientId, procedureId, newDesc, newPerformedBy) {
        if (!newDesc) throw new Error('Descripción requerida');
        const patients = patientsApi.getPatients();
        const p = patients.find(x => x.id === patientId);
        if (!p) throw new Error('Paciente no encontrado');
        const proc = (p.procedures || []).find(pr => pr.id === procedureId);
        if (!proc) throw new Error('Procedimiento no encontrado');
        const before = Object.assign({}, proc);
        proc.desc = newDesc;
        proc.performedBy = newPerformedBy || proc.performedBy;
        proc.time = utils.now();

        patientsApi.savePatients(patients);

        audit.logAudit({ action: 'edit_procedure', patientId, procedureId, user: (window.eseb.auth.currentSession() ? window.eseb.auth.currentSession().username : 'system'), details: { before, after: proc } });
        window.dispatchEvent(new CustomEvent('eseb:procedure:edited', { detail: { patientId, procedure: proc } }));
        // IMPORTANT: also emit patient updated so UI (staff detail, companion view) refresh immediately (fix #3)
        try {
            window.dispatchEvent(new CustomEvent('eseb:patient:updated', { detail: p }));
        } catch (e) { }
        return proc;
    }

    window.eseb = window.eseb || {};
    window.eseb.procedures = {
        addProcedure,
        editProcedure
    };
})();