// api.js — cliente centralizado para comunicación con el backend
const API_URL = "http://localhost:8000";

async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const { headers: optHeaders, ...restOptions } = options;
  const config = {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(optHeaders || {}),
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
    const detail = typeof error.detail === 'string'
      ? error.detail
      : JSON.stringify(error.detail);
    throw new Error(detail || `Error ${response.status}`);
  }

  return response.json();
}

async function getAuthToken() {
  try {
    const { getApps } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js");
    const apps = getApps();
    if (!apps.length) return null;
    const auth = getAuth(apps[0]);

    // Si hay usuario activo, retornar token inmediatamente
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken(false);
    }

    // Si no hay usuario aún, esperar hasta 3s a que Firebase restaure la sesión
    return await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (!user) {
          resolve(null);
          return;
        }
        try {
          const token = await user.getIdToken(false);
          resolve(token);
        } catch (e) {
          resolve(null);
        }
      });
      // Timeout de seguridad: 3 segundos
      setTimeout(() => resolve(null), 3000);
    });
  } catch (e) {
    return null;
  }
}

async function apiFetchAuth(endpoint, options = {}) {
  const token = await getAuthToken();
  if (!token) throw new Error("No hay sesión activa. Por favor inicia sesión.");
  return apiFetch(endpoint, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

// ── Pacientes ──────────────────────────────────────────

async function registerPatient(data) {
  return apiFetch("/patients/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function getPatientByPublicCode(publicCode) {
  return apiFetch(`/patients/companion/${publicCode}`);
}

async function getAllPatients() {
  return apiFetchAuth("/patients/");
}

async function updatePatient(patientId, data) {
  return apiFetchAuth(`/patients/${patientId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

async function addProcedure(patientId, description, performedBy) {
  return apiFetchAuth(`/patients/${patientId}/procedures`, {
    method: "POST",
    body: JSON.stringify({ description, performed_by: performedBy }),
  });
}

async function getProcedures(patientId) {
  return apiFetchAuth(`/patients/${patientId}/procedures`);
}

// ── Auth ───────────────────────────────────────────────

async function verifyAndLogin(idToken) {
  return apiFetch("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

async function getMe() {
  return apiFetchAuth("/auth/me");
}

// ── Staff ──────────────────────────────────────────────

async function getAllStaff() {
  return apiFetchAuth("/staff/");
}

async function getAuditLogs() {
  return apiFetchAuth("/staff/audit");
}

async function getAuditByPatient(patientId) {
  return apiFetchAuth(`/staff/audit/${patientId}`);
}

window.eseb = window.eseb || {};
window.eseb.api = {
  registerPatient,
  getPatientByPublicCode,
  getAllPatients,
  updatePatient,
  addProcedure,
  getProcedures,
  verifyAndLogin,
  getMe,
  getAllStaff,
  getAuditLogs,
  getAuditByPatient,
};