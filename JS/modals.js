// modals.js
(function () {
    const utils = window.eseb && window.eseb.utils;
    if (!utils) throw new Error('utils.js must be loaded before modals.js');

    const modalRegistered = document.getElementById('modal-registered');
    const regCodeEl = document.getElementById('reg-code');
    const btnCloseRegistered = document.getElementById('btn-close-registered');

    const modalView = document.getElementById('modal-view');
    const modalViewContent = document.getElementById('modal-view-content');
    const btnCloseView = document.getElementById('btn-close-view');

    function openRegistered(code) {
        if (!modalRegistered) return;
        if (regCodeEl) regCodeEl.textContent = code || '--';

        const qrContainer = document.getElementById('qr-code-container');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            if (code && typeof QRCode !== 'undefined') {
                try {
                    new QRCode(qrContainer, {
                        text: code,
                        width: 120,
                        height: 120,
                        colorDark: '#007B8F',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } catch (e) {
                    qrContainer.innerHTML = '';
                }
            }
        }

        modalRegistered.classList.remove('hidden');
        modalRegistered.style.zIndex = '9998';
    }

    function closeRegistered() {
        if (!modalRegistered) return;
        modalRegistered.classList.add('hidden');
    }

    function openModalLarge(html) {
        if (!modalView || !modalViewContent) return;
        modalViewContent.innerHTML = html || '';
        modalView.classList.remove('hidden');
        modalView.style.zIndex = '9999';
        const panel = document.getElementById('panel-staff');
        if (panel) {
            panel.style.pointerEvents = 'none';
            panel.style.filter = 'blur(0.6px)';
        }
        modalViewContent.scrollTop = 0;
        const first = modalViewContent.querySelector('button, input, select, textarea, a');
        if (first) first.focus();
    }

    function closeModalLarge() {
        if (!modalView || !modalViewContent) return;
        modalView.classList.add('hidden');
        modalViewContent.innerHTML = '';
        const panel = document.getElementById('panel-staff');
        if (panel) {
            panel.style.pointerEvents = '';
            panel.style.filter = '';
        }
        const comp = document.getElementById('comp-code');
        if (comp) comp.value = '';
    }

    function openCompanionContent(html) {
        openModalLarge(html);
    }

    if (btnCloseRegistered) btnCloseRegistered.addEventListener('click', () => closeRegistered());
    if (btnCloseView) btnCloseView.addEventListener('click', () => closeModalLarge());
    window.eseb = window.eseb || {};
    window.eseb.modals = {
        openRegistered,
        closeRegistered,
        openModalLarge,
        closeModalLarge,
        openCompanionContent
    };
})();