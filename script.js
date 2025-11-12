document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');

  if (!toggleBtn || !nav) return;

  const setExpanded = (expanded) => {
    toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  toggleBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    setExpanded(isOpen);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('open')) return;
    if (!nav.contains(e.target) && !toggleBtn.contains(e.target)) {
      nav.classList.remove('open');
      setExpanded(false);
    }
  });

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (nav.classList.contains('open')) {
        nav.classList.remove('open');
        setExpanded(false);
      }
    }
  });
});

// --- Auth, Roles, and UI Guards ---
(function () {
  const USERS = {
    'the@unknownshoppers.com': { role: 'admin' },
    'jalcz@pct.com': { role: 'director' },
    'inspector1@pct.com': { role: 'inspector' },
  };

  const PERMISSIONS = {
    admin: new Set(['create', 'view', 'edit', 'destroy']),
    director: new Set(['view', 'edit']),
    inspector: new Set(['create']),
  };

  const page = {
    isIndex: !!document.querySelector('main .actions'),
    isLogin: !!document.getElementById('login-form'),
    isInspection: !!document.getElementById('inspection-form'),
  };

  const getCurrentEmail = () => localStorage.getItem('currentUserEmail');
  const setCurrentEmail = (email) => {
    if (email) localStorage.setItem('currentUserEmail', email);
    else localStorage.removeItem('currentUserEmail');
  };
  const getRole = (email) => (email && USERS[email] ? USERS[email].role : null);

  const userEmailEl = document.getElementById('user-email');
  const loginLinkEl = document.getElementById('login-link');
  const logoutBtnEl = document.getElementById('logout-btn');

  function refreshUserBox() {
    const email = getCurrentEmail();
    if (userEmailEl) userEmailEl.textContent = email ? email : '';
    if (loginLinkEl) loginLinkEl.style.display = email ? 'none' : '';
    if (logoutBtnEl) logoutBtnEl.style.display = email ? '' : 'none';
  }

  if (logoutBtnEl) {
    logoutBtnEl.addEventListener('click', () => {
      setCurrentEmail(null);
      refreshUserBox();
      // After logout, send to login page for clarity
      if (!page.isLogin) window.location.href = 'login.html';
    });
  }

  // Handle login form
  if (page.isLogin) {
    const form = document.getElementById('login-form');
    const select = document.getElementById('email');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = select?.value;
      if (!email || !USERS[email]) {
        alert('Usuario no válido');
        return;
      }
      setCurrentEmail(email);
      window.location.href = 'index.html';
    });
  }

  function applyIndexPermissions() {
    if (!page.isIndex) return;
    const email = getCurrentEmail();
    const role = getRole(email);
    const allowed = role ? PERMISSIONS[role] : new Set();
    document.querySelectorAll('.action-btn').forEach((btn) => {
      const action = btn.getAttribute('data-action');
      const can = allowed.has(action);
      btn.disabled = !can;
      btn.style.opacity = can ? '1' : '0.5';
      btn.title = can ? '' : 'No autorizado';
    });
  }

  function applyInspectionGuard() {
    if (!page.isInspection) return;
    const email = getCurrentEmail();
    const role = getRole(email);
    const form = document.getElementById('inspection-form');
    const guardP = document.getElementById('inspection-guard');
    const result = document.getElementById('inspection-result');

    const canCreateInspection = role === 'inspector';
    if (!email) {
      if (guardP) {
        guardP.style.display = '';
        guardP.textContent = 'Inicia sesión para crear inspecciones.';
      }
      if (form) form.style.display = 'none';
      return;
    }

    if (!canCreateInspection) {
      if (guardP) {
        guardP.style.display = '';
        guardP.textContent = 'Solo el rol inspector puede crear inspecciones.';
      }
      if (form) form.style.display = 'none';
      return;
    }

    // Inspector can submit the form
    if (guardP) guardP.style.display = 'none';
    if (form) {
      form.style.display = '';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('insp-title')?.value?.trim();
        const date = document.getElementById('insp-date')?.value;
        const notes = document.getElementById('insp-notes')?.value?.trim();
        if (!title || !date) {
          alert('Título y fecha son requeridos.');
          return;
        }
        // Simulate persisted record in localStorage
        const key = 'inspections';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push({ id: Date.now(), title, date, notes, createdBy: email });
        localStorage.setItem(key, JSON.stringify(list));
        if (result) {
          result.textContent = 'Inspección creada correctamente.';
        }
        form.reset();
      });
    }
  }

  // Initialize
  refreshUserBox();
  applyIndexPermissions();
  applyInspectionGuard();

  // Optional: close mobile nav when clicking a nav link
  document.querySelectorAll('#primary-nav a').forEach((a) => {
    a.addEventListener('click', () => {
      const toggleBtn = document.querySelector('.menu-toggle');
      const nav = document.getElementById('primary-nav');
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggleBtn?.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();
