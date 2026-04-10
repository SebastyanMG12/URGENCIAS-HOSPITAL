// patients.js
(function () {
    const s = window.eseb && window.eseb.storage;
    const utils = window.eseb && window.eseb.utils;
    const audit = window.eseb && window.eseb.audit;
    if (!s || !utils || !audit) throw new Error('storage, utils and audit must be loaded before patients.js');

    function getPatients() {
        return s.read(s.STORAGE_KEYS.PATIENTS) || [];
    }
    function savePatients(list) {
        s.write(s.STORAGE_KEYS.PATIENTS, list || []);
    }

    function computeDiff(before, after) {
        const diff = {};
        Object.keys(after).forEach(k => {
            const a = before && before[k];
            const b = after[k];
            const aStr = (a === undefined || a === null) ? '' : String(a);
            const bStr = (b === undefined || b === null) ? '' : String(b);
            if (aStr !== bStr) diff[k] = { before: a, after: b };
        });
        return diff;
    }

    function createPatient(data) {
        const internalId = utils.uid('PINT');

        const publicCode = (function () {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            if (window.crypto && window.crypto.getRandomValues) {
                const arr = new Uint8Array(8);
                window.crypto.getRandomValues(arr);
                arr.forEach(b => { code += chars[b % chars.length]; });
            } else {
                for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
            }
            return code;
        })();

        const patient = {
            id: utils.uid('patient'),
            internalId,
            publicCode,
            name: data.name,
            doc: data.doc || null,
            phone: data.phone || null,
            reason: data.reason || '',
            notes: data.notes || '',
            allergies: data.allergies || null,
            bloodType: data.bloodType || null,
            triageLevel: data.triageLevel || null,
            dataConsent: data.dataConsent || false,
            consentDate: data.dataConsent ? utils.now() : null,
            companionName: data.companionName || null,
            companionPhone: data.companionPhone || null,
            companionRelation: data.companionRelation || null,
            createdAt: utils.now(),
            arrived: false,
            arrivedAt: null,
            assignedRoom: null,
            assignedBed: null,
            attending: null,
            admittedAt: null,
            dischargedAt: null,
            procedures: [],
            shareWithCompanion: false,
            finalDiagnosis: null,
            shareDiagnosis: false
        };
        const patients = getPatients();
        patients.unshift(patient);
        savePatients(patients);
        audit.logAudit({ action: 'create_patient', patientId: patient.id, details: { name: patient.name } });
        window.dispatchEvent(new CustomEvent('eseb:patient:created', { detail: patient }));
        return patient;
    }

    function updatePatient(id, patch, auditNote) {
        const patients = getPatients();
        const idx = patients.findIndex(p => p.id === id);
        if (idx === -1) throw new Error('Paciente no encontrado');
        const before = Object.assign({}, patients[idx]);
        const normalizedPatch = Object.keys(patch || {}).reduce((acc, k) => {
            acc[k] = patch[k] === undefined ? null : patch[k];
            return acc;
        }, {});
        patients[idx] = Object.assign({}, patients[idx], normalizedPatch);
        savePatients(patients);

        if (auditNote && auditNote.action) {
            audit.logAudit(Object.assign({
                patientId: id,
                user: (window.eseb.auth.currentSession() ? window.eseb.auth.currentSession().username : 'system'),
                time: utils.now()
            }, auditNote));
        } else {
            const after = patients[idx];
            const diff = computeDiff(before, after);
            if (Object.keys(diff).length > 0) {
                audit.logAudit({
                    action: 'update_patient',
                    patientId: id,
                    user: (window.eseb.auth.currentSession() ? window.eseb.auth.currentSession().username : 'system'),
                    details: { diff }
                });
            }
        }

        window.dispatchEvent(new CustomEvent('eseb:patient:updated', { detail: patients[idx] }));
        return patients[idx];
    }

    function findByPublicCode(code) {
        if (!code) return null;
        const p = getPatients().find(x => x.publicCode === code);
        return p || null;
    }

    window.eseb = window.eseb || {};
    window.eseb.patients = {
        getPatients,
        savePatients,
        createPatient,
        updatePatient,
        findByPublicCode
    };
})();