// main.js
(function () {
    const utils = window.eseb && window.eseb.utils;
    const storage = window.eseb && window.eseb.storage;
    const auth = window.eseb && window.eseb.auth;
    const patientsApi = window.eseb && window.eseb.patients;
    const modals = window.eseb && window.eseb.modals;
    const staffPanel = window.eseb && window.eseb.staffPanel;
    if (!utils || !storage || !auth || !patientsApi || !modals || !staffPanel) {
        console.warn('Algunos módulos no están cargados todavía. Asegúrate de incluirlos en el orden correcto.');
    }

    const formRegister = document.getElementById('form-register');
    const registerResult = document.getElementById('register-result');
    const btnClear = document.getElementById('btn-clear');

    // BOTON DE MENU DRAWER

    const drawer = document.getElementById('drawer-menu');
    const backdrop = document.getElementById('drawer-backdrop');
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');

    function openDrawer() {
        if (drawer) drawer.classList.add('open');
        if (backdrop) backdrop.classList.remove('hidden');
    }
    function closeDrawer() {
        if (drawer) drawer.classList.remove('open');
        if (backdrop) backdrop.classList.add('hidden');
    }

    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    // ────────────────────────────────────────────────────

    if (formRegister) {

        const v = window.eseb && window.eseb.validators;

        // ── Activar restricciones en tiempo real sobre el campo nombre
        if (v) {
            v.soloLetras(document.getElementById('p_name'));
            v.limpiarEnTiempoReal(document.getElementById('p_name'));
        }

        // ── Mostrar u ocultar el campo número según el tipo de documento elegido
        const docTipoEl = document.getElementById('p_doc_tipo');
        const filaDoc = document.getElementById('fila-doc');
        const docNumEl = document.getElementById('p_doc');

        if (docTipoEl) {
            docTipoEl.addEventListener('change', function () {
                const tipo = this.value;

                if (!tipo || tipo === 'MS') {
                    // Sin tipo o menor sin identificación: ocultar el campo número
                    if (filaDoc) filaDoc.style.display = 'none';
                    if (docNumEl) docNumEl.value = '';
                } else {
                    // Mostrar el campo número
                    if (filaDoc) filaDoc.style.display = 'flex';

                    // Para CC, TI y RC: solo números
                    // Para CE, PA, PE: letras y números (no restringir)
                    if (v && docNumEl) {
                        if (['CC', 'TI', 'RC'].includes(tipo)) {
                            v.soloNumeros(docNumEl);
                        }
                    }
                }
            });
        }

        // ── Submit del formulario
        formRegister.addEventListener('submit', async (ev) => {
            ev.preventDefault();

            const v = window.eseb && window.eseb.validators;

            // Leer elementos del DOM
            const nameEl = document.getElementById('p_name');
            const docTipoEl = document.getElementById('p_doc_tipo');
            const docNumEl = document.getElementById('p_doc');
            const phoneEl = document.getElementById('p_phone');
            const reasonEl = document.getElementById('p_reason');
            const notesEl = document.getElementById('p_notes');
            const allergiesEl = document.getElementById('p_allergies');
            const consentEl = document.getElementById('p_consent');

            // Leer y limpiar valores
            const name = v ? v.limpiarTexto(nameEl.value) : nameEl.value.trim();
            const docTipo = docTipoEl ? docTipoEl.value : '';
            const docNum = docNumEl ? (v ? v.limpiarTexto(docNumEl.value) : docNumEl.value.trim()) : '';
            const phone = v ? v.limpiarTexto(phoneEl.value) : phoneEl.value.trim();
            const reason = v ? v.limpiarTexto(reasonEl.value) : reasonEl.value.trim();
            const notes = v ? v.limpiarTexto(notesEl ? notesEl.value : '') : '';
            const allergies = v ? v.limpiarTexto(allergiesEl ? allergiesEl.value : '') : '';

            let hayError = false;

            // Validar nombre (obligatorio)
            const errNombre = v ? v.validar(name, 'nombre', true) : null;
            if (v) v.mostrarError(nameEl, errNombre);
            if (errNombre) hayError = true;

            // Validar documento: solo si eligió un tipo distinto de MS
            if (docTipo && docTipo !== 'MS') {
                const errDoc = v ? v.validarDocumento(docNum, docTipo) : null;
                if (v) v.mostrarError(docNumEl, errDoc);
                if (errDoc) hayError = true;
            } else {
                // Limpiar cualquier error previo del campo
                if (v && docNumEl) v.mostrarError(docNumEl, null);
            }

            // Validar teléfono (opcional, pero si tiene valor debe ser válido)
            const errPhone = phone ? (v ? v.validar(phone, 'telefono', false) : null) : null;
            if (v) v.mostrarError(phoneEl, errPhone);
            if (errPhone) hayError = true;

            // Validar motivo (obligatorio)
            const errReason = v ? v.validar(reason, 'textoGeneral', true) : null;
            if (v) v.mostrarError(reasonEl, errReason);
            if (errReason) hayError = true;

            // Si hay algún error, detener aquí y no guardar nada
            if (hayError) return;

            // Verificar consentimiento
            const dataConsent = consentEl ? consentEl.checked : false;
            if (!dataConsent) {
                alert('Debes aceptar la política de tratamiento de datos para continuar (Ley 1581 de 2012).');
                return;
            }

            // Leer campos restantes
            const bloodType = document.getElementById('p_blood_type')?.value || null;
            const triageLevel = document.getElementById('p_triage')?.value || null;
            const compName = v ? v.sanitizar(document.getElementById('p_comp_name')?.value || '') : '';
            const compPhone = v ? v.limpiarTexto(document.getElementById('p_comp_phone')?.value || '') : '';
            const compRelation = document.getElementById('p_comp_relation')?.value || null;

            // Crear paciente con datos limpios y sanitizados
            const api = window.eseb && window.eseb.api;
            if (!api) {
                alert("Error interno: módulo API no disponible.");
                return;
            }

            let patient;
            try {
                patient = await api.registerPatient({
                    name: v ? v.sanitizar(name) : name,
                    doc_tipo: docTipo || null,
                    doc_number: docNum || null,
                    phone: phone || null,
                    reason: v ? v.sanitizar(reason) : reason,
                    notes: v ? v.sanitizar(notes) : notes,
                    allergies: allergies ? (v ? v.sanitizar(allergies) : allergies) : null,
                    blood_type: bloodType || null,
                    triage_level: triageLevel || null,
                    companion_name: compName || null,
                    companion_phone: compPhone || null,
                    companion_relation: compRelation || null,
                    data_consent: dataConsent,
                });
            } catch (err) {
                alert("Error al registrar: " + err.message);
                return;
            }

            if (modals && modals.openRegistered) {
                modals.openRegistered(patient.public_code || patient.publicCode);
            }

            // Resetear formulario y limpiar errores visuales
            formRegister.reset();
            if (filaDoc) filaDoc.style.display = 'none';
            if (v) {
                [nameEl, docNumEl, phoneEl, reasonEl].forEach(el => {
                    if (el) v.mostrarError(el, null);
                });
            }

            if (staffPanel && typeof staffPanel.renderPatientList === 'function') {
                staffPanel.renderPatientList();
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => { if (formRegister) formRegister.reset(); });
    }



    // Abajo comento y este bloque es por el cual reemplazo_______________________________________
    // BLOQUE NUEVO, ABJO DEJO EL VIEJO

    const openLoginStaffBtn = document.getElementById('open-login-staff') || document.getElementById('open-login-med');

    if (openLoginStaffBtn) {
        openLoginStaffBtn.addEventListener('click', () => {
            window.open('login.html', '_blank', 'noopener,noreferrer');
            closeDrawer();
        });
    }

    const openCompanionBtn = document.getElementById('open-companion') || document.getElementById('open-companion-med');

    if (openCompanionBtn) {
        openCompanionBtn.addEventListener('click', () => {
            window.open('companion.html', '_blank', 'noopener,noreferrer');
            closeDrawer();
        });
    }
})();   