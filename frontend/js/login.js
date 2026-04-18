import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    getIdTokenResult,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";


const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "es";


const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
provider.addScope("email");
provider.addScope("profile");


const btnGoogleLogin = document.getElementById("btn-google-login");
const authMessage = document.getElementById("auth-message");


function setMessage(message, type = "info") {
    if (!authMessage) return;
    authMessage.textContent = message || "";
    authMessage.dataset.type = type;
}

function setBusy(isBusy) {
    if (!btnGoogleLogin) return;
    btnGoogleLogin.disabled = isBusy;
    btnGoogleLogin.style.opacity = isBusy ? "0.75" : "1";
    btnGoogleLogin.style.cursor = isBusy ? "wait" : "pointer";
}


function saveSessionSnapshot(user, role) {
    const snapshot = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        role,
        loggedAt: new Date().toISOString()
    };
    sessionStorage.setItem("eseb_staff_session", JSON.stringify(snapshot));
}


// REEMPLAZADO MIENTRAS DESARROLLO Y ASIGNO ROLES DESDE EL BACKEND_______________
function resolveRoleFromClaims(claims) {
    // Primero buscar custom claims (asignados por el backend con Firebase Admin SDK)
    if (claims) {
        if (claims.role === "admin" || claims.admin === true) return "admin";
        if (claims.role === "medico" || claims.medico === true) return "medico";
        if (claims.role === "enfermero") return "medico"; // enfermeros van al panel médico
    }

    // TEMPORAL — mientras el backend no asigna custom claims,
    // leer el rol del sessionStorage si fue seleccionado manualmente.
    // REMOVER este bloque cuando el backend esté funcionando.
    const raw = sessionStorage.getItem('eseb_role_temp');
    if (raw === 'admin' || raw === 'medico') return raw;

    // Sin claims ni rol temporal → sin acceso
    return null;
}

// ASIGNACION DE ROLES BACKEND TENER PRESENTE MAS ADELANTE PORFA_________________

// function resolveRoleFromClaims(claims) {
//     if (!claims) return null;
//     if (claims.role === "admin" || claims.admin === true) return "admin";
//     if (claims.role === "medico" || claims.medico === true) return "medico";
//     return null;
// }

function redirectByRole(role) {
    if (role === "admin") {
        window.location.href = "dashboard-admin.html";
        return;
    }
    window.location.href = "dashboard-medico.html";
}


async function handleLogin() {
    try {
        setBusy(true);
        setMessage("Abriendo Google...", "info");

        // TEMPORAL: guardar el rol seleccionado antes de ir a Google
        const roleTempSelect = document.getElementById('role-temp-select');
        if (roleTempSelect) {
            sessionStorage.setItem('eseb_role_temp', roleTempSelect.value);
        }

        try {
            // 🔹 Intento con popup
            const result = await signInWithPopup(auth, provider);

            const token = await getIdTokenResult(result.user, true);
            const role = resolveRoleFromClaims(token.claims);

            if (!role) {
                await signOut(auth);
                sessionStorage.removeItem("eseb_staff_session");
                setMessage("Tu cuenta no tiene un rol autorizado. Pide al administrador.", "error");
                return;
            }

            saveSessionSnapshot(result.user, role);
            setMessage("Acceso validado. Redirigiendo...", "success");
            redirectByRole(role);

        } catch (popupError) {
            console.error("Popup error:", popupError);

            // 🔹 Fallback a redirect
            setMessage("Redirigiendo a Google...", "info");
            await signInWithRedirect(auth, provider);
        }

    } catch (error) {
        console.error(error);
        setMessage("Error al iniciar sesión.", "error");
    } finally {
        setBusy(false);
    }
}


if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener("click", handleLogin);
}


onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
        const token = await getIdTokenResult(user, true);
        const role = resolveRoleFromClaims(token.claims);

        if (!role) {
            await signOut(auth);
            sessionStorage.removeItem("eseb_staff_session");
            setMessage("No tienes permisos.", "error");
            return;
        }

        saveSessionSnapshot(user, role);
        setMessage("Sesión detectada. Redirigiendo...", "success");
        redirectByRole(role);

    } catch (error) {
        console.error(error);
        setMessage("Error validando sesión.", "error");
    }
});


getRedirectResult(auth)
    .then(async (result) => {
        if (!result) return;

        const token = await getIdTokenResult(result.user, true);
        const role = resolveRoleFromClaims(token.claims);

        if (!role) {
            await signOut(auth);
            sessionStorage.removeItem("eseb_staff_session");
            setMessage("Tu cuenta no tiene permisos.", "error");
            return;
        }

        saveSessionSnapshot(result.user, role);
        setMessage("Acceso validado. Redirigiendo...", "success");
        redirectByRole(role);
    })
    .catch((error) => {
        console.error("Redirect error:", error);
    });