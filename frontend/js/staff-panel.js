// staff-panel.js
(function () {
    const patientsApi = window.eseb && window.eseb.patients;
    const roomsApi = window.eseb && window.eseb.rooms;
    const doctorsApi = window.eseb && window.eseb.doctors;
    const proceduresApi = window.eseb && window.eseb.procedures;
    const auth = window.eseb && window.eseb.auth;
    const modals = window.eseb && window.eseb.modals;
    const utils = window.eseb && window.eseb.utils;
    const audit = window.eseb && window.eseb.audit;
    if (!patientsApi || !roomsApi || !doctorsApi || !proceduresApi || !auth || !modals || !utils || !audit) {
        console.warn('staff-panel: faltan dependencias (asegúrate de cargar storage/utils/audit/modals antes)');
    }

    // UI elements
    const panelStaff = document.getElementById('panel-staff');
    const patientListEl = document.getElementById('patient-list');
    const patientDetailEl = document.getElementById('patient-detail');
    const searchInput = document.getElementById('search-patient');
    const btnSearch = document.getElementById('btn-search');

    const btnViewActive = document.getElementById('btn-view-active');
    const btnViewEgresados = document.getElementById('btn-view-egresados');
    const btnLogout = document.getElementById('btn-logout');

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (window.eseb && window.eseb.auth && typeof window.eseb.auth.logout === 'function') {
                await window.eseb.auth.logout();
            } else {
                sessionStorage.removeItem('eseb_staff_session');
                window.location.href = 'login.html';
            }
        });
    }

    let currentListFilter = 'all'; // 'all' | 'active' | 'discharged'

    let currentSelectedPatientId = null;

    /* ---------------------------
       Helper: format status text
       --------------------------- */
    function patientStatus(p) {
        if (!p) return '-';
        if (p.dischargedAt) return `Egresado · ${new Date(p.dischargedAt).toLocaleString()}`;
        return 'Activo';
    }

    /* ---------------------------
       Small modal helper for "no editar" warning
       --------------------------- */
    function showNotEditableForDischarged() {
        const html = `<div class="ig-content-large"><h3>Paciente egresado</h3><p class="muted">Este paciente está marcado como egresado. El personal médico ya no puede modificar información, procedimientos ni diagnóstico final.</p></div>`;
        if (modals && modals.openModalLarge) {
            modals.openModalLarge(html);
            // auto-close after short delay for better UX
            setTimeout(() => { if (modals && modals.closeModalLarge) modals.closeModalLarge(); }, 1400);
        } else {
            alert('Paciente egresado — no es posible modificar datos.');
        }
    }

    /* ---------------------------
       Render list (left column)
       --------------------------- */
    function renderPatientList(textFilter = '') {
        const all = (patientsApi && patientsApi.getPatients && patientsApi.getPatients()) || [];
        const f = (textFilter || '').toLowerCase().trim();

        let filtered = all.filter(p => {
            if (currentListFilter === 'active') return !p.dischargedAt;
            if (currentListFilter === 'discharged') return !!p.dischargedAt;
            return true;
        });

        if (f) {
            filtered = filtered.filter(p => {
                return (p.name && p.name.toLowerCase().includes(f)) ||
                    (p.internalId && p.internalId.toLowerCase().includes(f)) ||
                    (p.publicCode && p.publicCode.toLowerCase().includes(f)) ||
                    (p.reason && p.reason.toLowerCase().includes(f));
            });
        }

        if (!patientListEl) return;
        patientListEl.innerHTML = '';
        if (filtered.length === 0) {
            patientListEl.innerHTML = '<div class="muted">No hay pacientes registrados</div>';
            return;
        }

        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'patient-item' + (p.id === currentSelectedPatientId ? ' selected' : '');
            div.innerHTML = `<div>
                        <strong>${utils ? utils.escapeHtml(p.name) : p.name}</strong><br>
                        <small>${utils ? utils.escapeHtml(p.reason || '') : (p.reason || '')} · ${utils ? utils.escapeHtml(p.phone || '') : (p.phone || '')}</small>
                       </div>
                       <div style="text-align:right">
                         <small>Public: ${utils ? utils.escapeHtml(p.publicCode) : p.publicCode}</small><br>
                         <small>Creado: ${new Date(p.createdAt).toLocaleString()}</small>
                       </div>`;
            div.addEventListener('click', () => {
                currentSelectedPatientId = p.id;
                // quitar selección previa y marcar el nuevo
                patientListEl.querySelectorAll('.patient-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                showPatientDetail(p.id);
            });
            patientListEl.appendChild(div);
        });
    }

    /* ---------------------------
       Show patient detail (medico) with companion fields optional
       --------------------------- */
    function showPatientDetail(patientId) {
        const session = auth && auth.currentSession ? auth.currentSession() : null;
        const role = session ? session.role : null;
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        if (!p) {
            if (patientDetailEl) patientDetailEl.innerHTML = '<div class="muted">Paciente no encontrado</div>';
            return;
        }

        const isDischarged = !!p.dischargedAt;
        const disableForMed = (role === 'medico' && isDischarged);

        // If role is admin, render admin-specific view (table handled elsewhere)
        if (role === 'admin') {
            // open detailed modal for admin instead of full editable right panel
            openAdminPatientDetailModal(patientId);
            return;
        }

        // role medico — render editable detail with companion inputs
        // Determine disabled states for buttons/inputs when patient is discharged
        const arrivedDisabledAttr = disableForMed ? 'disabled' : '';
        const admitDisabledAttr = disableForMed ? 'disabled' : (p.admittedAt ? 'disabled' : '');
        const dischargeDisabledAttr = (p.dischargedAt ? 'disabled' : '') || (disableForMed ? 'disabled' : '');
        const addProcDisabledAttr = disableForMed ? 'disabled' : '';
        const saveCompanionDisabledAttr = disableForMed ? 'disabled' : '';
        const saveDxDisabledAttr = disableForMed ? 'disabled' : '';

        let html = `<div>
      <div class="detail-card">
        <h3>${utils ? utils.escapeHtml(p.name) : p.name}</h3>
        <div class="detail-grid">
          <div class="kv"><strong>Creado</strong><div class="muted">${new Date(p.createdAt).toLocaleString()}</div></div>
          <div class="kv"><strong>Código público</strong><div class="muted">${utils ? utils.escapeHtml(p.publicCode) : p.publicCode}</div></div>
          <div class="kv"><strong>Teléfono</strong><div class="muted">${utils ? utils.escapeHtml(p.phone || '-') : (p.phone || '-')}</div></div>
          <div class="kv"><strong>Motivo</strong><div class="muted">${utils ? utils.escapeHtml(p.reason || '-') : (p.reason || '-')}</div></div>
          <div class="kv"><strong>Notas</strong><div class="muted">${utils ? utils.escapeHtml(p.notes || '-') : (p.notes || '-')}</div></div>
          <!-- NUEVO: alergias destacadas -->
          <div class="kv" style="${p.allergies ? 'border-left:3px solid #ef4444;padding-left:10px' : ''}">
            <strong>⚠ Alergias</strong>
            <div class="muted" style="${p.allergies ? 'color:#dc2626;font-weight:600' : ''}">
              ${utils ? utils.escapeHtml(p.allergies || 'Sin alergias registradas') : (p.allergies || 'Sin alergias registradas')}
            </div>
          </div>
          <!-- NUEVO: tipo de sangre -->
          <div class="kv">
            <strong>Tipo de sangre</strong>
            <div class="muted">${utils ? utils.escapeHtml(p.bloodType || '-') : (p.bloodType || '-')}</div>
          </div>
          </div>`;

        html += `<div style="margin-top:12px">
        <div class="detail-grid">
          <div class="kv"><strong>Internal ID</strong><div class="muted">${utils ? utils.escapeHtml(p.internalId) : p.internalId}</div></div>
          <div class="kv"><strong>Documento</strong><div class="muted">${utils ? utils.escapeHtml(p.doc || '-') : (p.doc || '-')}</div></div>
          <div class="kv"><strong>Estado</strong><div class="muted">${patientStatus(p)}</div></div>
          <div class="kv"><strong>Hab / Camilla</strong><div class="muted">${utils ? utils.escapeHtml(p.assignedRoom || '-') : (p.assignedRoom || '-')} / ${utils ? utils.escapeHtml(p.assignedBed || '-') : (p.assignedBed || '-')}</div></div>
          <div class="kv"><strong>Atiende</strong><div class="muted">${utils ? utils.escapeHtml(p.attending || '-') : (p.attending || '-')}</div></div>
          <div class="kv"><strong>Llegada</strong><div class="muted">${p.arrived ? new Date(p.arrivedAt).toLocaleString() : 'Pendiente'}</div></div>
          <div class="kv"><strong>Ingreso</strong><div class="muted">${p.admittedAt ? new Date(p.admittedAt).toLocaleString() : '-'}</div></div>
          <div class="kv"><strong>Egreso</strong><div class="muted">${p.dischargedAt ? new Date(p.dischargedAt).toLocaleString() : '-'}</div></div>
        </div>
      </div>`;

        // If discharged and user is medico, show reminder banner
        if (disableForMed) {
            html += `<div class="detail-card" style="margin-top:12px;background:linear-gradient(180deg,#fff8f8,#fff);border:1px solid rgba(239,68,68,0.06)"><strong>Paciente egresado</strong><div class="muted">No es posible modificar información para este paciente.</div></div>`;
        }

        // Actions (existing)
        html += `<div style="margin-top:10px" class="detail-card">
        <strong>Acciones</strong>
        <div style="margin-top:8px" class="row">
          <button class="btn primary" id="btn-open-confirm-arrival" ${arrivedDisabledAttr}>${p.arrived ? 'Llegada confirmada' : 'Confirmar llegada'}</button>
          <button class="btn primary" id="btn-open-assign-room" ${disableForMed ? 'disabled' : ''}>Asignar Hab/Cam</button>
          <button class="btn primary" id="btn-open-assign-doctor" ${disableForMed ? 'disabled' : ''}>Asignar personal</button>
          <button class="btn primary" id="btn-open-set-admit" ${admitDisabledAttr}>${p.admittedAt ? 'Ingreso marcado' : 'Marcar ingreso'}</button>
          <button class="btn primary" id="btn-open-set-discharge" ${dischargeDisabledAttr}>${p.dischargedAt ? 'Egreso marcado' : 'Marcar egreso'}</button>
        </div>
        <div style="margin-top:10px">
          <label style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><span>Compartir historial de procedimientos con acompañante</span><input type="checkbox" id="chk-share-proc" ${p.shareWithCompanion ? 'checked' : ''} ${disableForMed ? 'disabled' : ''}/></label>
        </div>
    </div>`;

        // Companion (optional) - editable inputs for staff
        html += `<div style="margin-top:12px" class="detail-card">
      <h4>Información del acompañante (opcional)</h4>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label>Nombre</label><input id="inp-comp-name" class="ig-input" placeholder="Nombre acompañante" autocomplete = "off" value="${utils ? utils.escapeHtml(p.companionName || '') : (p.companionName || '')}" ${saveCompanionDisabledAttr}></div>
        <div><label>Teléfono</label><input id="inp-comp-phone" class="ig-input" placeholder="Teléfono acompañante" autocomplete = "off" value="${utils ? utils.escapeHtml(p.companionPhone || '') : (p.companionPhone || '')}" ${saveCompanionDisabledAttr}></div>
        <div style="grid-column:1/3"><label>Parentesco</label><select id="inp-comp-rel" class="ig-input" ${saveCompanionDisabledAttr}>
  <option value="">Seleccionar parentesco</option>
  <option value="Padre/Madre" ${(p.companionRelation === 'Padre/Madre') ? 'selected' : ''}>Padre / Madre</option>
  <option value="Hijo/Hija" ${(p.companionRelation === 'Hijo/Hija') ? 'selected' : ''}>Hijo / Hija</option>
  <option value="Cónyuge" ${(p.companionRelation === 'Cónyuge') ? 'selected' : ''}>Cónyuge / Pareja</option>
  <option value="Hermano/Hermana" ${(p.companionRelation === 'Hermano/Hermana') ? 'selected' : ''}>Hermano / Hermana</option>
  <option value="Amigo/Amiga" ${(p.companionRelation === 'Amigo/Amiga') ? 'selected' : ''}>Amigo / Amiga</option>
  <option value="Otro" ${(p.companionRelation === 'Otro') ? 'selected' : ''}>Otro</option>
</select></div>
      </div>
      <div style="margin-top:8px"><button class="btn primary" id="btn-save-companion" ${saveCompanionDisabledAttr}>Guardar acompañante</button></div>
    </div>`;

        // IMPORTANT: Agregar procedimiento siempre visible para personal autorizado (medico/admin)
        html += `<hr />
      <div style="margin-top:10px" class="detail-card">
        <strong>Agregar procedimiento / nota de atención</strong>
        <div style="margin-top:8px">
          <!-- Inputs siempre visibles para personal autorizado -->
          <input id="inp-proc-desc" placeholder="Descripción del procedimiento / orden" autocomplete="off" ${addProcDisabledAttr}/>
          <select id="inp-proc-by" class="ig-input" style="margin-top:8px" ${addProcDisabledAttr}>
            <option value="">¿Quien atendio?</option>
            ${(doctorsApi && doctorsApi.getDoctors ? doctorsApi.getDoctors() : []).map(d =>
            `<option value="${utils ? utils.escapeHtml(d.name) : d.name}">${utils ? utils.escapeHtml(d.name) : d.name}</option>`
        ).join('')}
          </select>
          <div style="margin-top:8px" class="row">
            <button class="btn primary" id="btn-add-proc" ${addProcDisabledAttr}>Agregar</button>
            <small class="small-muted" style="align-self:center">* No podrás agregar si faltan campos obligatorios del paciente</small>
          </div>
        </div>
      </div>`;

        // Procedures list and edit buttons
        html += `<div class="timeline" style="margin-top:10px"><h4>Historial de procedimientos</h4>`;
        if (!p.procedures || p.procedures.length === 0) html += `<div class="muted">Sin procedimientos registrados</div>`;
        (p.procedures || []).forEach(pr => {
            // disable edit button for discharged patients when role is medico
            const editBtnDisabled = disableForMed ? 'disabled' : '';
            html += `<div class="proc">
                 <div>
                   <strong>${utils ? utils.escapeHtml(pr.desc) : pr.desc}</strong><br>
                   <small>${utils ? utils.escapeHtml(pr.performedBy || '---') : (pr.performedBy || '---')} · ${new Date(pr.time).toLocaleString()}</small>
                 </div>
                 <div class="proc-actions">`;
            html += `<button class="btn" data-proc-edit="${utils ? utils.escapeHtml(pr.id) : pr.id}" data-proc-patient="${utils ? utils.escapeHtml(p.id) : p.id}" ${editBtnDisabled}>Editar</button>`;
            html += `</div></div>`;
        });
        html += `</div>`;

        // --- Diagnóstico final ---
        html += `<div style="margin-top:12px" class="detail-card">
      <h4>Diagnóstico final</h4>
      <div>
        <textarea id="inp-final-dx" class="ig-input" rows="3" placeholder="Escribe el diagnóstico final..." ${saveDxDisabledAttr}>${utils ? utils.escapeHtml(p.finalDiagnosis || '') : (p.finalDiagnosis || '')}</textarea>
        <label style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px"><span>Compartir diagnóstico con acompañante</span><input type="checkbox" id="chk-share-dx" ${p.shareDiagnosis ? 'checked' : ''} ${disableForMed ? 'disabled' : ''}/></label>        <div style="margin-top:8px"><button class="btn primary" id="btn-save-dx" ${saveDxDisabledAttr}>Guardar diagnóstico</button></div>
      </div>
    </div>`;

        if (patientDetailEl) patientDetailEl.innerHTML = `<div data-patient-id="${p.id}">` + html + `</div>`;

        // Companion save handler (validation and real-time update)
        const btnSaveComp = document.getElementById('btn-save-companion');
        if (btnSaveComp) {
            btnSaveComp.addEventListener('click', () => {
                // re-evaluate current state
                const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === p.id) : p;
                if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                    showNotEditableForDischarged();
                    return;
                }

                const compName = document.getElementById('inp-comp-name').value.trim() || null;
                const compPhone = document.getElementById('inp-comp-phone').value.trim() || null;
                const compRel = document.getElementById('inp-comp-rel').value.trim() || null;

                // VALIDATION: if all companion fields empty -> show message and do not save
                const allEmpty = (!compName || compName === '') && (!compPhone || compPhone === '') && (!compRel || compRel === '');
                if (allEmpty) {
                    alert('Debes agregar al menos el nombre, teléfono o parentesco del acompañante antes de guardar.');
                    return;
                }

                // Save and ensure companion info is propagated in real-time
                let updatedPatient = null;
                if (patientsApi && patientsApi.updatePatient) {
                    try {
                        updatedPatient = patientsApi.updatePatient(p.id, {
                            companionName: compName,
                            companionPhone: compPhone,
                            companionRelation: compRel
                        }, { action: 'update_companion', details: { companionName: compName, companionPhone: compPhone, companionRelation: compRel } });
                    } catch (e) {
                        console.warn('Error actualizando acompañante', e);
                    }
                }

                alert('Información del acompañante guardada correctamente.');

                // Force-emission of patient updated so companion module (y otras vistas) se refresquen immediately
                if (updatedPatient) {
                    try {
                        window.dispatchEvent(new CustomEvent('eseb:patient:updated', { detail: updatedPatient }));
                    } catch (e) { }
                }

                // re-render detail and list
                showPatientDetail(p.id);
                renderPatientList(searchInput ? searchInput.value.trim() : '');
            });
        }

        // Save diagnosis handler (nuevo)
        const btnSaveDx = document.getElementById('btn-save-dx');
        if (btnSaveDx) {
            btnSaveDx.addEventListener('click', () => {
                // re-evaluate current state
                const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === p.id) : p;
                if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                    showNotEditableForDischarged();
                    return;
                }

                const dxText = document.getElementById('inp-final-dx').value.trim() || null;
                const shareDx = !!document.getElementById('chk-share-dx').checked;

                let updatedPatient = null;
                if (patientsApi && patientsApi.updatePatient) {
                    try {
                        updatedPatient = patientsApi.updatePatient(p.id, {
                            finalDiagnosis: dxText,
                            shareDiagnosis: shareDx
                        }, { action: 'update_diagnosis', details: { finalDiagnosis: dxText, shareDiagnosis: shareDx } });
                    } catch (e) {
                        console.warn('Error guardando diagnóstico', e);
                    }
                }

                alert('Diagnóstico final guardado correctamente.');

                // trigger refresh UI (patientsApi.updatePatient already triggers eseb:patient:updated)
                if (updatedPatient) {
                    try { window.dispatchEvent(new CustomEvent('eseb:patient:updated', { detail: updatedPatient })); } catch (e) { }
                }

                showPatientDetail(p.id);
                renderPatientList(searchInput ? searchInput.value.trim() : '');
            });
        }

        // Attach action buttons handlers (reusing modal helpers)
        const btnArrival = document.getElementById('btn-open-confirm-arrival');
        if (btnArrival) btnArrival.addEventListener('click', () => openArrivalModal(p.id));

        const btnAssignRoom = document.getElementById('btn-open-assign-room');
        if (btnAssignRoom) btnAssignRoom.addEventListener('click', () => openAssignRoomModal(p.id));

        const btnAssignDoctor = document.getElementById('btn-open-assign-doctor');
        if (btnAssignDoctor) btnAssignDoctor.addEventListener('click', () => openAssignDoctorModal(p.id));

        const btnAdmit = document.getElementById('btn-open-set-admit');
        if (btnAdmit) btnAdmit.addEventListener('click', () => openAdmitModal(p.id));

        const btnDischarge = document.getElementById('btn-open-set-discharge');
        if (btnDischarge) btnDischarge.addEventListener('click', () => openDischargeModal(p.id));

        const chk = document.getElementById('chk-share-proc');
        if (chk) {
            chk.addEventListener('change', () => {
                const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === p.id) : p;
                if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                    showNotEditableForDischarged();
                    // Revert checkbox UI to reflect stored value
                    if (document.getElementById('chk-share-proc')) document.getElementById('chk-share-proc').checked = !!latest.shareWithCompanion;
                    return;
                }

                if (patientsApi && patientsApi.updatePatient) {
                    patientsApi.updatePatient(p.id, { shareWithCompanion: !!chk.checked }, { action: 'toggle_share_procedures', details: { shareWithCompanion: !!chk.checked } });
                }
                showPatientDetail(p.id);
            });
        }

        // add proc handler (with required fields validation)
        const btnAddProc = document.getElementById('btn-add-proc');
        if (btnAddProc) {
            btnAddProc.addEventListener('click', () => {
                // re-evaluate current state
                const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === p.id) : p;
                if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                    showNotEditableForDischarged();
                    return;
                }

                const descEl = document.getElementById('inp-proc-desc');
                const byEl = document.getElementById('inp-proc-by');
                const desc = descEl ? descEl.value.trim() : '';
                const by = (byEl && byEl.value) ? byEl.value : (auth && auth.currentSession ? (auth.currentSession().username || 'staff') : 'staff');

                if (!desc) return alert('Describe el procedimiento');

                // validate required patient fields: arrived, room, bed, attending
                const fresh = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === p.id) : p);
                const missing = [];
                if (!fresh.arrived) missing.push('Confirmar llegada');
                if (!fresh.assignedRoom) missing.push('Asignar habitación/sala');
                if (!fresh.assignedBed) missing.push('Asignar camilla');
                if (!fresh.attending) missing.push('Asignar personal que atiende');
                if (missing.length > 0) {
                    return alert('No es posible agregar procedimientos. Faltan campos obligatorios: ' + missing.join(', '));
                }

                // add procedure
                if (proceduresApi && proceduresApi.addProcedure) {
                    proceduresApi.addProcedure(p.id, desc, by);
                } else if (patientsApi && patientsApi.addProcedure) {
                    // backward compat: if patientsApi manages procedures
                    patientsApi.addProcedure(p.id, desc, by);
                }
                if (descEl) descEl.value = '';
                if (byEl) byEl.value = '';

                // refresh UI
                renderPatientList(searchInput ? searchInput.value.trim() : '');
                showPatientDetail(p.id);
            });
        }

        // edit proc buttons
        const procEditBtns = patientDetailEl.querySelectorAll('[data-proc-edit]');
        procEditBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const procId = btn.getAttribute('data-proc-edit');
                const pid = btn.getAttribute('data-proc-patient');
                // guard: do not allow editing if discharged and user is medico
                const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === pid) : null;
                if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                    showNotEditableForDischarged();
                    return;
                }
                openEditProcedureModal(pid, procId);
            });
        });
    }

    /* ---------------------------
       MEDICO modal helpers
       --------------------------- */
    function openArrivalModal(patientId) {
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        if (p && p.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
            showNotEditableForDischarged();
            return;
        }
        if (patientsApi && patientsApi.updatePatient) patientsApi.updatePatient(patientId, { arrived: true, arrivedAt: utils.now() }, { action: 'confirm_arrival' });
        renderPatientList(searchInput ? searchInput.value.trim() : '');
        showPatientDetail(patientId);
        alert('Llegada confirmada correctamente.');
    }

    function openAssignRoomModal(patientId) {
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        // guard
        if (p && p.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
            showNotEditableForDischarged();
            return;
        }

        const rooms = roomsApi && roomsApi.getRooms ? roomsApi.getRooms() : [];
        let html = `<div class="ig-content-large"><h3>Asignar habitación / camilla</h3>
      <p class="muted">Selecciona una cama disponible.</p>
      <div class="room-list">`;
        rooms.forEach(room => {
            html += `<div class="room-item"><div><strong>Hab ${utils ? utils.escapeHtml(room.roomLabel) : room.roomLabel}</strong> <small class="muted">Camas:</small></div><div>`;
            room.beds.forEach(b => {
                if (b.occupiedBy) {
                    html += `<span style="margin-left:8px"><span class="badge">Ocupada</span> <small class="muted">${utils ? utils.escapeHtml(b.label) : b.label}</small></span>`;
                } else {
                    html += `<button class="btn" data-assign-bed="${utils ? utils.escapeHtml(b.id) : b.id}" data-room="${utils ? utils.escapeHtml(room.roomLabel) : room.roomLabel}" style="margin-left:8px">Asignar ${utils ? utils.escapeHtml(b.label) : b.label}</button>`;
                }
            });
            html += `</div></div>`;
        });
        html += `</div><div style="margin-top:12px"><button class="btn ghost" id="btn-cancel-assign-room">Cerrar</button></div></div>`;
        if (modals && modals.openModalLarge) modals.openModalLarge(html);
        setTimeout(() => {
            const assignBtns = document.querySelectorAll('[data-assign-bed]');
            assignBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const bedId = btn.getAttribute('data-assign-bed');
                    const roomLabel = btn.getAttribute('data-room');
                    try {
                        if (roomsApi && roomsApi.assignBed) roomsApi.assignBed(patientId, bedId);
                        if (patientsApi && patientsApi.updatePatient) patientsApi.updatePatient(patientId, { assignedRoom: roomLabel, assignedBed: bedId }, { action: 'assign_bed', details: { room: roomLabel, bed: bedId } });
                        renderPatientList(searchInput ? searchInput.value.trim() : '');
                        showPatientDetail(patientId);
                        if (modals && modals.closeModalLarge) modals.closeModalLarge();
                    } catch (err) {
                        alert(err.message || 'Error asignando cama');
                    }
                });
            });
            const cancel = document.getElementById('btn-cancel-assign-room');
            if (cancel) cancel.addEventListener('click', () => { if (modals && modals.closeModalLarge) modals.closeModalLarge(); });
        }, 10);
    }

    function openAssignDoctorModal(patientId) {
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        // guard
        if (p && p.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
            showNotEditableForDischarged();
            return;
        }

        // We'll build the modal content and attach a listener to eseb:doctors:changed
        const buildHtml = () => {
            const doctors = doctorsApi && doctorsApi.getDoctors ? doctorsApi.getDoctors() : [];
            let html = `<div class="ig-content-large"><h3>Asignar personal (doctor/enfermero)</h3>
        <p class="muted">Selecciona el personal que atenderá (puede atender a varios pacientes).</p>
        <div class="doctor-list">`;
            doctors.forEach(doc => {
                html += `<div class="doctor-item"><div><strong>${utils ? utils.escapeHtml(doc.name) : doc.name}</strong><div class="muted">Atendiendo: ${doc.patients ? doc.patients.length : 0} pacientes</div></div>
                  <div><button class="btn" data-assign-doctor="${utils ? utils.escapeHtml(doc.id) : doc.id}">Asignar</button></div></div>`;
            });
            html += `</div></div>`;
            return html;
        };

        // Render initial modal
        if (modals && modals.openModalLarge) modals.openModalLarge(buildHtml());

        // Handler that attaches to dynamic buttons; we'll call it on initial render and whenever doctors change
        const attachHandlers = () => {
            // assign buttons
            const assignBtns = document.querySelectorAll('[data-assign-doctor]');
            assignBtns.forEach(btn => {
                // avoid double-binding by cloning node: remove and reattach fresh listener by replacing with same element (simple guard)
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', () => {
                    const docId = newBtn.getAttribute('data-assign-doctor');

                    // guard again: patient might have been discharged while modal open
                    const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null;
                    if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                        showNotEditableForDischarged();
                        // close modal
                        window.removeEventListener('eseb:doctors:changed', doctorsChangedHandler);
                        if (modals && modals.closeModalLarge) modals.closeModalLarge();
                        return;
                    }

                    try {
                        // Ensure patient is removed from any other doctor first (prevent duplicates)
                        try {
                            const allDocs = (doctorsApi && doctorsApi.getDoctors) ? doctorsApi.getDoctors() : [];
                            allDocs.forEach(d => {
                                if (d.patients && d.patients.includes(patientId) && d.id !== docId) {
                                    if (doctorsApi && doctorsApi.removePatientFromDoctor) doctorsApi.removePatientFromDoctor(d.id, patientId);
                                }
                            });
                        } catch (e) { /* safe */ }

                        // Assign to selected doctor (doctorsApi may also handle removal, but we do this defensively)
                        if (doctorsApi && doctorsApi.assignPatientToDoctor) doctorsApi.assignPatientToDoctor(docId, patientId);

                        // Update patient with attendingId + attending (reliable linking by id)
                        const doc = doctorsApi.getDoctors().find(d => d.id === docId);
                        if (patientsApi && patientsApi.updatePatient) {
                            patientsApi.updatePatient(patientId, {
                                attendingId: doc.id,
                                attending: doc.name
                            }, { action: 'assign_staff', details: { staffId: doc.id, staffName: doc.name } });
                        }

                        renderPatientList(searchInput ? searchInput.value.trim() : '');
                        showPatientDetail(patientId);
                        // cleanup listener and close modal
                        window.removeEventListener('eseb:doctors:changed', doctorsChangedHandler);
                        if (modals && modals.closeModalLarge) modals.closeModalLarge();
                    } catch (err) {
                        alert(err.message || 'Error asignando personal');
                    }
                });
            });
        };

        // Handler to refresh modal content when doctors change
        const doctorsChangedHandler = () => {
            // if modal is open, re-render content and reattach handlers
            try {
                const modalContent = document.getElementById('modal-view-content');
                const modalView = document.getElementById('modal-view');
                if (modalView && !modalView.classList.contains('hidden') && modalContent) {
                    modalContent.innerHTML = buildHtml();
                    // small timeout to wait DOM to be replaced
                    setTimeout(() => attachHandlers(), 10);
                } else {
                    // if modal closed, remove listener defensively
                    window.removeEventListener('eseb:doctors:changed', doctorsChangedHandler);
                }
            } catch (e) { }
        };

        // initial attach
        setTimeout(() => {
            attachHandlers();
            // listen for doctor changes to refresh counts in real-time
            window.addEventListener('eseb:doctors:changed', doctorsChangedHandler);
        }, 10);
    }

    function openAdmitModal(patientId) {
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        if (p && p.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
            showNotEditableForDischarged();
            return;
        }
        if (patientsApi && patientsApi.updatePatient) patientsApi.updatePatient(patientId, { admittedAt: utils.now() }, { action: 'mark_admit' });
        renderPatientList(searchInput ? searchInput.value.trim() : '');
        showPatientDetail(patientId);
        alert('Ingreso marcado correctamente.');
    }

    function openDischargeModal(patientId) {
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        if (p && p.dischargedAt) {
            alert('Este paciente ya tiene un egreso registrado.');
            return;
        }

        // free bed
        if (p && p.assignedBed) {
            if (roomsApi && roomsApi.releaseBed) roomsApi.releaseBed(p.assignedBed);
        }

        // remove from doctor
        if (p) {
            const docs = doctorsApi && doctorsApi.getDoctors ? doctorsApi.getDoctors() : [];
            let doc = null;
            if (p.attendingId) doc = docs.find(d => d.id === p.attendingId);
            if (!doc && p.attending) doc = docs.find(d => d.name === p.attending);
            if (doc && doctorsApi && doctorsApi.removePatientFromDoctor) {
                try { doctorsApi.removePatientFromDoctor(doc.id, patientId); } catch (e) { /* safe */ }
            }
        }

        if (patientsApi && patientsApi.updatePatient) {
            patientsApi.updatePatient(patientId, { dischargedAt: utils.now(), attending: null, attendingId: null }, { action: 'mark_discharge' });
        }

        renderPatientList(searchInput ? searchInput.value.trim() : '');
        showPatientDetail(patientId);
        alert('Egreso confirmado correctamente.');
    }

    function openEditProcedureModal(patientId, procedureId) {
        const patients = patientsApi && patientsApi.getPatients ? patientsApi.getPatients() : [];
        const p = patients.find(x => x.id === patientId);
        if (!p) return alert('Paciente no encontrado');

        // guard: if discharged and user is medico block
        if (p.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
            showNotEditableForDischarged();
            return;
        }

        const pr = (p.procedures || []).find(x => x.id === procedureId);
        if (!pr) return alert('Procedimiento no encontrado');

        const html = `<div class="ig-content-large">
      <h3>Editar procedimiento</h3>
      <p class="muted">Modifica la descripción o el responsable del procedimiento.</p>
      <div style="margin-top:10px" class="detail-card">
        <strong>Descripción</strong>
        <input id="edit-proc-desc" value="${utils ? utils.escapeHtml(pr.desc) : pr.desc}" />
        <label style="display:block;margin-top:10px;margin-bottom:4px">Realizado por</label>
        <select id="edit-proc-by" class="ig-input">
          <option value="">¿Quien atendio?</option>
          ${(doctorsApi && doctorsApi.getDoctors ? doctorsApi.getDoctors() : []).map(d =>
            `<option value="${utils ? utils.escapeHtml(d.name) : d.name}" ${pr.performedBy === d.name ? 'selected' : ''}>${utils ? utils.escapeHtml(d.name) : d.name}</option>`
        ).join('')}
        </select>
        <div style="margin-top:12px">
          <button class="btn primary" id="btn-save-proc-edit">Guardar</button>
          <button class="btn ghost" id="btn-cancel-proc-edit">Cancelar</button>
        </div>
      </div>
    </div>`;
        if (modals && modals.openModalLarge) modals.openModalLarge(html);
        setTimeout(() => {
            const saveBtn = document.getElementById('btn-save-proc-edit');
            const cancelBtn = document.getElementById('btn-cancel-proc-edit');
            if (saveBtn) saveBtn.addEventListener('click', () => {
                // guard again before saving
                const latest = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null;
                if (latest && latest.dischargedAt && auth && auth.currentSession && auth.currentSession().role === 'medico') {
                    showNotEditableForDischarged();
                    if (modals && modals.closeModalLarge) modals.closeModalLarge();
                    return;
                }

                const newDesc = document.getElementById('edit-proc-desc').value.trim();
                const newBy = document.getElementById('edit-proc-by').value || (auth && auth.currentSession ? (auth.currentSession().username || 'staff') : 'staff');
                if (!newDesc) return alert('La descripción no puede estar vacía');
                if (proceduresApi && proceduresApi.editProcedure) proceduresApi.editProcedure(patientId, procedureId, newDesc, newBy);
                if (modals && modals.closeModalLarge) modals.closeModalLarge();
            });
            if (cancelBtn) cancelBtn.addEventListener('click', () => { if (modals && modals.closeModalLarge) modals.closeModalLarge(); });
        }, 10);
    }

    /* ---------------------------
       ADMIN: render table with full data
       --------------------------- */
    function renderAdminTable() {
        // Right panel becomes admin table
        if (!patientDetailEl) return;
        patientDetailEl.innerHTML = ''; // clear any detail
        const patients = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients() : []);

        const table = document.createElement('table');
        table.className = 'admin-table';
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>
      <th>Nombre</th><th>Internal ID</th><th>Código público</th><th>Estado</th>
      <th>Llegada</th><th>Ingreso</th><th>Egreso</th><th>Atiende</th>
      <th>Hab / Camilla</th><th>Procedimientos</th><th>Acompañante</th><th>Acciones</th>
    </tr>`;
        table.appendChild(thead);
        const tbody = document.createElement('tbody');

        patients.forEach(p => {
            const tr = document.createElement('tr');
            const procCount = (p.procedures || []).length;
            const companion = p.companionName ? `${utils ? utils.escapeHtml(p.companionName) : p.companionName} (${utils ? utils.escapeHtml(p.companionRelation || '') : (p.companionRelation || '')}) ${utils ? utils.escapeHtml(p.companionPhone || '') : (p.companionPhone || '')}` : '-';
            tr.innerHTML = `<td>${utils ? utils.escapeHtml(p.name) : p.name}</td>
        <td>${utils ? utils.escapeHtml(p.internalId) : p.internalId}</td>
        <td>${utils ? utils.escapeHtml(p.publicCode) : p.publicCode}</td>
        <td>${p.dischargedAt ? 'Egresado' : 'Activo'}</td>
        <td>${p.arrived ? new Date(p.arrivedAt).toLocaleString() : '-'}</td>
        <td>${p.admittedAt ? new Date(p.admittedAt).toLocaleString() : '-'}</td>
        <td>${p.dischargedAt ? new Date(p.dischargedAt).toLocaleString() : '-'}</td>
        <td>${utils ? utils.escapeHtml(p.attending || '-') : (p.attending || '-')}</td>
        <td>${utils ? utils.escapeHtml(p.assignedRoom || '-') : (p.assignedRoom || '-')} / ${utils ? utils.escapeHtml(p.assignedBed || '-') : (p.assignedBed || '-')}</td>
        <td>${procCount}</td>
        <td>${companion}</td>
        <td><button class="btn" data-admin-view="${utils ? utils.escapeHtml(p.id) : p.id}">Ver</button> <button class="btn ghost" data-admin-audit="${utils ? utils.escapeHtml(p.id) : p.id}">Historial</button></td>`;
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        const wrapper = document.createElement('div');
        wrapper.style.overflow = 'auto';
        wrapper.style.maxHeight = '78vh';
        wrapper.appendChild(table);
        patientDetailEl.appendChild(wrapper);

        // bind actions
        const viewBtns = patientDetailEl.querySelectorAll('[data-admin-view]');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-admin-view');
                openAdminPatientDetailModal(pid);
            });
        });
        const auditBtns = patientDetailEl.querySelectorAll('[data-admin-audit]');
        auditBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-admin-audit');
                openAdminAuditModal(pid);
            });
        });
    }

    /* ---------------------------
       ADMIN modals
       --------------------------- */
    function openAdminPatientDetailModal(patientId) {
        const p = (patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === patientId) : null);
        if (!p) return alert('Paciente no encontrado');

        let html = `<div style="max-width:900px">
      <h3>Detalle paciente - ${utils ? utils.escapeHtml(p.name) : p.name}</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        <div><strong>Internal ID</strong><div class="muted">${utils ? utils.escapeHtml(p.internalId) : p.internalId}</div></div>
        <div><strong>Código público</strong><div class="muted">${utils ? utils.escapeHtml(p.publicCode) : p.publicCode}</div></div>
        <div><strong>Documento</strong><div class="muted">${utils ? utils.escapeHtml(p.doc || '-') : (p.doc || '-')}</div></div>
        <div><strong>Teléfono</strong><div class="muted">${utils ? utils.escapeHtml(p.phone || '-') : (p.phone || '-')}</div></div>
        <div><strong>Estado</strong><div class="muted">${patientStatus(p)}</div></div>
        <div><strong>Hab / Camilla</strong><div class="muted">${utils ? utils.escapeHtml(p.assignedRoom || '-') : (p.assignedRoom || '-')} / ${utils ? utils.escapeHtml(p.assignedBed || '-') : (p.assignedBed || '-')}</div></div>
        <div><strong>Atiende</strong><div class="muted">${utils ? utils.escapeHtml(p.attending || '-') : (p.attending || '-')}</div></div>
        <div><strong>Llegada</strong><div class="muted">${p.arrived ? new Date(p.arrivedAt).toLocaleString() : '-'}</div></div>
        <div><strong>Ingreso</strong><div class="muted">${p.admittedAt ? new Date(p.admittedAt).toLocaleString() : '-'}</div></div>
        <div style="grid-column:1/3"><strong>Notas</strong><div class="muted">${utils ? utils.escapeHtml(p.notes || '-') : (p.notes || '-')}</div></div>
        <div style="grid-column:1/3"><strong>Acompañante</strong><div class="muted">${p.companionName ? `${utils ? utils.escapeHtml(p.companionName) : p.companionName} · ${utils ? utils.escapeHtml(p.companionRelation || '') : (p.companionRelation || '')} · ${utils ? utils.escapeHtml(p.companionPhone || '') : (p.companionPhone || '')}` : '-'}</div></div>
      </div>
      <hr />
      <h4>Diagnóstico final</h4>
      <div class="muted">${p.finalDiagnosis ? utils ? utils.escapeHtml(p.finalDiagnosis) : p.finalDiagnosis : 'Sin diagnóstico registrado'}</div>
      <div style="margin-top:10px"><strong>Compartir diagnóstico con acompañante:</strong> <span class="muted">${p.shareDiagnosis ? 'Sí' : 'No'}</span></div>
      <hr />
      <h4>Procedimientos</h4>`;

        if (!p.procedures || p.procedures.length === 0) {
            html += `<div class="muted">Sin procedimientos registrados</div>`;
        } else {
            html += `<div style="display:flex;flex-direction:column;gap:8px">`;
            p.procedures.forEach(pr => {
                html += `<div style="padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.04)"><strong>${utils ? utils.escapeHtml(pr.desc) : pr.desc}</strong><div class="muted">Realizado por: ${utils ? utils.escapeHtml(pr.performedBy || '---') : (pr.performedBy || '---')} · ${new Date(pr.time).toLocaleString()}</div></div>`;
            });
            html += `</div>`;
        }

        html += `<hr /></div>`;
        if (modals && modals.openModalLarge) modals.openModalLarge(html);
    }

    function openAdminAuditModal(patientId) {
        const logs = (audit && audit.getAudit ? audit.getAudit() : []).filter(l => {
            if (l.patientId && l.patientId === patientId) return true;
            try {
                const json = JSON.stringify(l.details || '');
                if (json && json.indexOf(patientId) !== -1) return true;
            } catch (e) { }
            return false;
        });

        let html = `<div style="max-width:1000px">
      <h3>Historial de auditoría - paciente</h3>
      <div class="muted">Se muestran las acciones registradas (creación, actualizaciones, procedimientos, ediciones).</div>
      <div style="margin-top:12px">`;

        if (logs.length === 0) html += `<div class="muted">Sin registros de auditoría para este paciente</div>`;
        else {
            html += `<table style="width:100%;border-collapse:collapse"><thead><tr><th>Hora</th><th>Acción</th><th>Usuario</th><th>Detalles</th></tr></thead><tbody>`;
            logs.forEach(l => {
                const time = l.time ? new Date(l.time).toLocaleString() : (l.timestamp ? new Date(l.timestamp).toLocaleString() : '-');
                const action = utils ? utils.escapeHtml(l.action || '-') : (l.action || '-');
                const user = utils ? utils.escapeHtml(l.user || '-') : (l.user || '-');
                const details = utils ? utils.escapeHtml(JSON.stringify(l.details || l || {}).slice(0, 1000)) : JSON.stringify(l.details || l || {}).slice(0, 1000);
                html += `<tr style="border-bottom:1px solid rgba(0,0,0,0.04)"><td style="vertical-align:top">${time}</td><td style="vertical-align:top">${action}</td><td style="vertical-align:top">${user}</td><td style="vertical-align:top"><pre style="white-space:pre-wrap;word-break:break-word;margin:0">${details}</pre></td></tr>`;
            });
            html += `</tbody></table>`;
        }

        html += `</div></div>`;
        if (modals && modals.openModalLarge) modals.openModalLarge(html);
    }

    /* ---------------------------
       Filter button UI
       --------------------------- */
    function setListFilter(mode) {
        currentListFilter = mode;
        updateFilterButtonsUI();
        renderPatientList(searchInput ? searchInput.value.trim() : '');
        const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
        if (sess && sess.role === 'admin' && panelStaff && !panelStaff.classList.contains('hidden')) {
            renderAdminTable();
        }
    }
    function updateFilterButtonsUI() {
        if (!btnViewActive || !btnViewEgresados) return;
        btnViewActive.classList.remove('active');
        btnViewEgresados.classList.remove('active');
        if (currentListFilter === 'active') btnViewActive.classList.add('active');
        if (currentListFilter === 'discharged') btnViewEgresados.classList.add('active');
    }


    function handleLogoutUI() {
        if (modals && typeof modals.closeModalLarge === 'function') modals.closeModalLarge();
        if (patientDetailEl) patientDetailEl.innerHTML = '<div class="muted">Selecciona un paciente para ver detalles</div>';
        if (patientListEl) patientListEl.innerHTML = '';
        if (searchInput) searchInput.value = '';
        try { renderPatientList(); } catch (e) { }
    }

    /* ---------------------------
       Init: wire handlers and events
       --------------------------- */
    function init() {
        if (init._called) return;
        init._called = true;
        if (btnSearch) btnSearch.addEventListener('click', () => renderPatientList(searchInput ? searchInput.value.trim() : ''));
        if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') renderPatientList(searchInput.value.trim()); });

        if (btnViewActive) btnViewActive.addEventListener('click', () => setListFilter('active'));
        if (btnViewEgresados) btnViewEgresados.addEventListener('click', () => setListFilter('discharged'));

        // Listen to domain events to refresh UI
        window.addEventListener('eseb:patient:created', () => {
            renderPatientList(searchInput ? searchInput.value.trim() : '');
            const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
            if (sess && sess.role === 'admin') renderAdminTable();
        });
        window.addEventListener('eseb:patient:updated', (ev) => {
            renderPatientList(searchInput ? searchInput.value.trim() : '');
            const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
            if (sess && sess.role === 'admin') renderAdminTable();
            const detailWrap = patientDetailEl && patientDetailEl.querySelector ? patientDetailEl.querySelector('[data-patient-id]') : null;
            if (detailWrap) {
                const pid = detailWrap.getAttribute('data-patient-id');
                const p = patientsApi && patientsApi.getPatients ? patientsApi.getPatients().find(x => x.id === pid) : null;
                if (p) showPatientDetail(pid);
            }
        });
        window.addEventListener('eseb:procedure:added', () => {
            const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
            if (sess && sess.role === 'admin') renderAdminTable();
            renderPatientList(searchInput ? searchInput.value.trim() : '');
        });
        window.addEventListener('eseb:procedure:edited', () => {
            const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
            if (sess && sess.role === 'admin') renderAdminTable();
            renderPatientList(searchInput ? searchInput.value.trim() : '');
        });
        window.addEventListener('eseb:audit:changed', () => {
            const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
            if (sess && sess.role === 'admin') renderAdminTable();
        });

        // storage event (cross-tab) refresh
        window.addEventListener('eseb:storage', () => {
            renderPatientList(searchInput ? searchInput.value.trim() : '');
            const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;
            if (sess && sess.role === 'admin') renderAdminTable();
        });

        // initial render
        renderPatientList();
        const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;

        // Mostrar nombre del usuario en el título del panel cuando esté disponible
        const panelTitle = document.getElementById('panel-title');
        if (panelTitle && sess) {
            const displayName = sess.displayName || sess.username || sess.email || null;
            if (displayName) {
                panelTitle.textContent = sess.role === 'admin'
                    ? `Panel Administrativo — ${displayName}`
                    : `Panel Médico — ${displayName}`;
            }
        }

        if (sess && sess.role === 'admin') {
            renderAdminTable();
        }
    }

    window.eseb = window.eseb || {};
    window.eseb.staffPanel = {
        init,
        renderPatientList,
        showPatientDetail,
        renderAdminTable
    };

    window.addEventListener('load', () => {
        const sess = window.eseb && window.eseb.auth ? window.eseb.auth.currentSession() : null;

        if (sess) {
            if (typeof init === 'function') {
                init();
            } else if (window.eseb && window.eseb.staffPanel && typeof window.eseb.staffPanel.init === 'function') {
                window.eseb.staffPanel.init();
            } else {
                console.warn("No se encontró init()");
            }
        } else {
            console.warn("No hay sesión activa");
        }
    });
})();