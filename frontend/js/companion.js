// companion.js
(function () {
    const patientsApi = window.eseb && window.eseb.patients;
    const modals = window.eseb && window.eseb.modals;
    const utils = window.eseb && window.eseb.utils;
    if (!patientsApi || !modals || !utils) {
        console.warn('companion: falta patients/modals/utils');
    }

    const panelCompanion = document.getElementById('panel-companion');
    const formCompanion = document.getElementById('form-companion');
    const compInput = document.getElementById('comp-code');

    // Si abrimos un modal grande, guardamos el código que mostramos
    let currentShownCode = null;

    function buildStatusHtml(p) {
        if (!p) return `<div class="kv"><strong>Estado</strong><div class="muted">-</div></div>`;
        const discharged = p.discharged_at || p.dischargedAt;
        if (discharged) {
            return `<div class="kv"><strong>Estado</strong><div class="muted">Egresado · ${new Date(discharged).toLocaleString()}</div></div>`;
        } else {
            return `<div class="kv"><strong>Estado</strong><div class="muted">Activo</div></div>`;
        }
    }

    async function showCompanionInModal(code) {
        if (!code) return;
        let p = null;
        try {
            const api = window.eseb && window.eseb.api;
            if (api) {
                p = await api.getPatientByPublicCode(code);
            }
        } catch (err) {
            const notFoundHtml = `<div class="ig-content"><h3>Código no encontrado</h3><p class="muted">El código ingresado no corresponde a ningún paciente.</p></div>`;
            if (modals && modals.openCompanionContent) modals.openCompanionContent(notFoundHtml);
            return;
        }
        currentShownCode = code;

        if (!p) {
            const notFoundHtml = `<div class="ig-content"><h3>Código no encontrado</h3><p class="muted">El código ingresado no corresponde a ningún paciente.</p></div>`;
            if (modals && modals.openCompanionContent) modals.openCompanionContent(notFoundHtml);
            return; // ← esto faltaba, sin esto el código sigue y rompe con p null
        }

        // Build HTML with companion info and diagnosis (if allowed)
        let html = `<div class="ig-content-large">
      <h3>${utils ? utils.escapeHtml(p.name) : p.name} </h3>
      <div class="detail-grid">
        <div class="kv"><strong>Motivo</strong><div class="muted">${utils ? utils.escapeHtml(p.reason || '-') : (p.reason || '-')}</div></div>
        <div class="kv"><strong>Teléfono</strong><div class="muted">${utils ? utils.escapeHtml(p.phone || '-') : (p.phone || '-')}</div></div>
        ${buildStatusHtml(p)}
        <div class="kv"><strong>Llegada</strong><div class="muted">${p.arrived ? 'Confirmada ' + new Date(p.arrived_at || p.arrivedAt).toLocaleString() : 'Pendiente'}</div></div>
        <div class="kv"><strong>Hab / Camilla</strong><div class="muted">${utils ? utils.escapeHtml(p.assigned_room || p.assignedRoom || '-') : (p.assigned_room || p.assignedRoom || '-')} / ${utils ? utils.escapeHtml(p.assigned_bed || p.assignedBed || '-') : (p.assigned_bed || p.assignedBed || '-')}</div></div>
        <div class="kv"><strong>Atiende</strong><div class="muted">${utils ? utils.escapeHtml(p.attending_name || p.attending || '-') : (p.attending_name || p.attending || '-')}</div></div>`;

        // Companion info (nuevo — mostrar datos del acompañante al visitante)
        const cName = p.companion_name || p.companionName || null;
        const cRel = p.companion_relation || p.companionRelation || '';
        const cPhone = p.companion_phone || p.companionPhone || '';
        html += `<div class="kv"><strong>Acompañante</strong><div class="muted">${cName ? `${utils ? utils.escapeHtml(cName) : cName} · ${utils ? utils.escapeHtml(cRel) : cRel} · ${utils ? utils.escapeHtml(cPhone) : cPhone}` : '-'}</div></div>`;
        // Diagnóstico final — solo mostrar si el doctor permitió compartir (shareDiagnosis)
        const shareDx = p.share_diagnosis || p.shareDiagnosis || false;
        const finalDx = p.final_diagnosis || p.finalDiagnosis || null;
        if (shareDx) {
            html += `<div class="kv"><strong>Diagnóstico final</strong><div class="muted">${finalDx ? (utils ? utils.escapeHtml(finalDx) : finalDx) : 'Sin diagnóstico registrado'}</div></div>`;
        } else {
            html += `<div class="kv"><strong>Diagnóstico final</strong><div class="muted">No disponible</div></div>`;
        }

        html += `</div>
      <div class="timeline"><h4>Procedimientos (tiempo real)</h4>`;

        const shareProc = p.share_with_companion || p.shareWithCompanion || false;
        if (!shareProc) {
            html += `<div class="muted">Los procedimientos son privados para este paciente. No están disponibles para acompañantes.</div>`;
        } else {
            if (!p.procedures || p.procedures.length === 0) {
                html += `<div class="muted">Sin procedimientos registrados</div>`;
            } else {
                p.procedures.forEach(pr => {
                    const desc = pr.description || pr.desc || '';
                    const performedBy = pr.performed_by || pr.performedBy || '---';
                    const time = pr.created_at || pr.time || null;
                    html += `<div class="proc"><div><strong>${utils ? utils.escapeHtml(desc) : desc}</strong><br><small>${utils ? utils.escapeHtml(performedBy) : performedBy} · ${time ? new Date(time).toLocaleString() : '-'}</small></div></div>`;
                });
            }
        }

        html += `</div></div>`;

        if (modals && modals.openCompanionContent) modals.openCompanionContent(html);

        // Cablear la X del modal-view para que cierre también el panel companion
        setTimeout(() => {
            const btnX = document.getElementById('btn-close-view');
            if (btnX) {
                const handler = () => {
                    currentShownCode = null;
                    const panelC = document.getElementById('panel-companion');
                    if (panelC) panelC.classList.add('hidden');
                    const comp = document.getElementById('comp-code');
                    if (comp) comp.value = '';
                    btnX.removeEventListener('click', handler);
                };
                btnX.addEventListener('click', handler);
            }
        }, 10);
    }

    // Companion form submit -> abrir modal grande con contenido
    if (formCompanion) {
        formCompanion.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const code = (compInput && compInput.value) ? compInput.value.trim() : '';
            if (!code) return;
            await showCompanionInModal(code);
        });
    }

    // Real-time updates: si el modal companion grande está abierto mostrando ese código, refrescarlo
    async function refreshCompanionIfOpen() {
        if (!currentShownCode) return;
        await showCompanionInModal(currentShownCode);
    }

    window.addEventListener('eseb:patient:updated', async () => {
        try { await refreshCompanionIfOpen(); } catch (e) { /* safe */ }
    });

    window.addEventListener('eseb:procedure:added', async () => {
        try { await refreshCompanionIfOpen(); } catch (e) { /* safe */ }
    });

    window.addEventListener('eseb:procedure:edited', async () => {
        try { await refreshCompanionIfOpen(); } catch (e) { /* safe */ }
    });

    window.addEventListener('eseb:storage', async () => {
        try { await refreshCompanionIfOpen(); } catch (e) { /* safe */ }
    });

    window.eseb = window.eseb || {};
    window.eseb.companion = {
        showCompanionInModal,
        _getCurrentShownCode: () => currentShownCode
    };
})();