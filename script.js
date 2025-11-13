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

  // Cache for current email (driven by Firebase Auth state)
  const getCurrentEmail = () => localStorage.getItem('currentUserEmail');
  const setCurrentEmail = (email) => {
    if (email) localStorage.setItem('currentUserEmail', email);
    else localStorage.removeItem('currentUserEmail');
  };

  const getRole = (email) => (email && USERS[email] ? USERS[email].role : null);

  async function getAuthRoleClaim(){
    try{
      if (!window.firebase || !window.auth || !window.auth.currentUser) return null;
      const res = await window.auth.currentUser.getIdTokenResult();
      return res?.claims?.role || null;
    }catch{return null}
  }

  async function getEffectiveRole(email){
    const claim = await getAuthRoleClaim();
    if (claim) return claim;
    return getRole(email);
  }

  async function enforceInspectorRedirect(){
    const email = getCurrentEmail();
    const role = await getEffectiveRole(email);
    const isLogin = !!document.getElementById('login-form');
    const onInspection = /inspeccion\.html$/i.test(location.pathname);
    if (role === 'inspector' && !onInspection && !isLogin){
      location.href = 'inspeccion.html';
    }
  }

  async function applyNavVisibility(){
    const email = getCurrentEmail();
    const role = await getEffectiveRole(email);
    const nav = document.getElementById('primary-nav');
    const onInspection = /inspeccion\.html$/i.test(location.pathname);
    if (!nav) return;
    // Mostrar nav siempre para conservar estilo
    nav.style.display = '';
    // Para inspector en inspeccion.html, ocultar opciones que no sean Inspección
    const links = nav.querySelectorAll('a');
    links.forEach(a => {
      const href = String(a.getAttribute('href')||'');
      const isInspeccion = /inspeccion\.html$/i.test(href);
      if (role === 'inspector' && onInspection){
        a.style.display = isInspeccion ? '' : 'none';
      } else {
        a.style.display = '';
      }
    });
  }

  // Header permanece visible siempre para mantener estilo
  async function applyHeaderVisibility(){ return; }

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
    logoutBtnEl.addEventListener('click', async () => {
      try {
        if (window.auth && window.auth.signOut) {
          await window.auth.signOut();
        }
      } catch (e) {
        console.error('Error al cerrar sesión', e);
      }
    });
  }

  // Handle login form
  if (page.isLogin) {
    const form = document.getElementById('login-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value?.trim();
      const password = document.getElementById('login-password')?.value;
      if (!email || !password) {
        alert('Correo y contraseña son requeridos');
        return;
      }
      if (!window.auth || !window.firebase) {
        alert('Firebase no está cargado');
        return;
      }
      window.auth
        .signInWithEmailAndPassword(email, password)
        .then(() => {
          window.location.href = 'index.html';
        })
        .catch((err) => {
          console.error(err);
          alert('Error al iniciar sesión: ' + (err?.message || ''));
        });
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

  // Initialize from Firebase Auth state
  function bindAuthState() {
    if (window.auth && window.auth.onAuthStateChanged) {
      window.auth.onAuthStateChanged(async (user) => {
        setCurrentEmail(user?.email || null);
        refreshUserBox();
        applyIndexPermissions();
        applyInspectionGuard();
        await enforceInspectorRedirect();
        await applyNavVisibility();
        await applyHeaderVisibility();
      });
    } else {
      // Fallback (no Firebase): keep prior local state
      refreshUserBox();
      applyIndexPermissions();
      applyInspectionGuard();
      enforceInspectorRedirect();
      applyNavVisibility();
      applyHeaderVisibility();
    }
  }
  bindAuthState();

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
