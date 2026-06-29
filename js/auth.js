// ============================================================
//  AUTH.JS — Login / session sederhana
// ============================================================

const Auth = {
  SESSION_KEY: "tagihan_auth",

  isLoggedIn() {
    return sessionStorage.getItem(this.SESSION_KEY) === "1";
  },

  login(username, password) {
    if (username === CONFIG.USERNAME && password === CONFIG.PASSWORD) {
      sessionStorage.setItem(this.SESSION_KEY, "1");
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.href = "index.html";
  },

  // Panggil di setiap halaman yang butuh auth
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "index.html";
    }
  },

  // Redirect ke dashboard kalau sudah login
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      window.location.href = "dashboard.html";
    }
  }
};

// ---- Handler untuk halaman login ----
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  Auth.redirectIfLoggedIn();

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value;
    const err = document.getElementById("loginError");

    if (Auth.login(u, p)) {
      window.location.href = "dashboard.html";
    } else {
      err.textContent = "Username atau password salah.";
    }
  });
}
