import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { I18nProvider } from './i18n.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// ─── Production console suppression ─────────────────────
// Prevent sensitive data (errors with stack traces, API URLs) from leaking in browser console
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.warn = noop;
  // Keep console.error pointing to a sanitized version that strips sensitive patterns
  const origError = console.error;
  console.error = (...args) => {
    const sanitized = args.map(a => {
      if (typeof a === 'string') {
        // Strip JWT tokens, API keys, and passwords from error messages
        return a
          .replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, 'Bearer [REDACTED]')
          .replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[JWT_REDACTED]')
          .replace(/"(password|api_key|api_secret|auth_token|secret)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"');
      }
      if (a instanceof Error) return a.message; // Don't log full stack traces
      return '[object]';
    });
    origError.apply(console, sanitized);
  };
}

// ─── New ecosystem pages ─────────────────────────────────
import DriverLandingPage from './pages/DriverLandingPage.jsx'
import LandingEntryPage from './pages/LandingEntryPage.jsx'
import DriverHomePage from './pages/DriverHomePage.jsx'
import DriverMarketplacePage from './pages/DriverMarketplacePage.jsx'
import DriverDealerDirectoryPage from './pages/DriverDealerDirectoryPage.jsx'
import DriverLearnHubPage from './pages/DriverLearnHubPage.jsx'
import DealerPortalPage from './pages/DealerPortalPage.jsx'
import FinancerPage from './pages/FinancerPage.jsx'

// ─── PWA Auto-Update ────────────────────────────────────────────────────────
// Strategy: new SW waits → banner shown → user clicks OR idle 10s → skipWaiting → reload
// No silent auto-reload that breaks active form sessions.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      function applyUpdate(worker) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }

      function showUpdateBanner(worker) {
        if (document.getElementById('pwa-update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.style.cssText = [
          'position:fixed', 'top:16px', 'left:50%', 'transform:translateX(-50%) translateY(-80px)',
          'z-index:99999', 'background:#16a34a', 'color:#fff',
          'padding:12px 20px', 'border-radius:14px',
          'box-shadow:0 6px 28px rgba(0,0,0,0.35)',
          'display:flex', 'align-items:center', 'gap:12px',
          'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
          'font-size:14px', 'font-weight:600', 'white-space:nowrap',
          'max-width:calc(100vw - 32px)',
          'transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        ].join(';');

        let countdown = 10;
        banner.innerHTML = `
          <span>🔄 नया अपडेट ready — <span id="pwa-cd">${countdown}s</span> में auto-update</span>
          <button id="pwa-update-btn" style="background:#fff;color:#16a34a;border:none;padding:6px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">अभी Update करें</button>
          <button id="pwa-dismiss-btn" style="background:rgba(255,255,255,0.2);color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:13px;cursor:pointer;line-height:1;" title="Dismiss">✕</button>
        `;
        document.body.appendChild(banner);

        // Slide in after paint
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { banner.style.transform = 'translateX(-50%) translateY(0)'; });
        });

        // Countdown timer — apply update automatically after 10s
        const timer = setInterval(() => {
          countdown--;
          const cd = document.getElementById('pwa-cd');
          if (cd) cd.textContent = countdown + 's';
          if (countdown <= 0) {
            clearInterval(timer);
            applyUpdate(worker);
            banner.remove();
          }
        }, 1000);

        // Pause countdown on user interaction (typing, clicking inside forms)
        let paused = false;
        const pauseTimer = () => {
          if (paused) return;
          paused = true;
          clearInterval(timer);
          const cd = document.getElementById('pwa-cd');
          if (cd) cd.closest('span').textContent = 'अभी update करें या बाद में';
        };
        document.addEventListener('keydown', pauseTimer, { once: true });
        document.addEventListener('input', pauseTimer, { once: true });

        document.getElementById('pwa-update-btn').addEventListener('click', () => {
          clearInterval(timer);
          applyUpdate(worker);
          banner.remove();
        });
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
          clearInterval(timer);
          banner.style.transform = 'translateX(-50%) translateY(-80px)';
          setTimeout(() => banner.remove(), 350);
          // Re-show on next visibility (tab focus) so update isn't lost forever
          document.addEventListener('visibilitychange', function reshowOnFocus() {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', reshowOnFocus);
              setTimeout(() => showUpdateBanner(worker), 2000);
            }
          });
        });
      }

      // If a waiting SW already exists when page loads, show banner right away
      if (registration.waiting) {
        showUpdateBanner(registration.waiting);
      }

      // Listen for new SW finishing installation
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed and waiting — show banner (old SW still controls this page)
            showUpdateBanner(newWorker);
          }
        });
      });

      // When new SW takes control (after skipWaiting), reload once to get fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Poll for updates every 15 minutes + on every tab focus
      setInterval(() => registration.update().catch(() => {}), 15 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });

    } catch {
      // Keep startup resilient even if SW registration fails.
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <I18nProvider>
        <Routes>
          {/* Main homepage: driver-first with products + enquiry form */}
          <Route path="/"                    element={<DriverLandingPage />} />
          {/* Role selector: 3 ecosystem cards (for dealers/financers) */}
          <Route path="/welcome"             element={<LandingEntryPage />} />

          {/* Driver ecosystem — no login, Hindi default */}
          <Route path="/driver"              element={<DriverHomePage />} />
          <Route path="/driver/marketplace"  element={<DriverMarketplacePage />} />
          <Route path="/driver/dealers"      element={<DriverDealerDirectoryPage />} />
          <Route path="/driver/learn"        element={<DriverLearnHubPage />} />

          {/* Dealer ecosystem — login required, full SaaS portal */}
          <Route path="/dealer"              element={<DealerPortalPage />} />
          <Route path="/dealer/dashboard"    element={<DealerPortalPage />} />

          {/* Financer ecosystem — login required */}
          <Route path="/financer"            element={<FinancerPage />} />

          {/* Backward compatibility redirects */}
          <Route path="/home"        element={<Navigate to="/" replace />} />
          <Route path="/marketplace" element={<Navigate to="/driver/marketplace" replace />} />
          <Route path="/dealers"     element={<Navigate to="/driver/dealers" replace />} />
          <Route path="/learn"       element={<Navigate to="/driver/learn" replace />} />
          <Route path="/dashboard"   element={<Navigate to="/dealer" replace />} />
          <Route path="/login"       element={<Navigate to="/dealer" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </I18nProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
