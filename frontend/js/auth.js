// auth.js
(function () {
  const s = window.eseb && window.eseb.storage;
  const utils = window.eseb && window.eseb.utils;
  if (!s || !utils)
    throw new Error("storage.js and utils.js must be loaded before auth.js");

  function currentSession() {
    const raw = sessionStorage.getItem("eseb_staff_session");
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (s && !s.username) s.username = s.displayName || s.email || "staff";
      return s;
    } catch (e) {
      return null;
    }
  }

  function logout() {
    sessionStorage.removeItem("eseb_staff_session");
    window.dispatchEvent(new CustomEvent("eseb:logout", {}));
  }

  window.eseb = window.eseb || {};
  window.eseb.auth = {
    currentSession,
    logout,
  };
})();