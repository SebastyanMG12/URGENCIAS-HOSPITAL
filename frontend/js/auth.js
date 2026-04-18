// auth.js
(function () {
    const s = window.eseb && window.eseb.storage;
    const utils = window.eseb && window.eseb.utils;
    if (!s || !utils) throw new Error('storage.js and utils.js must be loaded before auth.js');

    function getUsers() {
        return s.read(s.STORAGE_KEYS.USERS) || [];
    }
    function saveUsers(list) {
        s.write(s.STORAGE_KEYS.USERS, list || []);
    }

    function encodePassword(p) { return btoa(unescape(encodeURIComponent(p))); }
    function checkPassword(stored, plain) { return stored === encodePassword(plain); }

    function validatePasswordStrength(p) {
        if (!p || p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        if (!/[A-Z]/.test(p)) return 'Debe contener al menos una letra mayúscula.';
        if (!/[0-9]/.test(p)) return 'Debe contener al menos un número.';
        return null;
    }

    const MAX_ATTEMPTS = 10;

    function getLockoutKey(username) { return 'eseb_lockout_' + username; }

    function isLocked(username) {
        const raw = localStorage.getItem(getLockoutKey(username));
        if (!raw) return false;
        return JSON.parse(raw).attempts >= MAX_ATTEMPTS;
    }

    function recordFailedAttempt(username) {
        const raw = localStorage.getItem(getLockoutKey(username));
        const data = raw ? JSON.parse(raw) : { attempts: 0 };
        data.attempts += 1;
        localStorage.setItem(getLockoutKey(username), JSON.stringify(data));
        return data.attempts;
    }

    function clearLockout(username) {
        localStorage.removeItem(getLockoutKey(username));
    }

    function getAttempts(username) {
        const raw = localStorage.getItem(getLockoutKey(username));
        return raw ? JSON.parse(raw).attempts : 0;
    }

    function saveUser(username, password, role) {
        const users = getUsers();
        if (users.some(u => u.username === username)) throw new Error('Usuario ya existe');

        const pwdError = validatePasswordStrength(password);
        if (pwdError) throw new Error(pwdError);

        users.push({
            id: utils.uid('user'),
            username,
            password: encodePassword(password),
            role,
            created: utils.now()
        });
        saveUsers(users);
        s.write(s.STORAGE_KEYS.USERS, users);
        window.dispatchEvent(new CustomEvent('eseb:user:created', { detail: { username, role } }));
        return true;
    }

    function loginUser(username, password, role) {
        const users = getUsers();
        const u = users.find(x => x.username === username && x.role === role);

        if (!u) {
            recordFailedAttempt(username);
            const raw = localStorage.getItem(getLockoutKey(username));
            const att = raw ? JSON.parse(raw).attempts : 1;
            const remaining = MAX_ATTEMPTS - att;
            if (remaining <= 0) throw new Error('Cuenta bloqueada. Intenta de nuevo en 5 minuto(s).');
            throw new Error('Credenciales inválidas. Intentos restantes: ' + remaining);
        }

        if (!checkPassword(u.password, password)) {
            const att = recordFailedAttempt(username);
            const remaining = MAX_ATTEMPTS - att;
            if (remaining <= 0) throw new Error('Cuenta bloqueada. Intenta de nuevo en 5 minuto(s).');
            throw new Error('Contraseña incorrecta. Intentos restantes: ' + remaining + '. ¿Olvidaste tu contraseña? Contacta al administrador.');
        }

        clearLockout(username);
        const session = { userId: u.id, username: u.username, role: u.role, loggedAt: utils.now() };
        s.write(s.STORAGE_KEYS.SESSION, session);
        window.dispatchEvent(new CustomEvent('eseb:login', { detail: session }));
        return session;
    }

    function logout() {
        localStorage.removeItem(s.STORAGE_KEYS.SESSION);
        window.dispatchEvent(new CustomEvent('eseb:logout', {}));
    }

    function currentSession() {
        return s.read(s.STORAGE_KEYS.SESSION);
    }

    window.eseb.auth = {
        getUsers,
        saveUser,
        loginUser,
        logout,
        currentSession,
        clearLockout,
        isLocked,
        getAttempts
    };
})();