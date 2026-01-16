const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("loginStatus");
const tokenKey = "adminToken";

function showStatus(message) {
  if (!loginStatus) return;
  loginStatus.textContent = message;
}

if (localStorage.getItem(tokenKey)) {
  window.location.href = "/admin";
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        showStatus("Credenciais invalidas. Tente novamente.");
        return;
      }
      const data = await res.json();
      if (data?.token) {
        localStorage.setItem(tokenKey, data.token);
        window.location.href = "/admin";
      } else {
        showStatus("Nao foi possivel entrar. Tente novamente.");
      }
    } catch {
      showStatus("Nao foi possivel entrar. Tente novamente.");
    }
  });
}
