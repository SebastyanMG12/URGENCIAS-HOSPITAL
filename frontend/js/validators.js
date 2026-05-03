// validators.js
(function () {

  // ── Tipos de documento colombianos y su validación
  const TIPOS_DOCUMENTO = {
    CC:  { label: 'Cédula de Ciudadanía',     patron: /^[0-9]{6,10}$/,      mensaje: 'La CC debe tener entre 6 y 10 dígitos numéricos.' },
    TI:  { label: 'Tarjeta de Identidad',     patron: /^[0-9]{10,11}$/,     mensaje: 'La TI debe tener 10 u 11 dígitos numéricos.' },
    RC:  { label: 'Registro Civil',           patron: /^[0-9]{8,11}$/,      mensaje: 'El RC debe tener entre 8 y 11 dígitos numéricos.' },
    CE:  { label: 'Cédula de Extranjería',    patron: /^[a-zA-Z0-9]{4,12}$/,mensaje: 'La CE puede tener letras y números (4–12 caracteres).' },
    PA:  { label: 'Pasaporte',                patron: /^[a-zA-Z0-9]{6,12}$/,mensaje: 'El pasaporte puede tener letras y números (6–12 caracteres).' },
    PE:  { label: 'Permiso Especial (PEP)',   patron: /^[a-zA-Z0-9]{6,20}$/,mensaje: 'El PEP puede tener letras y números (6–20 caracteres).' },
  };

  const PATTERNS = {
    // Solo letras (incluye acentos y ñ), un solo espacio entre palabras, guión y apóstrofe
    // El truco: validamos el valor YA limpio (sin dobles espacios)
    nombre:       /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]([a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\-' ])*[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]$|^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]{2}$/,
    telefono:     /^\+?[0-9]{7,15}$/,
    // Texto general: bloquea solo los caracteres de ataque
    textoGeneral: /^[^<>"';]{2,500}$/,
    codigoPublico:/^[A-Z0-9]{8}$/
  };

  const MENSAJES = {
    nombre:        'El nombre solo puede contener letras, tildes, ñ, espacios simples y guiones (mín. 2 caracteres).',
    telefono:      'Solo números. Puede empezar con + (7–15 dígitos).',
    textoGeneral:  'Este campo no puede contener los caracteres < > " \' ;',
    codigoPublico: 'El código debe tener exactamente 8 letras mayúsculas y números.',
    requerido:     'Este campo es obligatorio.',
    muyLargo:      'El texto ingresado es demasiado largo.',
    espaciosDobles:'No se permiten espacios dobles o seguidos.'
  };

  // ── Limpieza en tiempo real (llamar en evento 'input')
  // Corrige mientras el usuario escribe
  function limpiarEnTiempoReal(inputElement) {
    if (!inputElement) return;
    inputElement.addEventListener('input', function () {
      const pos = this.selectionStart;
      const original = this.value;

      // Colapsar múltiples espacios en uno solo
      let limpio = original.replace(/\s{2,}/g, ' ');

      // Solo actualizar el valor si cambió algo (evita mover el cursor sin razón)
      if (limpio !== original) {
        this.value = limpio;
        // Restaurar posición del cursor
        this.setSelectionRange(pos - 1, pos - 1);
      }
    });
  }

  // ── Forzar solo números en un input (llamar en evento 'keydown' e 'input')
  function soloNumeros(inputElement) {
    if (!inputElement) return;
    inputElement.addEventListener('keydown', function (e) {
      // Permitir: backspace, delete, tab, escape, enter, flechas, copy/paste
      const permitidos = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
      if (permitidos.includes(e.key)) return;
      // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) return;
      // Bloquear cualquier cosa que no sea dígito
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });
    // Segunda línea de defensa: limpiar si pegaron texto con letras
    inputElement.addEventListener('paste', function (e) {
      e.preventDefault();
      const pegado = (e.clipboardData || window.clipboardData).getData('text');
      const soloDigitos = pegado.replace(/[^0-9]/g, '');
      document.execCommand('insertText', false, soloDigitos);
    });
  }

  // ── Forzar solo letras y espacios (para el campo nombre)
  function soloLetras(inputElement) {
    if (!inputElement) return;
    inputElement.addEventListener('keydown', function (e) {
      const permitidos = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',' ','-',"'"];
      if (permitidos.includes(e.key)) return;
      if (e.ctrlKey || e.metaKey) return;
      // Permitir letras incluyendo acentos y ñ
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]$/.test(e.key)) {
        e.preventDefault();
      }
    });
    inputElement.addEventListener('paste', function (e) {
      e.preventDefault();
      const pegado = (e.clipboardData || window.clipboardData).getData('text');
      // Al pegar, eliminar todo lo que no sea letra, espacio o guión
      const limpio = pegado.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']/g, '').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, limpio);
    });
  }

  // ── Validación final antes de guardar
  function validar(valor, tipo, obligatorio = true) {
    const v = (valor || '').trim();

    if (!v) return obligatorio ? MENSAJES.requerido : null;
    if (v.length > 2000) return MENSAJES.muyLargo;

    // Verificar que no haya espacios dobles (por si acaso)
    if (/\s{2,}/.test(v)) return MENSAJES.espaciosDobles;

    const patron = PATTERNS[tipo];
    if (patron && !patron.test(v)) return MENSAJES[tipo] || 'Valor no válido.';

    return null;
  }

  // ── Validación especial para documento según tipo
  function validarDocumento(numero, tipoDoc) {
    if (!tipoDoc) return 'Selecciona el tipo de documento.';
    if (tipoDoc === 'MS') return null; // menor sin identificación no requiere número
    if (!numero || !numero.trim()) return 'El número de documento es obligatorio.';

    const config = TIPOS_DOCUMENTO[tipoDoc];
    if (!config) return 'Tipo de documento no reconocido.';
    if (!config.patron.test(numero.trim())) return config.mensaje;

    return null;
  }

  // ── Mostrar / ocultar error debajo del input
  function mostrarError(inputElement, errorMsg) {
    if (!inputElement) return;
    let errorEl = inputElement.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('campo-error')) {
      errorEl = document.createElement('small');
      errorEl.classList.add('campo-error');
      errorEl.style.cssText = 'color:#ef4444;font-size:11px;display:block;margin-top:3px;';
      inputElement.parentNode.insertBefore(errorEl, inputElement.nextSibling);
    }
    if (errorMsg) {
      errorEl.textContent = errorMsg;
      errorEl.style.display = 'block';
      inputElement.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.25)';
    } else {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      inputElement.style.boxShadow = '';
    }
  }

  // ── Limpieza final del texto antes de guardar
  function limpiarTexto(valor) {
    if (!valor) return '';
    return valor.trim().replace(/\s+/g, ' ');
  }

  function sanitizar(valor) {
    if (!valor) return '';
    return valor.trim().replace(/[<>"';]/g, '').replace(/\s+/g, ' ');
  }

  window.eseb = window.eseb || {};
  window.eseb.validators = {
    validar,
    validarDocumento,
    mostrarError,
    limpiarTexto,
    sanitizar,
    soloNumeros,
    soloLetras,
    limpiarEnTiempoReal,
    TIPOS_DOCUMENTO,
    PATTERNS,
    MENSAJES
  };

})();