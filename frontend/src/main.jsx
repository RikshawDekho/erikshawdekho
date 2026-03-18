import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { I18nProvider } from './i18n.jsx'

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

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Show "New version available" banner to the user
      function showUpdateBanner(worker) {
        // Avoid duplicate banners
        if (document.getElementById('pwa-update-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.style.cssText = [
          'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
          'z-index:9999', 'background:#16a34a', 'color:#fff',
          'padding:12px 20px', 'border-radius:12px', 'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
          'display:flex', 'align-items:center', 'gap:12px', 'font-family:inherit',
          'font-size:14px', 'font-weight:600', 'white-space:nowrap',
          'max-width:calc(100vw - 32px)',
        ].join(';');
        banner.innerHTML = `
          <span>🔄 नया अपडेट available है</span>
          <button id="pwa-update-btn" style="background:#fff;color:#16a34a;border:none;padding:6px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">Update करें</button>
          <button id="pwa-dismiss-btn" style="background:rgba(255,255,255,0.2);color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:13px;cursor:pointer;">✕</button>
        `;
        document.body.appendChild(banner);
        document.getElementById('pwa-update-btn').addEventListener('click', () => {
          worker.postMessage({ type: 'SKIP_WAITING' });
          banner.remove();
        });
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => banner.remove());
      }

      // If a new SW is already waiting (page was open when update came in), show banner immediately
      if (registration.waiting) {
        showUpdateBanner(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });

      // When new SW takes control, reload to get fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Check for updates every 30 minutes (also on visibility change)
      window.setInterval(() => { registration.update().catch(() => {}); }, 30 * 60 * 1000);
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
  </React.StrictMode>
)
