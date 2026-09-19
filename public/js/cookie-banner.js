/**
 * AUDIOFORGE LAB // BANDEAU DE CONSENTEMENT COOKIES RGPD (VANILLA JS)
 * Minimalist Liquid Glass × Studio DAW
 */

(() => {
  const CONSENT_KEY = 'audioforge_cookie_consent';

  function initCookieBanner() {
    const existingConsent = localStorage.getItem(CONSENT_KEY);

    if (existingConsent) {
      if (existingConsent === 'accepted') {
        enableOptionalScripts();
      }
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'audioforge-cookie-banner';
    banner.className = 'fixed bottom-5 inset-x-4 max-w-2xl mx-auto z-50 p-5 rounded-2xl glass-panel shadow-2xl font-mono text-xs text-slate-300';
    
    banner.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-white font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
            <span>RESPECT DE VOTRE VIE PRIVÉE</span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed font-sans">
            Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du studio (session membre et sécurité).
            <a href="/legal/cookies.html" class="text-slate-200 underline hover:text-white ml-1">En savoir plus &rarr;</a>
          </p>
        </div>
        
        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button id="btn-cookie-refuse" class="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition">
            Refuser
          </button>
          <button id="btn-cookie-accept" class="px-4 py-1.5 rounded-full glass-button-primary font-medium text-xs transition">
            Accepter
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('btn-cookie-accept').addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      banner.remove();
      enableOptionalScripts();
    });

    document.getElementById('btn-cookie-refuse').addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'refused');
      banner.remove();
    });
  }

  function enableOptionalScripts() {
    window.audioforgeAnalyticsEnabled = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
  } else {
    initCookieBanner();
  }
})();
