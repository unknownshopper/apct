/**
 * Helper para asegurar que la UI de autenticación se actualice correctamente
 * Usar en páginas que tienen problemas de timing con script.js
 */

(function() {
  'use strict';
  
  // Función para actualizar UI de autenticación
  function forceUpdateAuthUI() {
    try {
      const userEmailEl = document.getElementById('user-email');
      const loginLinkEl = document.getElementById('login-link');
      const logoutBtnEl = document.getElementById('logout-btn');
      
      if (!userEmailEl || !loginLinkEl || !logoutBtnEl) {
        console.warn('[auth-ui-helper] Elementos de UI no encontrados');
        return false;
      }
      
      if (window.auth && window.auth.currentUser) {
        const email = window.auth.currentUser.email || '';
        userEmailEl.textContent = email;
        loginLinkEl.style.display = 'none';
        logoutBtnEl.style.display = '';
        console.log('[auth-ui-helper] ✅ UI actualizada para:', email);
        return true;
      } else {
        userEmailEl.textContent = '';
        loginLinkEl.style.display = 'inline-block';
        logoutBtnEl.style.display = 'none';
        console.log('[auth-ui-helper] ℹ️ No hay usuario logueado');
        return false;
      }
    } catch (e) {
      console.error('[auth-ui-helper] Error:', e);
      return false;
    }
  }
  
  // Intentar actualizar inmediatamente
  forceUpdateAuthUI();
  
  // Intentar de nuevo después de que el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(forceUpdateAuthUI, 50);
    });
  }
  
  // Intentar una vez más después de que todo esté cargado
  window.addEventListener('load', () => {
    setTimeout(forceUpdateAuthUI, 100);
  });
  
  // Escuchar cambios de autenticación si Firebase está disponible
  function setupAuthListener() {
    if (window.auth && window.auth.onAuthStateChanged) {
      window.auth.onAuthStateChanged((user) => {
        console.log('[auth-ui-helper] Estado de auth cambió:', user ? user.email : 'sin sesión');
        setTimeout(forceUpdateAuthUI, 50);
      });
    } else {
      // Reintentar si Firebase no está listo
      setTimeout(setupAuthListener, 200);
    }
  }
  
  // Iniciar listener
  setupAuthListener();
  
  // Exponer función globalmente por si se necesita llamar manualmente
  window.forceUpdateAuthUI = forceUpdateAuthUI;
  
})();
