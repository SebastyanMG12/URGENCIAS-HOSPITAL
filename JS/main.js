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
    
    // Menu
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
        formRegister.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const name = document.getElementById('p_name').value.trim();
            const doc = document.getElementById('p_doc').value.trim();
            const phone = document.getElementById('p_phone').value.trim();
            const reason = document.getElementById('p_reason').value.trim();
            const notes = document.getElementById('p_notes').value.trim();
            const allergies = document.getElementById('p_allergies') ? document.getElementById('p_allergies').value.trim() : '';
            const bloodType = document.getElementById('p_blood_type') ? document.getElementById('p_blood_type').value : '';
            const triageLevel = document.getElementById('p_triage') ? document.getElementById('p_triage').value : '';
            const compName = document.getElementById('p_comp_name') ? document.getElementById('p_comp_name').value.trim() : '';
            const compPhone = document.getElementById('p_comp_phone') ? document.getElementById('p_comp_phone').value.trim() : '';
            const compRelation = document.getElementById('p_comp_relation') ? document.getElementById('p_comp_relation').value : '';
            const consentEl = document.getElementById('p_consent');
            const dataConsent = consentEl ? consentEl.checked : false;

            if (!name || !reason) { alert('Nombre y motivo son requeridos'); return; }
            if (!dataConsent) { alert('Debes aceptar la política de tratamiento de datos para continuar (Ley 1581 de 2012).'); return; }

            const patient = patientsApi.createPatient({
                name, doc, phone, reason, notes,
                allergies: allergies || null,
                bloodType: bloodType || null,
                triageLevel: triageLevel || null,
                companionName: compName || null,
                companionPhone: compPhone || null,
                companionRelation: compRelation || null,
                dataConsent
            });

            if (modals && modals.openRegistered) {
                modals.openRegistered(patient.publicCode);
            } else {
                if (registerResult) {
                    registerResult.style.display = 'block';
                    registerResult.innerHTML = `<strong>Registro recibido</strong>. Código público: <code>${utils.escapeHtml(patient.publicCode)}</code>`;
                }
            }
            formRegister.reset();
            if (staffPanel && typeof staffPanel.renderPatientList === 'function') staffPanel.renderPatientList();
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => { if (formRegister) formRegister.reset(); });
    }

    const openLoginStaffBtn = document.getElementById('open-login-staff') || document.getElementById('open-login-med');
    if (openLoginStaffBtn) {
        openLoginStaffBtn.addEventListener('click', () => {
            const loginModal = document.getElementById('modal-login');
            if (loginModal) {
                loginModal.classList.remove('hidden');
                closeDrawer();
                const lu = document.getElementById('login-username');
                const lp = document.getElementById('login-password');
                if (lu) lu.value = '';
                if (lp) lp.value = '';
            }
        });
    }

    const btnCancelLogin = document.getElementById('btn-cancel-login');
    if (btnCancelLogin) {
        btnCancelLogin.addEventListener('click', () => {
            const loginModal = document.getElementById('modal-login');
            if (loginModal) loginModal.classList.add('hidden');
        });
    }

    const formLogin = document.getElementById('form-login');
    const formCreateUser = document.getElementById('form-create-user');
    if (formCreateUser) {
        formCreateUser.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const u = document.getElementById('new-username').value.trim();
            const p = document.getElementById('new-password').value.trim();
            const r = document.getElementById('new-role').value;
            try {
                auth.saveUser(u, p, r);
                alert('Usuario creado localmente. Úsalo para iniciar sesión.');
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
            } catch (err) {
                alert(err.message || 'Error creando usuario');
            }
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const u = document.getElementById('login-username').value.trim();
            const p = document.getElementById('login-password').value.trim();
            const r = document.getElementById('login-role').value;

            let session;
            try {
                session = auth.loginUser(u, p, r);
            } catch (err) {
                alert(err.message || 'Error al iniciar sesión');
                return;
            }
            if (!session) { alert('Credenciales inválidas'); return; }

            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            const loginModal = document.getElementById('modal-login');
            if (loginModal) loginModal.classList.add('hidden');

            const panel = document.getElementById('panel-staff');
            if (panel) panel.classList.remove('hidden');
            if (staffPanel && typeof staffPanel.init === 'function') staffPanel.init();
        });
    }

    window.addEventListener('load', () => {
        const sess = auth.currentSession();
        if (sess) {
            const panel = document.getElementById('panel-staff');
            if (panel) panel.classList.remove('hidden');
            if (staffPanel && typeof staffPanel.init === 'function') staffPanel.init();
        } else {
            if (staffPanel && typeof staffPanel.renderPatientList === 'function') staffPanel.renderPatientList();
        }
    });
})();   