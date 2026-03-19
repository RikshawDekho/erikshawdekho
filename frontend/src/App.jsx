import React, { Component, useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from "react-router-dom";
import { SalesPage } from './SalesPage';
import NavbarNew from './components/NavbarNew';
import FooterNew from './components/FooterNew';
import { LIGHT_C, DARK_C, ThemeCtx, useC } from './theme';
import { BRANDING, buildWhatsAppLink } from './branding';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── i18n setup ──────────────────────────────────────────
const i18nResources = {
  en: { translation: {
    "nav.dashboard": "Dashboard", "nav.inventory": "Inventory", "nav.leads": "Leads",
    "nav.sales": "Sales", "nav.customers": "Customers", "nav.finance": "Finance",
    "nav.reports": "Reports", "nav.learn": "Learn", "nav.marketplace": "Marketplace",
    "nav.plans": "Plans", "nav.support": "Support", "nav.account": "My Account",
    "nav.logout": "Logout", "nav.home": "Home", "nav.stock": "Stock",
    "common.search": "Search", "common.add": "Add", "common.save": "Save",
    "common.cancel": "Cancel", "common.close": "Close", "common.loading": "Loading...",
    "dealer.portal": "Dealer Portal", "dealer.verified": "Verified", "dealer.pending": "Pending Verification",
  }},
  hi: { translation: {
    "nav.dashboard": "डैशबोर्ड", "nav.inventory": "इन्वेंटरी", "nav.leads": "लीड्स",
    "nav.sales": "बिक्री", "nav.customers": "ग्राहक", "nav.finance": "फाइनेंस",
    "nav.reports": "रिपोर्ट", "nav.learn": "सीखें", "nav.marketplace": "मार्केटप्लेस",
    "nav.plans": "प्लान्स", "nav.support": "सहायता", "nav.account": "मेरा खाता",
    "nav.logout": "लॉगआउट", "nav.home": "होम", "nav.stock": "स्टॉक",
    "common.search": "खोजें", "common.add": "जोड़ें", "common.save": "सहेजें",
    "common.cancel": "रद्द करें", "common.close": "बंद करें", "common.loading": "लोड हो रहा है...",
    "dealer.portal": "डीलर पोर्टल", "dealer.verified": "सत्यापित", "dealer.pending": "सत्यापन लंबित",
  }},
};
i18n.use(initReactI18next).init({
  resources: i18nResources,
  lng: localStorage.getItem("erd_lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// ── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const errMsg = String(this.state.error);
      const isChunkError = /loading chunk|dynamically imported module|failed to fetch/i.test(errMsg);
      if (isChunkError) {
        return (
          <div style={{ fontFamily: "'Inter','Nunito',sans-serif", minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🛺</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", marginBottom: 8 }}>Updating {BRANDING.platformName}...</h2>
            <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>A new version is being deployed. The page will reload automatically.</p>
            <button onClick={() => { if ("caches" in window) caches.keys().then(n => n.forEach(k => caches.delete(k))); window.location.reload(); }}
              style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              🔄 Retry Now
            </button>
          </div>
        );
      }
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, background: "#f5f5f5", fontFamily: "monospace", color: "#333" }}>
          <div style={{ maxWidth: 600, background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: 24 }}>
            <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12, color: "#d32f2f" }}>⚠️ Something Went Wrong</div>
            <div style={{ fontSize: 12, marginBottom: 16, color: "#666", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
              {errMsg}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", background: "#1e88e5", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
                🔄 Reload Page
              </button>
              <button onClick={() => { if ("caches" in window) caches.keys().then(n => n.forEach(k => caches.delete(k))); window.location.reload(); }}
                style={{ padding: "10px 20px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
                Hard Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Debounce hook: delays rapid input (e.g. search) by `delay` ms ──
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Swipe navigation hook ──────────────────────────────────────────
// Returns ref to attach to swipeable element + swipe direction signal
function useSwipeNav(onSwipeLeft, onSwipeRight, threshold = 60) {
  const touchStart = useRef(null);
  const touchStartY = useRef(null);
  const onTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only trigger if horizontal movement is dominant (not a scroll)
    if (Math.abs(dx) > threshold && Math.abs(dx) > dy * 1.5) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
    touchStart.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);
  return { onTouchStart, onTouchEnd };
}

// ═══════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════
const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");

async function apiFetch(path, opts = {}, _retry = false) {
  const token = localStorage.getItem("erd_access");
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  if (res.status === 401 && !_retry) {
    const refresh = localStorage.getItem("erd_refresh");
    if (refresh) {
      try {
        const r = await fetch(`${API}/auth/token/refresh/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (r.ok) {
          const d = await r.json();
          localStorage.setItem("erd_access", d.access);
          return apiFetch(path, opts, true);
        }
      } catch (_) { /* fall through to logout */ }
    }
    // Auth endpoints (login, register, google) return 401 for wrong credentials —
    // don't treat that as a session expiry. Only auto-logout for protected API calls.
    if (!path.startsWith('/auth/')) {
      localStorage.clear();
      window.location.reload();
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { ...body, _status: res.status };
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  login:    (d) => apiFetch("/auth/login/", { method: "POST", body: JSON.stringify(d) }),
  register: (d) => apiFetch("/auth/register/", { method: "POST", body: JSON.stringify(d) }),
  me:       ()  => apiFetch("/auth/me/"),
  dashboard:()  => apiFetch("/dashboard/"),
  marketplace:(p="") => apiFetch(`/marketplace/${p}`),

  vehicles: {
    list:   (p="") => apiFetch(`/vehicles/${p}`),
    get:    (id)   => apiFetch(`/vehicles/${id}/`),
    create: (d)    => apiFetch("/vehicles/", { method: "POST", body: d instanceof FormData ? d : JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/vehicles/${id}/`, { method: "PATCH", body: d instanceof FormData ? d : JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/vehicles/${id}/`, { method: "DELETE" }),
  },
  leads: {
    list:   (p="") => apiFetch(`/leads/${p}`),
    create: (d)    => apiFetch("/leads/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/leads/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/leads/${id}/`, { method: "DELETE" }),
  },
  sales: {
    list:    (p="") => apiFetch(`/sales/${p}`),
    create:  (d)    => apiFetch("/sales/", { method: "POST", body: JSON.stringify(d) }),
    invoice: (id)   => apiFetch(`/sales/${id}/invoice/`),
  },
  customers: {
    list:   (p="") => apiFetch(`/customers/${p}`),
    create: (d)    => apiFetch("/customers/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/customers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  },
  tasks: {
    list:   (p="") => apiFetch(`/tasks/${p}`),
    create: (d)    => apiFetch("/tasks/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/tasks/${id}/`, { method: "DELETE" }),
  },
  finance: {
    loans:      (p="") => apiFetch(`/finance/loans/${p}`),
    create:     (d)    => apiFetch("/finance/loans/", { method: "POST", body: JSON.stringify(d) }),
    emi:        (d)    => apiFetch("/finance/emi-calculator/", { method: "POST", body: JSON.stringify(d) }),
    updateLoan: (id,d) => apiFetch(`/finance/loans/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  },
  reports:  (p="") => apiFetch(`/reports/${p}`),
  brands:      ()     => apiFetch("/brands/"),
  vehicleTypes: ()    => fetch("/api/vehicle-types/").then(r => r.json()),
  videos: {
    list:   (p="") => apiFetch(`/videos/${p}`),
    create: (d)    => apiFetch("/videos/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/videos/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/videos/${id}/`, { method: "DELETE" }),
  },
  blogs: {
    list:   (p="") => apiFetch(`/blogs/${p}`),
    create: (d)    => apiFetch("/blogs/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/blogs/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/blogs/${id}/`, { method: "DELETE" }),
  },
  notifications: {
    getPrefs:    ()  => apiFetch("/notifications/preferences/"),
    updatePrefs: (d) => apiFetch("/notifications/preferences/", { method: "PATCH", body: JSON.stringify(d) }),
    updateFcm:   (d) => apiFetch("/notifications/fcm-token/", { method: "PATCH", body: JSON.stringify(d) }),
  },
  profile: {
    update: (d) => apiFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(d) }),
  },
  enquiry: (d) => apiFetch("/public/enquiry/", { method: "POST", body: JSON.stringify(d) }),
  enquiries: {
    list:          (p="") => apiFetch(`/dealer/enquiries/${p}`),
    markProcessed: (id)   => apiFetch("/dealer/enquiries/", { method: "PATCH", body: JSON.stringify({ id, is_processed: true }) }),
    unreadCount:   ()     => apiFetch("/dealer/enquiries/unread/"),
  },
  admin: {
    stats:              ()         => apiFetch("/admin-portal/stats/"),
    users:              (p="")     => apiFetch(`/admin-portal/users/${p}`),
    deleteUser:         (id)       => apiFetch(`/admin-portal/users/${id}/`, { method: "DELETE" }),
    dealers:            (p="")     => apiFetch(`/admin-portal/dealers/${p}`),
    verifyDealer:       (id,d)     => apiFetch(`/admin-portal/dealers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    resetDealerPassword:(id,d)     => apiFetch(`/admin-portal/dealers/${id}/reset-password/`, { method: "POST", body: JSON.stringify(d) }),
    applications:       (p="")     => apiFetch(`/admin-portal/applications/${p}`),
    updateApp:          (id,d)     => apiFetch(`/admin-portal/applications/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    enquiries:          (p="")     => apiFetch(`/admin-portal/enquiries/${p}`),
    toggleUserActive:   (id)       => apiFetch(`/admin-portal/users/${id}/toggle-active/`, { method: "PATCH" }),
    createUser:         (d)        => apiFetch("/admin-portal/create-user/", { method: "POST", body: JSON.stringify(d) }),
    updateSettings:     (d)        => apiFetch("/admin-portal/settings/", { method: "PATCH", body: JSON.stringify(d) }),
    financers:              (p="")     => apiFetch(`/admin-portal/financers/${p}`),
    verifyFinancer:         (id,d)     => apiFetch(`/admin-portal/financers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    resetFinancerPassword:  (id,d)     => apiFetch(`/admin-portal/financers/${id}/reset-password/`, { method: "POST", body: JSON.stringify(d) }),
    manageFinancer:         (id,d)     => apiFetch(`/admin-portal/financers/${id}/manage/`, { method: "POST", body: JSON.stringify(d) }),
    manageDealer:           (id,d)     => apiFetch(`/admin-portal/dealers/${id}/manage/`, { method: "POST", body: JSON.stringify(d) }),
    leadsAnalytics:         (p="")     => apiFetch(`/admin-portal/leads-analytics/${p}`),
    financeApps:            (p="")     => apiFetch(`/admin-portal/finance-applications/${p}`),
    financerDocs:           (id)       => apiFetch(`/admin-portal/financers/${id}/documents/`),
    reviewFinancerDoc:      (id,did,d) => apiFetch(`/admin-portal/financers/${id}/documents/${did}/`, { method: "PATCH", body: JSON.stringify(d) }),
  },
  auth: {
    forgotPassword:    (d) => apiFetch("/auth/forgot-password/",       { method: "POST", body: JSON.stringify(d) }),
    resetPassword:     (d) => apiFetch("/auth/reset-password/",        { method: "POST", body: JSON.stringify(d) }),
    resetPasswordPhone:(d) => apiFetch("/auth/reset-password-phone/",  { method: "POST", body: JSON.stringify(d) }),
    google:            (d) => apiFetch("/auth/google/",                { method: "POST", body: JSON.stringify(d) }),
  },
  dealer: {
    plans:           ()       => apiFetch("/plans/"),
    upgradePlan:     (d)      => apiFetch("/dealer/upgrade-plan/", { method: "POST", body: JSON.stringify(d) }),
    apiKeys:         ()       => apiFetch("/dealer/api-keys/"),
    saveApiKey:      (d)      => apiFetch("/dealer/api-keys/", { method: "POST", body: JSON.stringify(d) }),
    deleteApiKey:    (id)     => apiFetch(`/dealer/api-keys/${id}/`, { method: "DELETE" }),
    financers:       ()       => apiFetch("/dealer/financers/"),
    applyFinancer:   (id)     => apiFetch(`/dealer/financers/${id}/apply/`, { method: "POST" }),
    financerReqs:    (id)     => apiFetch(`/dealer/financers/${id}/requirements/`),
    finApps:         ()       => apiFetch("/dealer/finance-applications/"),
    createFinApp:    (d)      => apiFetch("/dealer/finance-applications/", { method: "POST", body: JSON.stringify(d) }),
    finAppDocs:      (id)     => apiFetch(`/dealer/finance-applications/${id}/documents/`),
    uploadFinAppDoc: (id,d)   => apiFetch(`/dealer/finance-applications/${id}/documents/`, { method: "POST", body: d }),
    finAppRemarks:   (id)     => apiFetch(`/dealer/finance-applications/${id}/remarks/`),
    postFinAppRemark:(id,d)   => apiFetch(`/dealer/finance-applications/${id}/remarks/`, { method: "POST", body: JSON.stringify(d) }),
    freeTierUsage:   ()       => apiFetch("/dealer/free-tier-usage/"),
  },
  financer: {
    profile:        ()       => apiFetch("/financer/profile/"),
    updateProfile:  (d)      => apiFetch("/financer/profile/", { method: "PATCH", body: JSON.stringify(d) }),
    documents:      ()       => apiFetch("/financer/documents/"),
    uploadDoc:      (d)      => apiFetch("/financer/documents/", { method: "POST", body: d }),
    dealers:        (p="")   => apiFetch(`/financer/dealers/${p}`),
    approveDealer:  (id,d)   => apiFetch(`/financer/dealers/${id}/approve/`, { method: "POST", body: JSON.stringify(d) }),
    requiredDocs:   ()       => apiFetch("/financer/required-documents/"),
    addRequiredDoc: (d)      => apiFetch("/financer/required-documents/", { method: "POST", body: JSON.stringify(d) }),
    deleteRequiredDoc:(id)   => apiFetch(`/financer/required-documents/${id}/`, { method: "DELETE" }),
    applications:   (p="")   => apiFetch(`/financer/applications/${p}`),
    updateAppStatus:(id,d)   => apiFetch(`/financer/applications/${id}/update-status/`, { method: "PATCH", body: JSON.stringify(d) }),
    plans:          ()       => apiFetch("/financer/plans/"),
    subscription:   ()       => apiFetch("/financer/subscription/"),
  },
  dealers: {
    detail:  (id) => apiFetch(`/dealers/${id}/`),
    reviews: (id) => apiFetch(`/dealers/${id}/reviews/`),
    review:  (id, d) => apiFetch(`/dealers/${id}/reviews/`, { method: "POST", body: JSON.stringify(d) }),
  },
};

// ═══════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════
const AuthCtx = createContext(null);

// ═══════════════════════════════════════════════════════
// TOAST CONTEXT
// ═══════════════════════════════════════════════════════
const ToastCtx = createContext(() => {});
function useToast() { return useContext(ToastCtx); }

function ToastProvider({ children }) {
  const C = useC();
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  const ICONS = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  const COLORS = { success: C.success, error: C.danger, warning: C.warning, info: C.info };
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: COLORS[t.type] || C.info, color: "#fff",
            padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "flex-start", gap: 8,
            animation: "slideDown 0.25s ease", pointerEvents: "auto",
          }}>
            <span style={{ flexShrink: 0, fontSize: 15 }}>{ICONS[t.type]}</span>
            <span style={{ lineHeight: 1.5, flex: 1 }}>{t.msg}</span>
            <button onClick={() => dismiss(t.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 16, cursor: "pointer", padding: "0 0 0 4px", lineHeight: 1, flexShrink: 0, fontFamily: "inherit" }} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════
// PLAN CONTEXT
// ═══════════════════════════════════════════════════════
const PlanCtx = createContext(null);
function usePlan() { return useContext(PlanCtx); }

function PlanGate({ children, feature = "This feature", onUpgrade, plan: planProp }) {
  const C = useC();
  const ctxPlan = usePlan();
  const plan = planProp ?? ctxPlan;
  if (!plan || plan.is_active) return children;
  return (
    <div style={{ position: "relative", minHeight: 200 }}>
      <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)", borderRadius: 12 }}>
        <div style={{ textAlign: "center", padding: 28, maxWidth: 320 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>{feature} — Plan Expired</div>
          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, marginBottom: 18 }}>
            Your free trial has ended. Upgrade to the Pro plan to continue using this feature.
          </div>
          <Btn label="⭐ View Plans & Upgrade" color={C.primary} onClick={onUpgrade} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS (module-level fallback = light theme)
// ═══════════════════════════════════════════════════════
const C = LIGHT_C;  // fallback for module-level constants; components call useC() for live value

const STOCK_COLOR = { in_stock: C.success, low_stock: C.warning, out_of_stock: C.danger };
const LEAD_COLOR  = { new:"#6366f1", interested:C.info, follow_up:C.warning, converted:C.success, lost:C.danger };
const FUEL_COLOR  = { electric:C.success, petrol:"#f97316", cng:"#06b6d4", lpg:"#8b5cf6", diesel:"#64748b" };

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════
function Badge({ label, color }) {
  const C = useC();
  const col = color ?? C.primary;
  return (
    <span style={{ background: `${col}18`, color: col, border: `1px solid ${col}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Btn({ label, onClick, color, outline, size = "md", icon, disabled, fullWidth, type = "button" }) {
  const C = useC();
  const col = color ?? C.primary;
  const pad = size === "sm" ? "5px 12px" : size === "lg" ? "12px 28px" : "8px 18px";
  const fs  = size === "sm" ? 12 : size === "lg" ? 15 : 13;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: outline ? "transparent" : disabled ? C.border : col,
      border: `2px solid ${disabled ? C.border : col}`,
      color: outline ? col : disabled ? C.textDim : "#fff",
      padding: pad, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: fs, fontWeight: 600, fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
      width: fullWidth ? "100%" : "auto", justifyContent: "center",
      transition: "all 0.15s",
    }}>
      {icon && <span>{icon}</span>}{label}
    </button>
  );
}

function Card({ children, style = {}, padding = 20 }) {
  const C = useC();
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  const C = useC();
  const col = color ?? C.primary;
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: col, fontFamily: "Georgia, serif" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${col}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
      </div>
    </Card>
  );
}

function Table({ cols, rows, onRow }) {
  const C = useC();
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {cols.map(c => (
              <th key={c.key || c.label} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                {c.label.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No data found</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRow?.(row)} style={{ borderBottom: `1px solid ${C.border}`, cursor: onRow ? "pointer" : "default", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "inherit"}>
              {cols.map(c => (
                <td key={c.key || c.label} style={{ padding: "12px 14px", color: C.text, verticalAlign: "middle" }}>
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, children, onClose, width = 560 }) {
  const C = useC();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{ background: C.surface, borderRadius: 14, width, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textDim, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required, style = {} }) {
  const C = useC();
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", required, style = {} }) {
  const C = useC();
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = C.primary}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, required, style = {} }) {
  const C = useC();
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} required={required}
      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface, outline: "none", ...style }}
      onFocus={e => e.target.style.borderColor = C.primary}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function Select({ value, onChange, options, placeholder, style = {} }) {
  const C = useC();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "9px 32px 9px 12px", border: `1.5px solid ${open ? C.primary : C.border}`,
        borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: selected ? C.text : C.textDim,
        background: C.surface, outline: "none", cursor: "pointer", textAlign: "left",
        boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "border-color 0.15s",
      }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : (placeholder || "Select...")}
        </span>
        <span style={{ fontSize: 10, color: C.textDim, marginLeft: 6, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: C.surface, border: `1.5px solid ${C.primary}`, borderRadius: 8,
          zIndex: 9000, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", overflow: "hidden",
          maxHeight: 260, overflowY: "auto",
        }}>
          {placeholder && (
            <div onClick={() => { onChange(""); setOpen(false); }} style={{
              padding: "10px 14px", fontSize: 13, color: C.textDim, cursor: "pointer",
              borderBottom: `1px solid ${C.border}`,
            }}>{placeholder}</div>
          )}
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} style={{
              padding: "10px 14px", fontSize: 13, cursor: "pointer",
              color: String(o.value) === String(value) ? C.primary : C.text,
              background: String(o.value) === String(value) ? `${C.primary}12` : "transparent",
              borderBottom: `1px solid ${C.border}20`,
              fontWeight: String(o.value) === String(value) ? 700 : 400,
              transition: "background 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.primary}18`}
              onMouseLeave={e => e.currentTarget.style.background = String(o.value) === String(value) ? `${C.primary}12` : "transparent"}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  const C = useC();
  return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `4px solid ${C.border}`, borderTop: `4px solid ${C.primary}`, animation: "spin 0.8s linear infinite" }}/>
  </div>;
}

function ScreenSaver({ onWake }) {
  return (
    <div onClick={onWake} onKeyDown={onWake} tabIndex={0}
      style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", cursor: "pointer" }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>🛺</div>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, opacity: 0.8 }}>{BRANDING.platformName}</div>
      <div style={{ color: "#fff", fontSize: 13, opacity: 0.5, marginTop: 8 }}>Click anywhere to wake</div>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.1);opacity:1} }`}</style>
    </div>
  );
}

function DateFilter({ from, to, onChange }) {
  const C = useC();
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const presets = [
    { label: 'Today',      f: fmt(today), t: fmt(today) },
    { label: 'This Week',  f: fmt(new Date(today - 6*86400000)), t: fmt(today) },
    { label: 'This Month', f: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), t: fmt(today) },
    { label: 'This Year',  f: fmt(new Date(today.getFullYear(), 0, 1)), t: fmt(today) },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {presets.map(p => {
        const active = from === p.f && to === p.t;
        return (
          <button key={p.label} onClick={() => onChange(p.f, p.t)}
            style={{ padding: '4px 10px', borderRadius: 14, border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary : C.surface, color: active ? '#fff' : C.textMid, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
            {p.label}
          </button>
        );
      })}
      <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
        style={{ padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: C.surface, color: C.text, colorScheme: 'inherit' }} />
      <span style={{ fontSize: 11, color: C.textDim }}>–</span>
      <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
        style={{ padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: C.surface, color: C.text, colorScheme: 'inherit' }} />
      {(from || to) && (
        <button onClick={() => onChange('', '')}
          style={{ padding: '4px 8px', borderRadius: 14, border: `1.5px solid ${C.danger}40`, background: `${C.danger}10`, color: C.danger, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
          ✕ Clear
        </button>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  const C = useC();
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: page <= 1 ? "not-allowed" : "pointer", color: page <= 1 ? C.textDim : C.text }}>‹</button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPage(p)} style={{ width: 34, height: 34, border: `1px solid ${p === page ? C.primary : C.border}`, borderRadius: 6, background: p === page ? C.primary : C.surface, color: p === page ? "#fff" : C.text, cursor: "pointer", fontWeight: p === page ? 700 : 400 }}>{p}</button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: page >= totalPages ? "not-allowed" : "pointer", color: page >= totalPages ? C.textDim : C.text }}>›</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MINI CHART
// ═══════════════════════════════════════════════════════
function BarChart({ data, height = 120 }) {
  const C = useC();
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.revenue || 0)) || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: `linear-gradient(180deg,${C.accent},${C.primary})`, borderRadius: "4px 4px 0 0", height: `${(d.revenue / max) * (height - 24)}px`, minHeight: 4, transition: "height 0.3s" }}/>
          <div style={{ fontSize: 9, color: C.textDim, whiteSpace: "nowrap" }}>{d.date?.split(" ")[1]}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, size = 100 }) {
  const C = useC();
  const total = Object.values(data || {}).reduce((a, b) => a + b, 0) || 1;
  const colors = { electric: C.success, petrol: "#f97316", cng: "#06b6d4", lpg: "#8b5cf6", diesel: "#64748b" };
  const entries = Object.entries(data || {});
  let offset = 0;
  const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14}/>
      {entries.map(([key, val], i) => {
        const pct = val / total;
        const dash = pct * circumference;
        const off = offset;
        offset += pct;
        return (
          <circle key={key} cx={cx} cy={cy} r={r} fill="none"
            stroke={colors[key] || "#94a3b8"} strokeWidth={14}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-off * circumference}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}/>
        );
      })}
      <text x={50} y={46} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: C.text }}>Total</text>
      <text x={50} y={60} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: C.primary }}>{total}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// AUTH PAGES
// ═══════════════════════════════════════════════════════
function AuthPage({ onAuth }) {
  const C = useC();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(() => searchParams.get("tab") === "register" ? "register" : "login"); // "login" | "register" | "forgot" | "otp"
  const [form, setForm] = useState({ username: "", password: "", confirm_password: "", email: "", dealer_name: "", phone: "", city: "", state: "", pincode: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [loginHint, setLoginHint] = useState(null); // null | "wrong_password" | "no_account" | "duplicate_email" | "rate_limited"
  const [shake, setShake] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pincodeData, setPincodeData] = useState(null); // { city, state, suggestions: [] }
  const [pincodeLoading, setPincodeLoading] = useState(false);
  // Forgot password state
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpConfirmPass, setFpConfirmPass] = useState("");
  const [fpStatus, setFpStatus] = useState(null); // null | "sent" | "done"
  const [fpError, setFpError] = useState("");
  const [fpMethod, setFpMethod] = useState("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [firebaseOtp, setFirebaseOtp] = useState("");

  const MAJOR_CITIES = [
    "Agra","Ahmedabad","Allahabad","Amritsar","Bengaluru","Bhopal","Chandigarh",
    "Chennai","Delhi","Faridabad","Ghaziabad","Guwahati","Hyderabad","Indore",
    "Jaipur","Jodhpur","Kanpur","Kochi","Kolkata","Lucknow","Ludhiana",
    "Meerut","Mumbai","Nagpur","Noida","Patna","Pune","Raipur","Ranchi",
    "Surat","Varanasi","Visakhapatnam","Others",
  ];

  const set = (k) => (v) => {
    setForm(p => ({ ...p, [k]: v }));
    // Clear only the field-specific error, not the auth status banner —
    // the banner should stay visible until user re-submits (Google pattern)
    setFieldErrors(p => ({ ...p, [k]: "" }));
  };

  const lookupPincode = async (pin) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    setPincodeLoading(true);
    setPincodeData(null);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
        const offices = data[0].PostOffice;
        const city  = offices[0].District;
        const state = offices[0].State;
        const suggestions = [...new Set(offices.map(o => o.District))].slice(0, 5);
        setPincodeData({ city, state, suggestions });
        // Auto-fill city if it matches a known major city or just use the district
        const matched = MAJOR_CITIES.find(c => c.toLowerCase() === city.toLowerCase()) || city;
        setForm(p => ({ ...p, city: matched }));
        setFieldErrors(p => ({ ...p, city: "", pincode: "" }));
      } else {
        setPincodeData(null);
        setFieldErrors(p => ({ ...p, pincode: "Pincode not found. Please enter city manually." }));
      }
    } catch {
      setFieldErrors(p => ({ ...p, pincode: "Could not verify pincode. Please enter city manually." }));
    }
    setPincodeLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setAuthStatus(null);
    setLoginHint(null);
    setFieldErrors({});
    try {
      const data = await api.auth.google({ credential: credentialResponse.credential });
      if (data.new_user) {
        // New user — pre-fill register form and switch to register tab
        setMode("register");
        setForm(p => ({ ...p, email: data.email || "", dealer_name: data.name || "" }));
        toast("Google account verified! Please complete your dealer registration.", "success");
        return;
      }
      // Existing user — complete login
      localStorage.setItem("erd_access", data.access);
      if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
      setAuthStatus("success");
      const name = data.user?.dealer_name || data.user?.username || data.user?.email || "";
      toast(`Welcome back, ${name}! Signing you in...`, "success");
      setTimeout(() => onAuth(data), 800);
    } catch (err) {
      setAuthStatus("error");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      const errObj = typeof err === "object" ? err : {};
      const msg = errObj.error || errObj.detail || "Google sign-in failed. Please try again.";
      setFieldErrors({ _banner: msg });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setFieldErrors({ _banner: "Google sign-in was cancelled or failed. Please try again." });
    setAuthStatus("error");
  };

  const validate = () => {
    const errs = {};
    // For login: username is required. For register: email is the identifier.
    if (mode === "login" && !form.username.trim()) errs.username = "Email or username is required";
    // Password
    if (!form.password) errs.password = "Password is required";
    else if (mode === "register" && form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    else if (mode === "register" && !/\d/.test(form.password))
      errs.password = "Password must contain at least one number";
    // Register-only fields
    if (mode === "register") {
      if (!form.dealer_name.trim()) errs.dealer_name = "Dealership name is required";
      else if (form.dealer_name.trim().length < 3) errs.dealer_name = "Dealership name is too short";
      if (!form.phone.trim()) errs.phone = "Mobile number is required";
      else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10)))
        errs.phone = "Enter a valid 10-digit Indian mobile number (starts with 6–9)";
      if (!form.email.trim()) errs.email = "Email address is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";
      if (form.confirm_password && form.password !== form.confirm_password)
        errs.confirm_password = "Passwords do not match";
      if (!form.city.trim()) errs.city = "City is required";
      if (form.pincode && !/^\d{6}$/.test(form.pincode)) errs.pincode = "Enter a valid 6-digit pincode";
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setAuthStatus(null);
    setLoginHint(null);
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      toast("Please fix the errors below before continuing.", "warning");
      return;
    }
    setLoading(true);
    try {
      const data = mode === "login"
        ? await api.login({ username: form.username, password: form.password })
        : await api.register({ email: form.email, password: form.password, dealer_name: form.dealer_name, phone: form.phone, city: form.city, state: form.state || pincodeData?.state || "", pincode: form.pincode });
      localStorage.setItem("erd_access", data.access);
      if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
      setAuthStatus("success");
      const name = data.user?.dealer_name || data.user?.username || form.username;
      toast(mode === "login" ? `Welcome back, ${name}! Signing you in...` : `Account created! Welcome to ${BRANDING.platformName}, ${name}!`, "success");
      setTimeout(() => onAuth(data), 800);
    } catch (err) {
      setAuthStatus("error");
      // Shake the card to signal error (Google-style)
      setShake(true);
      setTimeout(() => setShake(false), 500);
      const errObj = typeof err === "object" ? err : {};
      // Extract clean message (exclude boolean fields like account_exists)
      const serverMsg = errObj.error || errObj.detail || errObj.non_field_errors?.[0]
        || Object.values(errObj).filter(v => typeof v === "string").flat().join(" ")
        || "Something went wrong. Please try again.";
      // Determine contextual hint
      if (errObj._status === 429) {
        setLoginHint("rate_limited");
      } else if (mode === "login") {
        if (errObj.account_exists === false) setLoginHint("no_account");
        else if (errObj.account_exists === true) setLoginHint("wrong_password");
      } else {
        const emailErr = Array.isArray(errObj.email) ? errObj.email[0] : errObj.email;
        if (emailErr && /already/i.test(emailErr)) setLoginHint("duplicate_email");
      }
      // Set inline field errors — no toast for auth failures (inline is cleaner)
      const inlineErrs = { _banner: serverMsg };
      Object.keys(errObj).filter(k => !["error","detail","non_field_errors","account_exists"].includes(k)).forEach(k => {
        inlineErrs[k] = Array.isArray(errObj[k]) ? errObj[k][0] : (typeof errObj[k] === "string" ? errObj[k] : "");
      });
      setFieldErrors(inlineErrs);
    }
    setLoading(false);
  };

  const FieldErr = ({ k }) => fieldErrors[k]
    ? <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors[k]}</div>
    : null;

  const submitForgotRequest = async (e) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setFpError("Email address is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) { setFpError("Enter a valid email address."); return; }
    setFpError(""); setLoading(true);
    try {
      await api.auth.forgotPassword({ email: fpEmail });
      setFpStatus("sent");
      toast("OTP sent! Check your email.", "success");
    } catch { setFpError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const submitForgotConfirm = async (e) => {
    e.preventDefault();
    if (!fpOtp.trim() || fpOtp.length !== 6) { setFpError("Enter the 6-digit OTP from your email."); return; }
    if (!fpNewPass.trim() || fpNewPass.length < 8) { setFpError("Password must be at least 8 characters."); return; }
    if (!/\d/.test(fpNewPass)) { setFpError("Password must contain at least one number."); return; }
    if (fpNewPass !== fpConfirmPass) { setFpError("Passwords do not match."); return; }
    setFpError(""); setLoading(true);
    try {
      await api.auth.resetPassword({ email: fpEmail, otp: fpOtp, new_password: fpNewPass });
      setFpStatus("done");
      toast("Password reset! Please sign in.", "success");
      setTimeout(() => { setMode("login"); setFpStatus(null); setFpEmail(""); setFpOtp(""); setFpNewPass(""); setFpConfirmPass(""); }, 2000);
    } catch (err) {
      const msg = typeof err === "object" ? (err.error || Object.values(err).flat().join(" ")) : "Failed to reset password.";
      setFpError(msg);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Support info bar — above sticky navbar */}
      {(BRANDING.support.phone || BRANDING.support.email || BRANDING.support.whatsappDigits) && (
        <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "5px 16px", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
          <style>{`
            .auth-support-item { display:inline-flex;align-items:center;gap:4px;color:#15803d;text-decoration:none;font-weight:600;font-size:12px;padding:0 10px;white-space:nowrap; }
            .auth-support-item:hover { color:#14532d; }
            .auth-support-sep { color:#bbf7d0;font-size:14px;font-weight:300;flex-shrink:0; }
            .auth-support-label { display:inline; }
            @media(max-width:480px) { .auth-support-label { display:none; } .auth-support-item { padding:0 8px;font-size:14px; } }
          `}</style>
          {BRANDING.support.phone && (
            <a href={`tel:${BRANDING.support.phone}`} className="auth-support-item">
              📞 <span className="auth-support-label">{BRANDING.support.phone}</span>
            </a>
          )}
          {BRANDING.support.phone && <span className="auth-support-sep">|</span>}
          <a href={`mailto:${BRANDING.support.email}`} className="auth-support-item">
            ✉ <span className="auth-support-label">{BRANDING.support.email}</span>
          </a>
          {BRANDING.support.whatsappDigits && (<>
            <span className="auth-support-sep">|</span>
            <a href={`https://wa.me/${BRANDING.support.whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="auth-support-item">
              💬 <span className="auth-support-label">WhatsApp</span>
            </a>
          </>)}
        </div>
      )}

      {/* Navbar */}
      <NavbarNew />

      {/* Green gradient auth section */}
      <div style={{ flex: 1, background: `linear-gradient(135deg, ${C.primaryD} 0%, ${C.primary} 50%, #1a6b44 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: 440, maxWidth: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛺</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif" }}>
            {BRANDING.platformName}
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>{BRANDING.platformTagline}</div>
        </div>

        {/* ── Forgot Password flow ── */}
        {(mode === "forgot" || mode === "otp") && (
          <Card padding={32}>
            <button onClick={() => { setMode("login"); setFpStatus(null); setFpError(""); setFirebaseConfirmation(null); setFirebaseOtp(""); }} style={{ background: "none", border: "none", color: C.primary, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 18, display: "flex", alignItems: "center", gap: 5 }}>
              ← Back to Sign In
            </button>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 4 }}>
              {fpStatus === "done" ? "✓ Password Reset!" : fpStatus === "sent" ? "Enter OTP" : "Forgot Password"}
            </div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>
              {fpStatus === "done" ? "Your password has been reset. Redirecting to sign in..." :
               fpStatus === "sent" ? `We sent a 6-digit OTP to ${fpEmail}. Enter it below along with your new password.` :
               "Enter your registered email address or mobile number to receive a password reset OTP."}
            </div>
            {/* Method tabs: Email vs Phone */}
            {!fpStatus && (
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.bg, borderRadius: 8, padding: 4 }}>
                {[["email","📧 Email OTP"],["phone","📱 Mobile OTP"]].map(([m, lbl]) => (
                  <button key={m} onClick={() => setFpMethod(m)} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: fpMethod === m ? C.primary : "transparent", color: fpMethod === m ? "#fff" : C.textMid, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}
            {fpError && <div style={{ background: `${C.danger}12`, border: `1.5px solid ${C.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14 }}>⚠ {fpError}</div>}
            {fpStatus === "done" && <div style={{ background: `${C.success}12`, border: `1.5px solid ${C.success}44`, borderRadius: 10, padding: 16, textAlign: "center", color: C.success, fontWeight: 700 }}>✓ Password changed successfully!</div>}
            {/* ── Email OTP flow ── */}
            {fpMethod === "email" && !fpStatus && (
              <form onSubmit={submitForgotRequest}>
                <Field label="Registered Email Address" required>
                  <Input value={fpEmail} onChange={v => { setFpEmail(v); setFpError(""); }} type="email" placeholder="your@email.com" />
                </Field>
                <Btn label={loading ? "Sending OTP..." : "Send OTP"} type="submit" color={C.primary} fullWidth size="lg" disabled={loading} />
              </form>
            )}
            {fpMethod === "email" && fpStatus === "sent" && (
              <form onSubmit={submitForgotConfirm}>
                <Field label="6-digit OTP" required>
                  <Input value={fpOtp} onChange={v => { setFpOtp(v.replace(/\D/g, "").slice(0, 6)); setFpError(""); }} placeholder="e.g. 123456" style={{ letterSpacing: 4, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
                </Field>
                <Field label="New Password" required>
                  <Input value={fpNewPass} onChange={v => { setFpNewPass(v); setFpError(""); }} type="password" placeholder="Min 8 chars, include a number" />
                </Field>
                <Field label="Confirm New Password" required>
                  <Input value={fpConfirmPass} onChange={v => { setFpConfirmPass(v); setFpError(""); }} type="password" placeholder="Repeat your new password" />
                </Field>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <Btn label="Resend OTP" outline color={C.textMid} onClick={async (e) => { e.preventDefault(); await submitForgotRequest({ preventDefault: () => {} }); }} />
                  <Btn label={loading ? "Resetting..." : "Reset Password"} type="submit" color={C.primary} disabled={loading} style={{ flex: 1 }} />
                </div>
              </form>
            )}
            {/* ── Phone OTP (Firebase) flow ── */}
            {fpMethod === "phone" && !firebaseConfirmation && (
              <div>
                <Field label="Mobile Number (with country code)">
                  <Input value={phoneNumber} onChange={setPhoneNumber} placeholder="+919876543210" type="tel" />
                </Field>
                <div id="recaptcha-container" style={{ marginBottom: 12 }}></div>
                <Btn label="Send OTP to Mobile" color={C.primary} fullWidth onClick={async () => {
                  if (!phoneNumber || !phoneNumber.startsWith("+")) { toast("Enter number with country code e.g. +919876543210", "warning"); return; }
                  try {
                    const { initializeApp, getApp } = await import("firebase/app");
                    const { getAuth, RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
                    const firebaseConfig = {
                      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    };
                    let app;
                    try { app = getApp(); } catch { app = initializeApp(firebaseConfig); }
                    const auth = getAuth(app);
                    if (!window._recaptchaVerifier) {
                      window._recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
                    }
                    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window._recaptchaVerifier);
                    setFirebaseConfirmation(confirmation);
                    toast("OTP sent to your mobile!", "success");
                  } catch (err) {
                    toast(err?.message || "Failed to send OTP. Check Firebase config.", "error");
                  }
                }} />
              </div>
            )}
            {fpMethod === "phone" && firebaseConfirmation && (
              <div>
                <Field label="Enter OTP from SMS">
                  <Input value={firebaseOtp} onChange={setFirebaseOtp} placeholder="6-digit OTP" type="number" />
                </Field>
                <Field label="New Password *">
                  <Input value={fpNewPass} onChange={v => { setFpNewPass(v); setFpError(""); }} type="password" placeholder="Min 8 chars, must have a number" />
                </Field>
                <Field label="Confirm Password *">
                  <Input value={fpConfirmPass} onChange={v => { setFpConfirmPass(v); setFpError(""); }} type="password" placeholder="Re-enter new password" />
                </Field>
                <Btn label={loading ? "Resetting..." : "Reset Password"} color={C.primary} fullWidth disabled={loading} onClick={async () => {
                  if (fpNewPass !== fpConfirmPass) { toast("Passwords do not match.", "warning"); return; }
                  setLoading(true);
                  try {
                    const result = await firebaseConfirmation.confirm(firebaseOtp);
                    const idToken = await result.user.getIdToken();
                    await api.auth.resetPasswordPhone({ firebase_id_token: idToken, new_password: fpNewPass, phone: phoneNumber });
                    toast("Password reset successfully! Please login.", "success");
                    setMode("login");
                    setFirebaseConfirmation(null);
                    setFirebaseOtp("");
                  } catch (err) {
                    toast(err?.message || err?.error || "Failed to reset password.", "error");
                  }
                  setLoading(false);
                }} />
                <button onClick={() => setFirebaseConfirmation(null)} style={{ marginTop: 8, background: "none", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Change number</button>
              </div>
            )}
          </Card>
        )}

        {(mode === "login" || mode === "register") && (
        <style>{`
          @keyframes authShake {
            0%,100%{transform:translateX(0)}
            15%{transform:translateX(-7px)}
            30%{transform:translateX(7px)}
            45%{transform:translateX(-5px)}
            60%{transform:translateX(5px)}
            75%{transform:translateX(-3px)}
            90%{transform:translateX(3px)}
          }
        `}</style>
        )}
        {(mode === "login" || mode === "register") && (
        <Card padding={32} style={{ animation: shake ? "authShake 0.5s ease" : "none" }}>
          <div style={{ display: "flex", marginBottom: 24, background: C.bg, borderRadius: 8, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setFieldErrors({}); setAuthStatus(null); setLoginHint(null); }} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: mode === m ? C.primary : "transparent", color: mode === m ? "#fff" : C.textMid, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Status banner — clean, left-bordered, Google-style */}
          {authStatus === "error" && fieldErrors._banner && (
            <div style={{ borderLeft: `4px solid ${C.danger}`, background: `${C.danger}08`, borderRadius: "0 8px 8px 0", padding: "12px 14px", fontSize: 13, color: "#1e293b", marginBottom: 16, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, color: C.danger, marginBottom: loginHint ? 8 : 0 }}>{fieldErrors._banner}</div>
              {loginHint === "no_account" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>Don't have an account?</span>
                  <button onClick={() => { setMode("register"); setFieldErrors({}); setAuthStatus(null); setLoginHint(null); }} style={{ background: "none", border: `1.5px solid ${C.primary}`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: C.primary, cursor: "pointer", fontFamily: "inherit" }}>Create account</button>
                  <a href={`mailto:${BRANDING.support.email}?subject=Login Help`} style={{ fontSize: 12, color: "#64748b", textDecoration: "underline" }}>Contact support</a>
                </div>
              )}
              {loginHint === "wrong_password" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>Forgot your password?</span>
                  <button onClick={() => { setMode("forgot"); setFpStatus(null); setFpError(""); setLoginHint(null); }} style={{ background: "none", border: `1.5px solid ${C.primary}`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: C.primary, cursor: "pointer", fontFamily: "inherit" }}>Reset password</button>
                  <a href={`mailto:${BRANDING.support.email}?subject=Login Help`} style={{ fontSize: 12, color: "#64748b", textDecoration: "underline" }}>Contact support</a>
                </div>
              )}
              {loginHint === "duplicate_email" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>Already have an account?</span>
                  <button onClick={() => { setMode("login"); setForm(p => ({ ...p, username: form.email })); setFieldErrors({}); setAuthStatus(null); setLoginHint(null); }} style={{ background: "none", border: `1.5px solid ${C.primary}`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: C.primary, cursor: "pointer", fontFamily: "inherit" }}>Sign in instead</button>
                  <a href={`mailto:${BRANDING.support.email}?subject=Registration Help`} style={{ fontSize: 12, color: "#64748b", textDecoration: "underline" }}>Contact support</a>
                </div>
              )}
              {loginHint === "rate_limited" && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#92400e" }}>
                  Please wait a few minutes before trying again.
                </div>
              )}
              {!loginHint && (
                <a href={`mailto:${BRANDING.support.email}?subject=Login Help`} style={{ display: "inline-block", marginTop: 4, fontSize: 12, color: "#64748b", textDecoration: "underline" }}>Contact support if this continues →</a>
              )}
            </div>
          )}
          {authStatus === "success" && (
            <div style={{ background: `${C.success}15`, border: `1.5px solid ${C.success}55`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.success, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <span>{mode === "login" ? "Login successful! Redirecting..." : "Account created! Redirecting..."}</span>
            </div>
          )}

          <form onSubmit={submit}>
            {mode === "login" && (
              <Field label="Email or Username" required>
                <Input value={form.username} onChange={set("username")} placeholder="Username / Email / Mobile Number" autoComplete="username"
                  style={loginHint === "no_account" ? { border: `1.5px solid ${C.danger}` } : {}} />
                <FieldErr k="username" />
              </Field>
            )}
            {mode === "register" && (
              <>
                <Field label="Dealership / Showroom Name" required>
                  <Input value={form.dealer_name} onChange={set("dealer_name")} placeholder="e.g. Sharma eRickshaw Centre" />
                  <FieldErr k="dealer_name" />
                </Field>
                <Field label="Email Address" required>
                  <Input value={form.email} onChange={set("email")} type="email" placeholder="dealer@example.com" />
                  <FieldErr k="email" />
                </Field>
                <Field label="Mobile Number" required>
                  <Input value={form.phone} onChange={v => { set("phone")(v.replace(/\D/g, "").slice(0, 10)); }} placeholder="10-digit Indian number (starts with 6-9)" />
                  <FieldErr k="phone" />
                </Field>
              </>
            )}
            <Field label="Password" required>
              <div style={{ position: "relative" }}>
                <Input value={form.password} onChange={set("password")} type={showPassword ? "text" : "password"} placeholder={mode === "register" ? "Min 8 chars, include a number" : "Your password"} autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={{ ...(loginHint === "wrong_password" ? { border: `1.5px solid ${C.danger}` } : {}), paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16, padding: 2, lineHeight: 1 }}
                  title={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              <FieldErr k="password" />
            </Field>
            {mode === "register" && (
              <Field label="Confirm Password" required>
                <div style={{ position: "relative" }}>
                  <Input value={form.confirm_password} onChange={set("confirm_password")} type={showPassword ? "text" : "password"} placeholder="Repeat your password"
                    style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16, padding: 2, lineHeight: 1 }}>
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
                <FieldErr k="confirm_password" />
              </Field>
            )}
            {mode === "register" && (
              <>
                <Field label="Pincode / ZIP Code">
                  <div style={{ position: "relative" }}>
                    <Input value={form.pincode} onChange={v => { set("pincode")(v); if (v.length === 6) lookupPincode(v); }} placeholder="e.g. 110085" />
                    {pincodeLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textMid }}>🔍 Looking up...</span>}
                  </div>
                  <FieldErr k="pincode" />
                  {pincodeData && <div style={{ fontSize: 11, color: C.success, marginTop: 3 }}>✓ {pincodeData.city}, {pincodeData.state}</div>}
                </Field>
                <Field label="City / District" required>
                  <Select
                    value={form.city}
                    onChange={set("city")}
                    placeholder="— Select your city —"
                    style={fieldErrors.city ? { border: `1.5px solid ${C.danger}` } : {}}
                    options={[
                      ...(pincodeData?.suggestions?.filter(s => s !== form.city).map(s => ({ value: s, label: `✓ ${s} (from pincode)` })) || []),
                      ...MAJOR_CITIES.map(c => ({ value: c, label: c })),
                    ]}
                  />
                  <FieldErr k="city" />
                </Field>
              </>
            )}
            <Btn
              label={loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}
              type="submit"
              color={authStatus === "success" ? C.success : C.primary}
              fullWidth
              disabled={loading || authStatus === "success"}
              size="lg"
            />
          </form>

          {/* Google Sign-In — shown for both login and register */}
          <div style={{ margin: "20px 0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 12, color: C.textMid, whiteSpace: "nowrap" }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            {googleLoading ? (
              <div style={{ textAlign: "center", color: C.textMid, fontSize: 13, padding: "10px 0" }}>Verifying with Google…</div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  shape="rectangular"
                  size="large"
                  width="320"
                  text={mode === "login" ? "signin_with" : "signup_with"}
                />
              </div>
            )}
          </div>

          {mode === "login" && !loginHint && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button onClick={() => { setMode("forgot"); setFpStatus(null); setFpError(""); }} style={{ background: "none", border: "none", color: C.primary, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                Forgot password?
              </button>
            </div>
          )}
        </Card>
        )}
      </div>
      </div>

      {/* Minimal footer — full FooterNew is too heavy for a login page */}
      <div style={{ background: "#111827", color: "#6b7280", fontSize: 12, padding: "16px 24px", display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "8px 24px" }}>
        <span>© {new Date().getFullYear()} {BRANDING.platformName}</span>
        <a href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</a>
        <a href="/driver/marketplace" style={{ color: "#9ca3af", textDecoration: "none" }}>Marketplace</a>
        <a href="/driver/dealers" style={{ color: "#9ca3af", textDecoration: "none" }}>Find Dealers</a>
        <a href={`mailto:${BRANDING.support.email}`} style={{ color: "#9ca3af", textDecoration: "none" }}>Support</a>
        <a href="/install.html" style={{ color: "#9ca3af", textDecoration: "none" }}>Install App</a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════
const NAV = [
  { id: "dashboard",  label: "Dashboard",  icon: "📊" },
  { id: "inventory",  label: "Inventory",  icon: "🚗" },
  { id: "leads",      label: "Leads",      icon: "👥" },
  { id: "sales",      label: "Sales",      icon: "💰" },
  { id: "customers",  label: "Customers",  icon: "👤" },
  { id: "finance",    label: "Finance",    icon: "🏦" },
  { id: "marketing",  label: "Marketing",  icon: "📣" },
  { id: "reports",    label: "Reports",    icon: "📈" },
  { id: "learn",      label: "Learn",      icon: "🎓" },
  { id: "marketplace",label: "Marketplace",icon: "🛒" },
  { id: "plans",      label: "Plans",      icon: "⭐" },
  { id: "support",    label: "Support",    icon: "🛟" },
];

const BOTTOM_NAV = [
  { id: "dashboard",  label: "Home",    icon: "📊" },
  { id: "inventory",  label: "Stock",   icon: "🚗" },
  { id: "leads",      label: "Leads",   icon: "👥" },
  { id: "sales",      label: "Sales",   icon: "💰" },
  { id: "account",    label: "Account", icon: "👤" },
];

function Sidebar({ page, setPage, dealer, onLogout }) {
  const C = useC();
  const [showMore, setShowMore] = useState(false);
  return (
    <>
      {/* Desktop sidebar */}
      <div className="erd-sidebar" style={{ width: 220, minWidth: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
        <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛺</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, fontFamily: "Georgia, serif" }}>eRickshaw<span style={{ color: C.accent }}>Dekho</span></div>
              <div style={{ fontSize: 10, color: C.textDim }}>Dealer Portal</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: page === n.id ? `${C.primary}15` : "transparent",
              border: "none", borderRadius: 8,
              color: page === n.id ? C.primary : C.textMid,
              fontWeight: page === n.id ? 700 : 500, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", marginBottom: 2, transition: "all 0.1s",
              borderLeft: page === n.id ? `3px solid ${C.primary}` : "3px solid transparent",
            }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setPage("account")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: page === "account" ? `${C.primary}15` : "transparent", border: "none", borderRadius: 8, color: page === "account" ? C.primary : C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <span>👤</span>My Account
          </button>
          <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <span>🚪</span>Logout
          </button>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="erd-bottom-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, zIndex: 200, padding: "6px 0 8px" }}>
        {BOTTOM_NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "transparent", border: "none", cursor: "pointer",
            color: page === n.id ? C.primary : C.textDim, fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: page === n.id ? 700 : 400 }}>{n.label}</span>
          </button>
        ))}
        <button onClick={() => setShowMore(true)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          background: "transparent", border: "none", cursor: "pointer", color: C.textDim, fontFamily: "inherit",
        }}>
          <span style={{ fontSize: 20 }}>⋮⋮⋮</span>
          <span style={{ fontSize: 10 }}>More</span>
        </button>
      </div>

      {showMore && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowMore(false)}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: C.surface, borderRadius: "20px 20px 0 0", padding: "20px 16px 32px", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { id: "customers",   label: "Customers", icon: "👤" },
                { id: "finance",     label: "Finance",   icon: "🏦" },
                { id: "marketing",   label: "Marketing", icon: "📣" },
                { id: "reports",     label: "Reports",   icon: "📈" },
                { id: "learn",       label: "Learn",     icon: "🎓" },
                { id: "marketplace", label: "Market",    icon: "🛒" },
                { id: "plans",       label: "Plans",     icon: "⭐" },
                { id: "support",     label: "Support",   icon: "🛟" },
                { id: "account",     label: "Account",   icon: "👤" },
              ].map(n => (
                <button key={n.id} onClick={() => { setPage(n.id); setShowMore(false); }} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px",
                  background: page === n.id ? `${C.primary}15` : C.bg, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                  color: page === n.id ? C.primary : C.textMid,
                }}>
                  <span style={{ fontSize: 24 }}>{n.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: page === n.id ? 700 : 400 }}>{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .erd-sidebar { display: none !important; }
          .erd-bottom-nav { display: flex !important; }
          .erd-main { padding-bottom: 70px !important; }
        }
        @media (min-width: 769px) {
          .erd-bottom-nav { display: none !important; }
        }
      `}</style>
    </>
  );
}

function Topbar({ dealer, page, onAddNew, onProfile, onBell }) {
  const C = useC();
  const { isDark, toggle } = useContext(ThemeCtx);
  const [unread, setUnread] = useState(0);
  const [lang, setLang] = useState(() => localStorage.getItem("erd_lang") || "en");
  const pageLabel = [...NAV, { id: "account", label: "My Account" }, { id: "plans", label: "Plans & Pricing" }].find(n => n.id === page)?.label || page;

  useEffect(() => {
    if (!dealer) return;
    const fetchUnread = () => api.enquiries.unreadCount().then(d => setUnread(d.unread || 0)).catch(() => {});
    fetchUnread();
    const id = setInterval(fetchUnread, 60000);
    return () => clearInterval(id);
  }, [dealer]);

  return (
    <div className="erd-topbar" style={{ height: 60, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
      <div className="erd-topbar-title" style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{pageLabel}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {page === "inventory" && <span className="erd-topbar-add"><Btn label="+ Add Vehicle" size="sm" onClick={onAddNew} /></span>}
        {/* Bell icon — navigates to Leads → Enquiries tab */}
        <button onClick={onBell} title="Buyer Enquiries" style={{ position: "relative", background: unread > 0 ? `${C.danger}12` : "none", border: `1.5px solid ${unread > 0 ? C.danger : C.border}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          🔔
          {unread > 0 && (
            <span style={{ position: "absolute", top: -5, right: -5, background: C.danger, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {/* Hard refresh */}
        <button onClick={() => { if ("caches" in window) caches.keys().then(names => names.forEach(n => caches.delete(n))); window.location.reload(); }}
          title="Hard Refresh" style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          🔄
        </button>
        {/* Language toggle */}
        <button onClick={() => {
          const next = lang === "en" ? "hi" : "en";
          i18n.changeLanguage(next);
          localStorage.setItem("erd_lang", next);
          setLang(next);
        }} title={lang === "en" ? "Switch to Hindi" : "Switch to English"} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.textMid, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {lang === "en" ? "हि" : "EN"}
        </button>
        {/* Dark mode toggle */}
        <button onClick={toggle} title={isDark ? "Light Mode" : "Dark Mode"} style={{ background: isDark ? C.surface : C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {isDark ? "☀️" : "🌙"}
        </button>
        <button onClick={onProfile} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
          background: C.bg, borderRadius: 20, border: `1.5px solid ${C.border}`,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>
            {(dealer?.name || "D")[0].toUpperCase()}
          </div>
          <div className="erd-topbar-name">
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{dealer?.name || "Dealer"}</div>
            <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1 }}>My Account ›</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════
function Dashboard({ onNavigate }) {
  const C = useC();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doneTaskIds, setDoneTaskIds] = useState(new Set());

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch(err => {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, []);

  const markTaskDone = async (taskId) => {
    setDoneTaskIds(prev => new Set([...prev, taskId]));
    try {
      await api.tasks.update(taskId, { is_completed: true });
      toast("Task marked as done!", "success");
    } catch {
      setDoneTaskIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
      toast("Failed to update task.", "error");
    }
  };

  if (loading) return <Spinner />;
  if (error) return (
    <div style={{ padding: 24, textAlign: "center", color: C.error || "#ef4444" }}>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px", background: C.primary, color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
        Refresh Page
      </button>
    </div>
  );
  if (!data) return <Spinner />;

  const fuelColors = { electric: C.success, petrol: "#f97316", cng: "#06b6d4", lpg: "#8b5cf6" };
  const plan = data.plan;

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 1200 }}>
      {/* Welcome banner */}
      <div className="erd-welcome-banner" style={{ background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 14, padding: "22px 28px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Welcome back! 👋</div>
          <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Here's an overview of your dealership activity.</div>
        </div>
        <div className="erd-rickshaw-icon" style={{ fontSize: 48 }}>🛺</div>
      </div>

      {/* Verification warning */}
      {data && !data.is_verified && (
        <div style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: C.warning, display: "flex", alignItems: "center", gap: 8 }}>
          ⏳ <span>Your dealership is <b>pending verification</b>. Our team will review and approve it shortly.</span>
        </div>
      )}

      {/* Plan warnings */}
      {plan && !plan.is_active && (
        <div style={{ background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: C.danger, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>⚠️ Your <b>{plan.type} plan</b> has expired. Upgrade to continue accessing all features.</span>
          <Btn label="⭐ View Plans" color={C.danger} size="sm" onClick={() => onNavigate?.("plans")} />
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining <= 7 && (
        <div style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: C.warning, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>⚠️ Your <b>{plan.type} plan</b> expires in <b>{plan.days_remaining} day{plan.days_remaining !== 1 ? "s" : ""}</b>.</span>
          <Btn label="⭐ Upgrade Now" color={C.warning} size="sm" onClick={() => onNavigate?.("plans")} />
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining > 7 && (
        <div style={{ marginBottom: 24 }} />
      )}

      {/* Stats row */}
      <div className="erd-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon="🚗" label="Total Vehicles" value={data.total_vehicles} color={C.primary} sub={`${data.in_stock} in stock`} />
        <StatCard icon="👥" label="Active Leads"   value={data.active_leads}   color={C.info} />
        <StatCard icon="💰" label="New Sales"      value={data.new_sales}      color={C.success} sub="this month" />
        <StatCard icon="📋" label="Pending Tasks"  value={data.pending_tasks}  color={C.warning} />
      </div>

      {/* Charts row */}
      <div className="erd-dash-chart-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sales Insights</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.primary, fontFamily: "Georgia, serif", marginBottom: 12 }}>{fmtINR(data.monthly_revenue)}</div>
          <BarChart data={data.sales_chart} height={110} />
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Inventory Overview</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <DonutChart data={data.fuel_breakdown} size={110} />
            <div style={{ flex: 1 }}>
              {Object.entries(data.fuel_breakdown || {}).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: fuelColors[k] || "#94a3b8" }} />
                    <span style={{ textTransform: "capitalize", color: C.textMid }}>{k}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
                <span>Total</span><span style={{ color: C.primary }}>{data.total_vehicles}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="erd-dash-bottom-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Recent Leads</div>
          </div>
          {(data.recent_leads || []).map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data.recent_leads.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.customer_name}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{l.vehicle_name}</div>
              </div>
              <Badge label={l.status.replace("_", " ")} color={LEAD_COLOR[l.status]} />
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Upcoming Deliveries</div>
          {(data.upcoming_deliveries || []).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data.upcoming_deliveries.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛺</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.customer_name}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{s.vehicle_name}</div>
              </div>
              <div style={{ fontSize: 11, color: C.textMid }}>{fmtDate(s.delivery_date)}</div>
            </div>
          ))}
          {data.upcoming_tasks && data.upcoming_tasks.filter(t => !doneTaskIds.has(t.id)).length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, margin: "14px 0 10px" }}>Upcoming Tasks</div>
              {data.upcoming_tasks.filter(t => !doneTaskIds.has(t.id)).map((t, i, arr) => (
                <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <button
                    onClick={() => markTaskDone(t.id)}
                    title="Mark as done"
                    style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${C.success}`, background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.success, fontSize: 11, padding: 0, lineHeight: 1 }}
                  >✓</button>
                  <div style={{ flex: 1, fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, whiteSpace: "nowrap" }}>{fmtDate(t.due_date)}</div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLAN LISTING BANNER
// ═══════════════════════════════════════════════════════
function PlanListingBanner() {
  const C = useC();
  const [count, setCount] = useState(null);

  useEffect(() => {
    api.dashboard().then(d => {
      if (d.plan?.listing_limit !== undefined) {
        setCount({ limit: d.plan.listing_limit, current: d.plan.listing_count || 0 });
      }
    }).catch(() => {});
  }, []);

  if (!count || count.limit === 0) return null; // unlimited or no data

  const atLimit = count.current >= count.limit;
  const pct = Math.min(100, (count.current / count.limit) * 100);

  return (
    <div style={{
      margin: "0 24px 16px", padding: "12px 18px", borderRadius: 10,
      background: atLimit ? `${C.danger}10` : `${C.primary}08`,
      border: `1.5px solid ${atLimit ? C.danger : C.primary}33`,
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: atLimit ? C.danger : C.text, marginBottom: 6 }}>
          {atLimit ? "⚠️ Listing Limit Reached" : "📦 Vehicle Listings"}: {count.current} / {count.limit}
        </div>
        <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: atLimit ? C.danger : C.primary, borderRadius: 4, transition: "width 0.5s" }} />
        </div>
        {atLimit && (
          <div style={{ fontSize: 12, color: C.danger, marginTop: 6 }}>
            You have reached the Free Plan limit of {count.limit} vehicle listings. Upgrade to Pro for unlimited listings.
          </div>
        )}
        {!atLimit && count.limit > 0 && (
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
            Free plan: {count.limit} vehicle listings. {count.limit - count.current} slot{count.limit - count.current !== 1 ? "s" : ""} remaining.
          </div>
        )}
      </div>
      {atLimit && (
        <Btn label="⭐ Upgrade Plan" color={C.primary} size="sm" onClick={() => {}} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INVENTORY PAGE
// ═══════════════════════════════════════════════════════
function Inventory({ showAdd, onAddClose, onNavigate }) {
  const C = useC();
  const toast = useToast();
  const plan = usePlan();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, inStock: 0, outOfStock: 0, sold: 0, lowStock: 0 });
  const [filters, setFilters] = useState({ brand: "", fuel_type: "", stock_status: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState({ brand_id: "", model_name: "", fuel_type: "electric", vehicle_type: "passenger", price: "", stock_quantity: "", year: 2024, description: "", thumbnail: null, is_used: false, range_km: "", battery_capacity: "", max_speed: "", seating_capacity: "3", payload_kg: "", warranty_years: "1", hsn_code: "8703", thumbnail_url: "" });
  const [galleryFiles, setGalleryFiles] = useState([]);  // multiple gallery images for new vehicle
  const [saving, setSaving] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([
    { slug: "passenger", name: "Passenger Rickshaw" },
    { slug: "cargo",     name: "Cargo Loader" },
    { slug: "auto",      name: "Auto Rickshaw" },
  ]);
  const [showAddVType, setShowAddVType] = useState(false);
  const [newVTypeName, setNewVTypeName] = useState("");
  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editGalleryImages, setEditGalleryImages] = useState([]); // existing gallery images for edit
  const [editGalleryFiles, setEditGalleryFiles] = useState([]);   // new files to upload for edit
  const [editSaving, setEditSaving] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const formGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };

  const debouncedSearch = useDebounce(filters.search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const effectiveFilters = { ...filters, search: debouncedSearch };
    const params = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(effectiveFilters).filter(([, v]) => v)) });
    try {
      const data = await api.vehicles.list(`?${params}`);
      setVehicles(data.results || data);
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / 10));
    } catch (err) {
      console.error("Failed to load vehicles:", err);
      setError("Failed to load vehicles. Please try again.");
    } finally { setLoading(false); }
  }, [page, debouncedSearch, filters.brand, filters.fuel_type, filters.stock_status]);

  useEffect(() => { load(); }, [load]);

  const loadStats = () => api.dashboard().then(d => {
    if (d) setStats({ total: d.total_vehicles, inStock: d.in_stock, outOfStock: d.out_of_stock || 0, sold: d.total_sold || 0, lowStock: d.low_stock || 0 });
  }).catch(() => null);

  useEffect(() => {
    Promise.all([
      api.brands().catch(() => null),
      loadStats(),
      api.vehicleTypes().catch(() => null),
    ]).then(([brandsData, , typesData]) => {
      if (brandsData) setBrands(brandsData.results || brandsData);
      if (typesData) setVehicleTypes((typesData.results || typesData).map(t => ({ slug: t.slug, name: t.name })));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setF = k => v => setFilters(p => ({ ...p, [k]: v }));
  const setForm_ = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.brand_id) { toast("Please select a brand.", "warning"); return; }
    if (!form.model_name.trim()) { toast("Model name is required.", "warning"); return; }
    if (!form.price) { toast("Price is required.", "warning"); return; }
    setSaving(true);
    try {
      let payload;
      const specFields = { range_km: form.range_km || null, battery_capacity: form.battery_capacity, max_speed: form.max_speed || null, seating_capacity: form.seating_capacity || "3", payload_kg: form.payload_kg || null, warranty_years: form.warranty_years || 1, hsn_code: form.hsn_code || "8703", is_used: form.is_used };
      if (form.thumbnail) {
        payload = new FormData();
        payload.append("brand", form.brand_id);
        payload.append("model_name", form.model_name);
        payload.append("fuel_type", form.fuel_type);
        payload.append("vehicle_type", form.vehicle_type);
        payload.append("price", form.price);
        payload.append("stock_quantity", form.stock_quantity || 1);
        payload.append("year", form.year);
        if (form.description) payload.append("description", form.description);
        payload.append("thumbnail", form.thumbnail);
        Object.entries(specFields).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") payload.append(k, v); });
      } else {
        const { thumbnail, brand_id, thumbnail_url: turl, ...rest } = form;
        payload = { ...rest, ...specFields, brand: brand_id, stock_quantity: form.stock_quantity || 1 };
        if (turl) payload.thumbnail_url = turl;
      }
      const created = await api.vehicles.create(payload);
      // Upload gallery images if any were selected
      if (galleryFiles.length > 0 && created?.id) {
        const fd = new FormData();
        galleryFiles.forEach(f => fd.append("images", f));
        await apiFetch(`/vehicles/${created.id}/images/`, { method: "POST", body: fd });
      }
      setGalleryFiles([]);
      toast("Vehicle added successfully!", "success");
      onAddClose(); load(); loadStats();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add vehicle.";
      toast(msg, "error");
    }
    setSaving(false);
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setEditForm({ model_name: v.model_name, fuel_type: v.fuel_type, vehicle_type: v.vehicle_type || "passenger", price: v.price, stock_quantity: v.stock_quantity, year: v.year, description: v.description || "", thumbnail: null, is_used: v.is_used || false, range_km: v.range_km || "", battery_capacity: v.battery_capacity || "", max_speed: v.max_speed || "", seating_capacity: v.seating_capacity || "3", payload_kg: v.payload_kg || "", warranty_years: v.warranty_years || "1", hsn_code: v.hsn_code || "8703", thumbnail_url: v.thumbnail_url || "" });
    setEditGalleryImages(v.gallery_images || []);
    setEditGalleryFiles([]);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.model_name.trim()) { toast("Model name is required.", "warning"); return; }
    if (!editForm.price) { toast("Price is required.", "warning"); return; }
    setEditSaving(true);
    try {
      let payload;
      const editSpecFields = { range_km: editForm.range_km || null, battery_capacity: editForm.battery_capacity, max_speed: editForm.max_speed || null, seating_capacity: editForm.seating_capacity || "3", payload_kg: editForm.payload_kg || null, warranty_years: editForm.warranty_years || 1, hsn_code: editForm.hsn_code || "8703", is_used: editForm.is_used };
      if (editForm.thumbnail) {
        payload = new FormData();
        payload.append("model_name", editForm.model_name);
        payload.append("fuel_type", editForm.fuel_type);
        payload.append("vehicle_type", editForm.vehicle_type);
        payload.append("price", editForm.price);
        if (editForm.stock_quantity) payload.append("stock_quantity", editForm.stock_quantity);
        payload.append("year", editForm.year);
        if (editForm.description) payload.append("description", editForm.description);
        payload.append("thumbnail", editForm.thumbnail);
        Object.entries(editSpecFields).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") payload.append(k, v); });
      } else {
        const { thumbnail, thumbnail_url: turl, ...rest } = editForm;
        payload = { ...rest, ...editSpecFields };
        if (turl) payload.thumbnail_url = turl;
      }
      await api.vehicles.update(editVehicle.id, payload);
      // Upload any new gallery images
      if (editGalleryFiles.length > 0) {
        const fd = new FormData();
        editGalleryFiles.forEach(f => fd.append("images", f));
        await apiFetch(`/vehicles/${editVehicle.id}/images/`, { method: "POST", body: fd });
      }
      setEditGalleryFiles([]);
      toast("Vehicle updated successfully!", "success");
      setEditVehicle(null); load(); loadStats();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to update vehicle.";
      toast(msg, "error");
    }
    setEditSaving(false);
  };

  const confirmDelete = async () => {
    try {
      await api.vehicles.delete(deleteId);
      toast("Vehicle removed from inventory.", "success");
      setDeleteId(null); load(); loadStats();
    } catch {
      toast("Failed to delete vehicle.", "error");
    }
  };

  const cols = [
    { label: "ID",       render: r => <span style={{ color: C.textDim, fontSize: 12 }}>{r.id}</span> },
    { label: "Thumbnail",render: r => (
        <div style={{ position: "relative", width: 56, height: 40, background: `${C.primary}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>
          🛺
          {(r.thumbnail || r.thumbnail_url) && <img src={r.thumbnail || r.thumbnail_url} alt={r.model_name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />}
        </div>) },
    { label: "Model",    render: r => <div><div style={{ fontWeight: 600 }}>{r.model_name}</div><div style={{ fontSize: 11, color: C.textDim }}>{r.brand_name}</div></div> },
    { label: "Brand",    key:    "brand_name" },
    { label: "Fuel",     render: r => <Badge label={r.fuel_type} color={FUEL_COLOR[r.fuel_type]} /> },
    { label: "Price",    render: r => <span style={{ fontWeight: 600 }}>{fmtINR(r.price)}</span> },
    { label: "Stock",    render: r => <span style={{ fontWeight: 700, color: STOCK_COLOR[r.stock_status] }}>{r.stock_quantity}</span> },
    { label: "Status",   render: r => <Badge label={r.stock_status.replace("_", " ")} color={STOCK_COLOR[r.stock_status]} /> },
    { label: "Actions",  render: r => (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Btn label="View"   size="sm" outline color={C.info}    onClick={() => setViewVehicle(r)} />
        <Btn label="Edit"   size="sm" outline color={C.primary} onClick={() => openEdit(r)} />
        <Btn label="Delete" size="sm" outline color={C.danger}  onClick={() => setDeleteId(r.id)} />
      </div>
    )},
  ];

  return (
    <div style={{ padding: 24 }}>
      {loading && <Spinner />}
      {error && (
        <div style={{ padding: 24, textAlign: "center", color: C.error || "#ef4444", background: `${C.error || "#ef4444"}15`, borderRadius: 10, marginBottom: 20 }}>
          <p>{error}</p>
          <button onClick={load} style={{ marginTop: 16, padding: "8px 16px", background: C.primary, color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          <PlanListingBanner />
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Vehicles", value: stats.total,      color: C.info    },
          { label: "In Stock",       value: stats.inStock,    color: C.success },
          { label: "Low Stock",      value: stats.lowStock,   color: C.warning },
          { label: "Out of Stock",   value: stats.outOfStock, color: C.danger  },
          { label: "Units Sold",     value: stats.sold,       color: C.accent  },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 18px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Georgia, serif" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMid }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card padding={14} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={filters.brand} onChange={setF("brand")} placeholder="Filter by Brand"
            options={brands.map(b => ({ value: b.name, label: b.name }))} style={{ width: 160 }} />
          <Select value={filters.fuel_type} onChange={setF("fuel_type")} placeholder="Filter by Fuel"
            options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"}]} style={{ width: 160 }} />
          <Select value={filters.stock_status} onChange={setF("stock_status")} placeholder="Stock Status"
            options={[{value:"in_stock",label:"In Stock"},{value:"low_stock",label:"Low Stock"},{value:"out_of_stock",label:"Out of Stock"}]} style={{ width: 160 }} />
          <Input value={filters.search} onChange={setF("search")} placeholder="Search by Model or Brand..." style={{ width: 200 }} />
          <Btn label="Clear" size="sm" outline color={C.textMid} onClick={() => setFilters({ brand:"", fuel_type:"", stock_status:"", search:"" })} />
        </div>
      </Card>

      {/* Table */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>Inventory</div>
        {loading ? <Spinner /> : <Table cols={cols} rows={vehicles} />}
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </Card>

      {/* Add Vehicle Modal */}
      {showAdd && (
        <Modal title="Add New Vehicle" onClose={onAddClose} width={580}>
          <form onSubmit={submit}>
            <div style={formGridStyle}>
              <Field label="Brand" required>
                <Select
                  value={form.brand_id}
                  onChange={value => {
                    if (value === "__new__") {
                      setShowAddBrand(true);
                    } else {
                      setForm_("brand_id")(value);
                    }
                  }}
                  placeholder="Select brand"
                  options={[
                    ...brands.map(b => ({ value: b.id, label: b.name })),
                    { value: "__new__", label: "+ Add New Brand..." },
                  ]}
                />
              </Field>
              <Field label="Model Name" required><Input value={form.model_name} onChange={setForm_("model_name")} placeholder="e.g. YatriKing Pro" /></Field>
              <Field label="Vehicle Type" required>
                <Select value={form.vehicle_type} onChange={v => { if (v === "__new_type__") setShowAddVType(true); else setForm_("vehicle_type")(v); }}
                  options={[
                    ...vehicleTypes.map(t => ({ value: t.slug, label: t.name })),
                    { value: "__new_type__", label: "+ Add New Type..." },
                  ]} />
              </Field>
              <Field label="Fuel Type" required>
                <Select value={form.fuel_type} onChange={setForm_("fuel_type")} options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"},{value:"diesel",label:"Diesel"}]} />
              </Field>
              <Field label="Price (₹)" required><Input value={form.price} onChange={setForm_("price")} type="number" placeholder="150000" /></Field>
              <Field label="Stock Quantity"><Input value={form.stock_quantity} onChange={setForm_("stock_quantity")} type="number" placeholder="10" /></Field>
              <Field label="Year"><Input value={form.year} onChange={setForm_("year")} type="number" placeholder="2024" /></Field>
              <Field label="Seating Capacity"><Input value={form.seating_capacity} onChange={setForm_("seating_capacity")} placeholder="e.g. 3 or 4+1" /></Field>
              <Field label="Range (km, for electric)"><Input value={form.range_km} onChange={setForm_("range_km")} placeholder="e.g. 120 or 100-120" /></Field>
              <Field label="Battery Capacity"><Input value={form.battery_capacity} onChange={setForm_("battery_capacity")} placeholder="100Ah 48V" /></Field>
              <Field label="Max Speed (km/h)"><Input value={form.max_speed} onChange={setForm_("max_speed")} placeholder="e.g. 45 or 45-55" /></Field>
              <Field label="Payload (kg)"><Input value={form.payload_kg} onChange={setForm_("payload_kg")} placeholder="e.g. 500 or 600-1000" /></Field>
              <Field label="Warranty (years)"><Input value={form.warranty_years} onChange={setForm_("warranty_years")} type="number" placeholder="1" /></Field>
              <Field label="HSN Code"><Input value={form.hsn_code} onChange={setForm_("hsn_code")} placeholder="8703" /></Field>
              <Field label="Condition">
                <Select value={form.is_used ? "used" : "new"} onChange={v => setForm(p => ({ ...p, is_used: v === "used" }))} options={[{value:"new",label:"New"},{value:"used",label:"Used / Refurbished"}]} />
              </Field>
            </div>
            <Field label="Main Photo (Thumbnail)" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", padding: "14px", border: `2px dashed ${C.border}`, borderRadius: 8, cursor: "pointer", textAlign: "center", background: C.bg }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                    <div style={{ fontSize: 12, color: C.textMid }}>Click to upload main photo</div>
                    <input type="file" accept="image/*" onChange={e => setForm_("thumbnail")(e.target.files[0] || null)} style={{ display: "none" }} />
                  </label>
                  <div style={{ marginTop: 8, fontSize: 12, color: C.textDim }}>Or paste image URL:</div>
                  <Input value={form.thumbnail_url} onChange={setForm_("thumbnail_url")} placeholder="https://example.com/vehicle.jpg" />
                </div>
                {(form.thumbnail || form.thumbnail_url) && (
                  <img src={form.thumbnail ? URL.createObjectURL(form.thumbnail) : form.thumbnail_url} alt="preview"
                    style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: `1.5px solid ${C.border}` }} />
                )}
              </div>
            </Field>
            <Field label={`Additional Photos (${galleryFiles.length}/8)`} style={{ marginTop: 8 }}>
              <label style={{ display: "block", padding: "12px", border: `2px dashed ${C.border}`, borderRadius: 8, cursor: "pointer", textAlign: "center", background: C.bg }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>🖼️</div>
                <div style={{ fontSize: 12, color: C.textMid }}>Click to select up to 8 gallery photos</div>
                <input type="file" accept="image/*" multiple onChange={e => setGalleryFiles(Array.from(e.target.files).slice(0, 8))} style={{ display: "none" }} />
              </label>
              {galleryFiles.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {galleryFiles.map((f, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 6, border: `1.5px solid ${C.border}` }} />
                      <button type="button" onClick={() => setGalleryFiles(p => p.filter((_, idx) => idx !== i))}
                        style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: C.danger, color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Description">
              <TextArea value={form.description} onChange={setForm_("description")} rows={3} placeholder="Vehicle description, key specs, features..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={onAddClose} />
              <Btn label={saving ? "Saving..." : "Add Vehicle"} color={C.primary} type="submit" disabled={saving} />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Vehicle Modal */}
      {editVehicle && (
        <Modal title={`Edit — ${editVehicle.brand_name} ${editVehicle.model_name}`} onClose={() => setEditVehicle(null)} width={580}>
          <form onSubmit={saveEdit}>
            <div style={formGridStyle}>
              <Field label="Model Name" required>
                <Input value={editForm.model_name} onChange={v => setEditForm(p => ({ ...p, model_name: v }))} />
              </Field>
              <Field label="Vehicle Type">
                <Select value={editForm.vehicle_type}
                  onChange={v => { if (v === "__new_type__") setShowAddVType(true); else setEditForm(p => ({ ...p, vehicle_type: v })); }}
                  options={[
                    ...vehicleTypes.map(t => ({ value: t.slug, label: t.name })),
                    { value: "__new_type__", label: "+ Add New Type..." },
                  ]} />
              </Field>
              <Field label="Fuel Type">
                <Select value={editForm.fuel_type} onChange={v => setEditForm(p => ({ ...p, fuel_type: v }))}
                  options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"},{value:"diesel",label:"Diesel"}]} />
              </Field>
              <Field label="Price (₹)" required>
                <Input value={editForm.price} onChange={v => setEditForm(p => ({ ...p, price: v }))} type="number" />
              </Field>
              <Field label="Stock Quantity">
                <Input value={editForm.stock_quantity} onChange={v => setEditForm(p => ({ ...p, stock_quantity: v }))} type="number" />
              </Field>
              <Field label="Year">
                <Input value={editForm.year} onChange={v => setEditForm(p => ({ ...p, year: v }))} type="number" />
              </Field>
              <Field label="Seating Capacity"><Input value={editForm.seating_capacity || ""} onChange={v => setEditForm(p => ({ ...p, seating_capacity: v }))} placeholder="e.g. 3 or 4+1" /></Field>
              <Field label="Range (km)"><Input value={editForm.range_km || ""} onChange={v => setEditForm(p => ({ ...p, range_km: v }))} placeholder="e.g. 120 or 100-120" /></Field>
              <Field label="Battery Capacity"><Input value={editForm.battery_capacity || ""} onChange={v => setEditForm(p => ({ ...p, battery_capacity: v }))} placeholder="100Ah 48V" /></Field>
              <Field label="Max Speed (km/h)"><Input value={editForm.max_speed || ""} onChange={v => setEditForm(p => ({ ...p, max_speed: v }))} placeholder="e.g. 45 or 45-55" /></Field>
              <Field label="Payload (kg)"><Input value={editForm.payload_kg || ""} onChange={v => setEditForm(p => ({ ...p, payload_kg: v }))} placeholder="e.g. 500 or 600-1000" /></Field>
              <Field label="Warranty (years)"><Input value={editForm.warranty_years || ""} onChange={v => setEditForm(p => ({ ...p, warranty_years: v }))} type="number" placeholder="1" /></Field>
              <Field label="HSN Code"><Input value={editForm.hsn_code || ""} onChange={v => setEditForm(p => ({ ...p, hsn_code: v }))} placeholder="8703" /></Field>
              <Field label="Condition">
                <Select value={editForm.is_used ? "used" : "new"} onChange={v => setEditForm(p => ({ ...p, is_used: v === "used" }))} options={[{value:"new",label:"New"},{value:"used",label:"Used / Refurbished"}]} />
              </Field>
            </div>
            <Field label="Update Main Photo" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", padding: "10px", border: `2px dashed ${C.border}`, borderRadius: 8, cursor: "pointer", textAlign: "center", background: C.bg, fontSize: 12, color: C.textMid }}>
                    📷 Click to upload new main photo
                    <input type="file" accept="image/*" onChange={e => setEditForm(p => ({ ...p, thumbnail: e.target.files[0] || null }))} style={{ display: "none" }} />
                  </label>
                  <div style={{ marginTop: 6, fontSize: 12, color: C.textDim }}>Or update image URL:</div>
                  <Input value={editForm.thumbnail_url || ""} onChange={v => setEditForm(p => ({ ...p, thumbnail_url: v }))} placeholder="https://example.com/vehicle.jpg" />
                </div>
                {(editVehicle.thumbnail || editForm.thumbnail || editForm.thumbnail_url) && (
                  <img src={editForm.thumbnail ? URL.createObjectURL(editForm.thumbnail) : (editForm.thumbnail_url || editVehicle.thumbnail)} alt="preview"
                    style={{ width: 100, height: 75, objectFit: "cover", borderRadius: 8, border: `1.5px solid ${C.border}` }} />
                )}
              </div>
            </Field>
            <Field label={`Gallery Photos (${editGalleryImages.length} existing)`} style={{ marginTop: 8 }}>
              {editGalleryImages.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {editGalleryImages.map(img => (
                    <div key={img.id} style={{ position: "relative" }}>
                      <img src={img.url} alt="gallery" style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 6, border: `1.5px solid ${C.border}` }} />
                      <button type="button" onClick={async () => {
                        try {
                          await apiFetch(`/vehicles/${editVehicle.id}/images/${img.id}/`, { method: "DELETE" });
                          setEditGalleryImages(p => p.filter(x => x.id !== img.id));
                        } catch { toast("Failed to delete image", "error"); }
                      }} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: C.danger, color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <label style={{ display: "block", padding: "10px", border: `2px dashed ${C.border}`, borderRadius: 8, cursor: "pointer", textAlign: "center", background: C.bg, fontSize: 12, color: C.textMid }}>
                🖼️ Add more gallery photos (up to {8 - editGalleryImages.length} more)
                <input type="file" accept="image/*" multiple onChange={e => setEditGalleryFiles(Array.from(e.target.files).slice(0, 8 - editGalleryImages.length))} style={{ display: "none" }} />
              </label>
              {editGalleryFiles.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {editGalleryFiles.map((f, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 6, border: `1.5px solid ${C.border}` }} />
                      <button type="button" onClick={() => setEditGalleryFiles(p => p.filter((_, idx) => idx !== i))}
                        style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: C.danger, color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Description">
              <TextArea value={editForm.description} onChange={v => setEditForm(p => ({ ...p, description: v }))} rows={3} placeholder="Vehicle description..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setEditVehicle(null)} />
              <Btn label={editSaving ? "Saving..." : "Save Changes"} color={C.primary} type="submit" disabled={editSaving} />
            </div>
          </form>
        </Modal>
      )}

      {/* View Vehicle Modal */}
      {viewVehicle && (
        <Modal title={`${viewVehicle.brand_name} ${viewVehicle.model_name}`} onClose={() => setViewVehicle(null)} width={500}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Brand",       viewVehicle.brand_name],
              ["Model",       viewVehicle.model_name],
              ["Fuel Type",   viewVehicle.fuel_type],
              ["Price",       `₹${Number(viewVehicle.price).toLocaleString("en-IN")}`],
              ["Stock",       viewVehicle.stock_quantity],
              ["Status",      viewVehicle.stock_status?.replace("_"," ")],
              ["Year",        viewVehicle.year],
              ["Type",        viewVehicle.vehicle_type],
            ].map(([label, val]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label.toUpperCase()}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{val || "—"}</div>
              </div>
            ))}
          </div>
          {viewVehicle.description && (
            <div style={{ marginTop: 14, background: C.bg, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>DESCRIPTION</div>
              <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{viewVehicle.description}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn label="Edit Vehicle" color={C.primary} onClick={() => { setViewVehicle(null); openEdit(viewVehicle); }} />
            <Btn label="Close" outline color={C.textMid} onClick={() => setViewVehicle(null)} />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)} width={400}>
          <div style={{ fontSize: 14, color: C.text, marginBottom: 20 }}>
            Are you sure you want to remove this vehicle from inventory? This action marks it as inactive and cannot be undone easily.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn label="Cancel" outline color={C.textMid} onClick={() => setDeleteId(null)} />
            <Btn label="Yes, Delete" color={C.danger} onClick={confirmDelete} />
          </div>
        </Modal>
      )}

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.surface, borderRadius: 12, padding: 24, maxWidth: 320, width: "100%", margin: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Add New Brand</div>
            <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Brand name" autoFocus
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Existing brands — click 🗑 to remove:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {brands.map(b => (
                  <span key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f3f4f6", borderRadius: 6, padding: "3px 8px", fontSize: 12 }}>
                    {b.name}
                    <button onClick={async () => {
                      try {
                        await apiFetch(`/brands/${b.id}/`, { method: "DELETE" });
                        setBrands(prev => prev.filter(x => x.id !== b.id));
                        if (form.brand_id === b.id) setForm(f => ({ ...f, brand_id: "" }));
                        toast(`Brand "${b.name}" removed.`, "success");
                      } catch { toast("Cannot delete brand with existing vehicles.", "error"); }
                    }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: 0, lineHeight: 1 }}>🗑</button>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => { setShowAddBrand(false); setNewBrandName(""); }} style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={async () => {
                if (!newBrandName.trim()) return;
                let r;
                try {
                  r = await apiFetch("/brands/", { method: "POST", body: JSON.stringify({ name: newBrandName.trim() }) });
                } catch (err) {
                  // If brand already exists (409 or 400 with "already exists"), find it in existing list
                  const existing = brands.find(b => b.name.toLowerCase() === newBrandName.trim().toLowerCase());
                  if (existing) {
                    setShowAddBrand(false);
                    setNewBrandName("");
                    setForm(f => ({ ...f, brand_id: existing.id }));
                    setEditForm(f => ({ ...f, brand_id: existing.id }));
                    toast(`Brand "${existing.name}" already exists — selected.`, "info");
                    return;
                  }
                  toast(typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add brand.", "error");
                  return;
                }
                setBrands(prev => [...prev, r]);
                setShowAddBrand(false);
                setNewBrandName("");
                setForm(f => ({ ...f, brand_id: r.id }));
                setEditForm(f => ({ ...f, brand_id: r.id }));
                toast(`Brand "${r.name}" added!`, "success");
              }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Type Modal */}
      {showAddVType && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.surface, borderRadius: 12, padding: 24, maxWidth: 340, width: "100%", margin: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Add New Vehicle Type</div>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 12 }}>e.g. School Van, Delivery Cart, Garbage Van…</div>
            <input value={newVTypeName} onChange={e => setNewVTypeName(e.target.value)} placeholder="Type name" autoFocus
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAddVType(false); setNewVTypeName(""); }} style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={async () => {
                const name = newVTypeName.trim();
                if (!name) return;
                try {
                  const r = await apiFetch("/vehicle-types/", { method: "POST", body: JSON.stringify({ name }) });
                  const newType = { slug: r.slug, name: r.name };
                  setVehicleTypes(prev => [...prev, newType]);
                  // Apply to whichever form is currently open
                  setForm(f => ({ ...f, vehicle_type: r.slug }));
                  setEditForm(f => ({ ...f, vehicle_type: r.slug }));
                  setShowAddVType(false); setNewVTypeName("");
                  toast(`Vehicle type "${name}" added!`, "success");
                } catch { toast("Failed to create type. Try again.", "error"); }
              }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create</button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LEADS PAGE
// ═══════════════════════════════════════════════════════
function Leads({ onNavigate }) {
  const C = useC();
  const toast = useToast();
  const plan = usePlan();
  const [tab, setTab] = useState("leads"); // "leads" | "enquiries"
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", email: "", source: "website", status: "new", notes: "", vehicle: "" });
  const [vehicles, setVehicles] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const debouncedLeadSearch = useDebounce(leadSearch, 300);
  const [enquiryPage, setEnquiryPage] = useState(1);
  const [enquiryTotal, setEnquiryTotal] = useState(0);
  const [enquirySearch, setEnquirySearch] = useState("");
  const debouncedEnquirySearch = useDebounce(enquirySearch, 350);
  const [enquiryDateFrom, setEnquiryDateFrom] = useState("");
  const [enquiryDateTo, setEnquiryDateTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.leads.list(qs)
      .then(d => setLeads(d.results || d))
      .catch(err => { console.error("Failed to load leads:", err); setError("Failed to load leads. Please try again."); })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const loadEnquiries = useCallback(() => {
    setEnquiriesLoading(true);
    const p = new URLSearchParams();
    if (debouncedEnquirySearch) p.set("search", debouncedEnquirySearch);
    if (enquiryDateFrom)        p.set("date_from", enquiryDateFrom);
    if (enquiryDateTo)          p.set("date_to", enquiryDateTo);
    p.set("page", enquiryPage);
    api.enquiries.list(`?${p}`).then(d => { setEnquiries(d.results || []); setEnquiryTotal(d.count || 0); }).catch(() => {}).finally(() => setEnquiriesLoading(false));
  }, [debouncedEnquirySearch, enquiryDateFrom, enquiryDateTo, enquiryPage]);

  useEffect(() => {
    load();
    api.vehicles.list()
      .then(d => setVehicles(d.results || d))
      .catch(err => console.error("Failed to load vehicles:", err));
  }, [load]);

  // Poll enquiries every 30 seconds when on that tab
  useEffect(() => {
    if (tab !== "enquiries") return;
    loadEnquiries();
    const id = setInterval(loadEnquiries, 30000);
    return () => clearInterval(id);
  }, [tab, loadEnquiries]);

  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { toast("Customer name is required.", "warning"); return; }
    if (!form.phone.trim()) { toast("Phone number is required.", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      toast("Please enter a valid 10-digit Indian mobile number.", "warning"); return;
    }
    try {
      await api.leads.create(form);
      toast("Lead added successfully!", "success");
      setShowAdd(false); load();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add lead.";
      toast(msg, "error");
    }
  };

  const updateStatus = async (id, status) => {
    await api.leads.update(id, { status });
    setLeads(p => p.map(l => l.id === id ? { ...l, status } : l));
  };

  const markEnquiryProcessed = async (id) => {
    await api.enquiries.markProcessed(id);
    setEnquiries(p => p.map(e => e.id === id ? { ...e, is_processed: true } : e));
    toast("Marked as processed.", "success");
  };

  const filteredLeads = leads.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (debouncedLeadSearch) {
      const q = debouncedLeadSearch.toLowerCase();
      return l.customer_name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q) || l.notes?.toLowerCase().includes(q);
    }
    return true;
  });

  const cols = [
    { label: "Customer", render: r => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
        <a href={`tel:${r.phone}`} style={{ fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600 }}>📞 {r.phone}</a>
        {r.email && <div style={{ fontSize: 10, color: C.textDim }}>{r.email}</div>}
      </div>
    )},
    { label: "Vehicle",  render: r => <span style={{ fontSize: 12 }}>{r.vehicle_name || "—"}</span> },
    { label: "Source",   render: r => <Badge label={r.source.replace("_"," ")} color={C.info} /> },
    { label: "Status",   render: r => (
      <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
        style={{ border: `1.5px solid ${LEAD_COLOR[r.status]}55`, borderRadius: 6, padding: "3px 8px", fontSize: 12, background: `${LEAD_COLOR[r.status]}15`, color: LEAD_COLOR[r.status], cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
        {["new","interested","follow_up","converted","lost"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
      </select>
    )},
    { label: "Notes", render: r => <span style={{ fontSize: 11, color: C.textMid, maxWidth: 160, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.notes}>{r.notes || "—"}</span> },
    { label: "Date", render: r => <span style={{ fontSize: 12, color: C.textDim }}>{fmtDate(r.created_at)}</span> },
    { label: "Actions", render: r => (
      <div style={{ display: "flex", gap: 6 }}>
        <a href={`tel:${r.phone}`} style={{ padding: "4px 10px", borderRadius: 6, background: `${C.success}15`, border: `1px solid ${C.success}44`, color: C.success, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>📞 Call</a>
        {r.email && <a href={`mailto:${r.email}`} style={{ padding: "4px 10px", borderRadius: 6, background: `${C.info}15`, border: `1px solid ${C.info}44`, color: C.info, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>✉ Email</a>}
        <Btn label="Delete" size="sm" outline color={C.danger} onClick={() => { if (confirm(`Delete lead for ${r.customer_name}?`)) api.leads.delete(r.id).then(load); }} />
      </div>
    )},
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: C.bg, borderRadius: 8, padding: 4, width: "fit-content" }}>
        {[["leads","Pipeline Leads"],["enquiries","Buyer Enquiries"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 20px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
            fontWeight: 600, fontSize: 13, background: tab === id ? C.primary : "transparent",
            color: tab === id ? "#fff" : C.textMid,
          }}>
            {label}
            {id === "enquiries" && enquiries.filter(e => !e.is_processed).length > 0 && (
              <span style={{ marginLeft: 6, background: C.danger, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>
                {enquiries.filter(e => !e.is_processed).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "leads" && (
        <>
          <Card padding={12} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Search name / phone / notes…"
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", minWidth: 180 }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, cursor: "pointer" }}>
                  <option value="">All Statuses</option>
                  {["new","interested","follow_up","converted","lost"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                </select>
                <DateFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label="↺ Refresh" size="sm" outline color={C.primary} onClick={load} />
                <Btn label="+ Add Lead" color={C.primary} onClick={() => setShowAdd(true)} />
              </div>
            </div>
          </Card>
          <Card padding={0}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>
              Pipeline Leads ({filteredLeads.length}{filteredLeads.length !== leads.length ? ` of ${leads.length}` : ""}){(dateFrom || dateTo || statusFilter || leadSearch) && <span style={{ fontSize: 12, color: C.primary, fontWeight: 400, marginLeft: 8 }}>filtered</span>}
            </div>
            {loading ? <Spinner /> : <Table cols={cols} rows={filteredLeads} />}
          </Card>
        </>
      )}

      {tab === "enquiries" && (
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Buyer Enquiries from Marketplace</div>
          </div>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={enquirySearch} onChange={e => { setEnquirySearch(e.target.value); setEnquiryPage(1); }}
              placeholder="Search buyer name / phone..." style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
            <DateFilter from={enquiryDateFrom} to={enquiryDateTo} onChange={(f,t) => { setEnquiryDateFrom(f); setEnquiryDateTo(t); setEnquiryPage(1); }} />
            <Btn label="Refresh" size="sm" outline onClick={loadEnquiries} />
          </div>
          {enquiriesLoading && enquiries.length === 0 ? <Spinner /> : (
            <div style={{ overflowX: "auto" }}>
              {enquiries.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  No buyer enquiries yet. Enquiries from the public marketplace will appear here.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Buyer", "Phone", "City", "Vehicle Interest", "Message", "Time", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(e => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: e.is_processed ? C.surface : `${C.primary}08`, opacity: e.is_processed ? 0.65 : 1 }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{e.customer_name}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <a href={`tel:${e.phone}`} style={{ color: C.primary, fontWeight: 600, textDecoration: "none" }}>{e.phone}</a>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid, fontSize: 12 }}>{e.city || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12 }}>{e.vehicle || "General Inquiry"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textMid, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.notes || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 11, color: C.textDim, whiteSpace: "nowrap" }}>
                          {new Date(e.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {e.is_processed
                            ? <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>✓ Done</span>
                            : <Btn label="Mark Done" size="sm" color={C.success} onClick={() => markEnquiryProcessed(e.id)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <Pagination page={enquiryPage} totalPages={Math.ceil(enquiryTotal/20)} onPage={setEnquiryPage} />
        </Card>
      )}

      {showAdd && (
        <Modal title="Add New Lead" onClose={() => setShowAdd(false)}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Customer Name" required><Input value={form.customer_name} onChange={setF("customer_name")} required /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={setF("phone")} type="tel" required /></Field>
              <Field label="Email"><Input value={form.email} onChange={setF("email")} type="email" placeholder="optional" /></Field>
              <Field label="Source">
                <Select value={form.source} onChange={setF("source")} options={[{value:"walk_in",label:"Walk-in"},{value:"phone",label:"Phone"},{value:"website",label:"Website"},{value:"referral",label:"Referral"},{value:"social",label:"Social Media"},{value:"marketplace",label:"Marketplace"}]} />
              </Field>
              <Field label="Initial Status">
                <Select value={form.status} onChange={setF("status")} options={["new","interested","follow_up","converted","lost"].map(s => ({ value: s, label: s.replace("_"," ") }))} />
              </Field>
              <Field label="Vehicle Interest">
                <Select value={form.vehicle} onChange={setF("vehicle")} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: `${v.brand_name} ${v.model_name}` }))} />
              </Field>
            </div>
            <Field label="Notes"><textarea value={form.notes} onChange={e => setF("notes")(e.target.value)} rows={2} style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAdd(false)} />
              <Btn label="Add Lead" color={C.primary} type="submit" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INVOICE VIEW (matching reference image)
// ═══════════════════════════════════════════════════════
function InvoiceView({ inv }) {
  const C = useC();
  if (!inv) return null;
  return (
    <div style={{ fontFamily: "inherit", fontSize: 13, color: C.text }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 18, borderBottom: `2px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Georgia, serif" }}>
            🛺 eRickshaw<span style={{ color: C.accent }}>Dekho</span>.com
          </div>
          <div style={{ color: C.textMid, marginTop: 4, fontSize: 12 }}>{inv.dealer?.address}, {inv.dealer?.city}</div>
          <div style={{ color: C.textMid, fontSize: 12 }}>📞 {inv.dealer?.phone}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>GSTIN: {inv.dealer?.gstin}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: C.primary }}>INVOICE</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>Invoice No. <b>{inv.invoice_number}</b></div>
          <div style={{ fontSize: 12 }}>Date: <b>{fmtDate(inv.sale_date)}</b></div>
          <div style={{ marginTop: 8, background: `${C.success}15`, border: `2px solid ${C.success}`, borderRadius: 6, padding: "5px 14px", display: "inline-block", color: C.success, fontWeight: 700, fontSize: 13 }}>✓ PAID</div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.primary }}>BILL TO</div>
        <div style={{ fontWeight: 700 }}>{inv.customer?.name}</div>
        <div style={{ color: C.textMid, fontSize: 12 }}>{inv.customer?.address}</div>
        {inv.customer?.gstin && <div style={{ color: C.textDim, fontSize: 11 }}>GSTIN: {inv.customer.gstin}</div>}
        <div style={{ color: C.textMid, fontSize: 12 }}>📞 {inv.customer?.phone}</div>
      </div>

      {/* Line items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr style={{ background: C.primary, color: "#fff" }}>
            {["Item Description","HSN/SAC","Unit Price","Qty","Amount"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: h === "Item Description" ? "left" : "right", fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: "14px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 48, height: 36, background: `${C.primary}12`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛺</div>
              <div>
                <div style={{ fontWeight: 600 }}>{inv.vehicle?.name}</div>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "capitalize" }}>{inv.vehicle?.fuel_type} Rickshaw™</div>
              </div>
            </td>
            <td style={{ padding: "14px 12px", textAlign: "right" }}>{inv.vehicle?.hsn}</td>
            <td style={{ padding: "14px 12px", textAlign: "right" }}>{fmtINR(inv.unit_price)}</td>
            <td style={{ padding: "14px 12px", textAlign: "right" }}>{inv.quantity}</td>
            <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 600 }}>{fmtINR(inv.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 260 }}>
          {[
            ["Subtotal",  fmtINR(inv.subtotal),  false],
            [`CGST ${inv.cgst_rate}%`, fmtINR(inv.cgst_amount), false],
            [`SGST ${inv.sgst_rate}%`, fmtINR(inv.sgst_amount), false],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textMid }}>{l}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 8, background: C.primary, color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 15 }}>
            <span>Total Amount</span><span>{fmtINR(inv.total_amount)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <Btn label="Print Invoice" color={C.primary} onClick={() => window.print()} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CUSTOMERS PAGE
// ═══════════════════════════════════════════════════════
function Customers() {
  const C = useC();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "", gstin: "" });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toast = useToast();
  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (dateFrom)        p.set("date_from", dateFrom);
    if (dateTo)          p.set("date_to", dateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.customers.list(qs).then(d => setCustomers(d.results || d)).finally(() => setLoading(false));
  }, [debouncedSearch, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);
  const setF = k => v => setForm(p => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast("Customer name is required.", "warning"); return; }
    if (!form.phone.trim()) { toast("Phone number is required.", "warning"); return; }
    try {
      await api.customers.create(form);
      toast("Customer added!", "success");
      setShowAdd(false); load();
    } catch(err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add customer.";
      toast(msg, "error");
    }
  };

  const cols = [
    { label: "Name",      render: r => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: C.textDim }}>{r.email}</div></div> },
    { label: "Phone",     key: "phone" },
    { label: "City",      key: "city" },
    { label: "Purchases", render: r => <Badge label={r.total_purchases} color={C.primary} /> },
    { label: "Spent",     render: r => <span style={{ fontWeight: 600 }}>{fmtINR(r.total_spent)}</span> },
    { label: "Joined",    render: r => <span style={{ fontSize: 12, color: C.textDim }}>{fmtDate(r.created_at)}</span> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / phone..."
            style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
          <DateFilter from={dateFrom} to={dateTo} onChange={(f,t) => { setDateFrom(f); setDateTo(t); }} />
          <Btn label="↺ Refresh" size="sm" outline onClick={load} />
          <Btn label="+ Add Customer" onClick={() => setShowAdd(true)} />
        </div>
      </Card>
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>All Customers</div>
        {loading ? <Spinner /> : <Table cols={cols} rows={customers} />}
      </Card>
      {showAdd && (
        <Modal title="Add Customer" onClose={() => setShowAdd(false)}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Name" required><Input value={form.name} onChange={setF("name")} required /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={setF("phone")} required /></Field>
              <Field label="Email"><Input value={form.email} onChange={setF("email")} type="email" /></Field>
              <Field label="City"><Input value={form.city} onChange={setF("city")} /></Field>
              <Field label="GSTIN"><Input value={form.gstin} onChange={setF("gstin")} placeholder="09XXXXX" /></Field>
            </div>
            <Field label="Address"><Input value={form.address} onChange={setF("address")} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAdd(false)} />
              <Btn label="Add Customer" color={C.primary} type="submit" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FINANCE PAGE
// ═══════════════════════════════════════════════════════
function Finance() {
  const C = useC();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("loans");
  // ── EMI Calculator ──
  const [emiForm, setEmiForm] = useState({ principal: 150000, rate: 12, tenure: 36 });
  const [emiResult, setEmiResult] = useState(null);
  // ── Loans ──
  const [loans, setLoans] = useState([]);
  const [loanSearch, setLoanSearch] = useState("");
  const debouncedLoanSearch = useDebounce(loanSearch, 350);
  const [loanDateFrom, setLoanDateFrom] = useState("");
  const [loanDateTo, setLoanDateTo] = useState("");
  const [showNewLoan, setShowNewLoan] = useState(false);
  const [newLoan, setNewLoan] = useState({ customer_name: "", loan_amount: "", interest_rate: "12.0", tenure_months: "36", bank_name: "", status: "pending" });
  const [savingLoan, setSavingLoan] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  // ── Financers ──
  const [financers, setFinancers] = useState([]);
  const [financerSearch, setFinancerSearch] = useState("");
  const dFinancerSearch = useDebounce(financerSearch, 350);
  const [selectedFinancer, setSelectedFinancer] = useState(null);
  const [applyingFinancer, setApplyingFinancer] = useState(null);
  const [finReqs, setFinReqs] = useState([]);
  // ── Finance Applications ──
  const [finApps, setFinApps] = useState([]);
  const [showNewFinApp, setShowNewFinApp] = useState(false);
  const [newFinApp, setNewFinApp] = useState({ financer: "", vehicle: "", vehicle_price: "", customer_name: "", customer_phone: "", customer_email: "", customer_aadhaar: "", customer_pan: "", loan_amount: "", down_payment: "", tenure_months: "36" });
  const [savingFinApp, setSavingFinApp] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [finAppDetail, setFinAppDetail] = useState(null);
  const [finAppDocs, setFinAppDocs] = useState([]);
  const [finAppDocFiles, setFinAppDocFiles] = useState([]); // [{file, label, doc_type}]
  const [uploadingFinAppDoc, setUploadingFinAppDoc] = useState(false);
  const [finAppRemarks, setFinAppRemarks] = useState([]);
  const [postingFinAppRemark, setPostingFinAppRemark] = useState(false);
  const [finAppRemarkText, setFinAppRemarkText] = useState("");

  const setF = k => v => setEmiForm(p => ({ ...p, [k]: v }));
  const setNL = k => v => setNewLoan(p => ({ ...p, [k]: v }));
  const setNFA = k => v => setNewFinApp(p => ({ ...p, [k]: v }));

  const STATUS_COLORS = { pending: C.warning, approved: C.success, rejected: C.danger, disbursed: C.info, submitted: C.warning, under_review: C.info, docs_required: C.warning };
  const STATUS_NEXT = { pending: ["approved","rejected"], approved: ["disbursed","rejected"], rejected: [], disbursed: [] };

  const loadLoans = useCallback(() => {
    const p = new URLSearchParams();
    if (debouncedLoanSearch) p.set("search", debouncedLoanSearch);
    if (loanDateFrom) p.set("date_from", loanDateFrom);
    if (loanDateTo)   p.set("date_to", loanDateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.finance.loans(qs).then(d => setLoans(d.results || d)).catch(() => {});
  }, [debouncedLoanSearch, loanDateFrom, loanDateTo]);

  const loadFinancers = useCallback(() => {
    const p = new URLSearchParams();
    if (dFinancerSearch) p.set("search", dFinancerSearch);
    api.dealer.financers(`?${p}`).then(d => setFinancers(d.results || d || [])).catch(() => {});
  }, [dFinancerSearch]);

  const loadFinApps = useCallback(() => {
    api.dealer.finApps().then(d => setFinApps(d.results || d || [])).catch(() => {});
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);
  useEffect(() => { if (activeTab === "financers") loadFinancers(); }, [activeTab, loadFinancers]);
  useEffect(() => { if (activeTab === "applications") { loadFinApps(); api.vehicles.list().then(d => setVehicles(d.results || d || [])).catch(() => {}); } }, [activeTab, loadFinApps]);

  const calcEMI = async () => {
    try { const r = await api.finance.emi({ ...emiForm }); setEmiResult(r); }
    catch { toast("EMI calculation failed.", "error"); }
  };

  const handleNewLoan = async (e) => {
    e.preventDefault();
    if (!newLoan.customer_name.trim()) { toast("Customer name required.", "warning"); return; }
    if (!newLoan.loan_amount || parseFloat(newLoan.loan_amount) <= 0) { toast("Valid loan amount required.", "warning"); return; }
    setSavingLoan(true);
    try {
      let emi_amount = null;
      try { const r = await api.finance.emi({ principal: newLoan.loan_amount, rate: newLoan.interest_rate, tenure: newLoan.tenure_months }); emi_amount = r.emi; } catch { /* ignore */ }
      await api.finance.create({ ...newLoan, emi_amount });
      toast("Loan application created!", "success");
      setShowNewLoan(false);
      setNewLoan({ customer_name: "", loan_amount: "", interest_rate: "12.0", tenure_months: "36", bank_name: "", status: "pending" });
      loadLoans();
    } catch (err) { toast(err?.message || "Failed to create loan.", "error"); }
    setSavingLoan(false);
  };

  const updateStatus = async (loan, newStatus) => {
    try {
      await api.finance.updateLoan(loan.id, { status: newStatus });
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: newStatus } : l));
      toast(`Status updated to ${newStatus}.`, "success");
    } catch { toast("Failed to update status.", "error"); }
  };

  const handleApplyFinancer = async (financerId) => {
    setApplyingFinancer(financerId);
    try {
      await api.dealer.applyFinancer(financerId);
      loadFinancers();
      toast("Application sent! Awaiting financer approval.", "success");
    } catch (err) {
      const msg = err?.detail || err?.error || "Failed to apply.";
      toast(msg, "error");
    }
    setApplyingFinancer(null);
  };

  const openFinancerReqs = async (f) => {
    setSelectedFinancer(f);
    try { const r = await api.dealer.financerReqs(f.id); setFinReqs(r.results || r || []); } catch { setFinReqs([]); }
  };

  const openFinAppDetail = async (app) => {
    setFinAppDetail(app);
    setFinAppDocs([]);
    setFinAppRemarks(app.remarks || []);
    setFinAppRemarkText("");
    try { const r = await api.dealer.finAppDocs(app.id); setFinAppDocs(r.results || r || []); } catch { setFinAppDocs([]); }
    try { const r = await api.dealer.finAppRemarks(app.id); setFinAppRemarks(Array.isArray(r) ? r : r.results || []); } catch { /* keep embedded */ }
  };

  const handlePostFinAppRemark = async () => {
    if (!finAppDetail || !finAppRemarkText.trim()) return;
    setPostingFinAppRemark(true);
    try {
      const r = await api.dealer.postFinAppRemark(finAppDetail.id, { content: finAppRemarkText.trim() });
      setFinAppRemarks(prev => [...prev, r]);
      setFinAppRemarkText("");
    } catch { /* ignore */ }
    setPostingFinAppRemark(false);
  };

  const detectDocType = (filename) => {
    const n = filename.toLowerCase();
    if (n.includes('aadhaar') || n.includes('aadhar')) return 'aadhaar';
    if (n.includes('pan')) return 'pan';
    if (n.includes('bank') || n.includes('statement')) return 'bank_statement';
    if (n.includes('income') || n.includes('salary')) return 'income_proof';
    if (n.includes('address') || n.includes('utility')) return 'address_proof';
    if (n.includes('photo') || n.includes('passport')) return 'passport_photo';
    if (n.includes('quotation') || n.includes('quote')) return 'vehicle_quotation';
    if (n.includes('license') || n.includes('driving')) return 'driving_license';
    if (n.includes('voter')) return 'voter_id';
    return 'other';
  };

  const handleUploadFinAppDocs = async () => {
    if (!finAppDetail || finAppDocFiles.length === 0) return;
    setUploadingFinAppDoc(true);
    const oversized = finAppDocFiles.filter(df => df.file.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast(`File too large (max 5MB): ${oversized.map(f => f.file.name).join(', ')}`, 'error');
      setUploadingFinAppDoc(false);
      return;
    }
    let uploaded = 0;
    for (const { file, label, doc_type } of finAppDocFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", doc_type || "other");
      fd.append("notes", label || "");
      try {
        await api.dealer.uploadFinAppDoc(finAppDetail.id, fd);
        uploaded++;
      } catch { /* continue */ }
    }
    const r = await api.dealer.finAppDocs(finAppDetail.id);
    setFinAppDocs(r.results || r || []);
    setFinAppDocFiles([]);
    setUploadingFinAppDoc(false);
    toast(`${uploaded} document(s) uploaded`, "success");
  };

  const handleCreateFinApp = async (doSubmit = false) => {
    if (!newFinApp.financer) { toast("Select a financer", "warning"); return; }
    if (!newFinApp.customer_name || !newFinApp.customer_phone) { toast("Customer name and phone required", "warning"); return; }
    if (doSubmit && !newFinApp.loan_amount) { toast("Loan amount is required to submit", "warning"); return; }
    setSavingFinApp(true);
    try {
      const payload = { ...newFinApp };
      if (doSubmit) payload.submit = true;
      await api.dealer.createFinApp(payload);
      toast(doSubmit ? "Application submitted to financer!" : "Draft saved.", "success");
      setShowNewFinApp(false);
      setNewFinApp({ financer: "", vehicle: "", vehicle_price: "", customer_name: "", customer_phone: "", customer_email: "", customer_aadhaar: "", customer_pan: "", loan_amount: "", down_payment: "", tenure_months: "36" });
      loadFinApps();
    } catch (err) {
      const msg = err?.detail || err?.error || Object.values(err || {}).flat().join(" ") || "Failed to create.";
      toast(msg, "error");
    }
    setSavingFinApp(false);
  };

  const TABS = [
    { id: "loans",        label: "Internal Loans",   icon: "🏦" },
    { id: "financers",    label: "Loan Partners",    icon: "🤝" },
    { id: "applications", label: "Finance Apps",     icon: "📄" },
    { id: "emi",          label: "EMI Calculator",   icon: "🔢" },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `2px solid ${C.border}`, paddingBottom: 0, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "10px 18px", border: "none", background: "transparent",
            borderBottom: activeTab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
            color: activeTab === t.id ? C.primary : C.textMid,
            fontWeight: activeTab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── EMI Calculator ── */}
      {activeTab === "emi" && (
        <div className="erd-finance-layout" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          <Card>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: C.text }}>💰 EMI Calculator</div>
            <Field label="Loan Amount (₹)"><Input value={emiForm.principal} onChange={setF("principal")} type="number" /></Field>
            <Field label="Interest Rate (% p.a.)"><Input value={emiForm.rate} onChange={setF("rate")} type="number" step="0.1" /></Field>
            <Field label="Tenure (months)"><Input value={emiForm.tenure} onChange={setF("tenure")} type="number" /></Field>
            <Btn label="Calculate EMI" color={C.primary} onClick={calcEMI} fullWidth />
            {emiResult && (
              <div style={{ marginTop: 18, background: `${C.primary}08`, border: `1.5px solid ${C.primary}33`, borderRadius: 10, padding: 16 }}>
                {[
                  ["Monthly EMI",    fmtINR(emiResult.emi),           C.primary],
                  ["Total Payment",  fmtINR(emiResult.total_payment), C.text],
                  ["Total Interest", fmtINR(emiResult.total_interest),C.danger],
                  ["Principal",      fmtINR(emiResult.principal),     C.text],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: C.textMid }}>{l}</span>
                    <span style={{ fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div style={{ color: C.textDim, fontSize: 13, paddingTop: 40, textAlign: "center" }}>
            Enter loan details on the left to calculate EMI instantly.
          </div>
        </div>
      )}

      {/* ── Internal Loans ── */}
      {activeTab === "loans" && (
        <div className="erd-finance-layout" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: C.text }}>📊 Loan Summary</div>
            {[
              ["Total Loans", loans.length, C.text],
              ["Pending",  loans.filter(l => l.status === "pending").length,  C.warning],
              ["Approved", loans.filter(l => l.status === "approved").length, C.success],
              ["Disbursed",loans.filter(l => l.status === "disbursed").length,C.info],
              ["Rejected", loans.filter(l => l.status === "rejected").length, C.danger],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMid }}>{l}</span>
                <span style={{ fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
          </Card>
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder="Search customer / bank..."
                  style={{ flex: 1, minWidth: 160, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <DateFilter from={loanDateFrom} to={loanDateTo} onChange={(f,t) => { setLoanDateFrom(f); setLoanDateTo(t); }} />
                <Btn label="↺" size="sm" outline onClick={loadLoans} />
                <Btn label="+ New Loan" color={C.primary} size="sm" onClick={() => setShowNewLoan(true)} />
              </div>
            </Card>
            <Card padding={0}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Loan Applications</span>
                <span style={{ fontSize: 12, color: C.textDim }}>{loans.length} total</span>
              </div>
              <div className="erd-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Customer","Amount","EMI","Tenure","Bank","Status","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMid, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loans.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textDim }}>No loan applications. Click "+ New Loan" to add one.</td></tr>
                    ) : loans.map((loan, i) => (
                      <tr key={loan.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : `${C.bg}80` }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{loan.customer_name}</td>
                        <td style={{ padding: "10px 14px", color: C.primary, fontWeight: 700 }}>{fmtINR(loan.loan_amount)}</td>
                        <td style={{ padding: "10px 14px", color: C.textMid }}>{loan.emi_amount ? fmtINR(loan.emi_amount) : "—"}</td>
                        <td style={{ padding: "10px 14px", color: C.textMid }}>{loan.tenure_months}m</td>
                        <td style={{ padding: "10px 14px", color: C.textMid }}>{loan.bank_name || "—"}</td>
                        <td style={{ padding: "10px 14px" }}><Badge label={loan.status} color={STATUS_COLORS[loan.status] || C.textMid} /></td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                            {(STATUS_NEXT[loan.status] || []).map(s => (
                              <button key={s} onClick={() => updateStatus(loan, s)} style={{ padding: "3px 10px", borderRadius: 6, border: `1.5px solid ${STATUS_COLORS[s]}`, background: `${STATUS_COLORS[s]}12`, color: STATUS_COLORS[s], fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
                            ))}
                            <button onClick={() => setSelectedLoan(loan)} style={{ padding: "3px 10px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "transparent", color: C.textMid, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Loan Partners ── */}
      {activeTab === "financers" && (
        <div>
          <Card style={{ marginBottom: 14, padding: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input value={financerSearch} onChange={e => setFinancerSearch(e.target.value)} placeholder="Search financer / city..."
                style={{ flex: 1, minWidth: 160, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
              <Btn label="↺ Refresh" size="sm" outline onClick={loadFinancers} />
            </div>
          </Card>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>
            These are verified financers on the platform. Apply to partner with them and submit loan applications for your customers.
          </div>
          <Card padding={0}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Financer","City","Interest Rate","Max Loan","Association","Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financers.map(f => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{f.company_name || f.username}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{f.city}</div>
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textMid }}>{f.city || "—"}</td>
                    <td style={{ padding: "12px 14px", color: C.textMid }}>
                      {f.interest_rate_min && f.interest_rate_max ? `${f.interest_rate_min}%–${f.interest_rate_max}%` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textMid }}>
                      {f.max_loan_amount ? fmtINR(f.max_loan_amount) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge label={f.association_status || "Not Applied"} color={f.association_status === "approved" ? C.success : f.association_status === "pending" ? C.warning : f.association_status === "rejected" ? C.danger : C.textDim} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn label="Details" size="sm" outline color={C.info} onClick={() => openFinancerReqs(f)} />
                        {(!f.association_status || f.association_status === "rejected") && (
                          <Btn label={applyingFinancer === f.id ? "Applying..." : "Apply"} size="sm" color={C.primary} disabled={applyingFinancer === f.id} onClick={() => handleApplyFinancer(f.id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {financers.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.textDim }}>No verified financers available yet. Check back later.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Finance Applications ── */}
      {activeTab === "applications" && (
        <div>
          <Card style={{ marginBottom: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>Finance Applications to Loan Partners</div>
              <Btn label="+ New Application" color={C.primary} size="sm" onClick={() => setShowNewFinApp(true)} />
            </div>
          </Card>
          <Card padding={0}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Customer","Financer","Vehicle","Loan / DP","Status","Docs","Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finApps.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{a.customer_name}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{a.customer_phone}</div>
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textMid, fontSize: 12 }}>{a.financer_name || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{a.vehicle || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, color: C.success }}>{fmtINR(a.loan_amount)}</div>
                      {a.down_payment && <div style={{ fontSize: 11, color: C.textDim }}>DP: {fmtINR(a.down_payment)}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge label={a.status} color={STATUS_COLORS[a.status] || C.textMid} />
                      {a.status_notes && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, maxWidth: 120 }}>{a.status_notes}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{a.doc_count ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <Btn label="📎 Docs" size="sm" outline color={C.info} onClick={() => openFinAppDetail(a)} />
                    </td>
                  </tr>
                ))}
                {finApps.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textDim }}>No finance applications yet. Apply to a Loan Partner first, then create an application.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Financer Detail Modal ── */}
      {selectedFinancer && (
        <Modal title={`🏦 ${selectedFinancer.company_name || selectedFinancer.username}`} onClose={() => { setSelectedFinancer(null); setFinReqs([]); }}>
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {[
              ["City", selectedFinancer.city],
              ["Interest Rate", selectedFinancer.interest_rate_min && selectedFinancer.interest_rate_max ? `${selectedFinancer.interest_rate_min}% – ${selectedFinancer.interest_rate_max}%` : "—"],
              ["Max Loan Amount", selectedFinancer.max_loan_amount ? fmtINR(selectedFinancer.max_loan_amount) : "—"],
              ["Processing Fee", selectedFinancer.processing_fee_pct ? `${selectedFinancer.processing_fee_pct}%` : "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMid }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v || "—"}</span>
              </div>
            ))}
          </div>
          {finReqs.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.text }}>Documents Required from Customer:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {finReqs.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ color: r.is_mandatory ? C.danger : C.textDim }}>{r.is_mandatory ? "●" : "○"}</span>
                    <div>
                      <span style={{ fontWeight: 600 }}>{r.doc_type_label || r.doc_type?.replace(/_/g, " ")}</span>
                      {r.description && <span style={{ color: C.textDim, fontSize: 12 }}> — {r.description}</span>}
                    </div>
                    {r.is_mandatory && <Badge label="Required" color={C.danger} />}
                  </div>
                ))}
              </div>
            </>
          )}
          {finReqs.length === 0 && <div style={{ fontSize: 13, color: C.textDim }}>No specific document requirements listed.</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn label="Close" outline color={C.textMid} onClick={() => { setSelectedFinancer(null); setFinReqs([]); }} />
            {(!selectedFinancer.association_status || selectedFinancer.association_status === "rejected") && (
              <Btn label={applyingFinancer === selectedFinancer.id ? "Applying..." : "Apply to This Financer"} color={C.primary} disabled={applyingFinancer === selectedFinancer.id} onClick={() => { handleApplyFinancer(selectedFinancer.id); setSelectedFinancer(null); }} />
            )}
          </div>
        </Modal>
      )}

      {/* ── New Finance Application Modal ── */}
      {showNewFinApp && (
        <Modal title="New Finance Application" onClose={() => setShowNewFinApp(false)} width={600}>
          <form onSubmit={e => e.preventDefault()}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Loan Partner *">
                  <Select value={newFinApp.financer} onChange={setNFA("financer")} placeholder="Select financer..."
                    options={financers.filter(f => f.association_status === "approved").map(f => ({ value: f.id, label: f.company_name || f.username }))} />
                </Field>
              </div>
              <Field label="Vehicle (optional)">
                <Select value={newFinApp.vehicle} onChange={setNFA("vehicle")} placeholder="Select vehicle..."
                  options={[{ value: "", label: "None" }, ...vehicles.map(v => ({ value: v.id, label: `${v.brand_name} ${v.model_name}` }))]} />
              </Field>
              <Field label="Customer Name *"><Input value={newFinApp.customer_name} onChange={setNFA("customer_name")} placeholder="Full name" /></Field>
              <Field label="Customer Phone *"><Input value={newFinApp.customer_phone} onChange={setNFA("customer_phone")} placeholder="9876543210" /></Field>
              <Field label="Customer Email"><Input value={newFinApp.customer_email} onChange={setNFA("customer_email")} type="email" placeholder="customer@email.com" /></Field>
              <Field label="Aadhaar Number"><Input value={newFinApp.customer_aadhaar} onChange={setNFA("customer_aadhaar")} placeholder="XXXX XXXX XXXX" /></Field>
              <Field label="PAN Number"><Input value={newFinApp.customer_pan} onChange={setNFA("customer_pan")} placeholder="ABCDE1234F" /></Field>
              <Field label="Vehicle Price (₹)">
                <Input value={newFinApp.vehicle_price || ""} onChange={v => {
                  const vp = parseFloat(v) || 0;
                  const dp = parseFloat(newFinApp.down_payment) || 0;
                  setNewFinApp(p => ({ ...p, vehicle_price: v, loan_amount: dp ? String(Math.max(0, vp - dp)) : p.loan_amount }));
                }} type="number" placeholder="200000" />
              </Field>
              <Field label="Down Payment (₹)">
                <Input value={newFinApp.down_payment} onChange={v => {
                  const dp = parseFloat(v) || 0;
                  const vp = parseFloat(newFinApp.vehicle_price) || 0;
                  setNewFinApp(p => ({ ...p, down_payment: v, loan_amount: vp ? String(Math.max(0, vp - dp)) : p.loan_amount }));
                }} type="number" placeholder="30000" />
              </Field>
              <Field label="Loan Amount (₹) *">
                <Input value={newFinApp.loan_amount} onChange={setNFA("loan_amount")} type="number" placeholder="150000" />
                {newFinApp.vehicle_price && newFinApp.down_payment && (
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>
                    ₹{Number(newFinApp.vehicle_price || 0).toLocaleString("en-IN")} − ₹{Number(newFinApp.down_payment || 0).toLocaleString("en-IN")} = ₹{Number(newFinApp.loan_amount || 0).toLocaleString("en-IN")}
                  </div>
                )}
              </Field>
              <Field label="Tenure (months)"><Input value={newFinApp.tenure_months} onChange={setNFA("tenure_months")} type="number" placeholder="36" /></Field>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowNewFinApp(false)} />
              <Btn label={savingFinApp ? "Saving..." : "Save Draft"} outline color={C.textMid} type="button" disabled={savingFinApp} onClick={() => handleCreateFinApp(false)} />
              <Btn label={savingFinApp ? "Submitting..." : "Submit to Financer →"} color={C.primary} type="button" disabled={savingFinApp} onClick={() => handleCreateFinApp(true)} />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Finance App Detail + Documents + Remarks ── */}
      {finAppDetail && (
        <Modal title={`📎 Finance App — ${finAppDetail.customer_name}`} onClose={() => { setFinAppDetail(null); setFinAppDocs([]); setFinAppDocFiles([]); setFinAppRemarks([]); setFinAppRemarkText(""); }} width={600}>
          {/* Summary bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: C.textMid, marginBottom: 10 }}>
              <span>Financer: <b style={{ color: C.text }}>{finAppDetail.financer_name || "—"}</b></span>
              <span>Loan: <b style={{ color: C.success }}>{fmtINR(finAppDetail.loan_amount)}</b></span>
              {finAppDetail.down_payment && parseFloat(finAppDetail.down_payment) > 0 && <span>DP: <b>{fmtINR(finAppDetail.down_payment)}</b></span>}
              <Badge label={finAppDetail.status} color={STATUS_COLORS[finAppDetail.status] || C.textMid} />
            </div>
            {finAppDetail.status_notes && <div style={{ fontSize: 12, color: C.warning, background: `${C.warning}12`, padding: "6px 10px", borderRadius: 6, marginBottom: 10 }}>ℹ {finAppDetail.status_notes}</div>}
          </div>

          {/* Uploaded docs */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Uploaded Documents ({finAppDocs.length})</div>
            {finAppDocs.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textDim }}>No documents uploaded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {finAppDocs.map((doc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.bg, borderRadius: 6, fontSize: 12 }}>
                    <span>📄</span>
                    <span style={{ flex: 1, color: C.text }}>{[doc.doc_type?.replace(/_/g, " ").toUpperCase(), doc.notes].filter(Boolean).join(" — ") || `Document ${i+1}`}</span>
                    {doc.file && <a href={doc.file} target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 600 }}>View</a>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload new docs */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Upload Documents</div>
            {finAppDocFiles.map((df, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <select value={df.doc_type || "other"} onChange={e => setFinAppDocFiles(p => p.map((x, j) => j === i ? { ...x, doc_type: e.target.value } : x))}
                  style={{ padding: "6px 8px", border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, background: C.bg, color: C.text, fontFamily: "inherit" }}>
                  {[["aadhaar","Aadhaar"],["pan","PAN"],["voter_id","Voter ID"],["driving_license","Driving License"],["bank_statement","Bank Statement"],["income_proof","Income Proof"],["address_proof","Address Proof"],["passport_photo","Passport Photo"],["vehicle_quotation","Vehicle Quotation"],["form_16","Form 16"],["other","Other"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="text" value={df.label} placeholder="Notes (optional)"
                  onChange={e => setFinAppDocFiles(p => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  style={{ flex: 1, minWidth: 100, padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, background: C.bg, color: C.text, fontFamily: "inherit" }} />
                <span style={{ fontSize: 12, color: C.textDim, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{df.file.name} ({(df.file.size / 1024).toFixed(0)} KB)</span>
                <button onClick={() => setFinAppDocFiles(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>
              Accepted: PDF, JPG, PNG, DOC · Max 5 MB per file. Select doc type from the dropdown for each file.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <label style={{ padding: "7px 14px", border: `1.5px dashed ${C.border}`, borderRadius: 7, cursor: "pointer", fontSize: 12, color: C.textMid, fontFamily: "inherit" }}>
                + Add File
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: "none" }} onChange={e => {
                  const files = Array.from(e.target.files).map(f => ({ file: f, label: '', doc_type: detectDocType(f.name) }));
                  setFinAppDocFiles(p => [...p, ...files]);
                  e.target.value = "";
                }} />
              </label>
              {finAppDocFiles.length > 0 && (
                <Btn label={uploadingFinAppDoc ? "Uploading..." : `Upload ${finAppDocFiles.length} File(s)`} color={C.primary} disabled={uploadingFinAppDoc} onClick={handleUploadFinAppDocs} />
              )}
            </div>
          </div>

          {/* Remarks thread */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>💬 Remarks ({finAppRemarks.length})</div>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, padding: "4px 0" }}>
              {finAppRemarks.length === 0 && <div style={{ fontSize: 12, color: C.textDim, textAlign: "center", padding: "8px 0" }}>No remarks yet. You can message the financer here.</div>}
              {finAppRemarks.map(r => {
                const isMe = r.author_type === "dealer";
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px", fontSize: 12,
                      borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0",
                      background: isMe ? C.primary : C.bg, color: isMe ? "#fff" : C.text,
                      border: isMe ? "none" : `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>
                        {isMe ? "You" : "Financer"} · {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                      {r.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={finAppRemarkText} onChange={e => setFinAppRemarkText(e.target.value)}
                placeholder="Type a message for financer..."
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handlePostFinAppRemark()}
                style={{ flex: 1, padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
              <Btn label={postingFinAppRemark ? "..." : "Send"} color={C.primary} disabled={postingFinAppRemark || !finAppRemarkText.trim()} onClick={handlePostFinAppRemark} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Btn label="Close" outline color={C.textMid} onClick={() => { setFinAppDetail(null); setFinAppDocs([]); setFinAppDocFiles([]); setFinAppRemarks([]); setFinAppRemarkText(""); }} />
          </div>
        </Modal>
      )}

      {/* ── New Loan Modal ── */}
      {showNewLoan && (
        <Modal title="New Loan Application" onClose={() => setShowNewLoan(false)}>
          <form onSubmit={handleNewLoan}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Customer Name *">
                  <Input value={newLoan.customer_name} onChange={setNL("customer_name")} placeholder="Full name" />
                </Field>
              </div>
              <Field label="Loan Amount (₹) *"><Input value={newLoan.loan_amount} onChange={setNL("loan_amount")} type="number" placeholder="150000" /></Field>
              <Field label="Interest Rate (% p.a.)"><Input value={newLoan.interest_rate} onChange={setNL("interest_rate")} type="number" step="0.1" placeholder="12.0" /></Field>
              <Field label="Tenure (months)"><Input value={newLoan.tenure_months} onChange={setNL("tenure_months")} type="number" placeholder="36" /></Field>
              <Field label="Bank / Financer"><Input value={newLoan.bank_name} onChange={setNL("bank_name")} placeholder="HDFC Bank, SBI, etc." /></Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Status">
                  <Select value={newLoan.status} onChange={setNL("status")}
                    options={[{value:"pending",label:"Pending"},{value:"approved",label:"Approved"},{value:"disbursed",label:"Disbursed"},{value:"rejected",label:"Rejected"}]} />
                </Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowNewLoan(false)} />
              <Btn label={savingLoan ? "Saving..." : "Create Application"} color={C.primary} type="submit" disabled={savingLoan} />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Loan Detail Modal ── */}
      {selectedLoan && (
        <Modal title={`Loan — ${selectedLoan.customer_name}`} onClose={() => setSelectedLoan(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["Customer",    selectedLoan.customer_name],
              ["Loan Amount", fmtINR(selectedLoan.loan_amount)],
              ["Monthly EMI", selectedLoan.emi_amount ? fmtINR(selectedLoan.emi_amount) : "—"],
              ["Interest",    `${selectedLoan.interest_rate}% p.a.`],
              ["Tenure",      `${selectedLoan.tenure_months} months`],
              ["Bank",        selectedLoan.bank_name || "—"],
              ["Status",      selectedLoan.status],
              ["Applied On",  new Date(selectedLoan.applied_date).toLocaleDateString("en-IN")],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMid }}>{l}</span>
                <span style={{ fontWeight: 700, color: C.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(STATUS_NEXT[selectedLoan.status] || []).map(s => (
              <Btn key={s} label={`Mark ${s}`} color={STATUS_COLORS[s] || C.primary} size="sm"
                onClick={() => { updateStatus(selectedLoan, s); setSelectedLoan(l => l ? { ...l, status: s } : l); }} />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ACCOUNT PAGE
// ═══════════════════════════════════════════════════════
function ToggleSwitch({ checked, onChange, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: checked ? C.primary : C.border, transition: "background 0.2s", position: "relative", flexShrink: 0,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3, left: checked ? 23 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

function IntegrationsSection() {
  const C = useC();
  const toast = useToast();
  const [keys, setKeys] = useState([]);
  const [adding, setAdding] = useState(null);
  const [form, setForm] = useState({ api_key: "", api_secret: "", display_name: "", from_number: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.dealer.apiKeys().then(setKeys).catch(() => {}); }, []);

  const PROVIDER_OPTIONS = {
    whatsapp: [
      { id: "twilio", label: "Twilio", fields: ["api_key", "api_secret"], labels: { api_key: "Account SID", api_secret: "Auth Token" }, extraFields: [{ key: "from_number", label: "WhatsApp From Number", placeholder: "e.g. whatsapp:+14155238886" }] },
      { id: "gupshup", label: "Gupshup", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "source_number", label: "Source Number", placeholder: "e.g. 919876543210" }, { key: "app_name", label: "App Name", placeholder: `e.g. ${BRANDING.platformName}` }] },
      { id: "meta_cloud", label: "Meta Cloud API", fields: ["api_key"], labels: { api_key: "Access Token" }, extraFields: [{ key: "phone_number_id", label: "Phone Number ID", placeholder: "Your WABA phone number ID" }] },
      { id: "360dialog", label: "360dialog", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [] },
      { id: "wati", label: "Wati", fields: ["api_key"], labels: { api_key: "API Token" }, extraFields: [{ key: "api_url", label: "Wati Server URL", placeholder: "e.g. https://live-server-XXXXX.wati.io" }] },
      { id: "aisensy", label: "AiSensy", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "campaign_name", label: "Campaign Name", placeholder: "e.g. marketing" }] },
    ],
    sms: [
      { id: "twilio", label: "Twilio", fields: ["api_key", "api_secret"], labels: { api_key: "Account SID", api_secret: "Auth Token" }, extraFields: [{ key: "from_number", label: "SMS From Number", placeholder: "e.g. +1234567890" }] },
      { id: "gupshup", label: "Gupshup", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "source_number", label: "Source Number", placeholder: "e.g. 919876543210" }] },
      { id: "msg91", label: "MSG91", fields: ["api_key"], labels: { api_key: "Auth Key" }, extraFields: [{ key: "sender_id", label: "Sender ID", placeholder: "e.g. ERIKSH" }, { key: "template_id", label: "Template ID", placeholder: "DLT template ID" }] },
      { id: "textlocal", label: "Textlocal", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "sender", label: "Sender Name", placeholder: "e.g. ERIKSH" }] },
      { id: "fast2sms", label: "Fast2SMS", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "sender_id", label: "Sender ID", placeholder: "e.g. ERIKSH" }] },
    ],
    email: [
      { id: "gmail", label: "Gmail SMTP", fields: ["api_key", "api_secret"], labels: { api_key: "Gmail Address", api_secret: "App Password" }, extraFields: [] },
      { id: "sendgrid", label: "SendGrid", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "from_email", label: "From Email", placeholder: "e.g. info@yourdomain.com" }] },
      { id: "mailgun", label: "Mailgun", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "domain", label: "Domain", placeholder: "e.g. mg.yourdomain.com" }, { key: "from_email", label: "From Email", placeholder: "e.g. info@yourdomain.com" }] },
      { id: "ses", label: "Amazon SES", fields: ["api_key", "api_secret"], labels: { api_key: "Access Key ID", api_secret: "Secret Access Key" }, extraFields: [{ key: "region", label: "AWS Region", placeholder: "e.g. ap-south-1" }, { key: "from_email", label: "From Email", placeholder: "e.g. info@yourdomain.com" }] },
    ],
  };
  const [selectedProvider, setSelectedProvider] = useState({ whatsapp: "twilio", sms: "twilio", email: "gmail" });

  const SERVICES = [
    { id: "twilio", label: "SMS Service", desc: "SMS OTP + marketing — choose your provider", icon: "📱", hasProviderSelect: true, providerKey: "sms" },
    { id: "gmail_smtp", label: "Email Service", desc: "Email marketing & notifications — choose your provider", icon: "📧", hasProviderSelect: true, providerKey: "email" },
    { id: "whatsapp_business", label: "WhatsApp Business", desc: "Bulk WhatsApp messaging — choose your provider below", icon: "💬", hasProviderSelect: true },
    { id: "firebase", label: "Firebase", desc: "Push notifications (mobile/PWA)", icon: "🔔", fields: ["api_key"], labels: { api_key: "Server Key" } },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {SERVICES.map(svc => {
          const existing = keys.find(k => k.service === svc.id);
          return (
            <div key={svc.id} style={{ border: `1.5px solid ${existing ? C.success : C.border}`, borderRadius: 12, padding: 16, position: "relative" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{svc.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{svc.label}</div>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 12 }}>{svc.desc}</div>
              {existing ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>✓ {existing.extra_config?.provider ? `Connected (${existing.extra_config.provider})` : "Connected"}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setAdding(svc); if (svc.hasProviderSelect && existing?.extra_config?.provider) { const pKey = svc.providerKey || (svc.id === "whatsapp_business" ? "whatsapp" : svc.id === "twilio" ? "sms" : "email"); setSelectedProvider(p => ({ ...p, [pKey]: existing.extra_config.provider })); } setForm({ api_key: "", api_secret: "", display_name: existing.display_name, from_number: existing.extra_config?.from_number || "", source_number: existing.extra_config?.source_number || "", phone_number_id: existing.extra_config?.phone_number_id || "", api_url: existing.extra_config?.api_url || "", app_name: existing.extra_config?.app_name || "", campaign_name: existing.extra_config?.campaign_name || "" }); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: C.textMid }}>Edit</button>
                    <button onClick={async () => { if (confirm("Delete this API key?")) { try { await api.dealer.deleteApiKey(existing.id); setKeys(keys.filter(k => k.id !== existing.id)); toast(`${svc.label} deleted`, "success"); } catch { toast("Failed to delete", "error"); } }}} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.danger}44`, background: `${C.danger}10`, cursor: "pointer", fontFamily: "inherit", color: C.danger }}>Delete</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAdding(svc); setForm({ api_key: "", api_secret: "", display_name: "", from_number: "" }); }} style={{ width: "100%", padding: "7px", borderRadius: 8, border: `1px dashed ${C.primary}`, background: `${C.primary}08`, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  + Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: C.textDim, background: `${C.warning}10`, border: `1px solid ${C.warning}33`, borderRadius: 8, padding: "10px 14px" }}>
        ⚠️ API keys are stored securely. Without connecting a service: SMS OTP login, WhatsApp alerts, push notifications, and email campaigns are disabled but shown in the UI.
      </div>

      {adding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{adding.icon} Connect {adding.label}</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>{adding.desc}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>Display Name (optional)</div>
              <input type="text" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                placeholder="e.g. Production Key, Staging Key"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
            </div>
            {adding.hasProviderSelect && (() => {
              const pKey = adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms");
              const provList = PROVIDER_OPTIONS[pKey] || [];
              const curProv = selectedProvider[pKey] || provList[0]?.id;
              return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>Choose Provider</div>
                <select value={curProv} onChange={e => setSelectedProvider(p => ({ ...p, [pKey]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }}>
                  {provList.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            );})()}
            {(() => {
              const pKey = adding.hasProviderSelect ? (adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms")) : null;
              const provList = pKey ? PROVIDER_OPTIONS[pKey] || [] : [];
              const curProv = pKey ? (selectedProvider[pKey] || provList[0]?.id) : null;
              const prov = pKey ? provList.find(p => p.id === curProv) : null;
              return (adding.hasProviderSelect ? prov?.fields || [] : adding.fields || []).map(f => {
              const labels = adding.hasProviderSelect ? prov?.labels || {} : adding.labels || {};
              return (
              <div key={f} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{labels[f] || f}</div>
                <input type={f === "api_secret" ? "password" : "text"} value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  placeholder={`Enter ${labels[f] || f}`}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
              </div>
            );});})()}
            {(() => {
              const pKey = adding.hasProviderSelect ? (adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms")) : null;
              const provList = pKey ? PROVIDER_OPTIONS[pKey] || [] : [];
              const curProv = pKey ? (selectedProvider[pKey] || provList[0]?.id) : null;
              const prov = pKey ? provList.find(p => p.id === curProv) : null;
              return (adding.hasProviderSelect ? prov?.extraFields || [] : adding.extraFields || []).map(ef => (
              <div key={ef.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{ef.label}</div>
                <input type="text" value={form[ef.key] || ""} onChange={e => setForm(p => ({ ...p, [ef.key]: e.target.value }))}
                  placeholder={ef.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
              </div>
            ));})()}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setAdding(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: C.textMid }}>Cancel</button>
              <button disabled={saving} onClick={async () => {
                setSaving(true);
                try {
                  const extraCfg = {};
                  if (adding.hasProviderSelect) {
                    const pKey = adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms");
                    const provList = PROVIDER_OPTIONS[pKey] || [];
                    const curProv = selectedProvider[pKey] || provList[0]?.id;
                    extraCfg.provider = curProv;
                    const prov = provList.find(p => p.id === curProv);
                    (prov?.extraFields || []).forEach(ef => { if (form[ef.key]) extraCfg[ef.key] = form[ef.key]; });
                  } else {
                    if (form.from_number) extraCfg.from_number = form.from_number;
                    (adding.extraFields || []).forEach(ef => { if (form[ef.key]) extraCfg[ef.key] = form[ef.key]; });
                  }
                  await api.dealer.saveApiKey({ service: adding.id, api_key: form.api_key, api_secret: form.api_secret || "", display_name: form.display_name, extra_config: extraCfg });
                  const updated = await api.dealer.apiKeys();
                  setKeys(updated);
                  toast(`${adding.label} connected!`, "success");
                  setAdding(null);
                } catch { toast("Failed to save. Check your API key.", "error"); }
                finally { setSaving(false); }
              }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving..." : "Save & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPage({ dealer: dealerProp, onLogout }) {
  const C = useC();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ dealer_name: "", phone: "", city: "", email: "", address: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [brandingMode, setBrandingMode] = useState(false);
  const [brandingForm, setBrandingForm] = useState({ sales_manager_name: "", bank_name: "", bank_account_number: "", bank_ifsc: "", bank_upi: "", invoice_footer_note: "" });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [prefs, setPrefs] = useState({ notify_email: true, notify_whatsapp: true, notify_push: true });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const loadData = () => {
    Promise.all([api.me(), api.dashboard()]).then(([me, dash]) => {
      setData({ ...me, plan: dash.plan });
      setEditForm({
        dealer_name: me.dealer?.name || me.dealer?.dealer_name || "",
        phone: me.dealer?.phone || "",
        city: me.dealer?.city || "",
        email: me.user?.email || "",
        address: me.dealer?.address || "",
        description: me.dealer?.description || "",
      });
      setBrandingForm({
        sales_manager_name:  me.dealer?.sales_manager_name  || "",
        bank_name:           me.dealer?.bank_name           || "",
        bank_account_number: me.dealer?.bank_account_number || "",
        bank_ifsc:           me.dealer?.bank_ifsc           || "",
        bank_upi:            me.dealer?.bank_upi            || "",
        invoice_footer_note: me.dealer?.invoice_footer_note || "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    api.notifications.getPrefs()
      .then(d => setPrefs({ notify_email: d.notify_email, notify_whatsapp: d.notify_whatsapp, notify_push: d.notify_push }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!editForm.dealer_name.trim()) { toast("Dealership name cannot be empty.", "warning"); return; }
    if (!editForm.phone.trim()) { toast("Phone number is required.", "warning"); return; }
    setEditSaving(true);
    try {
      await api.profile.update(editForm);
      toast("Profile updated successfully!", "success");
      setEditMode(false);
      loadData();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to update profile.";
      toast(msg, "error");
    }
    setEditSaving(false);
  };

  const savePref = async (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    setPrefsSaving(true); setPrefsSaved(false);
    try {
      await api.notifications.updatePrefs(updated);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch (_) { toast("Failed to save preferences.", "error"); }
    setPrefsSaving(false);
  };

  const dealer = data?.dealer || dealerProp;
  const plan = data?.plan;

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      {/* Profile card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", flexShrink: 0, fontWeight: 700 }}>
              {((dealer?.name || dealer?.dealer_name || "D")[0]).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{dealer?.name || dealer?.dealer_name || "Dealer"}</div>
              <div style={{ fontSize: 12, color: C.textMid }}>📍 {dealer?.city || "—"}</div>
            </div>
          </div>
          <Btn label={editMode ? "Cancel" : "✏ Edit Profile"} color={C.primary} outline size="sm" onClick={() => setEditMode(e => !e)} />
        </div>

        {editMode ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Dealership Name"><Input value={editForm.dealer_name} onChange={v => setEditForm(p => ({ ...p, dealer_name: v }))} placeholder="Kumar Electric Vehicles" /></Field>
              <Field label="Phone"><Input value={editForm.phone} onChange={v => setEditForm(p => ({ ...p, phone: v }))} placeholder="9876543210" /></Field>
              <Field label="City"><Input value={editForm.city} onChange={v => setEditForm(p => ({ ...p, city: v }))} placeholder="Delhi" /></Field>
              <Field label="Email"><Input value={editForm.email} onChange={v => setEditForm(p => ({ ...p, email: v }))} type="email" placeholder="you@email.com" /></Field>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="Address"><Input value={editForm.address} onChange={v => setEditForm(p => ({ ...p, address: v }))} placeholder="Shop No. 12, Sector 5, Rohini, Delhi" /></Field>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="Showroom Description">
                  <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                    placeholder="Tell buyers about your showroom — specialties, brands, experience, service..." />
                </Field>
              </div>
            </div>
            <Btn label={editSaving ? "Saving..." : "Save Changes"} color={C.primary} onClick={saveProfile} disabled={editSaving} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Phone", dealer?.phone], ["Email", data?.user?.email || "—"], ["GSTIN", dealer?.gstin || "—"], ["Verification", dealer?.is_verified ? "✅ Verified" : "⏳ Pending"]].map(([label, val]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{val || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invoice Branding card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>🧾 Invoice Branding</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>Customise how your invoices appear — payment details, signatory, footer</div>
          </div>
          <Btn label={brandingMode ? "Cancel" : "✏ Edit"} color={C.primary} outline size="sm" onClick={() => setBrandingMode(m => !m)} />
        </div>
        {brandingMode ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Sales Manager / Signatory Name">
                <Input value={brandingForm.sales_manager_name} onChange={v => setBrandingForm(p => ({ ...p, sales_manager_name: v }))} placeholder="e.g. Rajesh Kumar" />
              </Field>
              <Field label="Bank Name">
                <Input value={brandingForm.bank_name} onChange={v => setBrandingForm(p => ({ ...p, bank_name: v }))} placeholder="e.g. HDFC Bank Ltd." />
              </Field>
              <Field label="Bank Account Number">
                <Input value={brandingForm.bank_account_number} onChange={v => setBrandingForm(p => ({ ...p, bank_account_number: v }))} placeholder="e.g. 50200012345678" />
              </Field>
              <Field label="Bank IFSC Code">
                <Input value={brandingForm.bank_ifsc} onChange={v => setBrandingForm(p => ({ ...p, bank_ifsc: v }))} placeholder="e.g. HDFC0001234" />
              </Field>
              <Field label="UPI ID">
                <Input value={brandingForm.bank_upi} onChange={v => setBrandingForm(p => ({ ...p, bank_upi: v }))} placeholder="e.g. yourname@hdfc" />
              </Field>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="Invoice Footer Note (optional)">
                  <textarea value={brandingForm.invoice_footer_note} onChange={e => setBrandingForm(p => ({ ...p, invoice_footer_note: e.target.value }))} rows={2}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                    placeholder="e.g. Subject to Delhi jurisdiction. All disputes to be settled amicably." />
                </Field>
              </div>
            </div>
            <Btn label={brandingSaving ? "Saving..." : "Save Branding"} color={C.primary} onClick={async () => {
              setBrandingSaving(true);
              try { await api.profile.update(brandingForm); toast("Invoice branding saved!", "success"); setBrandingMode(false); loadData(); }
              catch { toast("Failed to save branding.", "error"); }
              setBrandingSaving(false);
            }} disabled={brandingSaving} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Signatory", brandingForm.sales_manager_name || "Authorised Signatory"],
              ["Bank",      brandingForm.bank_name          || "—"],
              ["A/C No",    brandingForm.bank_account_number|| "—"],
              ["IFSC",      brandingForm.bank_ifsc          || "—"],
              ["UPI",       brandingForm.bank_upi           || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Plan card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Subscription Plan</div>
        {loading ? <Spinner /> : plan ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: C.primary, textTransform: "capitalize" }}>{plan.type} Plan</div>
                <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>
                  {plan.is_active ? `Expires: ${plan.expires_at ? new Date(plan.expires_at).toLocaleDateString("en-IN") : "—"}` : "Plan expired"}
                </div>
              </div>
              <Badge label={plan.is_active ? "Active" : "Expired"} color={plan.is_active ? C.success : C.danger} />
            </div>
            {plan.is_active && plan.days_remaining !== null && (
              <div style={{
                background: plan.days_remaining <= 7 ? `${C.danger}12` : `${C.success}12`,
                border: `1px solid ${plan.days_remaining <= 7 ? C.danger + "44" : C.success + "44"}`,
                borderRadius: 8, padding: "10px 14px", fontSize: 13,
                color: plan.days_remaining <= 7 ? C.danger : C.success,
              }}>
                {plan.days_remaining <= 7
                  ? `⚠️ Only ${plan.days_remaining} day${plan.days_remaining !== 1 ? "s" : ""} remaining! Contact support to upgrade.`
                  : `✅ ${plan.days_remaining} days remaining`}
              </div>
            )}
            {!plan.is_active && (
              <div style={{ background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.danger }}>
                ⚠️ Your plan has expired. Please contact support to renew.
              </div>
            )}
          </>
        ) : (
          <div style={{ color: C.textDim, fontSize: 13 }}>No plan information available.</div>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Notification Preferences</div>
          {prefsSaving && <span style={{ fontSize: 11, color: C.textDim }}>Saving…</span>}
          {prefsSaved && <span style={{ fontSize: 11, color: C.success }}>✓ Saved</span>}
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Choose how you want to receive alerts and reminders.</div>
        {prefsLoading ? <Spinner /> : (
          <>
            <ToggleSwitch
              label="Email Notifications"
              sub="Plan expiry warnings, lead alerts, invoices"
              checked={prefs.notify_email}
              onChange={v => savePref("notify_email", v)}
            />
            <ToggleSwitch
              label="WhatsApp Notifications"
              sub="New leads, follow-up reminders, plan alerts (Pro plan)"
              checked={prefs.notify_whatsapp}
              onChange={v => savePref("notify_whatsapp", v)}
            />
            <ToggleSwitch
              label="Push Notifications"
              sub="Real-time browser / app alerts (Pro plan)"
              checked={prefs.notify_push}
              onChange={v => savePref("notify_push", v)}
            />
          </>
        )}
      </Card>

      {/* Actions */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Account Actions</div>
        <button onClick={onLogout} style={{
          width: "100%", padding: "12px", background: `${C.danger}12`, border: `1.5px solid ${C.danger}44`,
          borderRadius: 8, color: C.danger, fontWeight: 700, fontSize: 14, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}>
          🚪 Logout
        </button>
      </Card>

      {/* Integrations section */}
      <Card style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🔌 Integrations & API Keys</div>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>
          Connect third-party services to unlock SMS OTP, WhatsApp alerts, and email marketing.
        </div>
        <IntegrationsSection />
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════
function Reports() {
  const C = useC();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.reports(`?period=${period}`).then(setData).finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>📈 Analytics & Reports</div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>Track your dealership performance over time</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: C.bg, padding: 4, borderRadius: 10 }}>
          {["week","month","year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: 13, transition: "all 0.15s",
              background: period === p ? C.surface : "transparent",
              color: period === p ? C.primary : C.textMid,
              boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : !data ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>Could not load report data</div>
      ) : (
        <>
          {/* KPI stat cards */}
          <div className="erd-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard icon="💰" label="Revenue"         value={fmtINR(data.revenue)}          color={C.primary} />
            <StatCard icon="🛺" label="Sales"           value={data.sale_count}               color={C.success} />
            <StatCard icon="👥" label="New Leads"       value={data.lead_count}               color={C.info}    />
            <StatCard icon="✅" label="Conversion Rate" value={`${data.conversion_rate}%`}   color={C.accent}  />
            <StatCard icon="📊" label="Avg Sale Value"  value={fmtINR(data.avg_sale_value)}  color={C.warning} />
            <StatCard icon="🎯" label="Leads Converted" value={data.converted_leads}          color={C.success} />
          </div>

          {/* Sales by Fuel Type */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚡</span> Sales by Vehicle Type
            </div>
            {!data.fuel_sales?.length ? (
              <div style={{ textAlign: "center", padding: 24, color: C.textDim, fontSize: 13 }}>No sales data for this period</div>
            ) : (
              <div>
                {data.fuel_sales.map((f, i) => {
                  const maxRev = Math.max(...data.fuel_sales.map(x => x.revenue || 0));
                  const pct = maxRev > 0 ? ((f.revenue || 0) / maxRev) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: FUEL_COLOR[f.vehicle__fuel_type] || "#94a3b8", flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{f.vehicle__fuel_type || "Unknown"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 24 }}>
                          <span style={{ color: C.textMid }}>Units: <b style={{ color: C.text }}>{f.count}</b></span>
                          <span style={{ color: C.primary }}>Revenue: <b>{fmtINR(f.revenue)}</b></span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: FUEL_COLOR[f.vehicle__fuel_type] || C.primary, borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Period summary */}
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>📅 Period Summary — {period.charAt(0).toUpperCase() + period.slice(1)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {[
                { label: "Total Revenue", value: fmtINR(data.revenue), icon: "💰", color: C.primary },
                { label: "Sales Made", value: data.sale_count, icon: "🛺", color: C.success },
                { label: "Leads Received", value: data.lead_count, icon: "📩", color: C.info },
                { label: "Leads Converted", value: data.converted_leads, icon: "✅", color: C.accent },
                { label: "Average Sale", value: fmtINR(data.avg_sale_value), icon: "📊", color: C.warning },
                { label: "Conversion %", value: `${data.conversion_rate}%`, icon: "🎯", color: C.success },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STAR RATING COMPONENT
// ═══════════════════════════════════════════════════════
function StarRating({ value, onChange, max = 5, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span key={star}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            fontSize: size, cursor: readOnly ? "default" : "pointer",
            color: star <= (hover || value) ? "#f59e0b" : "#e2e8f0",
            transition: "color 0.1s", userSelect: "none",
          }}>★</span>
      ))}
    </div>
  );
}

function AvgStars({ avg, count }) {
  if (!avg) return <span style={{ fontSize: 12, color: C.textDim }}>No reviews yet</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <StarRating value={Math.round(avg)} readOnly size={14} />
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{avg}</span>
      <span style={{ fontSize: 12, color: C.textDim }}>({count} review{count !== 1 ? "s" : ""})</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VEHICLE DETAIL MODAL
// ═══════════════════════════════════════════════════════
function VehicleDetailModal({ vehicle: v, onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState("overview"); // overview | reviews | enquiry
  const [dealerInfo, setDealerInfo] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ reviewer_name: "", reviewer_phone: "", rating: 0, comment: "" });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({ customer_name: "", phone: "", email: "", pincode: "", notes: `Interested in ${v.brand_name} ${v.model_name}` });
  const [enquirySending, setEnquirySending] = useState(false);

  useEffect(() => {
    if (v.dealer_id) {
      api.dealers.detail(v.dealer_id).then(d => {
        setDealerInfo(d.dealer);
        setReviews(d.reviews || []);
      }).catch(() => {});
    }
  }, [v.dealer_id]);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.reviewer_name.trim()) { toast("Please enter your name.", "warning"); return; }
    if (!reviewForm.reviewer_phone.trim()) { toast("Please enter your phone number.", "warning"); return; }
    if (reviewForm.rating === 0) { toast("Please select a star rating.", "warning"); return; }
    if (!reviewForm.comment.trim()) { toast("Please write a comment.", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(reviewForm.reviewer_phone.replace(/\D/g,"").slice(-10))) {
      toast("Enter a valid 10-digit Indian mobile number.", "warning"); return;
    }
    setReviewSaving(true);
    try {
      const r = await api.dealers.review(v.dealer_id, reviewForm);
      setReviews(prev => [r, ...prev]);
      setReviewForm({ reviewer_name: "", reviewer_phone: "", rating: 0, comment: "" });
      toast("Review submitted! Thank you.", "success");
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to submit review.";
      toast(msg, "error");
    }
    setReviewSaving(false);
  };

  const submitEnquiry = async (e) => {
    e.preventDefault();
    if (!enquiryForm.customer_name.trim()) { toast("नाम डालना ज़रूरी है। (Name is required.)", "warning"); return; }
    if (!enquiryForm.phone.trim()) { toast("मोबाइल नंबर डालना ज़रूरी है। (Mobile number is required.)", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(enquiryForm.phone.replace(/\D/g, "").slice(-10))) {
      toast("10 अंकों का सही मोबाइल नंबर डालें। (Enter valid 10-digit mobile.)", "warning"); return;
    }
    if (enquiryForm.pincode && !/^\d{6}$/.test(enquiryForm.pincode.trim())) {
      toast("Pin code 6 digits होना चाहिए। (Pin code must be 6 digits.)", "warning"); return;
    }
    if (enquiryForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiryForm.email)) {
      toast("Valid email address डालें।", "warning"); return;
    }
    setEnquirySending(true);
    try {
      const city = enquiryForm.pincode ? `PIN: ${enquiryForm.pincode}` : "";
      await api.enquiry({ ...enquiryForm, city, vehicle: v.id });
      toast("Enquiry भेज दी गई! Dealer 24 घंटों में call करेगा।", "success");
      setTab("overview");
      setEnquiryForm({ customer_name: "", phone: "", email: "", pincode: "", notes: `Interested in ${v.brand_name} ${v.model_name}` });
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Enquiry नहीं भेजी जा सकी। फिर कोशिश करें।";
      toast(msg, "error");
    }
    setEnquirySending(false);
  };

  const SPECS = [
    v.range_km         && ["Range",           `${v.range_km} km`],
    v.battery_capacity && ["Battery",          v.battery_capacity],
    v.max_speed        && ["Max Speed",        `${v.max_speed} km/h`],
    v.payload_kg       && ["Payload",          `${v.payload_kg} kg`],
    v.seating_capacity && ["Seating",          `${v.seating_capacity} persons`],
    v.warranty_years   && ["Warranty",         `${v.warranty_years} year${v.warranty_years > 1 ? "s" : ""}`],
    v.year             && ["Year",             v.year],
    v.hsn_code         && ["HSN Code",         v.hsn_code],
  ].filter(Boolean);

  return (
    <Modal title={`${v.brand_name} ${v.model_name}`} onClose={onClose} width={640}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: C.bg, borderRadius: 8, padding: 4 }}>
        {[["overview","Overview"],["reviews","Reviews"],["enquiry","Get Price"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "8px 4px", border: "none", borderRadius: 6,
            background: tab === id ? C.primary : "transparent",
            color: tab === id ? "#fff" : C.textMid,
            fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {/* Vehicle hero */}
          <div style={{ height: 140, background: `linear-gradient(135deg,${C.primary}15,${C.accent}15)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, marginBottom: 16 }}>🛺</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{fmtINR(v.price)}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>Ex-showroom price (incl. GST)</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge label={v.fuel_type} color={FUEL_COLOR[v.fuel_type]} />
              {v.stock_status === "out_of_stock" ? <Badge label="Out of Stock" color={C.danger} /> : <Badge label={`${v.stock_quantity || ""} in Stock`} color={C.success} />}
              {v.is_featured && <Badge label="Featured" color={C.accent} />}
            </div>
          </div>

          {v.description && <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, marginBottom: 16 }}>{v.description}</p>}

          {/* Specs grid */}
          {SPECS.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8 }}>Technical Specifications</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
                {SPECS.map(([label, val]) => (
                  <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label.toUpperCase()}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dealer info */}
          <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}22`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.text }}>🏪 Dealer Details</div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{dealerInfo?.dealer_name || v.dealer_name}</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>📍 {dealerInfo?.address || ""}{dealerInfo?.address ? ", " : ""}{v.dealer_city}, {v.dealer_state || ""}</div>
            {dealerInfo?.avg_rating && <div style={{ marginTop: 6 }}><AvgStars avg={dealerInfo.avg_rating} count={dealerInfo.review_count || 0} /></div>}
            {(dealerInfo?.phone || v.dealer_phone) && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`tel:${(dealerInfo?.phone || v.dealer_phone).replace(/\s/g,"")}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.success, color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  📞 Call Dealer — {dealerInfo?.phone || v.dealer_phone}
                </a>
                <Btn label="💬 Send Enquiry" color={C.primary} size="sm" onClick={() => setTab("enquiry")} />
              </div>
            )}
          </div>

          <Btn label="⭐ Rate This Dealer" color={C.accent} outline fullWidth size="sm" onClick={() => setTab("reviews")} />
        </div>
      )}

      {tab === "reviews" && (
        <div>
          {/* Average */}
          <div style={{ textAlign: "center", padding: "12px 0 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.text }}>{avgRating || "—"}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <StarRating value={Math.round(Number(avgRating) || 0)} readOnly size={20} />
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""} for {v.dealer_name}</div>
          </div>

          {/* Submit review form */}
          <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Write a Review</div>
            <form onSubmit={submitReview}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Field label="Your Name"><Input value={reviewForm.reviewer_name} onChange={v => setReviewForm(p => ({ ...p, reviewer_name: v }))} placeholder="Ramesh Kumar" /></Field>
                <Field label="Mobile Number"><Input value={reviewForm.reviewer_phone} onChange={v => setReviewForm(p => ({ ...p, reviewer_phone: v }))} placeholder="9876543210" /></Field>
              </div>
              <Field label="Rating">
                <StarRating value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} size={28} />
              </Field>
              <Field label="Your Review">
                <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} rows={3}
                  style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                  placeholder="How was your experience with this dealer?" />
              </Field>
              <Btn label={reviewSaving ? "Submitting..." : "Submit Review"} color={C.primary} type="submit" disabled={reviewSaving} />
            </form>
          </div>

          {/* Existing reviews */}
          {reviews.length === 0 && <div style={{ textAlign: "center", color: C.textDim, padding: 20, fontSize: 13 }}>No reviews yet. Be the first to review!</div>}
          {reviews.map((r, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.reviewer_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <StarRating value={r.rating} readOnly size={14} />
                  <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(r.created_at)}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, margin: 0 }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "enquiry" && (
        <div>
          <div style={{ background: `${C.primary}08`, borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13, color: C.primary }}>
            🛺 <b>{v.brand_name} {v.model_name}</b> — Starting at {fmtINR(v.price)}
          </div>
          <div style={{ background: `${C.success}12`, border: `1px solid ${C.success}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            🏪 Your enquiry will be sent to: <b>{v.dealer_name}</b>
            {v.dealer_city && <span style={{ color: C.textMid }}> · {v.dealer_city}</span>}
            {v.dealer_verified && <span style={{ marginLeft: 6, color: C.success, fontWeight: 600 }}>✓ Verified</span>}
          </div>
          {/* On-road price info banner */}
          <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>🛣️ On-Road Price में शामिल है:</div>
            <div style={{ color: C.textMid, lineHeight: 1.7 }}>
              Ex-Showroom: <b>{fmtINR(v.price)}</b> + Registration + Insurance + State Tax
              <br/>Dealer आपको exact on-road price बताएगा।
            </div>
          </div>
          <form onSubmit={submitEnquiry}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="आपका नाम / Your Name" required>
                <Input value={enquiryForm.customer_name} onChange={v2 => setEnquiryForm(p => ({ ...p, customer_name: v2 }))} placeholder="Ramesh Kumar" required />
              </Field>
              <Field label="Mobile Number" required>
                <Input value={enquiryForm.phone} onChange={v2 => setEnquiryForm(p => ({ ...p, phone: v2 }))} placeholder="9876543210" type="tel" required />
              </Field>
              <Field label="Pin Code / पिन कोड">
                <Input value={enquiryForm.pincode} onChange={v2 => setEnquiryForm(p => ({ ...p, pincode: v2 }))} placeholder="110001" type="number" style={{ appearance: "none" }} />
              </Field>
              <Field label="Email (Optional)">
                <Input value={enquiryForm.email} onChange={v2 => setEnquiryForm(p => ({ ...p, email: v2 }))} placeholder="you@email.com" type="email" />
              </Field>
            </div>
            <Field label="Message / संदेश">
              <textarea value={enquiryForm.notes} onChange={e => setEnquiryForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                placeholder="Koi vishesh requirement... (Any specific requirements...)" />
            </Field>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14, lineHeight: 1.7 }}>
              ✓ Dealer 24 घंटों में संपर्क करेगा। &nbsp;✓ आपका नंबर किसी third party को नहीं दिया जाएगा।
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn label="वापस / Back" outline color={C.textMid} onClick={() => setTab("overview")} />
              <Btn label={enquirySending ? "भेज रहे हैं..." : "🛣️ Best Price / On-Road Price पाएं →"} color={C.primary} type="submit" disabled={enquirySending} fullWidth />
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════
// LEARN PAGE — Video resources + dealer YouTube uploads
// ═══════════════════════════════════════════════════════
const VIDEO_CATS = [
  { id: "",            label: "All Videos" },
  { id: "tutorial",   label: "🛺 How to Drive" },
  { id: "maintenance",label: "🔧 Maintenance" },
  { id: "earning",    label: "💰 Earn More" },
  { id: "review",     label: "⭐ Expert Reviews" },
  { id: "general",    label: "ℹ️ General Info" },
];

function extractVideoId(url) {
  for (const pat of [/youtube\.com\/watch\?v=([^&\s]+)/, /youtu\.be\/([^?\s]+)/, /youtube\.com\/embed\/([^?\s]+)/]) {
    const m = url?.match(pat);
    if (m) return m[1];
  }
  return null;
}

function VideoCard({ v, onDelete, onWatch }) {
  const C = useC();
  const [inlineWatch, setInlineWatch] = useState(null);
  const thumb = v.thumbnail_url || (v.video_id ? `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg` : null)
    || (extractVideoId(v.youtube_url) ? `https://img.youtube.com/vi/${extractVideoId(v.youtube_url)}/hqdefault.jpg` : null);
  const catColors = { tutorial: C.primary, maintenance: C.warning, earning: C.success, review: C.info, general: C.textMid };
  const catLabels = { tutorial: "How to Drive", maintenance: "Maintenance", earning: "Earn More", review: "Expert Review", general: "General" };

  const handleWatch = () => {
    if (onWatch) { onWatch(v); return; }
    // fallback: show inline iframe modal instead of opening new tab
    const vid = extractVideoId(v.youtube_url);
    if (vid) setInlineWatch(vid);
  };

  return (
    <>
    {inlineWatch && (
      <div onClick={() => setInlineWatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 760 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setInlineWatch(null)} style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer" }}>×</button>
          <div style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe src={`https://www.youtube.com/embed/${inlineWatch}?autoplay=1&rel=0`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={v.title} />
          </div>
        </div>
      </div>
    )}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column" }}
      onClick={handleWatch}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${C.primary}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      {/* Thumbnail */}
      <div style={{ position: "relative", paddingTop: "56.25%", background: "#0f172a", overflow: "hidden" }}>
        {thumb
          ? <img src={thumb} alt={v.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 40 }}>▶</div>
        }
        {/* Play overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = 1; }} onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}>
          <div style={{ width: 48, height: 48, background: "#ff0000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>▶</div>
        </div>
        {/* Category badge */}
        <div style={{ position: "absolute", top: 8, left: 8, background: catColors[v.category] || C.textMid, color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
          {catLabels[v.category] || v.category}
        </div>
        {v.dealer && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 9 }}>Dealer</div>}
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{v.title}</div>
        {v.description && <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, flex: 1 }}>{v.description.slice(0, 90)}{v.description.length > 90 ? "…" : ""}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div style={{ fontSize: 10, color: C.textMid }}>{v.dealer_name || BRANDING.platformName}</div>
          {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(v.id); }} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 11, padding: "2px 6px" }}>✕ Delete</button>}
        </div>
      </div>
    </div>
    </>
  );
}

const BLOG_CATS = [
  { id: "",            label: "All Posts" },
  { id: "maintenance", label: "🔧 Maintenance" },
  { id: "earning",     label: "💰 Earn More" },
  { id: "news",        label: "📰 News" },
  { id: "scheme",      label: "🏛 Schemes" },
  { id: "general",     label: "📝 General" },
];

function BlogPostCard({ post, onDelete }) {
  const C = useC();
  const [showContent, setShowContent] = useState(false);
  const auth = JSON.parse(localStorage.getItem("erd_dealer") || "null");
  const canDelete = auth && (post.dealer === null ? false : true);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "transform 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      {post.cover_image_url && (
        <img src={post.cover_image_url} alt={post.title}
          style={{ width: "100%", height: 140, objectFit: "cover" }}
          onError={e => e.target.style.display = "none"} />
      )}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 0.5, background: `${C.primary}12`, padding: "2px 8px", borderRadius: 20 }}>
            {BLOG_CATS.find(c => c.id === post.category)?.label?.replace(/^[^\s]+\s/, '') || post.category}
          </span>
          {canDelete && <button onClick={() => onDelete(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 14, padding: 2 }}>✕</button>}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>{post.title}</div>
        {post.excerpt && <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6, flex: 1, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.excerpt}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <span style={{ fontSize: 11, color: C.textDim }}>{new Date(post.created_at).toLocaleDateString("en-IN")}</span>
          <button onClick={() => post.url ? window.open(post.url, "_blank") : setShowContent(true)} style={{ fontSize: 12, color: C.primary, fontWeight: 700, padding: "4px 12px", border: `1.5px solid ${C.primary}`, borderRadius: 20, background: `${C.primary}08`, cursor: "pointer", fontFamily: "inherit" }}>
            {post.url ? "Read More →" : "Read →"}
          </button>
          {showContent && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowContent(false)}>
              <div style={{ background: "var(--erd-card, #fff)", borderRadius: 16, padding: 24, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.4 }}>{post.title}</div>
                  <button onClick={() => setShowContent(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textDim, marginLeft: 8 }}>×</button>
                </div>
                <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{post.content}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>By {post.dealer_name || BRANDING.platformName}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUPPORT PAGE
// ═══════════════════════════════════════════════════════

function SupportPage() {
  const C = useC();
  const [settings, setSettings] = useState({
    support_phone: BRANDING.support.phone,
    support_email: BRANDING.support.email,
    support_whatsapp: BRANDING.support.whatsapp,
  });

  const openSupportWhatsApp = (message) => {
    const digits = String(settings.support_whatsapp || "").replace(/\D/g, "");
    const fallback = buildWhatsAppLink(message);
    const href = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : fallback;
    if (href) window.open(href);
  };

  useEffect(() => {
    apiFetch("/platform/settings/")
      .then(data => {
        setSettings({
          support_phone: data.support_phone || BRANDING.support.phone,
          support_email: data.support_email || BRANDING.support.email,
          support_whatsapp: data.support_whatsapp || BRANDING.support.whatsapp,
        });
      })
      .catch(err => {
        console.error("Failed to load support settings:", err);
      });
  }, []);

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>🛟 Support Center</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>We're here to help. Reach us anytime.</div>
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }} className="erd-two-col">
        {/* Dealer Support */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.primary, marginBottom: 4 }}>🏪 Dealer Support</div>
          <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>For showroom owners and dealers on our platform</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "📞", label: "Call Us", value: settings.support_phone, action: () => window.open(`tel:${settings.support_phone}`) },
              { icon: "💬", label: "WhatsApp", value: "Chat with us", action: () => openSupportWhatsApp("Hi I need help with my dealer account") },
              { icon: "✉️", label: "Email", value: settings.support_email, action: () => window.open(`mailto:${settings.support_email}?subject=Dealer Support`) },
            ].map(({ icon, label, value, action }) => (
              <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{value}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, background: `${C.primary}08`, border: `1px solid ${C.primary}22`, borderRadius: 8, padding: "12px 14px", fontSize: 12, color: C.textMid }}>
            <div style={{ fontWeight: 700, color: C.primary, marginBottom: 4 }}>Onboarding Help</div>
            <div>Need help setting up your dealer profile, adding vehicles, or getting your first leads? Our team guides you through the whole process.</div>
          </div>
        </Card>

      </div>

      {/* FAQ */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 18 }}>❓ Frequently Asked Questions</div>
        {[
          { q: "My account is under verification. How long does it take?", a: "Admin verification typically takes 24-48 hours on business days. You'll receive an email once approved." },
          { q: "How do I upgrade to Early Dealer Plan?", a: "Go to Plans & Pricing from the left navigation and click 'Upgrade Now'. ₹5000/year gets you unlimited listings + priority ranking." },
          { q: "I forgot my password. How do I reset it?", a: "On the login screen, click 'Forgot password?' and enter your registered email address. You'll receive a 6-digit OTP." },
          { q: "How do I add more than 5 vehicles?", a: "The Free Trial allows 5 vehicle listings. Upgrade to the Pro Plan for unlimited listings. Contact our team to activate instantly." },
          { q: "How are leads distributed to dealers?", a: "When a buyer submits an enquiry, leads go to dealers matching the vehicle type and location. Priority dealers appear first." },
          { q: "Can I use the platform on mobile?", a: "Yes! Install our app from your browser — tap 'Add to Home Screen' on Chrome/Safari. Fully works as PWA." },
        ].map(({ q, a }, i) => (
          <details key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 0" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.text, listStyle: "none", display: "flex", justifyContent: "space-between" }}>
              {q} <span style={{ color: C.primary, fontSize: 16 }}>+</span>
            </summary>
            <div style={{ fontSize: 13, color: C.textMid, marginTop: 10, lineHeight: 1.7 }}>{a}</div>
          </details>
        ))}
      </Card>

      {/* Pro plan CTA */}
      <div style={{ marginTop: 20, background: `linear-gradient(135deg,${C.primary}12,${C.accent}08)`, border: `1.5px solid ${C.primary}33`, borderRadius: 14, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.primary }}>Need Pro Plan Assistance?</div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>Our team activates your Early Dealer Plan within minutes during business hours.</div>
        </div>
        <Btn label="⭐ Upgrade to Early Dealer — ₹5000/yr" color={C.primary} onClick={() => window.open(`https://wa.me/${settings.support_whatsapp.replace(/\D/g,"")}?text=Hi+I+want+to+upgrade+to+Early+Dealer+Plan`)} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MARKETING PAGE
// ═══════════════════════════════════════════════════════
const MARKETING_TEMPLATES = {
  whatsapp: [
    { id: "enquiry_followup", label: "Enquiry Follow-up", text: "नमस्ते {name} जी! 🙏\n\nआपने हमारे eRickshaw के बारे में enquiry की थी। क्या आप इसके बारे में और जानना चाहते हैं?\n\nहमारे पास latest models available हैं। Call करें: {phone}\n\n- {dealer_name}" },
    { id: "offer", label: "Special Offer", text: "नमस्ते {name} जी! 🎉\n\nआज हमारे पास एक special offer है — eRickshaw पर ₹{amount} की छूट!\n\nसीमित समय के लिए। आज ही संपर्क करें: {phone}\n\n- {dealer_name}" },
    { id: "new_model", label: "New Model Launch", text: "नमस्ते {name} जी! 🚀\n\nहमारे showroom में नया model आ गया है — {model}!\n\nBest price और EMI options के लिए आज ही आएं।\n\n📍 {address}\n📞 {phone}\n\n- {dealer_name}" },
  ],
  sms: [
    { id: "sms_offer", label: "SMS Offer", text: "Namaste {name}! Special offer on eRickshaw at {dealer_name}. Save Rs.{amount}. Call {phone} today!" },
    { id: "sms_reminder", label: "SMS Reminder", text: "Hi {name}, this is {dealer_name}. Your eRickshaw enquiry is pending. Call {phone} to know more." },
  ],
  email: [
    { id: "email_welcome", label: "Welcome Email", text: "Subject: Welcome to {dealer_name} — Your eRickshaw Journey Starts Here!\n\nDear {name},\n\nThank you for your interest in our eRickshaw vehicles. We are committed to providing you with the best electric vehicles at competitive prices.\n\nOur showroom is open Monday–Saturday, 9 AM to 7 PM.\n\nFor queries: {phone}\n\nWarm regards,\n{dealer_name}" },
    { id: "email_invoice", label: "Invoice Ready", text: "Subject: Your eRickshaw Invoice is Ready — {dealer_name}\n\nDear {name},\n\nYour invoice for the eRickshaw purchase is attached. Please review and let us know if you have any questions.\n\nThank you for choosing {dealer_name}!\n\nRegards,\n{dealer_name}" },
  ],
};

function MarketingPage() {
  const C = useC();
  const toast = useToast();
  const [tab, setTab] = useState("whatsapp"); // whatsapp | sms | email
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateText, setTemplateText] = useState("");
  const [contacts, setContacts] = useState(""); // newline-separated numbers/emails
  const [variables, setVariables] = useState({ name: "", phone: "", dealer_name: "", amount: "", model: "", address: "" });
  const [sending, setSending] = useState(false);
  const [apiKeys, setApiKeys] = useState({ twilio: false, whatsapp_business: false, gmail_smtp: false });

  // Check configured API keys
  useEffect(() => {
    api.dealer.apiKeys()
      .then(keys => {
        setApiKeys({
          twilio: keys.some(k => k.service === "twilio" && k.is_active),
          whatsapp_business: keys.some(k => k.service === "whatsapp_business" && k.is_active),
          gmail_smtp: keys.some(k => k.service === "gmail_smtp" && k.is_active),
        });
      })
      .catch(err => {
        console.error("Failed to fetch API keys:", err);
      });
  }, []);

  const templates = MARKETING_TEMPLATES[tab] || [];

  const selectTemplate = (t) => {
    setSelectedTemplate(t.id);
    setTemplateText(t.text);
  };

  const resolveText = () => {
    return templateText
      .replace(/\{name\}/g, variables.name || "{name}")
      .replace(/\{phone\}/g, variables.phone || "{phone}")
      .replace(/\{dealer_name\}/g, variables.dealer_name || "{dealer_name}")
      .replace(/\{amount\}/g, variables.amount || "{amount}")
      .replace(/\{model\}/g, variables.model || "{model}")
      .replace(/\{address\}/g, variables.address || "{address}");
  };

  const contactList = contacts.split("\n").map(c => c.trim()).filter(Boolean);

  const handleSend = async () => {
    if (!templateText.trim()) { toast("Please select or write a template.", "warning"); return; }
    if (contactList.length === 0) { toast("Please add at least one contact.", "warning"); return; }
    const apiKeyNeeded = tab === "email" ? "gmail_smtp" : tab === "whatsapp" ? "whatsapp_business" : "twilio";
    if (!apiKeys[apiKeyNeeded]) {
      toast(`Connect your ${tab === "email" ? "Email Service" : tab === "whatsapp" ? "WhatsApp Business" : "SMS Service"} in Settings → Integrations first.`, "warning");
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch("/marketing/send/", {
        method: "POST",
        body: JSON.stringify({ channel: tab, message: resolveText(), contacts: contactList }),
      });
      if (result.failed > 0) {
        toast(`Sent: ${result.sent}, Failed: ${result.failed}. ${result.errors?.[0] || "Check API key settings."}`, result.sent > 0 ? "warning" : "error");
      } else {
        toast(`Campaign sent to ${result.sent} contact${result.sent !== 1 ? "s" : ""}!`, "success");
      }
      if (result.sent > 0) setContacts("");
    } catch (err) {
      const msg = typeof err === "object" ? (err.error || Object.values(err).flat().join(" ")) : "Failed to send. Check API keys in Settings.";
      toast(msg, "error");
    }
    setSending(false);
  };

  const tabInfo = {
    whatsapp: { icon: "💬", label: "WhatsApp", apiKey: "whatsapp_business", apiLabel: "WhatsApp Business API" },
    sms:      { icon: "📱", label: "SMS",       apiKey: "twilio",           apiLabel: "SMS Provider" },
    email:    { icon: "✉️", label: "Email",      apiKey: "gmail_smtp",       apiLabel: "Gmail SMTP API" },
  };
  const info = tabInfo[tab];
  const hasKey = apiKeys[info.apiKey];

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>📣 Marketing Campaigns</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>Send WhatsApp, SMS, or Email campaigns to your customers and leads.</div>
      </div>

      {/* Channel tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {Object.entries(tabInfo).map(([id, t]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 700, fontSize: 13, background: tab === id ? C.surface : "transparent",
            color: tab === id ? C.primary : C.textMid, boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* API key warning */}
      {!hasKey && (
        <div style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.warning, display: "flex", alignItems: "center", gap: 10 }}>
          ⚠️ <span><b>{info.apiLabel}</b> is not connected. Go to <b>Settings → API Keys</b> to add your key. You can still compose messages, but sending will be disabled.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: Template picker + editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📋 Message Templates</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => selectTemplate(t)} style={{
                  padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${selectedTemplate === t.id ? C.primary : C.border}`,
                  background: selectedTemplate === t.id ? `${C.primary}12` : C.bg, cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left", fontSize: 13, fontWeight: selectedTemplate === t.id ? 700 : 400, color: C.text,
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: C.textMid }}>✏️ Edit Message</div>
            <textarea value={templateText} onChange={e => setTemplateText(e.target.value)} rows={6}
              placeholder={`Write your ${info.label} message here...\nUse {name}, {phone}, {dealer_name}, {amount}, {model}, {address} as placeholders.`}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.bg, lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Variables: {"{"+"name}"}, {"{"+"phone}"}, {"{"+"dealer_name}"}, {"{"+"amount}"}, {"{"+"model}"}, {"{"+"address}"}</div>
          </div>

          {/* Variable substitution */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🔤 Fill Variables</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.entries({ name: "Customer Name", phone: "Your Phone", dealer_name: "Dealer Name", amount: "Offer Amount (₹)", model: "Vehicle Model", address: "Showroom Address" }).map(([k, label]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: C.textMid, marginBottom: 3 }}>{label}</div>
                  <input value={variables[k]} onChange={e => setVariables(p => ({ ...p, [k]: e.target.value }))}
                    placeholder={`{${k}}`}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Contacts + preview + send */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Contact list */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
              👥 Contact List <span style={{ fontSize: 12, color: C.textDim, fontWeight: 400 }}>({contactList.length} contacts)</span>
            </div>
            <textarea value={contacts} onChange={e => setContacts(e.target.value)} rows={8}
              placeholder={tab === "email" ? "Enter email addresses, one per line:\njohn@example.com\nsuresh@example.com" : "Enter phone numbers, one per line:\n9876543210\n9123456789"}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.bg }} />
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
              {tab === "email" ? "One email per line." : "One 10-digit mobile number per line (Indian numbers)."}
            </div>
          </div>

          {/* Live preview */}
          {templateText && (
            <div style={{ background: tab === "whatsapp" ? "#e7fdd8" : C.surface, border: `1px solid ${tab === "whatsapp" ? "#25D36644" : C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: tab === "whatsapp" ? "#128c7e" : C.text }}>
                {info.icon} Preview
              </div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333", background: tab === "whatsapp" ? "#dcf8c6" : C.bg, padding: 12, borderRadius: 10 }}>
                {resolveText()}
              </div>
            </div>
          )}

          {/* Send button */}
          <button onClick={handleSend} disabled={sending || !hasKey}
            style={{ padding: "14px 24px", borderRadius: 10, background: hasKey ? C.primary : C.border, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: hasKey ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {sending ? "📤 Sending..." : `${info.icon} Send to ${contactList.length} contact${contactList.length !== 1 ? "s" : ""}`}
          </button>
          {!hasKey && (
            <div style={{ fontSize: 12, color: C.textDim, textAlign: "center" }}>
              Connect <b>{info.apiLabel}</b> in Settings → API Keys to enable sending.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LearnPage() {
  const C = useC();
  const toast = useToast();
  // tab: "videos" | "blogs"
  const [tab, setTab] = useState("videos");

  // ── Videos state ──
  const [videos, setVideos] = useState([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoCat, setVideoCat] = useState("");
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [addVideoForm, setAddVideoForm] = useState({ title: "", youtube_url: "", description: "", category: "tutorial", is_public: true });
  const [addingVideo, setAddingVideo] = useState(false);
  const [videoPreview, setVideoPreview] = useState(null);

  // ── Blog posts state ──
  const [posts, setPosts] = useState([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postCat, setPostCat] = useState("");
  const [showAddPost, setShowAddPost] = useState(false);
  const [addPostForm, setAddPostForm] = useState({ title: "", excerpt: "", content: "", url: "", category: "general", cover_image_url: "", is_published: true });
  const [addingPost, setAddingPost] = useState(false);

  const loadVideos = useCallback(() => {
    setVideoLoading(true);
    const q = videoCat ? `?category=${videoCat}` : "";
    api.videos.list(q).then(d => setVideos(d.results || d)).finally(() => setVideoLoading(false));
  }, [videoCat]);

  const loadPosts = useCallback(() => {
    setPostLoading(true);
    const q = postCat ? `?category=${postCat}` : "";
    api.blogs.list(q).then(d => setPosts(d.results || d)).finally(() => setPostLoading(false));
  }, [postCat]);

  useEffect(() => { loadVideos(); }, [loadVideos]);
  useEffect(() => { if (tab === "blogs") loadPosts(); }, [tab, loadPosts]);

  // Live preview for video URL
  useEffect(() => {
    const vid = extractVideoId(addVideoForm.youtube_url);
    setVideoPreview(vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null);
  }, [addVideoForm.youtube_url]);

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!addVideoForm.title.trim()) { toast("Title is required.", "warning"); return; }
    const vid = extractVideoId(addVideoForm.youtube_url);
    if (!vid) { toast("Enter a valid YouTube URL (e.g. https://youtube.com/watch?v=XXXX).", "warning"); return; }
    setAddingVideo(true);
    try {
      await api.videos.create(addVideoForm);
      toast("Video added successfully!", "success");
      setShowAddVideo(false);
      setAddVideoForm({ title: "", youtube_url: "", description: "", category: "tutorial", is_public: true });
      loadVideos();
    } catch (err) {
      toast(err?.message || "Failed to add video. Please try again.", "error");
    }
    setAddingVideo(false);
  };

  const handleDeleteVideo = async (id) => {
    if (!confirm("Delete this video?")) return;
    await api.videos.delete(id);
    setVideos(v => v.filter(x => x.id !== id));
    toast("Video deleted.", "success");
  };

  const handleAddPost = async (e) => {
    e.preventDefault();
    if (!addPostForm.title.trim()) { toast("Title is required.", "warning"); return; }
    if (!addPostForm.excerpt.trim() && !addPostForm.content.trim() && !addPostForm.url.trim()) {
      toast("Add an excerpt, content, or URL for the post.", "warning"); return;
    }
    setAddingPost(true);
    try {
      await api.blogs.create(addPostForm);
      toast("Blog post added!", "success");
      setShowAddPost(false);
      setAddPostForm({ title: "", excerpt: "", content: "", url: "", category: "general", cover_image_url: "", is_published: true });
      loadPosts();
    } catch (err) {
      toast(err?.message || "Failed to add post.", "error");
    }
    setAddingPost(false);
  };

  const handleDeletePost = async (id) => {
    if (!confirm("Delete this post?")) return;
    await api.blogs.delete(id);
    setPosts(p => p.filter(x => x.id !== id));
    toast("Post deleted.", "success");
  };

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>🎓 Learning Hub</div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>Tutorials, maintenance tips, earning guides, expert reviews & blog posts</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "videos" && (
            <button onClick={() => setShowAddVideo(true)} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              + Add Video
            </button>
          )}
          {tab === "blogs" && (
            <button onClick={() => setShowAddPost(true)} style={{ background: C.info, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              + Write Post
            </button>
          )}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[{id:"videos",label:"🎬 Videos"},{id:"blogs",label:"📝 Blog Posts"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
            background: tab === t.id ? C.surface : "transparent",
            color: tab === t.id ? C.primary : C.textMid,
            boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "videos" && (
        <>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {VIDEO_CATS.map(c => (
              <button key={c.id} onClick={() => setVideoCat(c.id)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1.5px solid ${videoCat === c.id ? C.primary : C.border}`,
                background: videoCat === c.id ? C.primary : C.surface,
                color: videoCat === c.id ? "#fff" : C.textMid,
                fontWeight: videoCat === c.id ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{c.label}</button>
            ))}
          </div>
          {videoLoading ? <Spinner /> : videos.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <div style={{ fontWeight: 600 }}>No videos in this category</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Add a helpful eRickshaw video!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {videos.map(v => <VideoCard key={v.id} v={v} onDelete={handleDeleteVideo} />)}
            </div>
          )}
        </>
      )}

      {tab === "blogs" && (
        <>
          {/* Blog category filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {BLOG_CATS.map(c => (
              <button key={c.id} onClick={() => setPostCat(c.id)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1.5px solid ${postCat === c.id ? C.info : C.border}`,
                background: postCat === c.id ? C.info : C.surface,
                color: postCat === c.id ? "#fff" : C.textMid,
                fontWeight: postCat === c.id ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{c.label}</button>
            ))}
          </div>
          {postLoading ? <Spinner /> : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontWeight: 600 }}>No blog posts yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Share your knowledge with the eRickshaw community!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {posts.map(p => <BlogPostCard key={p.id} post={p} onDelete={handleDeletePost} />)}
            </div>
          )}
        </>
      )}

      {/* Info cards (shown on both tabs) */}
      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {[
          { icon: "⚡", title: "Zero Fuel Cost", body: "Electric power costs ₹1–2 per km vs ₹5–6 for petrol. Save ₹3000–5000 per month on fuel alone.", color: C.success },
          { icon: "💰", title: "Earn ₹800–1500/Day", body: "With proper route planning in high-demand areas — schools, markets, hospitals — drivers can earn significantly more.", color: C.primary },
          { icon: "🔋", title: "Battery Life Tips", body: "Charge to 90%, avoid full discharge. Park in shade. Clean terminals monthly. Battery lasts 3–5 years with good care.", color: C.warning },
          { icon: "📋", title: "Registration & License", body: "eRickshaw needs: Driving License (LMV), RC Book, Insurance, Permit. Yellow plate required for commercial use.", color: C.info },
        ].map(({ icon, title, body, color }) => (
          <div key={title} style={{ background: C.surface, border: `1.5px solid ${color}25`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>{body}</div>
          </div>
        ))}
      </div>

      {/* Add Video modal */}
      {showAddVideo && (
        <Modal title="Add YouTube Video" onClose={() => setShowAddVideo(false)}>
          <form onSubmit={handleAddVideo}>
            <Field label="YouTube URL *">
              <Input value={addVideoForm.youtube_url} onChange={v => setAddVideoForm(p => ({ ...p, youtube_url: v }))} placeholder="https://www.youtube.com/watch?v=..." />
            </Field>
            {videoPreview && (
              <div style={{ marginBottom: 14, borderRadius: 8, overflow: "hidden", maxHeight: 160 }}>
                <img src={videoPreview} alt="preview" style={{ width: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
              </div>
            )}
            <Field label="Title *">
              <Input value={addVideoForm.title} onChange={v => setAddVideoForm(p => ({ ...p, title: v }))} placeholder="e.g. Battery maintenance tips" />
            </Field>
            <Field label="Category">
              <Select value={addVideoForm.category} onChange={v => setAddVideoForm(p => ({ ...p, category: v }))} options={VIDEO_CATS.filter(c => c.id).map(c => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label="Description">
              <Input value={addVideoForm.description} onChange={v => setAddVideoForm(p => ({ ...p, description: v }))} placeholder="Brief description..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAddVideo(false)} />
              <Btn label={addingVideo ? "Adding..." : "Add Video"} color={C.primary} type="submit" disabled={addingVideo} />
            </div>
          </form>
        </Modal>
      )}

      {/* Add Blog Post modal */}
      {showAddPost && (
        <Modal title="Write a Blog Post" onClose={() => setShowAddPost(false)}>
          <form onSubmit={handleAddPost}>
            <Field label="Title *">
              <Input value={addPostForm.title} onChange={v => setAddPostForm(p => ({ ...p, title: v }))} placeholder="e.g. Battery maintenance tips for 5-year life" />
            </Field>
            <Field label="Category">
              <Select value={addPostForm.category} onChange={v => setAddPostForm(p => ({ ...p, category: v }))} options={BLOG_CATS.filter(c => c.id).map(c => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label="Short Excerpt (shown in card)">
              <textarea value={addPostForm.excerpt} onChange={e => setAddPostForm(p => ({ ...p, excerpt: e.target.value }))}
                rows={2} placeholder="Brief description of this post..."
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, resize: "vertical", boxSizing: "border-box" }} />
            </Field>
            <Field label="External URL (optional — link to article)">
              <Input value={addPostForm.url} onChange={v => setAddPostForm(p => ({ ...p, url: v }))} placeholder="https://example.com/article" />
            </Field>
            <Field label="Full Content (optional — write your article here)">
              <textarea value={addPostForm.content} onChange={e => setAddPostForm(p => ({ ...p, content: e.target.value }))}
                rows={4} placeholder="Write your full article content here..."
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, resize: "vertical", boxSizing: "border-box" }} />
            </Field>
            <Field label="Cover Image URL (optional)">
              <Input value={addPostForm.cover_image_url} onChange={v => setAddPostForm(p => ({ ...p, cover_image_url: v }))} placeholder="https://images.unsplash.com/..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAddPost(false)} />
              <Btn label={addingPost ? "Publishing..." : "Publish Post"} color={C.info} type="submit" disabled={addingPost} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MARKETPLACE PAGE (public-facing)
// ═══════════════════════════════════════════════════════
function Marketplace() {
  const C = useC();
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ fuel_type: "", search: "", city: "" });
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const pendingCityAction = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams(Object.fromEntries(Object.entries({ ...filter, city: cityFilter || filter.city }).filter(([, v]) => v)));
    if (sortBy) p.set("ordering", sortBy);
    api.marketplace(`?${p}`).then(d => setVehicles(d.results || [])).finally(() => setLoading(false));
  }, [filter, cityFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleNearMe = () => {
    pendingCityAction.current = (city) => { setCityFilter(city); };
    setShowCityModal(true);
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 16, padding: "32px 28px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", fontSize: 72, opacity: 0.25 }}>🛺</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>India's #1 Marketplace for eRickshaw & Auto-rickshaws</div>
        <div style={{ opacity: 0.85, marginBottom: 18 }}>Search, Compare & Buy New and Used eRickshaws in India</div>
        <div style={{ display: "flex", gap: 10, maxWidth: 520 }}>
          <Input value={filter.search} onChange={v => setFilter(p => ({ ...p, search: v }))} placeholder="Search by model or brand..." style={{ background: "rgba(255,255,255,0.9)", border: "none" }} />
          <Btn label="Search" color={C.accent} onClick={load} />
        </div>
      </div>

      {/* Fuel filter tabs + city + sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {["", "electric", "petrol", "cng", "lpg"].map(f => (
          <button key={f} onClick={() => setFilter(p => ({ ...p, fuel_type: f }))}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${filter.fuel_type === f ? C.primary : C.border}`, background: filter.fuel_type === f ? C.primary : "#fff", color: filter.fuel_type === f ? "#fff" : C.textMid, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All eRickshaws"}
          </button>
        ))}
        <button onClick={handleNearMe}
          style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${cityFilter ? C.success : C.border}`, background: cityFilter ? C.success : "#fff", color: cityFilter ? "#fff" : C.textMid, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
          📍 {cityFilter ? `Near: ${cityFilter}` : "Near Me"}
        </button>
        {cityFilter && (
          <button onClick={() => setCityFilter("")}
            style={{ padding: "5px 10px", borderRadius: 14, border: `1.5px solid ${C.danger}40`, background: `${C.danger}10`, color: C.danger, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
            ✕ Clear City
          </button>
        )}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", color: C.textMid, cursor: "pointer", background: C.surface }}>
          <option value="">Sort: Default</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
          <option value="best_price">Best Price Near Me</option>
        </select>
      </div>

      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, color: C.text }}>Browse New & Popular Models</div>

      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {vehicles.map(v => (
            <Card key={v.id} style={{ transition: "all 0.2s", border: `1.5px solid ${C.border}`, cursor: "pointer" }}
              onClick={() => setDetailVehicle(v)}>
              {(v.thumbnail || v.thumbnail_url)
                ? <img src={v.thumbnail || v.thumbnail_url} alt={v.model_name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />
                : <div style={{ height: 120, background: `linear-gradient(135deg,${C.primary}15,${C.accent}15)`, borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🛺</div>}
              <div style={{ fontWeight: 700, fontSize: 14 }}>{v.model_name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 6, flexWrap: "wrap" }}>
                <Badge label={v.fuel_type} color={FUEL_COLOR[v.fuel_type]} />
                <Badge label={v.brand_name} color={C.textMid} />
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>📍 {v.dealer_city}</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 12 }}>Starting at <span style={{ color: C.primary, fontWeight: 700, fontSize: 15 }}>{fmtINR(v.price)}</span></div>
              <Btn label="View Details & Price" color={C.primary} fullWidth size="sm" onClick={e => { e.stopPropagation(); setDetailVehicle(v); }} /></Card>
          ))}
        </div>
      )}

      {detailVehicle && <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />}

      {showCityModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Find Nearby Dealers</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>Enter your city to find dealers near you:</div>
            <input
              type="text"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && cityInput.trim()) { pendingCityAction.current?.(cityInput.trim()); setShowCityModal(false); setCityInput(""); } }}
              placeholder="e.g. Delhi, Mumbai, Lucknow"
              autoFocus
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", marginBottom: 16, background: C.bg, color: C.text, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCityModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => { if (cityInput.trim()) { pendingCityAction.current?.(cityInput.trim()); setShowCityModal(false); setCityInput(""); } }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Find Dealers</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLANS PAGE
// ═══════════════════════════════════════════════════════
const PLAN_FEATURES = [
  { label: "Vehicle Listings",              free: "5 vehicles",           pro: "Unlimited" },
  { label: "Lifetime Leads",                free: "20 leads",             pro: "Unlimited" },
  { label: "Lifetime Invoices (GST)",       free: "20 invoices",          pro: "Unlimited" },
  { label: "Lifetime Enquiries",            free: "20 enquiries",         pro: "Unlimited" },
  { label: "Customer Database",             free: true,                   pro: true },
  { label: "Finance & EMI Calculator",      free: true,                   pro: true },
  { label: "Reports & Analytics",           free: "Basic",                pro: "Advanced + Export" },
  { label: "Priority Marketplace Ranking",  free: false,                  pro: true },
  { label: "Featured Dealer Badge",         free: false,                  pro: true },
  { label: "Email Notifications",           free: true,                   pro: true },
  { label: "WhatsApp Lead Alerts",          free: false,                  pro: true },
  { label: "Marketing Campaign Tools",      free: false,                  pro: true },
  { label: "Loan Partner Integration",      free: false,                  pro: true },
  { label: "Priority Support",              free: false,                  pro: true },
  { label: "Validity",                      free: "30 days free trial",   pro: "1 Year" },
];

function PlanFeatureRow({ label, free, pro }) {
  const renderVal = (v) => {
    if (v === true)  return <span style={{ color: C.success, fontSize: 16 }}>✓</span>;
    if (v === false) return <span style={{ color: C.textDim, fontSize: 16 }}>—</span>;
    return <span style={{ fontSize: 12, color: C.textMid }}>{v}</span>;
  };
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: "11px 16px", fontSize: 13, color: C.text }}>{label}</td>
      <td style={{ padding: "11px 16px", textAlign: "center" }}>{renderVal(free)}</td>
      <td style={{ padding: "11px 16px", textAlign: "center", background: `${C.primary}08` }}>{renderVal(pro)}</td>
    </tr>
  );
}

function PlansPage({ onUpgrade }) {
  const C = useC();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [platformContact, setPlatformContact] = useState({ support_phone: "", support_whatsapp: "", support_email: "", support_name: "" });

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
    fetch(`${API}/platform/settings/`).then(r => r.json()).then(d => setPlatformContact(d)).catch(() => {});
  }, []);

  const plan = data?.plan;
  const isPro = plan?.is_active && plan?.type !== "free";
  const isFreeActive = plan?.type === "free" && plan?.is_active;

  const phone    = platformContact.support_phone    || SUPPORT_PHONE;
  const wa       = platformContact.support_whatsapp || SUPPORT_WA;
  const email    = platformContact.support_email    || SUPPORT_EMAIL;
  const teamName = platformContact.support_name     || `${BRANDING.platformName} Team`;

  const handleGetPro = () => setShowContactModal(true);

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 6 }}>Plans & Pricing</div>
        <div style={{ fontSize: 14, color: C.textMid }}>Choose the right plan for your dealership. Start free, upgrade anytime.</div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Current plan status */}
          {plan && (
            <div style={{
              background: plan.is_active ? `${C.success}12` : `${C.danger}12`,
              border: `1px solid ${plan.is_active ? C.success + "44" : C.danger + "44"}`,
              borderRadius: 10, padding: "12px 18px", marginBottom: 24,
              fontSize: 13, color: plan.is_active ? C.success : C.danger,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {plan.is_active
                ? `✅ You are on the ${plan.type.toUpperCase()} plan — ${plan.days_remaining} day${plan.days_remaining !== 1 ? "s" : ""} remaining`
                : `⚠️ Your plan has expired. Contact our team to renew and continue accessing all features.`}
            </div>
          )}

          {/* Plan cards */}
          <div className="erd-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {/* Free Plan */}
            <Card style={{ border: isFreeActive ? `2px solid ${C.primary}` : `1px solid ${C.border}`, position: "relative" }}>
              {isFreeActive && (
                <div style={{ position: "absolute", top: -12, left: 20, background: C.primary, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>
                  CURRENT PLAN
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, letterSpacing: "1px", marginBottom: 6 }}>FREE TRIAL</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.text }}>₹0</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>30-day free trial</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.7 }}>
                Explore the platform at no cost. Perfect for new dealerships getting started.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {[
                  "5 vehicle listings",
                  "20 lifetime leads",
                  "20 lifetime invoices",
                  "20 lifetime enquiries",
                  "EMI calculator",
                  "Basic dashboard",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMid }}>
                    <span style={{ color: C.success, fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
                {["Priority marketplace ranking", "Featured dealer badge", "WhatsApp lead alerts", "Advanced analytics", "Financer integration"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textDim }}>
                    <span>—</span> {f}
                  </div>
                ))}
              </div>
              <Btn label={isFreeActive ? "Current Plan" : "Get Started Free"} color={C.primary} outline fullWidth disabled={isFreeActive} />
            </Card>

            {/* Early Dealer / Pro Plan */}
            <Card style={{ border: `2px solid ${C.primary}`, background: `linear-gradient(180deg,${C.primary}08 0%,transparent 100%)`, position: "relative" }}>
              <div style={{ position: "absolute", top: -12, right: 20, background: `linear-gradient(90deg,${C.accent || "#6366f1"},${C.primary})`, color: "#fff", borderRadius: 20, padding: "3px 14px", fontSize: 11, fontWeight: 700 }}>
                {isPro ? "CURRENT PLAN" : "FIRST 100 DEALERS"}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "1px", marginBottom: 6 }}>PRO PLAN — EARLY DEALER</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: C.primary }}>₹5,000</div>
                  <div style={{ fontSize: 13, color: C.textMid, marginBottom: 7 }}>/year</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: C.textDim, textDecoration: "line-through" }}>₹9,000/yr</span>
                  <span style={{ background: `${C.success}20`, color: C.success, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>SAVE ₹4,000</span>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>For first 100 dealers only • Regular price ₹9,000/yr after</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.7 }}>
                Everything unlimited for 1 full year. Priority search ranking, featured badge, WhatsApp alerts, financer integration, and all future tools.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {[
                  "Unlimited vehicle listings",
                  "Unlimited leads & invoices",
                  "Priority marketplace ranking",
                  "Featured dealer badge",
                  "WhatsApp lead alerts",
                  "Advanced analytics & reports",
                  "Loan Partner integration",
                  "All future marketing tools",
                  "Priority support",
                  "1 year validity",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
                    <span style={{ color: C.success, fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {isPro ? (
                <Btn label="Active Plan ✓" color={C.success} fullWidth disabled />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Btn label="⭐ Get Pro Plan — Contact Team" color={C.primary} fullWidth onClick={handleGetPro} />
                  <div style={{ textAlign: "center", fontSize: 11, color: C.textDim }}>Our team activates your account instantly • Limited early spots</div>
                </div>
              )}
            </Card>
          </div>

          {/* Feature comparison table */}
          <Card padding={0} style={{ marginBottom: 28 }}>
            <div style={{ padding: "16px 16px 0", fontWeight: 700, fontSize: 15, color: C.text }}>Full Feature Comparison</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}` }}>FEATURE</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, width: 150 }}>FREE TRIAL</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: C.primary, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, background: `${C.primary}08`, width: 150 }}>PRO ⭐</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map(f => <PlanFeatureRow key={f.label} {...f} />)}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Contact / upgrade CTA */}
          <div style={{ padding: "24px", background: `linear-gradient(135deg,${C.primary}10,${C.primary}05)`, borderRadius: 14, border: `1.5px solid ${C.primary}22`, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>🚀</div>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8, color: C.text }}>Ready to go Pro?</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.8, marginBottom: 20, maxWidth: 480, margin: "0 auto 20px" }}>
              Call or WhatsApp our team — we'll activate your Pro account within minutes.<br />
              <b>First 100 dealers get lifetime early-bird pricing at ₹5,000/yr.</b>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {phone && <Btn label={`📞 Call ${phone}`} color={C.primary} size="lg" onClick={() => window.open(`tel:${phone.replace(/\s/g, "")}`)} />}
              {wa    && <Btn label="💬 WhatsApp Team" color={C.success} size="lg" onClick={() => window.open(buildWhatsAppLink(`Hi! I want to upgrade to the Pro Plan on ${BRANDING.platformName}`), "_blank")} />}
              {email && <Btn label={`✉️ Email Us`} color={C.info} outline size="lg" onClick={() => window.open(`mailto:${email}?subject=Pro Plan Upgrade — ${BRANDING.platformName}`)} />}
            </div>
          </div>
        </>
      )}

      {/* Pro plan contact modal */}
      {showContactModal && (
        <Modal title="⭐ Upgrade to Pro — Contact Our Team" onClose={() => setShowContactModal(false)} width={500}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🚀</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>Get Pro for ₹5,000/year</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>
              Contact our team to activate your Pro plan instantly.<br />
              <b style={{ color: C.primary }}>First 100 dealers only</b> — regular price ₹9,000/yr after.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {phone && (
              <button onClick={() => window.open(`tel:${phone.replace(/\s/g, "")}`)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: `1.5px solid ${C.primary}44`, background: `${C.primary}08`, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 24 }}>📞</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Call Us</div>
                  <div style={{ fontSize: 13, color: C.primary }}>{phone}</div>
                </div>
              </button>
            )}
            {wa && (
              <button onClick={() => window.open(buildWhatsAppLink(`Hi! I want to upgrade to the Pro Plan on ${BRANDING.platformName}. Please activate my account.`), "_blank")}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: `1.5px solid #25D36644`, background: "#25D36608", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 24 }}>💬</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>WhatsApp</div>
                  <div style={{ fontSize: 13, color: "#25D366" }}>+{wa}</div>
                </div>
              </button>
            )}
            {email && (
              <button onClick={() => window.open(`mailto:${email}?subject=Pro Plan Upgrade — ${BRANDING.platformName}`, "_blank")}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: `1.5px solid ${C.info}44`, background: `${C.info}08`, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 24 }}>✉️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Email</div>
                  <div style={{ fontSize: 13, color: C.info }}>{email}</div>
                </div>
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, textAlign: "center" }}>
            Our team is available Mon–Sat, 10am–7pm IST
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PWA INSTALL PROMPT
// ═══════════════════════════════════════════════════════
function PWAInstallPrompt() {
  const C = useC();
  const [prompt, setPrompt] = useState(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("erd_pwa_dismissed") === "1");

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isIOS && !isStandalone && !dismissed) setShowIOS(true);

    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem("erd_pwa_dismissed", "1");
    setDismissed(true); setPrompt(null); setShowIOS(false);
  };

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  };

  if (dismissed || (!prompt && !showIOS)) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: C.surface, border: `1.5px solid ${C.primary}`, borderRadius: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "14px 20px", zIndex: 9998,
      display: "flex", alignItems: "center", gap: 14, maxWidth: 400, width: "calc(100% - 40px)",
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>🛺</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Install {BRANDING.platformName} App</div>
        <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>
          {showIOS ? "Tap Share → Add to Home Screen for faster access." : "Get faster access and offline support."}
        </div>
      </div>
      {!showIOS && <Btn label="Install" color={C.primary} size="sm" onClick={install} />}
      <button onClick={dismiss} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textDim, padding: 0, flexShrink: 0 }}>✕</button>
    </div>
  );
}

// Support contact — set VITE_SUPPORT_PHONE / VITE_SUPPORT_WA in .env.local
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || BRANDING.support.phone || "";
const SUPPORT_WA    = import.meta.env.VITE_SUPPORT_WA    || BRANDING.support.whatsapp || "";
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || BRANDING.support.email || "";

function ContactSupportModal({ onClose, onNavigate }) {
  const C = useC();
  return (
    <Modal title="Upgrade to Early Dealer Plan" onClose={onClose} width={440}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "4px 0 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.primary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>⭐</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>Unlock Early Dealer Features</div>
        <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.75 }}>
          Get unlimited vehicles, leads, invoices, WhatsApp alerts and priority support.
        </div>
      </div>

      {/* Early Dealer Plan */}
      <div style={{ background: `${C.primary}08`, border: `2px solid ${C.primary}33`, borderRadius: 12, padding: "16px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 4 }}>Early Dealer Plan</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>₹5,000</div>
        <div style={{ fontSize: 12, color: C.textMid, marginBottom: 8 }}>per year · Unlimited Listings · Priority Ranking</div>
        <div style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>⚡ Only 100 dealers — First come, first served</div>
      </div>

      {/* Contact options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SUPPORT_WA && (
          <Btn label="💬 WhatsApp Us — Get started in minutes" color={C.success} fullWidth
            onClick={() => window.open(`https://wa.me/${SUPPORT_WA.replace(/\D/g, "")}?text=Hi+I+want+to+upgrade+to+Pro+plan`, "_blank")} />
        )}
        {SUPPORT_PHONE && (
          <Btn label={`📞 Call Us — ${SUPPORT_PHONE}`} color={C.primary} fullWidth
            onClick={() => window.open(`tel:${SUPPORT_PHONE}`)} />
        )}
        <Btn label={`✉️ Email — ${SUPPORT_EMAIL}`} color={C.info} outline fullWidth
          onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=Pro%20Plan%20Upgrade%20Request&body=Hi%2C%20I%27d%20like%20to%20upgrade%20to%20the%20Pro%20plan.%20Please%20get%20in%20touch.`)} />
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: C.textDim, textAlign: "center", lineHeight: 1.6 }}>
        We'll activate your account within minutes during business hours.<br />
        No hidden charges. Cancel anytime.
      </div>
    </Modal>
  );
}

const FINANCER_NAV = [
  { id: "overview",      label: "Dashboard",    icon: "📊" },
  { id: "dealers",       label: "Dealers",      icon: "🏪" },
  { id: "applications",  label: "Applications", icon: "📄" },
  { id: "documents",     label: "My Documents", icon: "📁" },
  { id: "req_docs",      label: "Doc Templates",icon: "📋" },
];

// ═══════════════════════════════════════════════════════
// ADMIN PORTAL
// ═══════════════════════════════════════════════════════
const ADMIN_NAV = [
  { id: "overview",      label: "Overview",       icon: "📊" },
  { id: "dealers",       label: "Dealers",        icon: "🏪" },
  { id: "financers",     label: "Financers",      icon: "🏦" },
  { id: "users",         label: "Users",          icon: "👥" },
  { id: "applications",  label: "Applications",   icon: "📋" },
  { id: "fin_apps",      label: "Finance Apps",   icon: "💳" },
  { id: "analytics",     label: "Leads Analytics",icon: "📈" },
  { id: "enquiries",     label: "Enquiries",      icon: "💬" },
  { id: "homepage",      label: "Homepage",       icon: "🏠" },
  { id: "settings",      label: "Settings",       icon: "⚙️" },
];

function AdminSettingsPanel({ toast }) {
  const C = useC();
  const [form, setForm] = useState({ support_name: "", support_phone: "", support_whatsapp: "", support_email: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/platform/settings/`).then(r => r.json()).then(d => { setForm(d); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings(form);
      toast("Settings saved!", "success");
    } catch { toast("Failed to save settings.", "error"); }
    setSaving(false);
  };

  if (!loaded) return <Spinner />;
  return (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: C.text }}>⚙️ Platform Settings</div>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>These contact details appear in dealer verification banners and support pages.</div>
        {[
          { key: "support_name",      label: "Support Team Name",    placeholder: `${BRANDING.platformName} Support` },
          { key: "support_email",     label: "Support Email",        placeholder: BRANDING.support.email },
          { key: "support_phone",     label: "Support Phone",        placeholder: "+91 99999 99999" },
          { key: "support_whatsapp",  label: "WhatsApp Number (with country code, no +)", placeholder: "919999999999" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{f.label}</div>
            <input value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
          </div>
        ))}
        <Btn label={saving ? "Saving..." : "💾 Save Settings"} color={C.primary} disabled={saving} onClick={save} />
      </Card>
    </div>
  );
}

function AdminHomepagePanel({ toast }) {
  const C = useC();
  const [form, setForm] = useState({
    announcement_text: "", announcement_link: "",
    hero_title_hi: "", hero_title_en: "",
    hero_subtitle_hi: "", hero_subtitle_en: "",
    support_phone: "", support_whatsapp: "", support_email: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/public/homepage/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setForm(p => ({ ...p, ...d })); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/admin-portal/settings/", { method: "PATCH", body: JSON.stringify(form) });
      toast("Homepage content saved!", "success");
    } catch { toast("Failed to save.", "error"); }
    setSaving(false);
  };

  if (!loaded) return <Spinner />;
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" };
  const Section = ({ title, children }) => (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>{title}</div>
      {children}
    </Card>
  );
  const Field = ({ label, k, placeholder, as = "input" }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{label}</div>
      {as === "textarea"
        ? <textarea value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
            placeholder={placeholder} rows={2}
            style={{ ...inp, resize: "vertical", minHeight: 60 }} />
        : <input value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
            placeholder={placeholder} style={inp} />
      }
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      <Section title="📢 Announcement Bar">
        <div style={{ fontSize: 12, color: C.textMid, marginBottom: 12 }}>Leave text blank to hide the announcement bar on homepage.</div>
        <Field k="announcement_text" label="Announcement Text (Hindi preferred)" placeholder="🎉 अब 500+ verified dealers available — free enquiry करें!" as="textarea" />
        <Field k="announcement_link" label="Link (optional)" placeholder="https://erikshawdekho.com/..." />
      </Section>

      <Section title="🦸 Hero Section Text">
        <Field k="hero_title_hi" label="Main Heading (Hindi)" placeholder="ई-रिक्शा चाहिए?" />
        <Field k="hero_title_en" label="Main Heading (English)" placeholder="Looking for E-Rickshaw?" />
        <Field k="hero_subtitle_hi" label="Subtitle (Hindi)" placeholder="Verified dealers से best price पाएँ — बिल्कुल मुफ्त" as="textarea" />
        <Field k="hero_subtitle_en" label="Subtitle (English)" placeholder="Get best prices from verified dealers — completely free" as="textarea" />
      </Section>

      <Section title="📞 Contact Info (shown on homepage)">
        <Field k="support_phone" label="Support Phone" placeholder="+91-99999-99999" />
        <Field k="support_whatsapp" label="WhatsApp Number (digits only, with country code)" placeholder="919999999999" />
        <Field k="support_email" label="Support Email" placeholder="support@erikshawdekho.com" />
      </Section>

      <Btn label={saving ? "Saving..." : "💾 Save Homepage Content"} color={C.primary} disabled={saving} onClick={save} />
      <div style={{ marginTop: 10, fontSize: 12, color: C.textMid }}>Changes appear on the public homepage immediately.</div>
    </div>
  );
}

function AdminPortal({ user, onLogout }) {
  const C = useC();
  const { isDark, toggle } = useContext(ThemeCtx);
  const toast = useToast();
  const [page, setPage] = useState("overview");
  const [stats, setStats] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [pg, setPg] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appFilter, setAppFilter] = useState("pending");
  const [resetPwdDealer, setResetPwdDealer] = useState(null);
  const [resetPwdInput, setResetPwdInput] = useState("");
  const [resetPwdResult, setResetPwdResult] = useState(null);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", phone: "", password: "", user_type: "dealer", city: "", state: "" });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [financers, setFinancers] = useState([]);
  const [finApps, setFinApps] = useState([]);
  const [finAppFilter, setFinAppFilter] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("monthly");
  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [resetPwdFinancer, setResetPwdFinancer] = useState(null);
  const [managePlanTarget, setManagePlanTarget] = useState(null); // { type: 'dealer'|'financer', item }
  const [managePlanLoading, setManagePlanLoading] = useState(false);
  const [selectedFinancerDocs, setSelectedFinancerDocs] = useState(null);
  const [financerDocList, setFinancerDocList] = useState([]);
  const [loadingFinancerDocs, setLoadingFinancerDocs] = useState(false);

  useEffect(() => { api.admin.stats().then(setStats).catch(() => {}); }, []);

  const loadPage = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: pg });
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to", dateTo);
    if (appFilter && page === "applications") p.set("status", appFilter);
    const qs = `?${p}`;
    const calls = {
      dealers:      () => api.admin.dealers(qs).then(d => { setDealers(d.results || []); setTotalPages(d.total_pages || 1); }),
      financers:    () => api.admin.financers(qs).then(d => { setFinancers(d.results || d || []); setTotalPages(d.total_pages || 1); }),
      users:        () => api.admin.users(qs).then(d => { setUsers(d.results || []); setTotalPages(d.total_pages || 1); }),
      applications: () => api.admin.applications(qs).then(d => { setApplications(d.results || []); setTotalPages(d.total_pages || 1); }),
      fin_apps:     () => api.admin.financeApps(qs).then(d => { setFinApps(d.results || d || []); setTotalPages(d.total_pages || 1); }),
      enquiries:    () => api.admin.enquiries(qs).then(d => { setEnquiries(d.results || []); setTotalPages(d.total_pages || 1); }),
      analytics:    () => {
        const ap = new URLSearchParams({ period: analyticsPeriod });
        if (analyticsFrom) ap.set("date_from", analyticsFrom);
        if (analyticsTo)   ap.set("date_to", analyticsTo);
        return api.admin.leadsAnalytics(`?${ap}`).then(d => setAnalytics(d));
      },
    };
    (calls[page] || (() => Promise.resolve()))().finally(() => setLoading(false));
  }, [page, pg, debouncedSearch, dateFrom, dateTo, appFilter, analyticsPeriod, analyticsFrom, analyticsTo]);

  useEffect(() => { if (page !== "overview") loadPage(); }, [loadPage, page]);

  const verifyDealer = async (id, verified) => {
    await api.admin.verifyDealer(id, { is_verified: verified });
    setDealers(p => p.map(d => d.id === id ? { ...d, is_verified: verified } : d));
    toast(verified ? "Dealer verified!" : "Verification removed.", "success");
  };

  const verifyFinancer = async (id, verified) => {
    await api.admin.verifyFinancer(id, { is_verified: verified });
    setFinancers(p => p.map(f => f.id === id ? { ...f, is_verified: verified } : f));
    toast(verified ? "Financer verified!" : "Verification removed.", "success");
  };

  const loadFinancerDocs = async (f) => {
    setSelectedFinancerDocs(f);
    setLoadingFinancerDocs(true);
    try {
      const r = await api.admin.financerDocs(f.id);
      setFinancerDocList(r.docs || []);
    } catch { setFinancerDocList([]); }
    setLoadingFinancerDocs(false);
  };

  const reviewFinancerDoc = async (financer, doc, status) => {
    try {
      await api.admin.reviewFinancerDoc(financer.id, doc.id, { status });
      const r = await api.admin.financerDocs(financer.id);
      setFinancerDocList(r.docs || []);
      toast(`Document ${status}`, status === 'approved' ? 'success' : 'error');
    } catch { toast('Failed to update', 'error'); }
  };

  const handleApp = async (id, status) => {
    await api.admin.updateApp(id, { status });
    setApplications(p => p.map(a => a.id === id ? { ...a, status } : a));
    toast(`Application ${status}.`, "success");
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    await api.admin.deleteUser(id);
    setUsers(p => p.filter(u => u.id !== id));
    toast("User deleted.", "success");
  };

  const handleManagePlan = async (planSlug) => {
    if (!managePlanTarget) return;
    setManagePlanLoading(true);
    try {
      const { type, item } = managePlanTarget;
      if (type === "dealer") {
        await api.admin.manageDealer(item.id, { action: "set_plan", plan_slug: planSlug });
        setDealers(p => p.map(d => d.id === item.id ? { ...d, plan_type: planSlug === "free" ? "free" : "pro" } : d));
      } else {
        await api.admin.manageFinancer(item.id, { action: "set_plan", plan_slug: planSlug });
        setFinancers(p => p.map(f => f.id === item.id ? { ...f, plan_type: planSlug } : f));
      }
      toast(`Plan updated to ${planSlug}`, "success");
      setManagePlanTarget(null);
    } catch (e) { toast(e?.error || "Failed to update plan", "error"); }
    setManagePlanLoading(false);
  };

  const handleToggleActive = async (type, item) => {
    const action = item.is_active === false ? "activate" : "deactivate";
    const label = type === "dealer" ? item.dealer_name : item.company_name;
    if (!confirm(`${action === "deactivate" ? "Deactivate" : "Activate"} ${label}?`)) return;
    try {
      if (type === "dealer") {
        await api.admin.manageDealer(item.id, { action });
        setDealers(p => p.map(d => d.id === item.id ? { ...d, is_active: action === "activate" } : d));
      } else {
        await api.admin.manageFinancer(item.id, { action });
        setFinancers(p => p.map(f => f.id === item.id ? { ...f, is_active: action === "activate" } : f));
      }
      toast(`${label} ${action}d.`, "success");
    } catch (e) { toast(e?.error || "Failed", "error"); }
  };

  const sidebarStyle = { width: 200, minWidth: 200, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 };

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
      {/* Admin Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${C.danger},#b91c1c)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚙️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Admin Portal</div>
              <div style={{ fontSize: 10, color: C.textDim }}>Super Admin</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {ADMIN_NAV.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setPg(1); setSearch(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: page === n.id ? `${C.danger}15` : "transparent", border: "none", borderRadius: 8, color: page === n.id ? C.danger : C.textMid, fontWeight: page === n.id ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 2, borderLeft: page === n.id ? `3px solid ${C.danger}` : "3px solid transparent" }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={toggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {isDark ? "☀️" : "🌙"} {isDark ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
              {ADMIN_NAV.find(n => n.id === page)?.icon} {ADMIN_NAV.find(n => n.id === page)?.label || "Overview"}
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>Logged in as: <b>{user?.username}</b></div>
          </div>
        </div>

        {/* Overview stats */}
        {page === "overview" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
              {[
                ["🏪","Total Dealers",        stats.total_dealers,            C.primary],
                ["✅","Verified Dealers",      stats.verified_dealers,         C.success],
                ["🔄","Free Trial Dealers",    stats.free_trial_dealers ?? (stats.total_dealers - stats.verified_dealers), C.warning],
                ["🚗","Active Vehicles",       stats.total_vehicles,           C.info],
                ["👥","Pipeline Leads",        stats.total_leads,              C.warning],
                ["💰","Total Sales",           stats.total_sales,              C.success],
                ["🏦","Financers",             stats.total_financers ?? "—",   C.info],
                ["📋","Pending Applications",  stats.pending_applications,     C.danger],
                ["👤","Total Users",           stats.total_users,              C.primary],
              ].map(([icon,label,value,color]) => (
                <StatCard key={label} icon={icon} label={label} value={value ?? "—"} color={color} />
              ))}
            </div>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Platform Revenue</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.success }}>₹{Number(stats.total_revenue || 0).toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Total recorded sales across all dealers</div>
            </Card>
          </div>
        )}

        {/* Dealers */}
        {page === "dealers" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search dealer / phone..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Dealer","City","Plan","Vehicles","Verified","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dealers.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{d.dealer_name}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{d.username} · {d.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>
                          <div>{d.city}</div>
                          {d.state && d.state !== d.city && <div style={{ fontSize: 11, color: C.textDim }}>{d.state}</div>}
                        </td>
                        <td style={{ padding: "12px 14px" }}><Badge label={d.plan_type} color={d.plan_type === "pro" ? C.success : C.warning} /></td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{d.vehicle_count}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {d.is_verified ? <span style={{ color: C.success, fontWeight: 700 }}>✓ Verified</span> : <span style={{ color: C.textDim }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <Btn label={d.is_verified ? "Revoke" : "Verify"} size="sm" color={d.is_verified ? C.danger : C.success} onClick={() => verifyDealer(d.id, !d.is_verified)} />
                            <Btn label="🔑 Pwd" size="sm" outline color={C.warning} onClick={() => setResetPwdDealer(d)} />
                            <Btn label="📦 Plan" size="sm" outline color={C.info} onClick={() => setManagePlanTarget({ type: "dealer", item: d })} />
                            <Btn label={d.is_active === false ? "✅ Activate" : "🚫 Deactivate"} size="sm" outline color={d.is_active === false ? C.success : C.danger} onClick={() => handleToggleActive("dealer", d)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dealers.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No dealers found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Users */}
        {page === "users" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search username / email..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
                <Btn label="+ Create User" size="sm" color={C.primary} onClick={() => setShowCreateUser(true)} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["User","Type","Dealer / Showroom","Joined","Status","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{u.username}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}><Badge label={u.user_type} color={u.user_type === "admin" ? C.danger : u.user_type === "dealer" ? C.primary : C.info} /></td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{u.dealer_name || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{new Date(u.date_joined).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <Badge label={u.is_active ? "Active" : "Inactive"} color={u.is_active ? C.success : C.textDim} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {!u.is_superuser && (
                              <>
                                <button onClick={async () => {
                                  try {
                                    const r = await api.admin.toggleUserActive(u.id);
                                    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: r.is_active } : x));
                                    toast(r.is_active ? "User activated" : "User deactivated", r.is_active ? "success" : "warning");
                                  } catch { toast("Failed to update user", "error"); }
                                }} style={{
                                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                                  background: u.is_active ? `${C.danger}15` : `${C.success}15`,
                                  color: u.is_active ? C.danger : C.success, fontSize: 12, fontWeight: 700, fontFamily: "inherit"
                                }}>
                                  {u.is_active ? "Deactivate" : "Activate"}
                                </button>
                                <Btn label="Delete" size="sm" color={C.danger} onClick={() => deleteUser(u.id)} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No users found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />

            {/* Create User Modal */}
            {showCreateUser && (
              <Modal title="Create New User" onClose={() => setShowCreateUser(false)} width={480}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Full Name"><Input value={createUserForm.name} onChange={v => setCreateUserForm(p => ({ ...p, name: v }))} placeholder="Dealer name" /></Field>
                  <Field label="Email *"><Input value={createUserForm.email} onChange={v => setCreateUserForm(p => ({ ...p, email: v }))} type="email" placeholder="user@email.com" /></Field>
                  <Field label="Phone"><Input value={createUserForm.phone} onChange={v => setCreateUserForm(p => ({ ...p, phone: v }))} placeholder="9876543210" /></Field>
                  <Field label="Password *"><Input value={createUserForm.password} onChange={v => setCreateUserForm(p => ({ ...p, password: v }))} type="password" placeholder="Min 8 chars" /></Field>
                  <Field label="User Type">
                    <Select value={createUserForm.user_type} onChange={v => setCreateUserForm(p => ({ ...p, user_type: v }))}
                      options={[{value:"dealer",label:"Dealer"},{value:"driver",label:"Driver"},{value:"admin",label:"Admin"}]} />
                  </Field>
                  <Field label="City"><Input value={createUserForm.city} onChange={v => setCreateUserForm(p => ({ ...p, city: v }))} placeholder="Delhi" /></Field>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowCreateUser(false)} />
                  <Btn label={createUserLoading ? "Creating..." : "Create User"} color={C.primary} disabled={createUserLoading} onClick={async () => {
                    if (!createUserForm.email || !createUserForm.password) { toast("Email and password are required.", "warning"); return; }
                    setCreateUserLoading(true);
                    try {
                      await api.admin.createUser(createUserForm);
                      toast("User created successfully!", "success");
                      setShowCreateUser(false);
                      setCreateUserForm({ name: "", email: "", phone: "", password: "", user_type: "dealer", city: "", state: "" });
                      loadPage();
                    } catch (err) {
                      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to create user.";
                      toast(msg, "error");
                    }
                    setCreateUserLoading(false);
                  }} />
                </div>
              </Modal>
            )}
          </div>
        )}

        {/* Applications */}
        {page === "applications" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search dealer name / email..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                {["","pending","approved","rejected"].map(s => (
                  <button key={s} onClick={() => { setAppFilter(s); setPg(1); }} style={{ padding: "5px 12px", borderRadius: 14, border: `1.5px solid ${appFilter === s ? C.primary : C.border}`, background: appFilter === s ? C.primary : "transparent", color: appFilter === s ? "#fff" : C.textMid, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    {s || "All"}
                  </button>
                ))}
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Dealer","Contact","City","Status","Applied","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{a.dealer_name}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{a.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.contact_name}<br/><span style={{ fontSize: 11 }}>{a.phone}</span></td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.city}, {a.state}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={a.status} color={a.status === "approved" ? C.success : a.status === "rejected" ? C.danger : C.warning} /></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{new Date(a.applied_at).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {a.status !== "approved"  && <Btn label="Approve" size="sm" color={C.success} onClick={() => handleApp(a.id, "approved")} />}
                            {a.status !== "rejected"  && <Btn label="Reject"  size="sm" color={C.danger}  onClick={() => handleApp(a.id, "rejected")} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No applications found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Enquiries */}
        {page === "enquiries" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search buyer / phone..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <DateFilter from={dateFrom} to={dateTo} onChange={(f,t) => { setDateFrom(f); setDateTo(t); setPg(1); }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Buyer","Phone","City","Vehicle","Dealer","Status","Date"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(e => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{e.customer_name}</td>
                        <td style={{ padding: "12px 14px", color: C.primary }}>{e.phone}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{e.city || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12 }}>{e.vehicle || "General"}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{e.dealer_name || "—"}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={e.is_processed ? "Done" : "New"} color={e.is_processed ? C.success : C.warning} /></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{new Date(e.created_at).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                    {enquiries.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No enquiries found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Financers */}
        {page === "financers" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search financer / company..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Financer","Contact","City","Plan","Verified","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financers.map(f => (
                      <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{f.company_name || f.username}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{f.username} · {f.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{f.phone || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{f.city || "—"}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={f.plan_type || "free"} color={f.plan_type === "paid" ? C.success : C.warning} /></td>
                        <td style={{ padding: "12px 14px" }}>
                          {f.is_verified ? <span style={{ color: C.success, fontWeight: 700 }}>✓ Verified</span> : <span style={{ color: C.textDim }}>Pending</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <Btn label={f.is_verified ? "Revoke" : "Verify"} size="sm" color={f.is_verified ? C.danger : C.success} onClick={() => verifyFinancer(f.id, !f.is_verified)} />
                            <Btn label="🔑 Pwd" size="sm" outline color={C.warning} onClick={() => setResetPwdFinancer(f)} />
                            <Btn label="📦 Plan" size="sm" outline color={C.info} onClick={() => setManagePlanTarget({ type: "financer", item: f })} />
                            <Btn label={`📄 Docs${f.doc_count ? ` (${f.doc_count})` : ''}`} size="sm" outline color={C.info} onClick={() => loadFinancerDocs(f)} />
                            <Btn label={f.is_active === false ? "✅ Activate" : "🚫 Deactivate"} size="sm" outline color={f.is_active === false ? C.success : C.danger} onClick={() => handleToggleActive("financer", f)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {financers.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No financers found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Finance Apps */}
        {page === "fin_apps" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search customer / dealer..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                {["","submitted","under_review","approved","rejected","disbursed"].map(s => (
                  <button key={s} onClick={() => { setFinAppFilter(s); setPg(1); }} style={{ padding: "5px 12px", borderRadius: 14, border: `1.5px solid ${finAppFilter === s ? C.primary : C.border}`, background: finAppFilter === s ? C.primary : "transparent", color: finAppFilter === s ? "#fff" : C.textMid, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    {s || "All"}
                  </button>
                ))}
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Customer","Dealer","Financer","Vehicle","Amount","Status","Submitted"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finApps.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{a.customer_name}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.dealer_name || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.financer_name || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12 }}>{a.vehicle || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.primary, fontWeight: 700 }}>₹{Number(a.loan_amount || 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={a.status} color={a.status==="approved"||a.status==="disbursed" ? C.success : a.status==="rejected" ? C.danger : C.warning} /></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN") : "Draft"}</td>
                      </tr>
                    ))}
                    {finApps.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No finance applications found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Leads Analytics */}
        {page === "analytics" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={analyticsPeriod} onChange={e => setAnalyticsPeriod(e.target.value)}
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: C.surface, color: C.text, fontFamily: "inherit" }}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <input type="date" value={analyticsFrom} onChange={e => setAnalyticsFrom(e.target.value)}
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: C.surface, color: C.text, fontFamily: "inherit" }} />
                <input type="date" value={analyticsTo} onChange={e => setAnalyticsTo(e.target.value)}
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: C.surface, color: C.text, fontFamily: "inherit" }} />
                <Btn label="🔍 Apply" size="sm" color={C.primary} onClick={loadPage} />
                <Btn label="↺ Clear" size="sm" outline onClick={() => { setAnalyticsFrom(""); setAnalyticsTo(""); setAnalyticsPeriod("monthly"); }} />
              </div>
            </Card>
            {loading ? <Spinner /> : analytics && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
                  {[
                    ["📋","Total Leads",    analytics.totals?.leads, C.primary],
                    ["💰","Total Sales",    analytics.totals?.sales, C.success],
                    ["💳","Finance Apps",   analytics.totals?.finance_apps, C.info],
                  ].map(([icon,label,value,color]) => (
                    <StatCard key={label} icon={icon} label={label} value={value ?? "—"} color={color} />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <Card>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📋 Leads by Dealer (Top 20)</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: C.bg }}>
                        {["Dealer","City","Leads"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(analytics.dealer_breakdown || []).map(d => (
                          <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: C.text }}>{d.name}</td>
                            <td style={{ padding: "8px 10px", color: C.textMid }}>{d.city || "—"}</td>
                            <td style={{ padding: "8px 10px" }}><Badge label={d.lead_count} color={C.primary} /></td>
                          </tr>
                        ))}
                        {(analytics.dealer_breakdown || []).length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: C.textDim }}>No data</td></tr>}
                      </tbody>
                    </table>
                  </Card>
                  <Card>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>💳 Finance Apps by Financer (Top 20)</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: C.bg }}>
                        {["Financer","City","Apps"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(analytics.financer_breakdown || []).map(f => (
                          <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: C.text }}>{f.name}</td>
                            <td style={{ padding: "8px 10px", color: C.textMid }}>{f.city || "—"}</td>
                            <td style={{ padding: "8px 10px" }}><Badge label={f.app_count} color={C.info} /></td>
                          </tr>
                        ))}
                        {(analytics.financer_breakdown || []).length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: C.textDim }}>No data</td></tr>}
                      </tbody>
                    </table>
                  </Card>
                </div>
                <Card>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📈 Leads Timeline</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: C.bg }}>
                        {["Period","Leads"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(analytics.leads_series || []).map((s,i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: "7px 10px", color: C.textMid }}>{s.period}</td>
                            <td style={{ padding: "7px 10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ background: C.primary, height: 8, borderRadius: 4, width: Math.max(4, (s.count / Math.max(...(analytics.leads_series||[{count:1}]).map(x=>x.count))) * 120) }} />
                                <span style={{ fontWeight: 700, color: C.text }}>{s.count}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {(analytics.leads_series || []).length === 0 && <tr><td colSpan={2} style={{ padding: 20, textAlign: "center", color: C.textDim }}>No lead data for this period</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
            {!loading && !analytics && <Card><div style={{ textAlign: "center", padding: 40, color: C.textDim }}>Click Apply to load analytics data.</div></Card>}
          </div>
        )}

        {/* Homepage Content */}
        {page === "homepage" && <AdminHomepagePanel toast={toast} />}

        {/* Settings */}
        {page === "settings" && <AdminSettingsPanel toast={toast} />}
      </div>

      {/* ── Admin: Reset Dealer Password Modal ── */}
      {resetPwdDealer && (
        <Modal title={`🔑 Reset Password — ${resetPwdDealer.dealer_name}`} onClose={() => { setResetPwdDealer(null); setResetPwdInput(""); setResetPwdResult(null); }}>
          <div style={{ marginBottom: 14, fontSize: 13, color: C.textMid }}>
            Dealer: <strong>{resetPwdDealer.dealer_name}</strong> &nbsp;|&nbsp; Username: <strong>{resetPwdDealer.username}</strong>
          </div>
          {resetPwdResult ? (
            <div style={{ background: `${C.success}12`, border: `1.5px solid ${C.success}44`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: C.success, marginBottom: 8 }}>✓ Password reset successfully</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 6 }}>New password (copy and share with dealer):</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 14px", letterSpacing: 2, flex: 1 }}>{resetPwdResult}</div>
                <Btn label="Copy" outline color={C.primary} onClick={() => { navigator.clipboard.writeText(resetPwdResult); toast("Copied!", "success"); }} />
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>Ask the dealer to change this password after logging in.</div>
            </div>
          ) : (
            <>
              <Field label="New Password (leave blank to auto-generate)">
                <Input value={resetPwdInput} onChange={setResetPwdInput} type="text" placeholder="Min 6 characters, or leave blank to auto-generate" />
              </Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <Btn label="Cancel" outline color={C.textMid} onClick={() => { setResetPwdDealer(null); setResetPwdInput(""); }} />
                <Btn label={resetPwdLoading ? "Resetting..." : "🔑 Reset Password"} color={C.warning} disabled={resetPwdLoading} onClick={async () => {
                  setResetPwdLoading(true);
                  try {
                    const r = await api.admin.resetDealerPassword(resetPwdDealer.id, { new_password: resetPwdInput });
                    setResetPwdResult(r.new_password || 'Password reset successfully');
                    toast(`Password reset for ${r.dealer_name}`, "success");
                  } catch { toast("Failed to reset password", "error"); }
                  setResetPwdLoading(false);
                }} />
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── Admin: Reset Financer Password Modal ── */}
      {resetPwdFinancer && (
        <Modal title={`🔑 Reset Password — ${resetPwdFinancer.company_name}`} onClose={() => { setResetPwdFinancer(null); setResetPwdInput(""); setResetPwdResult(null); }}>
          <div style={{ marginBottom: 14, fontSize: 13, color: C.textMid }}>
            Company: <strong>{resetPwdFinancer.company_name}</strong> &nbsp;|&nbsp; Username: <strong>{resetPwdFinancer.username}</strong>
          </div>
          {resetPwdResult ? (
            <div style={{ background: `${C.success}12`, border: `1.5px solid ${C.success}44`, borderRadius: 10, padding: 18 }}>
              <div style={{ fontWeight: 700, color: C.success, marginBottom: 8 }}>✓ Password reset successfully</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 6 }}>New password (copy and share with financer):</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 14px", letterSpacing: 2, flex: 1 }}>{resetPwdResult}</div>
                <Btn label="Copy" outline color={C.primary} onClick={() => { navigator.clipboard.writeText(resetPwdResult); toast("Copied!", "success"); }} />
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>Ask the financer to change this password after logging in.</div>
            </div>
          ) : (
            <>
              <Field label="New Password (leave blank to auto-generate)">
                <Input value={resetPwdInput} onChange={setResetPwdInput} type="text" placeholder="Min 6 characters, or leave blank to auto-generate" />
              </Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <Btn label="Cancel" outline color={C.textMid} onClick={() => { setResetPwdFinancer(null); setResetPwdInput(""); }} />
                <Btn label={resetPwdLoading ? "Resetting..." : "🔑 Reset Password"} color={C.warning} disabled={resetPwdLoading} onClick={async () => {
                  setResetPwdLoading(true);
                  try {
                    const r = await api.admin.resetFinancerPassword(resetPwdFinancer.id, { new_password: resetPwdInput });
                    setResetPwdResult(r.new_password || 'Password reset successfully');
                    toast(`Password reset for ${r.company_name}`, "success");
                  } catch { toast("Failed to reset password", "error"); }
                  setResetPwdLoading(false);
                }} />
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Admin: Financer Documents Review Modal */}
      {selectedFinancerDocs && (
        <Modal title={`📄 ${selectedFinancerDocs.company_name} — Documents`} onClose={() => { setSelectedFinancerDocs(null); setFinancerDocList([]); }} width={620}>
          {loadingFinancerDocs ? <Spinner /> : financerDocList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: C.textDim }}>No documents uploaded by this financer yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {financerDocList.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.bg, borderRadius: 10, border: `1.5px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                      {doc.doc_type_display || doc.doc_type?.replace(/_/g, ' ').toUpperCase()}
                      {doc.title && <span style={{ fontWeight: 400, color: C.textMid }}> — {doc.title}</span>}
                    </div>
                    {doc.notes && <div style={{ fontSize: 11, color: C.textDim }}>{doc.notes}</div>}
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                      Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
                      {doc.reviewed_at && ` · Reviewed: ${new Date(doc.reviewed_at).toLocaleDateString('en-IN')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge label={doc.status} color={doc.status === 'approved' ? C.success : doc.status === 'rejected' ? C.danger : C.warning} />
                    {doc.file && <a href={doc.file} target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>View ↗</a>}
                    {doc.status !== 'approved' && <Btn label="✅ Approve" size="sm" color={C.success} onClick={() => reviewFinancerDoc(selectedFinancerDocs, doc, 'approved')} />}
                    {doc.status !== 'rejected' && <Btn label="❌ Reject" size="sm" outline color={C.danger} onClick={() => reviewFinancerDoc(selectedFinancerDocs, doc, 'rejected')} />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn label="Close" outline color={C.textMid} onClick={() => { setSelectedFinancerDocs(null); setFinancerDocList([]); }} />
          </div>
        </Modal>
      )}

      {/* ── Admin: Manage Plan Modal ── */}
      {managePlanTarget && (
        <Modal title={`📦 Change Plan — ${managePlanTarget.type === "dealer" ? managePlanTarget.item.dealer_name : managePlanTarget.item.company_name}`} onClose={() => setManagePlanTarget(null)}>
          <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>
            Current plan: <strong>{managePlanTarget.item.plan_type || "free"}</strong>
          </div>
          {managePlanTarget.type === "dealer" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { slug: "free", name: "Free Trial", desc: "5 listings, 20 leads/invoices/enquiries lifetime", color: C.warning },
                { slug: "early_dealer", name: "Early Dealer (₹5,000/yr)", desc: "Unlimited listings, all features, 1 year validity", color: C.success },
                { slug: "pro", name: "Pro Plan (₹9,000/yr)", desc: "Unlimited everything, all features, 1 year validity", color: C.primary },
              ].map(p => (
                <button key={p.slug} disabled={managePlanLoading} onClick={() => handleManagePlan(p.slug)}
                  style={{ padding: "14px 18px", borderRadius: 10, border: `2px solid ${p.color}`, background: `${p.color}10`, cursor: managePlanLoading ? "wait" : "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <div style={{ fontWeight: 700, color: p.color, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { slug: "free", name: "Free Trial", desc: "Max 2 dealers · 5 applications · ₹3,000/lead commission", color: C.warning },
                { slug: "pro",  name: "Pro (₹5,000/yr)", desc: "Unlimited dealers · Unlimited apps · ₹2,000/lead commission", color: C.primary },
              ].map(p => (
                <button key={p.slug} disabled={managePlanLoading} onClick={() => handleManagePlan(p.slug)}
                  style={{ padding: "14px 18px", borderRadius: 10, border: `2px solid ${p.color}`, background: `${p.color}10`, cursor: managePlanLoading ? "wait" : "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <div style={{ fontWeight: 700, color: p.color, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          )}
          {managePlanLoading && <div style={{ textAlign: "center", marginTop: 16 }}><Spinner /></div>}
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FINANCER PORTAL
// ═══════════════════════════════════════════════════════
function FinancerPortal({ user, onLogout }) {
  const C = useC();
  const { isDark, toggle } = useContext(ThemeCtx);
  const toast = useToast();
  const [page, setPage] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reqDocs, setReqDocs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 350);
  const [dealerFilter, setDealerFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [showAddReqDoc, setShowAddReqDoc] = useState(false);
  const [newReqDoc, setNewReqDoc] = useState({ doc_type: "", label: "", is_mandatory: true });
  const [selectedApp, setSelectedApp] = useState(null);
  const [appStatusNote, setAppStatusNote] = useState("");
  const [appNewStatus, setAppNewStatus] = useState("");

  useEffect(() => {
    api.financer.profile().then(setProfile).catch(() => {});
    api.financer.subscription().then(setSubscription).catch(() => {});
  }, []);

  const loadPage = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (dSearch) p.set("search", dSearch);
    if (dealerFilter) p.set("status", dealerFilter);
    if (appFilter) p.set("status", appFilter);
    const qs = p.toString() ? `?${p}` : "";
    const calls = {
      dealers:      () => api.financer.dealers(qs).then(d => setDealers(d.results || d || [])),
      applications: () => api.financer.applications(qs).then(d => setApplications(d.results || d || [])),
      documents:    () => api.financer.documents().then(d => setDocuments(d.results || d || [])),
      req_docs:     () => api.financer.requiredDocs().then(d => setReqDocs(d.results || d || [])),
    };
    (calls[page] || (() => Promise.resolve()))().finally(() => setLoading(false));
  }, [page, dSearch, dealerFilter, appFilter]);

  useEffect(() => { if (page !== "overview") loadPage(); }, [loadPage, page]);

  const handleApproveDealer = async (dealerId, action) => {
    // backend expects status: approved|rejected|suspended
    const statusMap = { approve: "approved", reject: "rejected", suspend: "suspended", approve_again: "approved" };
    try {
      await api.financer.approveDealer(dealerId, { status: statusMap[action] || action });
      loadPage();
      toast(`Dealer ${action}d`, action === "approve" ? "success" : "warning");
    } catch (e) { toast(e?.error || "Action failed", "error"); }
  };

  const handleUpdateAppStatus = async () => {
    if (!selectedApp || !appNewStatus) { toast("Select a status", "warning"); return; }
    try {
      await api.financer.updateAppStatus(selectedApp.id, { status: appNewStatus, status_notes: appStatusNote });
      setApplications(p => p.map(a => a.id === selectedApp.id ? { ...a, status: appNewStatus } : a));
      setSelectedApp(null);
      setAppStatusNote(""); setAppNewStatus("");
      toast("Application status updated", "success");
    } catch { toast("Failed to update", "error"); }
  };

  const handleAddReqDoc = async () => {
    if (!newReqDoc.doc_type || !newReqDoc.label) { toast("Fill in all fields", "warning"); return; }
    try {
      await api.financer.addRequiredDoc(newReqDoc);
      loadPage();
      setShowAddReqDoc(false);
      setNewReqDoc({ doc_type: "", label: "", is_mandatory: true });
      toast("Document template added", "success");
    } catch { toast("Failed to add", "error"); }
  };

  const sidebarStyle = { width: 200, minWidth: 200, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 };
  const APP_STATUS_COLORS = { draft: C.textDim, submitted: C.warning, under_review: C.info, approved: C.success, rejected: C.danger, docs_required: C.warning, disbursed: C.success };

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${C.info},#1e40af)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Financer Portal</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{profile?.company_name || user?.username}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {FINANCER_NAV.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setSearch(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: page === n.id ? `${C.info}15` : "transparent", border: "none", borderRadius: 8, color: page === n.id ? C.info : C.textMid, fontWeight: page === n.id ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 2, borderLeft: page === n.id ? `3px solid ${C.info}` : "3px solid transparent" }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={toggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {isDark ? "☀️" : "🌙"} {isDark ? "Light" : "Dark"}
          </button>
          <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
              {FINANCER_NAV.find(n => n.id === page)?.icon} {FINANCER_NAV.find(n => n.id === page)?.label || "Dashboard"}
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>Logged in as: <b>{user?.username}</b></div>
          </div>
          {!profile?.is_verified && (
            <div style={{ background: `${C.warning}15`, border: `1.5px solid ${C.warning}44`, borderRadius: 10, padding: "8px 16px", fontSize: 12, color: C.warning, fontWeight: 600 }}>
              ⏳ Pending Admin Verification
            </div>
          )}
        </div>

        {/* Overview */}
        {page === "overview" && (
          <div>
            {subscription && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
                {[
                  ["📦","Plan", subscription.plan_name || "Free Trial", subscription.plan_slug === "pro" ? C.success : C.warning],
                  ["📄","Apps Used", `${subscription.applications_used} / ${subscription.max_applications === 0 ? "∞" : (subscription.max_applications ?? 5)}`, C.info],
                  ["💰","Commission/Lead", subscription.commission_per_lead ? `₹${Number(subscription.commission_per_lead).toLocaleString("en-IN")}` : "₹3,000", C.primary],
                ].map(([icon,label,value,color]) => (
                  <StatCard key={label} icon={icon} label={label} value={value ?? "—"} color={color} />
                ))}
              </div>
            )}
            {profile && (
              <Card style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.text }}>🏦 Your Profile</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  {[
                    ["Company",    profile.company_name],
                    ["City",       profile.city],
                    ["Phone",      profile.phone],
                    ["Min Rate",   profile.min_interest_rate ? `${profile.min_interest_rate}%` : "—"],
                    ["Max Rate",   profile.max_interest_rate ? `${profile.max_interest_rate}%` : "—"],
                    ["Max Loan",   profile.max_loan_amount ? `₹${Number(profile.max_loan_amount).toLocaleString("en-IN")}` : "—"],
                  ].map(([l,v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.textMid }}>{l}</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{v || "—"}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <Badge label={profile.is_verified ? "Verified" : "Pending Verification"} color={profile.is_verified ? C.success : C.warning} />
                </div>
              </Card>
            )}
            <Card>
              <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>
                <b>How it works:</b><br/>
                1. Admin verifies your account after document review.<br/>
                2. Once verified, dealers can apply to associate with you.<br/>
                3. Approve/reject dealer applications from the <b>Dealers</b> tab.<br/>
                4. Approved dealers submit customer loan applications.<br/>
                5. Review and update application status from the <b>Applications</b> tab.
              </div>
            </Card>
          </div>
        )}

        {/* Dealers */}
        {page === "dealers" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dealer / city..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                {["", "pending", "approved", "rejected"].map(s => (
                  <button key={s} onClick={() => { setDealerFilter(s); }} style={{ padding: "5px 12px", borderRadius: 14, border: `1.5px solid ${dealerFilter === s ? C.info : C.border}`, background: dealerFilter === s ? C.info : "transparent", color: dealerFilter === s ? "#fff" : C.textMid, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    {s || "All"}
                  </button>
                ))}
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Dealer","City","Vehicles","Association","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dealers.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{d.dealer_name}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{d.city}, {d.state}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{d.city}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{d.vehicle_count ?? 0}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <Badge label={d.association_status || "not applied"} color={d.association_status === "approved" ? C.success : d.association_status === "rejected" ? C.danger : d.association_status === "pending" ? C.warning : C.textDim} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {d.association_status === "pending" && (
                              <>
                                <Btn label="✅ Approve" size="sm" color={C.success} onClick={() => handleApproveDealer(d.id, "approve")} />
                                <Btn label="✗ Reject" size="sm" color={C.danger} onClick={() => handleApproveDealer(d.id, "reject")} />
                              </>
                            )}
                            {d.association_status === "approved" && (
                              <Btn label="⛔ Suspend" size="sm" color={C.warning} onClick={() => handleApproveDealer(d.id, "suspend")} />
                            )}
                            {(d.association_status === "rejected" || d.association_status === "suspended" || !d.association_status) && (
                              <Btn label="+ Approve" size="sm" outline color={C.success} onClick={() => handleApproveDealer(d.id, "approve")} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dealers.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No verified dealers found yet. Wait for admin to verify dealers.</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* Applications */}
        {page === "applications" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                {["", "submitted", "under_review", "docs_required", "approved", "rejected", "disbursed"].map(s => (
                  <button key={s} onClick={() => setAppFilter(s)} style={{ padding: "5px 12px", borderRadius: 14, border: `1.5px solid ${appFilter === s ? C.info : C.border}`, background: appFilter === s ? C.info : "transparent", color: appFilter === s ? "#fff" : C.textMid, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    {s || "All"}
                  </button>
                ))}
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Customer","Phone","Vehicle","Loan Amount","Dealer","Status","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{a.customer_name}</td>
                        <td style={{ padding: "12px 14px", color: C.primary }}>{a.customer_phone}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12 }}>{a.vehicle_name || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.success, fontWeight: 700 }}>₹{Number(a.loan_amount || 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.dealer_name || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <Badge label={a.status} color={APP_STATUS_COLORS[a.status] || C.textMid} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <Btn label="Update" size="sm" outline color={C.info} onClick={() => { setSelectedApp(a); setAppNewStatus(a.status); setAppStatusNote(a.status_notes || ""); }} />
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No applications yet</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* Documents */}
        {page === "documents" && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>📁 KYC Documents</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>Upload your company registration, PAN, GST, and RBI license for admin verification.</div>
              {loading ? <Spinner /> : documents.length === 0 ? (
                <div style={{ color: C.textDim, fontSize: 13 }}>No documents uploaded yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {documents.map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.doc_type_display || d.doc_type}</div>
                        <div style={{ fontSize: 11, color: C.textDim }}>{new Date(d.uploaded_at).toLocaleDateString("en-IN")}</div>
                      </div>
                      <Badge label={d.status || "uploaded"} color={d.status === "approved" ? C.success : d.status === "rejected" ? C.danger : C.warning} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Required Document Templates */}
        {page === "req_docs" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, color: C.text }}>Document Templates Required from Dealers</div>
                <Btn label="+ Add Template" size="sm" color={C.info} onClick={() => setShowAddReqDoc(true)} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Document Type","Label","Mandatory","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reqDocs.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{d.doc_type}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{d.label}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={d.is_mandatory ? "Required" : "Optional"} color={d.is_mandatory ? C.danger : C.textDim} /></td>
                        <td style={{ padding: "12px 14px" }}>
                          <Btn label="Delete" size="sm" color={C.danger} onClick={async () => {
                            if (!confirm("Delete this template?")) return;
                            await api.financer.deleteRequiredDoc(d.id);
                            loadPage();
                            toast("Deleted", "success");
                          }} />
                        </td>
                      </tr>
                    ))}
                    {reqDocs.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No document templates yet. Add templates dealers must submit.</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* Add Req Doc Modal */}
        {showAddReqDoc && (
          <Modal title="Add Document Template" onClose={() => setShowAddReqDoc(false)} width={460}>
            <Field label="Document Type (slug e.g. aadhaar, pan, bank_statement)">
              <Input value={newReqDoc.doc_type} onChange={v => setNewReqDoc(p => ({ ...p, doc_type: v }))} placeholder="aadhaar" />
            </Field>
            <Field label="Label (shown to dealer)">
              <Input value={newReqDoc.label} onChange={v => setNewReqDoc(p => ({ ...p, label: v }))} placeholder="Aadhaar Card" />
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
              <input type="checkbox" checked={newReqDoc.is_mandatory} onChange={e => setNewReqDoc(p => ({ ...p, is_mandatory: e.target.checked }))} id="mand" />
              <label htmlFor="mand" style={{ fontSize: 13, color: C.textMid }}>Mandatory document</label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAddReqDoc(false)} />
              <Btn label="Add Template" color={C.info} onClick={handleAddReqDoc} />
            </div>
          </Modal>
        )}

        {/* Update Application Status Modal */}
        {selectedApp && (
          <Modal title={`Update Application — ${selectedApp.customer_name}`} onClose={() => setSelectedApp(null)}>
            <div style={{ marginBottom: 14, fontSize: 13 }}>
              <div style={{ color: C.textMid }}>Vehicle: <b>{selectedApp.vehicle_name || "—"}</b></div>
              <div style={{ color: C.textMid }}>Loan Amount: <b>₹{Number(selectedApp.loan_amount || 0).toLocaleString("en-IN")}</b></div>
            </div>
            <Field label="New Status">
              <Select value={appNewStatus} onChange={setAppNewStatus} options={[
                { value: "under_review",  label: "Under Review" },
                { value: "docs_required", label: "Documents Required" },
                { value: "approved",      label: "Approved" },
                { value: "rejected",      label: "Rejected" },
                { value: "disbursed",     label: "Disbursed" },
              ]} />
            </Field>
            <Field label="Note to Dealer (optional)">
              <TextArea value={appStatusNote} onChange={setAppStatusNote} placeholder="Reason or instructions for the dealer..." rows={3} />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setSelectedApp(null)} />
              <Btn label="Update Status" color={C.info} onClick={handleUpdateAppStatus} />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LANDING PAGE (shown before any auth choice)
// ═══════════════════════════════════════════════════════
function LandingPage({ onDealer, onMarketplace }) {
  const C = useC();
  const [lang, setLang] = useState(() => localStorage.getItem("erd_lang") || "en");

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primaryD} 0%,${C.primary} 45%,#1a6b44 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito','Segoe UI',sans-serif", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Language Toggle - Top Right */}
      <button onClick={() => {
        const next = lang === "en" ? "hi" : "en";
        i18n.changeLanguage(next);
        localStorage.setItem("erd_lang", next);
        setLang(next);
      }} title={lang === "en" ? "भाषा बदलें हिंदी के लिए" : "Change language to English"}
        style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(5px)", transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>
        {lang === "en" ? "हि" : "EN"}
      </button>

      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 48, color: "#fff" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🛺</div>
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Georgia,serif", letterSpacing: -1 }}>
          eRickshaw<span style={{ color: C.accent }}>Dekho</span><span style={{ opacity: 0.7 }}>.com</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 15, opacity: 0.8, maxWidth: 380 }}>
          India's #1 Platform for eRickshaws & Auto-rickshaws
        </div>
      </div>

      {/* Two paths */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 640 }}>
        {/* Driver / Buyer */}
        <div onClick={onMarketplace} style={{
          flex: 1, minWidth: 260, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 18, padding: 32,
          color: "#fff", cursor: "pointer", transition: "all 0.2s", textAlign: "center",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Browse Marketplace</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7, marginBottom: 20 }}>
            Search & compare eRickshaws near you. View prices, specs, dealers and reviews. No sign-in needed.
          </div>
          <div style={{ background: C.accent, color: "#1a1a1a", borderRadius: 10, padding: "11px 20px", fontWeight: 700, fontSize: 14 }}>
            Browse eRickshaws →
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 10 }}>Driver • Buyer • Fleet Owner</div>
        </div>

        {/* Dealer */}
        <div onClick={onDealer} style={{
          flex: 1, minWidth: 260, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 18, padding: 32,
          color: "#fff", cursor: "pointer", transition: "all 0.2s", textAlign: "center",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏪</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Dealer Portal</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7, marginBottom: 20 }}>
            Manage inventory, leads, sales & invoices. Full GST billing, CRM and analytics for your showroom.
          </div>
          <div style={{ background: "#fff", color: C.primary, borderRadius: 10, padding: "11px 20px", fontWeight: 700, fontSize: 14 }}>
            Dealer Sign In →
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 10 }}>Showroom • Dealer • Distributor</div>
        </div>
      </div>

      <div style={{ marginTop: 36, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
        Trusted by 500+ dealers across India · Delhi · UP · Bihar · Rajasthan
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PUBLIC LEARN SECTION (for buyers on the marketplace)
// ═══════════════════════════════════════════════════════
function PublicLearnSection() {
  const C = useC();
  const [videos, setVideos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("videos");
  const [watchVideo, setWatchVideo] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", city: "", model: "" });
  const [leadSent, setLeadSent] = useState(false);

  useEffect(() => {
    Promise.all([
      api.videos.list("?category=&is_public=true").then(d => setVideos((d.results || d).slice(0, 6))),
      api.blogs.list("?is_published=true").then(d => setPosts((d.results || d).slice(0, 4))),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: C.bg, padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>🎓 eRickshaw Learning Hub</div>
        <div style={{ fontSize: 14, color: C.textMid }}>Tips, guides and videos to help you earn more and maintain your eRickshaw</div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 28, background: C.surface, padding: 4, borderRadius: 12, width: "fit-content", margin: "0 auto 28px" }}>
        {[{id:"videos",label:"🎬 Videos"},{id:"blogs",label:"📝 Articles"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
            background: tab === t.id ? C.primary : "transparent",
            color: tab === t.id ? "#fff" : C.textMid,
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : tab === "videos" ? (
        videos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>No videos available yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {videos.map(v => <VideoCard key={v.id} v={v} onWatch={(vid) => setWatchVideo(vid)} />)}
          </div>
        )
      ) : (
        posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>No articles available yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {posts.map(p => <BlogPostCard key={p.id} post={p} />)}
          </div>
        )
      )}
      {watchVideo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 800, width: "100%", position: "relative" }}>
            <button onClick={() => { setWatchVideo(null); setShowLeadForm(true); }} style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer" }}>×</button>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 12 }}>
              <iframe
                src={`https://www.youtube.com/embed/${extractVideoId(watchVideo.youtube_url)}?autoplay=1&rel=0`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="autoplay; encrypted-media" allowFullScreen title={watchVideo.title}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => { setWatchVideo(null); setShowLeadForm(true); }} style={{ padding: "10px 28px", borderRadius: 8, background: "#25D366", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                💬 Get Free Quote from Dealers
              </button>
            </div>
          </div>
        </div>
      )}
      {showLeadForm && !leadSent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: C.text }}>🛺 Get Free Quote</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>Our dealers will contact you within 2 hours</div>
            {[
              { key: "name", label: "Your Name *", placeholder: "Full name", type: "text" },
              { key: "phone", label: "Mobile Number *", placeholder: "10-digit number", type: "tel" },
              { key: "city", label: "Your City *", placeholder: "e.g. Delhi, Lucknow", type: "text" },
              { key: "model", label: "Model Interested In", placeholder: "e.g. Vikram 4G Plus (optional)", type: "text" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{f.label}</div>
                <input type={f.type} value={leadForm[f.key]} onChange={e => setLeadForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowLeadForm(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: C.textMid }}>Cancel</button>
              <button onClick={async () => {
                if (!leadForm.name || !leadForm.phone || !leadForm.city) return;
                try {
                  await apiFetch("/enquiries/", { method: "POST", body: JSON.stringify({
                    name: leadForm.name, phone: leadForm.phone, city: leadForm.city,
                    message: `Interested in: ${leadForm.model || "eRickshaw"}. Source: YouTube Video Lead.`,
                    source: "youtube_video"
                  }) });
                  setLeadSent(true);
                } catch { alert("Failed to submit. Please try again."); }
              }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Submit — Get Free Quote
              </button>
            </div>
          </div>
        </div>
      )}
      {leadSent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 32, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Quote Request Sent!</div>
            <div style={{ fontSize: 14, color: C.textMid, marginBottom: 24 }}>Dealers in your city will contact you within 2 hours.</div>
            <button onClick={() => { setLeadSent(false); setShowLeadForm(false); setLeadForm({ name: "", phone: "", city: "", model: "" }); }} style={{ padding: "10px 28px", borderRadius: 8, background: C.primary, border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PUBLIC MARKETPLACE PAGE (no dealer auth required)
// ═══════════════════════════════════════════════════════
function PublicMarketplacePage({ onDealerPortal, onBack }) {
  const C = useC();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Top nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛺</div>
          <span style={{ fontWeight: 800, fontSize: 16, fontFamily: "Georgia,serif", color: C.text }}>eRickshaw<span style={{ color: C.accent }}>Dekho</span></span>
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onBack} style={{ padding: "7px 14px", borderRadius: 8, background: C.bg, border: `1.5px solid ${C.border}`, color: C.textMid, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            🏠 Home
          </button>
          <span style={{ fontSize: 12, color: C.textDim }}>Are you a dealer?</span>
          <button onClick={onDealerPortal} style={{ padding: "7px 16px", borderRadius: 8, background: C.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Dealer Portal →
          </button>
        </div>
      </div>
      {/* Mobile bottom nav for public */}
      <div className="erd-public-bottom-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, zIndex: 200, padding: "6px 0 8px" }}>
        {[
          { label: "Home", icon: "🏠", action: onBack },
          { label: "Browse", icon: "🛺", action: () => document.querySelector('.erd-marketplace-grid')?.scrollIntoView({ behavior: "smooth" }) },
          { label: "Learn", icon: "🎓", action: () => document.querySelector('.erd-learn-hub')?.scrollIntoView({ behavior: "smooth" }) },
          { label: "Dealer Portal", icon: "🏪", action: onDealerPortal },
        ].map((n, i) => (
          <button key={i} onClick={n.action} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "transparent", border: "none", cursor: "pointer", color: C.textDim, fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10 }}>{n.label}</span>
          </button>
        ))}
      </div>
      <style>{`.erd-public-bottom-nav { display: none; } @media (max-width: 768px) { .erd-public-bottom-nav { display: flex !important; } }`}</style>
      <div style={{ paddingBottom: 0 }}>
        <Marketplace />
        <PublicLearnSection />
      </div>
      <PWAInstallPrompt />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════
const SWIPE_PAGES = ["dashboard", "inventory", "leads", "sales", "customers", "finance", "reports", "support", "account"];

export default function App({ skipLanding = false }) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => localStorage.getItem("erd_theme") === "dark");
  const toggleTheme = () => setIsDark(d => { const next = !d; localStorage.setItem("erd_theme", next ? "dark" : "light"); return next; });

  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("erd_access");
    const dealer = JSON.parse(localStorage.getItem("erd_dealer") || "null");
    const user   = JSON.parse(localStorage.getItem("erd_user") || "null");
    return token ? { token, dealer, user } : null;
  });
  // appMode: null = landing, 'dealer' = dealer auth/portal, 'public' = public marketplace, 'admin' = admin portal
  const [appMode, setAppMode] = useState(() => {
    const user = JSON.parse(localStorage.getItem("erd_user") || "null");
    const token = localStorage.getItem("erd_access");
    if (token && user) {
      if (user.user_type === "admin") return "admin";
      return "dealer";
    }
    return skipLanding ? "dealer" : null;
  });
  const [page, setPage] = useState("dashboard");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  // Swipe nav order (matches BOTTOM_NAV for mobile)
  const [plan, setPlan] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dealerIsVerified, setDealerIsVerified] = useState(() => {
    const d = JSON.parse(localStorage.getItem("erd_dealer") || "null");
    return d?.is_verified ?? true;
  });
  const [platformSettings, setPlatformSettings] = useState({
    support_whatsapp: BRANDING.support.whatsapp,
    support_email: BRANDING.support.email,
    support_phone: BRANDING.support.phone,
  });
  const [freeTier, setFreeTier] = useState(null); // free tier usage data

  // Fetch platform settings once on mount
  useEffect(() => {
    let isMounted = true;
    apiFetch("/platform/settings/")
      .then(data => {
        if (isMounted) {
          setPlatformSettings({
            support_whatsapp: data.support_whatsapp || BRANDING.support.whatsapp,
            support_email: data.support_email || BRANDING.support.email,
            support_phone: data.support_phone || BRANDING.support.phone,
          });
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Screen saver
  const [sleeping, setSleeping] = useState(false);
  const sleepTimer = useRef(null);
  const resetSleep = useCallback(() => {
    setSleeping(false);
    clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => setSleeping(true), 5 * 60 * 1000);
  }, []);
  useEffect(() => {
    resetSleep();
    window.addEventListener("mousemove", resetSleep);
    window.addEventListener("keydown", resetSleep);
    return () => {
      clearTimeout(sleepTimer.current);
      window.removeEventListener("mousemove", resetSleep);
      window.removeEventListener("keydown", resetSleep);
    };
  }, [resetSleep]);

  // Fetch plan once on login
  useEffect(() => {
    if (auth && appMode !== "admin" && auth.user?.user_type !== "admin") {
      api.dashboard()
        .then(d => { 
          if (d && d.plan) {
            setPlan(d.plan);
          }
          if (d) {
            setDealerIsVerified(d.is_verified ?? true);
          }
        })
        .catch((err) => {
          console.error("Dashboard fetch error:", err);
        });
    }
  }, [auth, appMode]);

  const handleAuth = (data) => {
    localStorage.setItem("erd_access",  data.access);
    if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
    localStorage.setItem("erd_dealer", JSON.stringify(data.dealer));
    localStorage.setItem("erd_user",   JSON.stringify(data.user));
    setAuth(data);
    const utype = data.user?.user_type;
    setAppMode(utype === "admin" ? "admin" : utype === "financer" ? "financer" : "dealer");
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
    setPlan(null);
    setAppMode(skipLanding ? "dealer" : null);
  };

  const C_LIVE = isDark ? DARK_C : LIGHT_C;

  // Swipe navigation between pages (mobile/PWA) — must be before any early returns
  const swipeLeft  = useCallback(() => {
    const idx = SWIPE_PAGES.indexOf(page);
    if (idx < SWIPE_PAGES.length - 1) setPage(SWIPE_PAGES[idx + 1]);
  }, [page]);
  const swipeRight = useCallback(() => {
    const idx = SWIPE_PAGES.indexOf(page);
    if (idx > 0) setPage(SWIPE_PAGES[idx - 1]);
  }, [page]);
  const swipeHandlers = useSwipeNav(swipeLeft, swipeRight);

  // 1. No auth + no mode chosen → landing page
  if (!auth && appMode === null) {
    return (
      <ThemeCtx.Provider value={{ isDark, toggle: toggleTheme, C: C_LIVE }}>
        <ToastProvider>
          <LandingPage onDealer={() => setAppMode("dealer")} onMarketplace={() => setAppMode("public")} />
        </ToastProvider>
      </ThemeCtx.Provider>
    );
  }

  // 2. Public marketplace (driver/buyer, no auth required)
  if (!auth && appMode === "public") {
    return (
      <ThemeCtx.Provider value={{ isDark, toggle: toggleTheme, C: C_LIVE }}>
        <ToastProvider>
          <PublicMarketplacePage onDealerPortal={() => setAppMode("dealer")} onBack={() => setAppMode(null)} />
        </ToastProvider>
      </ThemeCtx.Provider>
    );
  }

  // 3. Dealer auth flow
  if (!auth) {
    return (
      <ThemeCtx.Provider value={{ isDark, toggle: toggleTheme, C: C_LIVE }}>
        <ToastProvider>
          <AuthPage onAuth={handleAuth} />
        </ToastProvider>
      </ThemeCtx.Provider>
    );
  }

  // 4. Admin portal
  if (auth && (appMode === "admin" || auth.user?.user_type === "admin")) {
    return (
      <ThemeCtx.Provider value={{ isDark, toggle: toggleTheme, C: C_LIVE }}>
        <ToastProvider>
          <AdminPortal user={auth.user} onLogout={handleLogout} />
        </ToastProvider>
      </ThemeCtx.Provider>
    );
  }

  // 4b. Financer portal
  if (auth && (appMode === "financer" || auth.user?.user_type === "financer")) {
    return (
      <ThemeCtx.Provider value={{ isDark, toggle: toggleTheme, C: C_LIVE }}>
        <ToastProvider>
          <FinancerPortal user={auth.user} onLogout={handleLogout} />
        </ToastProvider>
      </ThemeCtx.Provider>
    );
  }

  const dealer = auth.dealer;
  const goUpgrade = () => setShowUpgradeModal(true);

  const renderPage = () => {
    switch (page) {
      case "dashboard":   return <Dashboard onNavigate={setPage} />;
      case "inventory":   return <PlanGate plan={plan} feature="Inventory" onUpgrade={goUpgrade}><Inventory showAdd={showAddVehicle} onAddClose={() => setShowAddVehicle(false)} onNavigate={setPage} /></PlanGate>;
      case "leads":       return <PlanGate plan={plan} feature="Leads" onUpgrade={goUpgrade}><Leads onNavigate={setPage} /></PlanGate>;
      case "sales":       return <PlanGate plan={plan} feature="Sales" onUpgrade={goUpgrade}><SalesPage /></PlanGate>;
      case "customers":   return <PlanGate plan={plan} feature="Customers" onUpgrade={goUpgrade}><Customers /></PlanGate>;
      case "finance":     return <PlanGate plan={plan} feature="Finance" onUpgrade={goUpgrade}><Finance /></PlanGate>;
      case "marketing":   return <MarketingPage />;
      case "reports":     return <PlanGate plan={plan} feature="Reports" onUpgrade={goUpgrade}><Reports /></PlanGate>;
      case "learn":       return <LearnPage />;
      case "support":     return <SupportPage />;
      case "marketplace": return <Marketplace />;
      case "plans":       return <PlansPage onUpgrade={goUpgrade} />;
      case "account":     return <AccountPage dealer={dealer} onLogout={handleLogout} />;
      default:            return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <ThemeCtx.Provider value={{ isDark, toggle: toggleTheme, C: C_LIVE }}>
      <ToastProvider>
        <PlanCtx.Provider value={plan}>
          <div style={{ display: "flex", background: C_LIVE.bg, minHeight: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", color: C_LIVE.text }}>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { background: ${C_LIVE.bg}; color-scheme: ${isDark ? 'dark' : 'light'}; }
              :root { color-scheme: ${isDark ? 'dark' : 'light'}; }
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
              ::-webkit-scrollbar { width: 6px; }
              ::-webkit-scrollbar-track { background: ${C_LIVE.bg}; }
              ::-webkit-scrollbar-thumb { background: ${C_LIVE.border}; border-radius: 4px; }
              select option { background: ${C_LIVE.surface}; color: ${C_LIVE.text}; }
              input[type="date"], input[type="datetime-local"] { color-scheme: ${isDark ? 'dark' : 'light'}; }
              /* ── Global responsive layout ── */
              @media (max-width: 768px) {
                .erd-topbar-name { display: none !important; }
                .erd-topbar-add { display: none !important; }
                .erd-fab-add { display: flex !important; }
                .erd-wa-fab { right: 16px !important; }
                .erd-stat-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
                .erd-two-col { grid-template-columns: 1fr !important; }
                .erd-three-col { grid-template-columns: 1fr 1fr !important; }
                .erd-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .erd-page-pad { padding: 12px !important; }
                .erd-card-title { font-size: 14px !important; }
                .erd-filter-row { flex-wrap: wrap; gap: 8px !important; }
                .erd-modal-inner { padding: 16px !important; }
                .erd-form-grid-2 { grid-template-columns: 1fr !important; }
                .erd-form-grid-3 { grid-template-columns: 1fr !important; }
                .erd-dash-chart-row { grid-template-columns: 1fr !important; }
                .erd-dash-bottom-row { grid-template-columns: 1fr !important; }
                .erd-finance-layout { grid-template-columns: 1fr !important; }
                .erd-welcome-banner { flex-direction: column; text-align: center; }
                .erd-welcome-banner .erd-rickshaw-icon { display: none !important; }
                .erd-topbar { padding: 0 12px !important; }
                .erd-topbar-title { font-size: 15px !important; }
              }
              @media (max-width: 480px) {
                .erd-stat-grid { grid-template-columns: 1fr 1fr !important; }
                .erd-three-col { grid-template-columns: 1fr !important; }
                .erd-bottom-nav button span:last-child { font-size: 9px !important; }
              }
              /* ── Smooth page transitions ── */
              .erd-main main { animation: pageSlide 0.18s ease; }
              @keyframes pageSlide { from { opacity: 0.7; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
              /* ── Safe area insets for notched phones ── */
              .erd-bottom-nav { padding-bottom: max(8px, env(safe-area-inset-bottom)) !important; }
              /* ── Touch target minimum sizes ── */
              @media (pointer: coarse) {
                button, [role="button"] { min-height: 36px; }
                input, select { min-height: 40px; font-size: 16px !important; }
              }
            `}</style>

            <Sidebar page={page} setPage={setPage} dealer={dealer} onLogout={handleLogout} />

            <div className="erd-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
              <Topbar dealer={dealer} page={page} onAddNew={() => setShowAddVehicle(true)} onProfile={() => setPage("account")} onBell={() => setPage("leads")} />
              {!dealerIsVerified && (
                <div style={{ background: `${C_LIVE.warning}15`, borderBottom: `1px solid ${C_LIVE.warning}33`, padding: "10px 24px", fontSize: 13, color: C_LIVE.warning, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span>⏳ <b>Your showroom is under verification</b> by platform admin. Your profile will become visible to buyers after approval.</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                    <a href={`mailto:${platformSettings.support_email}`} style={{ fontSize: 11, color: C_LIVE.textMid, textDecoration: "none" }}>✉ {platformSettings.support_email}</a>
                    <a href={`https://wa.me/${platformSettings.support_whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent("Hi my dealer account is pending verification")}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#25D366", textDecoration: "none", fontWeight: 700 }}>💬 WhatsApp</a>
                  </div>
                </div>
              )}
              <main style={{ flex: 1 }} key={page}>
                {renderPage()}
              </main>
            </div>

            {/* Floating Add Vehicle button — mobile only, inventory page only */}
            {page === "inventory" && (
              <button className="erd-fab-add" onClick={() => setShowAddVehicle(true)}
                style={{ display: "none", position: "fixed", bottom: 80, right: 16, zIndex: 1001, width: 52, height: 52, borderRadius: "50%", background: C_LIVE.primary, color: "#fff", border: "none", fontSize: 26, cursor: "pointer", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(22,163,74,0.5)", fontFamily: "inherit" }}
                title="Add Vehicle">
                +
              </button>
            )}
            {/* Floating WhatsApp Support */}
            <a href={`https://wa.me/${platformSettings.support_whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi I need help with my dealer account on ${BRANDING.platformName}`)}`} target="_blank" rel="noreferrer"
              style={{ position: "fixed", bottom: 80, right: 76, zIndex: 1000, width: 52, height: 52, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(37,211,102,0.4)", textDecoration: "none", fontSize: 26 }}
              className="erd-wa-fab">
              💬
            </a>
            {showUpgradeModal && <ContactSupportModal onClose={() => setShowUpgradeModal(false)} onNavigate={setPage} />}
            <PWAInstallPrompt />
            {sleeping && <ScreenSaver onWake={resetSleep} />}
          </div>
        </PlanCtx.Provider>
      </ToastProvider>
    </ThemeCtx.Provider>
  );
}
