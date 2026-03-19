import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { I18nProvider } from './i18n.jsx'

// ─── Per-route SEO meta tags ────────────────────────────────────
const ROUTE_META = {
  '/': {
    title: 'ErikshawDekho — भारत का सबसे भरोसेमंद ई-रिक्शा प्लेटफॉर्म',
    description: 'भारत का सबसे भरोसेमंद ई-रिक्शा प्लेटफॉर्म। Compare करें, verified dealers से best price पाएँ, EMI calculator, free enquiry — बिल्कुल मुफ्त।',
    og_title: 'ErikshawDekho — भारत का ई-रिक्शा प्लेटफॉर्म',
    canonical: 'https://www.erikshawdekho.com/',
  },
  '/driver': {
    title: 'ई-रिक्शा खरीदें | ErikshawDekho',
    description: 'Find the best e-rickshaw deals near you. Compare prices, EMI options, and verified dealers across India.',
    og_title: 'Buy E-Rickshaw in India | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/driver',
  },
  '/driver/marketplace': {
    title: 'E-Rickshaw Marketplace — New & Used eRickshaws | ErikshawDekho',
    description: 'Browse 500+ new and used e-rickshaws from verified dealers across India. Filter by fuel type, city, price. Free enquiry.',
    og_title: 'E-Rickshaw Marketplace India | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/driver/marketplace',
  },
  '/driver/dealers': {
    title: 'Verified E-Rickshaw Dealers Near You | ErikshawDekho',
    description: 'Find trusted, verified e-rickshaw and auto-rickshaw dealers in your city. Compare showrooms, read reviews, contact directly.',
    og_title: 'Verified E-Rickshaw Dealers India | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/driver/dealers',
  },
  '/driver/learn': {
    title: 'E-Rickshaw Buying Guide & Tips | ErikshawDekho',
    description: 'Learn everything about buying an e-rickshaw — battery, range, EMI, government subsidy, insurance, maintenance tips.',
    og_title: 'E-Rickshaw Buying Guide | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/driver/learn',
  },
  '/dealer': {
    title: 'Dealer Portal — Manage Your Showroom | ErikshawDekho',
    description: 'Manage your e-rickshaw inventory, leads, and sales with ErikshawDekho\'s dealer SaaS platform.',
    og_title: 'E-Rickshaw Dealer Portal | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/dealer',
  },
  '/financer': {
    title: 'Financer Portal — E-Rickshaw Finance | ErikshawDekho',
    description: 'Offer e-rickshaw loans, manage dealer associations, and track finance applications on ErikshawDekho.',
    og_title: 'E-Rickshaw Finance Portal | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/financer',
  },
  '/sitemap': {
    title: 'Site Map — All Pages | ErikshawDekho',
    description: 'Complete sitemap of ErikshawDekho — browse all pages: marketplace, dealers, buying guide, portals.',
    og_title: 'Sitemap | ErikshawDekho',
    canonical: 'https://www.erikshawdekho.com/sitemap',
  },
}

// JSON-LD per route
const ROUTE_JSONLD = {
  '/driver/marketplace': {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "E-Rickshaw Marketplace India",
    "description": "Browse new and used e-rickshaws from verified dealers across India",
    "url": "https://www.erikshawdekho.com/driver/marketplace",
    "numberOfItems": "500+",
    "itemListOrder": "https://schema.org/ItemListOrderDescending",
  },
  '/driver/dealers': {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Verified E-Rickshaw Dealers in India",
    "description": "Find trusted verified e-rickshaw and auto-rickshaw dealers across India",
    "url": "https://www.erikshawdekho.com/driver/dealers",
  },
  '/driver/learn': {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "name": "E-Rickshaw Buying Guide",
    "description": "Learn about e-rickshaw battery, range, EMI, government subsidies, and maintenance",
    "url": "https://www.erikshawdekho.com/driver/learn",
  },
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el) }
  el.href = href
}

function setJsonLd(data) {
  let el = document.getElementById('route-jsonld')
  if (!el) {
    el = document.createElement('script')
    el.id = 'route-jsonld'
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = data ? JSON.stringify(data) : ''
}

function RouteMeta() {
  const location = useLocation()
  useEffect(() => {
    const meta = ROUTE_META[location.pathname]
    if (meta) {
      document.title = meta.title
      setMeta('description', meta.description)
      setMeta('og:title', meta.og_title || meta.title)
      setMeta('og:description', meta.description)
      setMeta('og:url', meta.canonical)
      setMeta('twitter:title', meta.og_title || meta.title)
      setMeta('twitter:description', meta.description)
      if (meta.canonical) setCanonical(meta.canonical)
    }
    setJsonLd(ROUTE_JSONLD[location.pathname] || null)
  }, [location.pathname])
  return null
}

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
import SitemapPage from './pages/SitemapPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

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
        <RouteMeta />
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

          {/* HTML Sitemap */}
          <Route path="/sitemap" element={<SitemapPage />} />

          {/* Catch-all — proper 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </I18nProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
