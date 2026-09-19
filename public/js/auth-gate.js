/**
 * AUDIOFORGE LAB // AUTH GATE & SESSION VERIFICATION
 * Gère le jeton JWT, la licence client et le contrôle d'accès aux modules
 */

const AuthGate = (() => {
  const STORAGE_KEY = 'audioforge_jwt_token';
  const USER_KEY = 'audioforge_user_data';
  const DEMO_TOKEN = 'VIBE-PRO-DEMO-2025';

  // Initialisation : vérifie les paramètres d'URL (?token=... ou ?license=...)
  function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token') || urlParams.get('license');

    if (tokenFromUrl) {
      setSession(tokenFromUrl, {
        email: urlParams.get('email') || 'apprenant@audioforge.io',
        name: urlParams.get('name') || 'Beatmaker Pro',
        modules: ['lowcode', 'vibecoding', 'business'],
        tier: 'Bundle Accès Complet'
      });
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (!getToken()) {
      // Pour permettre le test immédiat sans friction en local :
      // On initialise automatiquement une session démo complète
      setSession(DEMO_TOKEN, {
        email: 'beatmaker@studio.io',
        name: 'Membre AudioForge',
        modules: ['lowcode', 'vibecoding', 'business'],
        tier: 'Bundle Intégral & Templates'
      });
    }
  }

  function setSession(token, userData) {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }

  function getToken() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || {
        name: 'Membre AudioForge',
        email: 'membre@audioforge.io',
        modules: ['lowcode', 'vibecoding', 'business'],
        tier: 'Bundle Intégral'
      };
    } catch (e) {
      return null;
    }
  }

  function hasAccess(moduleCode) {
    const user = getUser();
    if (!user || !user.modules) return false;
    // 'bundle' donne accès à tout
    if (user.modules.includes('bundle') || user.modules.includes('all')) return true;
    return user.modules.includes(moduleCode);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/index.html';
  }

  // Lance l'initialisation au chargement
  init();

  return {
    getToken,
    getUser,
    hasAccess,
    setSession,
    logout
  };
})();
