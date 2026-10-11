/**
 * Library Management System - Authentication & Profile Manager
 */

const auth = {
  getToken() {
    return localStorage.getItem("lms_token");
  },

  getUser() {
    const userStr = localStorage.getItem("lms_user");
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  setAuth(token, user) {
    localStorage.setItem("lms_token", token);
    localStorage.setItem("lms_user", JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");
  },

  logout() {
    this.clearAuth();
    showToast("info", "Logged Out", "You have been logged out successfully.");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 400);
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },

  initUI() {
    const user = this.getUser();
    if (!user) return;

    // Sidebar user details
    const userNameElements = document.querySelectorAll(".user-name-display");
    userNameElements.forEach(el => el.textContent = user.fullName || user.username);

    const userRoleElements = document.querySelectorAll(".user-role-display");
    userRoleElements.forEach(el => el.textContent = user.role || "ADMIN");

    const userAvatarElements = document.querySelectorAll(".user-avatar-display");
    const initials = (user.fullName || user.username || "A").substring(0, 2).toUpperCase();
    userAvatarElements.forEach(el => el.textContent = initials);

    // Bind logout buttons
    const logoutBtns = document.querySelectorAll(".btn-logout");
    logoutBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    });

    // Mobile sidebar toggle logic
    const sidebarToggler = document.querySelector(".sidebar-toggler");
    const sidebar = document.querySelector(".app-sidebar");
    const backdrop = document.querySelector(".sidebar-backdrop");

    if (sidebarToggler && sidebar) {
      sidebarToggler.addEventListener("click", () => {
        sidebar.classList.toggle("show");
        if (backdrop) backdrop.classList.toggle("show");
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener("click", () => {
        sidebar.classList.remove("show");
        backdrop.classList.remove("show");
      });
    }
  }
};

// Global event listener for common UI setup
document.addEventListener("DOMContentLoaded", () => {
  // If not on login or register, enforce authentication check
  const path = window.location.pathname;
  if (!path.endsWith("login.html") && !path.endsWith("register.html")) {
    if (auth.requireAuth()) {
      auth.initUI();
    }
  }
});
