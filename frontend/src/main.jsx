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
import LandingPage from './pages/LandingPage.jsx'
import DriverHomePage from './pages/DriverHomePage.jsx'
import DriverMarketplacePage from './pages/DriverMarketplacePage.jsx'
import DriverDealerDirectoryPage from './pages/DriverDealerDirectoryPage.jsx'
import DealerPortalPage from './pages/DealerPortalPage.jsx'
import FinancerPage from './pages/FinancerPage.jsx'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <Routes>
          {/* Landing: branded entry with 3 ecosystem cards */}
          <Route path="/"                    element={<LandingPage />} />

          {/* Driver ecosystem — no login, Hindi default */}
          <Route path="/driver"              element={<DriverHomePage />} />
          <Route path="/driver/marketplace"  element={<DriverMarketplacePage />} />
          <Route path="/driver/dealers"      element={<DriverDealerDirectoryPage />} />

          {/* Dealer ecosystem — login required, full SaaS portal */}
          <Route path="/dealer"              element={<DealerPortalPage />} />
          <Route path="/dealer/dashboard"    element={<DealerPortalPage />} />

          {/* Financer ecosystem — login required */}
          <Route path="/financer"            element={<FinancerPage />} />

          {/* Backward compatibility redirects */}
          <Route path="/home"        element={<Navigate to="/driver" replace />} />
          <Route path="/marketplace" element={<Navigate to="/driver/marketplace" replace />} />
          <Route path="/dealers"     element={<Navigate to="/driver/dealers" replace />} />
          <Route path="/dashboard"   element={<Navigate to="/dealer" replace />} />
          <Route path="/login"       element={<Navigate to="/dealer" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
)
