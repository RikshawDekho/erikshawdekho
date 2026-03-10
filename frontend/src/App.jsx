import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { SalesPage } from './SalesPage';
import { LIGHT_C, DARK_C, ThemeCtx, useC } from './theme';

// ═══════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════
const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";

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
    localStorage.clear();
    window.location.reload();
  }
  if (!res.ok) throw await res.json();
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
    loans:   (p="") => apiFetch(`/finance/loans/${p}`),
    create:  (d)    => apiFetch("/finance/loans/", { method: "POST", body: JSON.stringify(d) }),
    emi:     (d)    => apiFetch("/finance/emi-calculator/", { method: "POST", body: JSON.stringify(d) }),
  },
  reports:  (p="") => apiFetch(`/reports/${p}`),
  brands:   ()     => apiFetch("/brands/"),
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
    stats:          ()         => apiFetch("/admin-portal/stats/"),
    users:          (p="")     => apiFetch(`/admin-portal/users/${p}`),
    deleteUser:     (id)       => apiFetch(`/admin-portal/users/${id}/`, { method: "DELETE" }),
    dealers:        (p="")     => apiFetch(`/admin-portal/dealers/${p}`),
    verifyDealer:   (id,d)     => apiFetch(`/admin-portal/dealers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    applications:   (p="")     => apiFetch(`/admin-portal/applications/${p}`),
    updateApp:      (id,d)     => apiFetch(`/admin-portal/applications/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    enquiries:      (p="")     => apiFetch(`/admin-portal/enquiries/${p}`),
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
  const ICONS = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  const COLORS = { success: C.success, error: C.danger, warning: C.warning, info: C.info };
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 8, maxWidth: 360, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: COLORS[t.type] || C.info, color: "#fff",
            padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "flex-start", gap: 8,
            animation: "slideUp 0.25s ease",
          }}>
            <span style={{ flexShrink: 0, fontSize: 15 }}>{ICONS[t.type]}</span>
            <span style={{ lineHeight: 1.5 }}>{t.msg}</span>
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
          <tr style={{ background: "#f8fafc" }}>
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
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = ""}>
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

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", required, style = {} }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: "#fff", outline: "none", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = C.primary}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function Select({ value, onChange, options, placeholder, style = {} }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: "#fff", outline: "none", boxSizing: "border-box", cursor: "pointer", ...style }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Spinner() {
  return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `4px solid ${C.border}`, borderTop: `4px solid ${C.primary}`, animation: "spin 0.8s linear infinite" }}/>
  </div>;
}

function DateFilter({ from, to, onChange }) {
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
            style={{ padding: '4px 10px', borderRadius: 14, border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary : '#fff', color: active ? '#fff' : C.textMid, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
            {p.label}
          </button>
        );
      })}
      <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
        style={{ padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
      <span style={{ fontSize: 11, color: C.textDim }}>–</span>
      <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
        style={{ padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
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
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", color: page <= 1 ? C.textDim : C.text }}>‹</button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPage(p)} style={{ width: 34, height: 34, border: `1px solid ${p === page ? C.primary : C.border}`, borderRadius: 6, background: p === page ? C.primary : "#fff", color: p === page ? "#fff" : C.text, cursor: "pointer", fontWeight: p === page ? 700 : 400 }}>{p}</button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer", color: page >= totalPages ? C.textDim : C.text }}>›</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MINI CHART
// ═══════════════════════════════════════════════════════
function BarChart({ data, height = 120 }) {
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
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", email: "", dealer_name: "", phone: "", city: "Delhi" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => { setForm(p => ({ ...p, [k]: v })); setFieldErrors(p => ({ ...p, [k]: "" })); };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Username is required";
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters";
    if (mode === "register") {
      if (!form.dealer_name.trim()) errs.dealer_name = "Dealership name is required";
      if (!form.phone.trim()) errs.phone = "Phone number is required";
      else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10)))
        errs.phone = "Enter a valid 10-digit Indian mobile number";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = "Enter a valid email address";
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true);
    try {
      const data = mode === "login"
        ? await api.login({ username: form.username, password: form.password })
        : await api.register(form);
      localStorage.setItem("erd_access", data.access);
      if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
      onAuth(data);
    } catch (e) {
      const errs = typeof e === "object" ? e : { non_field_errors: "Something went wrong. Try again." };
      setFieldErrors(errs);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.primaryD} 0%, ${C.primary} 50%, #1a6b44 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 440, maxWidth: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛺</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif" }}>
            eRickshaw<span style={{ color: C.accent }}>Dekho</span>.com
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>SaaS & Marketplace Platform for eRickshaws</div>
        </div>

        <Card padding={32}>
          <div style={{ display: "flex", marginBottom: 24, background: C.bg, borderRadius: 8, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: mode === m ? C.primary : "transparent", color: mode === m ? "#fff" : C.textMid, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <Field label="Username" required>
              <Input value={form.username} onChange={set("username")} placeholder="username" />
              {fieldErrors.username && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors.username}</div>}
            </Field>
            <Field label="Password" required>
              <Input value={form.password} onChange={set("password")} type="password" placeholder="••••••" />
              {fieldErrors.password && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors.password}</div>}
            </Field>
            {mode === "register" && <>
              <Field label="Email">
                <Input value={form.email} onChange={set("email")} type="email" placeholder="you@email.com" />
                {fieldErrors.email && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors.email}</div>}
              </Field>
              <Field label="Dealership Name" required>
                <Input value={form.dealer_name} onChange={set("dealer_name")} placeholder="Kumar Electric Vehicles" />
                {fieldErrors.dealer_name && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors.dealer_name}</div>}
              </Field>
              <Field label="Phone" required>
                <Input value={form.phone} onChange={set("phone")} placeholder="9876543210" />
                {fieldErrors.phone && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors.phone}</div>}
              </Field>
              <Field label="City"><Input value={form.city} onChange={set("city")} placeholder="Delhi" /></Field>
            </>}
            {fieldErrors.non_field_errors && (
              <div style={{ background: "#fef2f2", border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14 }}>
                ✕ {fieldErrors.non_field_errors}
              </div>
            )}
            {fieldErrors.detail && (
              <div style={{ background: "#fef2f2", border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14 }}>
                ✕ {fieldErrors.detail}
              </div>
            )}
            <Btn label={loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"} type="submit" color={C.primary} fullWidth disabled={loading} size="lg" />
          </form>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.textDim }}>Demo: username=<b>demo</b>  password=<b>demo1234</b></div>
        </Card>
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
  { id: "reports",    label: "Reports",    icon: "📈" },
  { id: "marketplace",label: "Marketplace",icon: "🛒" },
  { id: "plans",      label: "Plans",      icon: "⭐" },
];

const BOTTOM_NAV = [
  { id: "dashboard",  label: "Home",    icon: "📊" },
  { id: "inventory",  label: "Stock",   icon: "🚗" },
  { id: "leads",      label: "Leads",   icon: "👥" },
  { id: "sales",      label: "Sales",   icon: "💰" },
  { id: "account",    label: "Account", icon: "👤" },
];

function Sidebar({ page, setPage, dealer, onLogout }) {
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
      </div>

      <style>{`
        @media (max-width: 768px) {
          .erd-sidebar { display: none !important; }
          .erd-bottom-nav { display: flex !important; }
          .erd-main { padding-bottom: 70px !important; }
        }
      `}</style>
    </>
  );
}

function Topbar({ dealer, page, onAddNew, onProfile }) {
  const pageLabel = [...NAV, { id: "account", label: "My Account" }, { id: "plans", label: "Plans & Pricing" }].find(n => n.id === page)?.label || page;
  return (
    <div style={{ height: 60, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{pageLabel}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {page === "inventory" && <Btn label="+ Add Vehicle" color={C.primary} size="sm" onClick={onAddNew} />}
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
          <div>
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const fuelColors = { electric: C.success, petrol: "#f97316", cng: "#06b6d4", lpg: "#8b5cf6" };
  const plan = data.plan;

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Welcome banner */}
      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 14, padding: "22px 28px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Welcome back! 👋</div>
          <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Here's an overview of your dealership activity.</div>
        </div>
        <div style={{ fontSize: 48 }}>🛺</div>
      </div>

      {/* Verification warning */}
      {plan && !plan.is_verified && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
          ⏳ <span>Your dealership is <b>pending verification</b>. Our team will review and approve it shortly.</span>
        </div>
      )}

      {/* Plan warnings */}
      {plan && !plan.is_active && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>⚠️ Your <b>{plan.type} plan</b> has expired. Upgrade to continue accessing all features.</span>
          <Btn label="⭐ View Plans" color="#dc2626" size="sm" onClick={() => onNavigate?.("plans")} />
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining <= 7 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>⚠️ Your <b>{plan.type} plan</b> expires in <b>{plan.days_remaining} day{plan.days_remaining !== 1 ? "s" : ""}</b>.</span>
          <Btn label="⭐ Upgrade Now" color={C.warning} size="sm" onClick={() => onNavigate?.("plans")} />
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining > 7 && (
        <div style={{ marginBottom: 24 }} />
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="🚗" label="Total Vehicles" value={data.total_vehicles} color={C.primary} sub={`${data.in_stock} in stock`} />
        <StatCard icon="👥" label="Active Leads"   value={data.active_leads}   color={C.info} />
        <StatCard icon="💰" label="New Sales"      value={data.new_sales}      color={C.success} sub="this month" />
        <StatCard icon="📋" label="Pending Tasks"  value={data.pending_tasks}  color={C.warning} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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
          {data.upcoming_tasks && data.upcoming_tasks.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, margin: "14px 0 10px" }}>Upcoming Tasks</div>
              {data.upcoming_tasks.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: i < data.upcoming_tasks.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.priority === "high" ? C.danger : t.priority === "medium" ? C.warning : C.success, marginTop: 5, flexShrink: 0 }} />
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
// INVENTORY PAGE
// ═══════════════════════════════════════════════════════
function Inventory({ showAdd, onAddClose, onNavigate }) {
  const toast = useToast();
  const plan = usePlan();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inStock: 0, sold: 0, lowStock: 0 });
  const [filters, setFilters] = useState({ brand: "", fuel_type: "", stock_status: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState({ brand_id: "", model_name: "", fuel_type: "electric", vehicle_type: "passenger", price: "", stock_quantity: "", year: 2024, description: "", thumbnail: null });
  const [saving, setSaving] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    try {
      const data = await api.vehicles.list(`?${params}`);
      setVehicles(data.results || data);
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / 10));
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.brands().then(d => setBrands(d.results || d));
    api.dashboard().then(d => setStats({ total: d.total_vehicles, inStock: d.in_stock, sold: 0, lowStock: 0 }));
  }, []);

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
      if (form.thumbnail) {
        payload = new FormData();
        payload.append("brand", form.brand_id);
        payload.append("model_name", form.model_name);
        payload.append("fuel_type", form.fuel_type);
        payload.append("vehicle_type", form.vehicle_type);
        payload.append("price", form.price);
        if (form.stock_quantity) payload.append("stock_quantity", form.stock_quantity);
        payload.append("year", form.year);
        if (form.description) payload.append("description", form.description);
        payload.append("thumbnail", form.thumbnail);
      } else {
        const { thumbnail, brand_id, ...rest } = form;
        payload = { ...rest, brand: brand_id };
      }
      await api.vehicles.create(payload);
      toast("Vehicle added successfully!", "success");
      onAddClose(); load();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add vehicle.";
      toast(msg, "error");
    }
    setSaving(false);
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setEditForm({ model_name: v.model_name, fuel_type: v.fuel_type, vehicle_type: v.vehicle_type || "passenger", price: v.price, stock_quantity: v.stock_quantity, year: v.year, description: v.description || "", thumbnail: null });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.model_name.trim()) { toast("Model name is required.", "warning"); return; }
    if (!editForm.price) { toast("Price is required.", "warning"); return; }
    setEditSaving(true);
    try {
      let payload;
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
      } else {
        const { thumbnail, ...rest } = editForm;
        payload = rest;
      }
      await api.vehicles.update(editVehicle.id, payload);
      toast("Vehicle updated successfully!", "success");
      setEditVehicle(null); load();
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
      setDeleteId(null); load();
    } catch {
      toast("Failed to delete vehicle.", "error");
    }
  };

  const cols = [
    { label: "ID",       render: r => <span style={{ color: C.textDim, fontSize: 12 }}>{r.id}</span> },
    { label: "Thumbnail",render: r => r.thumbnail
        ? <img src={r.thumbnail} alt={r.model_name} style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
        : <div style={{ width: 56, height: 40, background: `${C.primary}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛺</div> },
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
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Vehicles", value: stats.total, color: C.info    },
          { label: "In Stock",       value: stats.inStock,color: C.success },
          { label: "Sold",           value: 27,           color: C.accent  },
          { label: "Low Stock",      value: 5,            color: C.danger  },
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Brand" required>
                <Select value={form.brand_id} onChange={setForm_("brand_id")} placeholder="Select brand"
                  options={brands.map(b => ({ value: b.id, label: b.name }))} />
              </Field>
              <Field label="Model Name" required><Input value={form.model_name} onChange={setForm_("model_name")} placeholder="e.g. YatriKing Pro" /></Field>
              <Field label="Vehicle Type" required>
                <Select value={form.vehicle_type} onChange={setForm_("vehicle_type")} options={[{value:"passenger",label:"Passenger Rickshaw"},{value:"cargo",label:"Cargo Loader"},{value:"auto",label:"Auto Rickshaw"}]} />
              </Field>
              <Field label="Fuel Type" required>
                <Select value={form.fuel_type} onChange={setForm_("fuel_type")} options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"},{value:"diesel",label:"Diesel"}]} />
              </Field>
              <Field label="Price (₹)" required><Input value={form.price} onChange={setForm_("price")} type="number" placeholder="150000" /></Field>
              <Field label="Stock Quantity"><Input value={form.stock_quantity} onChange={setForm_("stock_quantity")} type="number" placeholder="10" /></Field>
              <Field label="Year"><Input value={form.year} onChange={setForm_("year")} type="number" placeholder="2024" /></Field>
            </div>
            <Field label="Vehicle Photo (optional)" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="file" accept="image/*" onChange={e => setForm_("thumbnail")(e.target.files[0] || null)}
                  style={{ flex: 1, fontSize: 13, cursor: "pointer", padding: "8px 0" }} />
                {form.thumbnail && (
                  <img src={URL.createObjectURL(form.thumbnail)} alt="preview"
                    style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                )}
              </div>
            </Field>
            <Field label="Description"><textarea value={form.description} onChange={e => setForm_("description")(e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Vehicle description, key specs..." /></Field>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Model Name" required>
                <Input value={editForm.model_name} onChange={v => setEditForm(p => ({ ...p, model_name: v }))} />
              </Field>
              <Field label="Vehicle Type">
                <Select value={editForm.vehicle_type} onChange={v => setEditForm(p => ({ ...p, vehicle_type: v }))}
                  options={[{value:"passenger",label:"Passenger Rickshaw"},{value:"cargo",label:"Cargo Loader"},{value:"auto",label:"Auto Rickshaw"}]} />
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
            </div>
            <Field label="Update Photo (optional)" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {editVehicle.thumbnail && !editForm.thumbnail && (
                  <img src={editVehicle.thumbnail} alt="current"
                    style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                )}
                <input type="file" accept="image/*" onChange={e => setEditForm(p => ({ ...p, thumbnail: e.target.files[0] || null }))}
                  style={{ flex: 1, fontSize: 13, cursor: "pointer", padding: "8px 0" }} />
                {editForm.thumbnail && (
                  <img src={URL.createObjectURL(editForm.thumbnail)} alt="new preview"
                    style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: `2px solid ${C.primary}` }} />
                )}
              </div>
            </Field>
            <Field label="Description">
              <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Vehicle description..." />
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LEADS PAGE
// ═══════════════════════════════════════════════════════
function Leads({ onNavigate }) {
  const toast = useToast();
  const plan = usePlan();
  const [tab, setTab] = useState("leads"); // "leads" | "enquiries"
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", source: "website", status: "new", notes: "", vehicle: "" });
  const [vehicles, setVehicles] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.leads.list(qs).then(d => setLeads(d.results || d)).finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const loadEnquiries = useCallback(() => {
    setEnquiriesLoading(true);
    api.enquiries.list().then(d => setEnquiries(d.results || [])).catch(() => {}).finally(() => setEnquiriesLoading(false));
  }, []);

  useEffect(() => { load(); api.vehicles.list().then(d => setVehicles(d.results || d)); }, [load]);

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

  const cols = [
    { label: "Customer", render: r => <div><div style={{ fontWeight: 600 }}>{r.customer_name}</div><div style={{ fontSize: 11, color: C.textDim }}>{r.phone}</div></div> },
    { label: "Vehicle",  render: r => <span style={{ fontSize: 12 }}>{r.vehicle_name || "—"}</span> },
    { label: "Source",   render: r => <Badge label={r.source.replace("_"," ")} color={C.info} /> },
    { label: "Status",   render: r => (
      <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
        style={{ border: `1.5px solid ${LEAD_COLOR[r.status]}55`, borderRadius: 6, padding: "3px 8px", fontSize: 12, background: `${LEAD_COLOR[r.status]}15`, color: LEAD_COLOR[r.status], cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
        {["new","interested","follow_up","converted","lost"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
      </select>
    )},
    { label: "Date", render: r => <span style={{ fontSize: 12, color: C.textDim }}>{fmtDate(r.created_at)}</span> },
    { label: "Actions", render: r => <Btn label="Delete" size="sm" outline color={C.danger} onClick={() => api.leads.delete(r.id).then(load)} /> },
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
              <DateFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label="↺ Refresh" size="sm" outline color={C.primary} onClick={load} />
                <Btn label="+ Add Lead" color={C.primary} onClick={() => setShowAdd(true)} />
              </div>
            </div>
          </Card>
          <Card padding={0}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>
              Pipeline Leads ({leads.length}){(dateFrom || dateTo) && <span style={{ fontSize: 12, color: C.primary, fontWeight: 400, marginLeft: 8 }}>filtered by date</span>}
            </div>
            {loading ? <Spinner /> : <Table cols={cols} rows={leads} />}
          </Card>
        </>
      )}

      {tab === "enquiries" && (
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Buyer Enquiries from Marketplace</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: C.textDim }}>Auto-refreshes every 30s</span>
              <Btn label="Refresh" size="sm" outline color={C.primary} onClick={loadEnquiries} />
            </div>
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
                    <tr style={{ background: "#f8fafc" }}>
                      {["Buyer", "Phone", "City", "Vehicle Interest", "Message", "Time", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(e => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: e.is_processed ? "#fff" : `${C.primary}06` }}>
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
        </Card>
      )}

      {showAdd && (
        <Modal title="Add New Lead" onClose={() => setShowAdd(false)}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Customer Name" required><Input value={form.customer_name} onChange={setF("customer_name")} required /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={setF("phone")} required /></Field>
              <Field label="Source">
                <Select value={form.source} onChange={setF("source")} options={[{value:"walk_in",label:"Walk-in"},{value:"phone",label:"Phone"},{value:"website",label:"Website"},{value:"referral",label:"Referral"},{value:"social",label:"Social Media"}]} />
              </Field>
              <Field label="Vehicle Interest">
                <Select value={form.vehicle} onChange={setF("vehicle")} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: `${v.brand_name} ${v.model_name}` }))} />
              </Field>
            </div>
            <Field label="Notes"><textarea value={form.notes} onChange={e => setF("notes")(e.target.value)} rows={2} style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} /></Field>
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
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "", gstin: "" });

  const toast = useToast();
  const load = () => { setLoading(true); api.customers.list().then(d => setCustomers(d.results || d)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn label="+ Add Customer" color={C.primary} onClick={() => setShowAdd(true)} />
      </div>
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
  const [emiForm, setEmiForm] = useState({ principal: 150000, rate: 12, tenure: 36 });
  const [emiResult, setEmiResult] = useState(null);
  const [loans, setLoans] = useState([]);
  const setF = k => v => setEmiForm(p => ({ ...p, [k]: v }));

  useEffect(() => { api.finance.loans().then(d => setLoans(d.results || d)); }, []);

  const calcEMI = async () => {
    const r = await api.finance.emi({ ...emiForm });
    setEmiResult(r);
  };

  const cols = [
    { label: "Customer",   key: "customer_name" },
    { label: "Vehicle",    render: r => r.vehicle_name || "—" },
    { label: "Amount",     render: r => fmtINR(r.loan_amount) },
    { label: "EMI",        render: r => fmtINR(r.emi_amount) },
    { label: "Tenure",     render: r => `${r.tenure_months} months` },
    { label: "Bank",       key: "bank_name" },
    { label: "Status",     render: r => <Badge label={r.status} color={r.status==="approved"?C.success:r.status==="rejected"?C.danger:C.warning} /> },
  ];

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
      {/* EMI Calculator */}
      <div>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>💰 EMI Calculator</div>
          <Field label="Loan Amount (₹)"><Input value={emiForm.principal} onChange={setF("principal")} type="number" /></Field>
          <Field label="Interest Rate (% p.a.)"><Input value={emiForm.rate} onChange={setF("rate")} type="number" step="0.1" /></Field>
          <Field label="Tenure (months)"><Input value={emiForm.tenure} onChange={setF("tenure")} type="number" /></Field>
          <Btn label="Calculate EMI" color={C.primary} onClick={calcEMI} fullWidth />
          {emiResult && (
            <div style={{ marginTop: 18, background: `${C.primary}08`, border: `1.5px solid ${C.primary}33`, borderRadius: 10, padding: 16 }}>
              {[
                ["Monthly EMI",      fmtINR(emiResult.emi),            C.primary],
                ["Total Payment",    fmtINR(emiResult.total_payment),  C.text],
                ["Total Interest",   fmtINR(emiResult.total_interest), C.danger],
                ["Principal",        fmtINR(emiResult.principal),      C.text],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: C.textMid }}>{l}</span>
                  <span style={{ fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Loans table */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>Loan Applications</div>
        <Table cols={cols} rows={loans} />
      </Card>
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

function AccountPage({ dealer: dealerProp, onLogout }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ dealer_name: "", phone: "", city: "", email: "", address: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [prefs, setPrefs] = useState({ notify_email: true, notify_whatsapp: true, notify_push: true });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const loadData = () => {
    Promise.all([api.me(), api.dashboard()]).then(([me, dash]) => {
      setData({ ...me, plan: dash.plan });
      setEditForm({
        dealer_name: me.dealer?.name || "",
        phone: me.dealer?.phone || "",
        city: me.dealer?.city || "",
        email: me.user?.email || "",
        address: me.dealer?.address || "",
        description: me.dealer?.description || "",
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
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
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
              <Badge label={plan.is_active ? "Active" : "Expired"} color={plan.is_active ? C.success : "#dc2626"} />
            </div>
            {plan.is_active && plan.days_remaining !== null && (
              <div style={{
                background: plan.days_remaining <= 7 ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${plan.days_remaining <= 7 ? "#fecaca" : "#bbf7d0"}`,
                borderRadius: 8, padding: "10px 14px", fontSize: 13,
                color: plan.days_remaining <= 7 ? "#dc2626" : C.success,
              }}>
                {plan.days_remaining <= 7
                  ? `⚠️ Only ${plan.days_remaining} day${plan.days_remaining !== 1 ? "s" : ""} remaining! Contact support to upgrade.`
                  : `✅ ${plan.days_remaining} days remaining`}
              </div>
            )}
            {!plan.is_active && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>
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
          width: "100%", padding: "12px", background: "#fef2f2", border: "1.5px solid #fecaca",
          borderRadius: 8, color: "#dc2626", fontWeight: 700, fontSize: 14, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}>
          🚪 Logout
        </button>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════
function Reports() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");

  useEffect(() => { api.reports(`?period=${period}`).then(setData); }, [period]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["week","month","year"].map(p => (
          <Btn key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} color={C.primary} outline={period !== p} size="sm" onClick={() => setPeriod(p)} />
        ))}
      </div>
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard icon="💰" label="Revenue"        value={fmtINR(data.revenue)}                color={C.primary} />
          <StatCard icon="🛺" label="Sales"          value={data.sale_count}                     color={C.success} />
          <StatCard icon="👥" label="Leads"          value={data.lead_count}                     color={C.info}    />
          <StatCard icon="✅" label="Conversion"     value={`${data.conversion_rate}%`}          color={C.accent}  />
          <StatCard icon="📊" label="Avg Sale Value" value={fmtINR(data.avg_sale_value)}         color={C.textMid} />
          <StatCard icon="🎯" label="Converted"      value={data.converted_leads}                color={C.success} />
        </div>
      )}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Sales by Fuel Type</div>
        {data?.fuel_sales?.map((f, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: FUEL_COLOR[f.vehicle__fuel_type] || "#94a3b8" }} />
              <span style={{ textTransform: "capitalize" }}>{f.vehicle__fuel_type}</span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <span style={{ color: C.textMid }}>Units: <b>{f.count}</b></span>
              <span style={{ color: C.primary }}>Revenue: <b>{fmtINR(f.revenue)}</b></span>
            </div>
          </div>
        ))}
      </Card>
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
  const [enquiryForm, setEnquiryForm] = useState({ customer_name: "", phone: "", city: "", notes: `Interested in ${v.brand_name} ${v.model_name}` });
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
    if (!enquiryForm.customer_name.trim()) { toast("Please enter your name.", "warning"); return; }
    if (!enquiryForm.phone.trim()) { toast("Please enter your mobile number.", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(enquiryForm.phone.replace(/\D/g, "").slice(-10))) {
      toast("Enter a valid 10-digit Indian mobile number.", "warning"); return;
    }
    setEnquirySending(true);
    try {
      await api.enquiry({ ...enquiryForm, vehicle: v.id });
      toast("Enquiry sent! The dealer will call you within 24 hours.", "success");
      setTab("overview");
      setEnquiryForm({ customer_name: "", phone: "", city: "", notes: `Interested in ${v.brand_name} ${v.model_name}` });
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to send enquiry. Try again.";
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
                  style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
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
          <form onSubmit={submitEnquiry}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Your Name" required><Input value={enquiryForm.customer_name} onChange={v2 => setEnquiryForm(p => ({ ...p, customer_name: v2 }))} placeholder="Ramesh Kumar" /></Field>
              <Field label="Mobile Number" required><Input value={enquiryForm.phone} onChange={v2 => setEnquiryForm(p => ({ ...p, phone: v2 }))} placeholder="9876543210" /></Field>
              <Field label="Your City"><Input value={enquiryForm.city} onChange={v2 => setEnquiryForm(p => ({ ...p, city: v2 }))} placeholder="Delhi" /></Field>
            </div>
            <Field label="Message">
              <textarea value={enquiryForm.notes} onChange={e => setEnquiryForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                placeholder="Any specific requirements..." />
            </Field>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>
              ✓ Dealer will contact you within 24 hours. Your number is never shared with third parties.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn label="Back" outline color={C.textMid} onClick={() => setTab("overview")} />
              <Btn label={enquirySending ? "Sending..." : "Get Best Price →"} color={C.primary} type="submit" disabled={enquirySending} />
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════
// MARKETPLACE PAGE (public-facing)
// ═══════════════════════════════════════════════════════
function Marketplace() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ fuel_type: "", search: "", city: "" });
  const [detailVehicle, setDetailVehicle] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([, v]) => v)));
    api.marketplace(`?${p}`).then(d => setVehicles(d.results || [])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

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

      {/* Fuel filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["", "electric", "petrol", "cng", "lpg"].map(f => (
          <button key={f} onClick={() => setFilter(p => ({ ...p, fuel_type: f }))}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${filter.fuel_type === f ? C.primary : C.border}`, background: filter.fuel_type === f ? C.primary : "#fff", color: filter.fuel_type === f ? "#fff" : C.textMid, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All eRickshaws"}
          </button>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, color: C.text }}>Browse New & Popular Models</div>

      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {vehicles.map(v => (
            <Card key={v.id} style={{ transition: "all 0.2s", border: `1.5px solid ${C.border}`, cursor: "pointer" }}
              onClick={() => setDetailVehicle(v)}>
              {v.thumbnail
                ? <img src={v.thumbnail} alt={v.model_name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLANS PAGE
// ═══════════════════════════════════════════════════════
const PLAN_FEATURES = [
  { label: "Vehicle Listings",          free: "Up to 5 vehicles",     pro: "Unlimited vehicles" },
  { label: "Lead Management",           free: "Up to 50 leads/month",  pro: "Unlimited leads" },
  { label: "Sales & Invoicing (GST)",   free: "10 invoices/month",     pro: "Unlimited invoices" },
  { label: "Customer Database",         free: true,                    pro: true },
  { label: "Finance & EMI Calculator",  free: true,                    pro: true },
  { label: "Reports & Analytics",       free: "Basic",                 pro: "Advanced + Export" },
  { label: "Marketplace Listing",       free: false,                   pro: true },
  { label: "Email Notifications",       free: true,                    pro: true },
  { label: "WhatsApp Notifications",    free: false,                   pro: true },
  { label: "Push Notifications",        free: false,                   pro: true },
  { label: "Follow-up Reminders",       free: false,                   pro: true },
  { label: "Priority Support",          free: false,                   pro: true },
  { label: "Dedicated Account Manager", free: false,                   pro: true },
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  const plan = data?.plan;
  const isPro = plan?.type === "pro" && plan?.is_active;
  const isFreeActive = plan?.type === "free" && plan?.is_active;

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
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
              background: plan.is_active ? `${C.success}12` : "#fef2f2",
              border: `1px solid ${plan.is_active ? C.success + "44" : "#fecaca"}`,
              borderRadius: 10, padding: "12px 18px", marginBottom: 24,
              fontSize: 13, color: plan.is_active ? C.success : "#dc2626",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {plan.is_active
                ? `✅ You are on the ${plan.type.toUpperCase()} plan — ${plan.days_remaining} day${plan.days_remaining !== 1 ? "s" : ""} remaining`
                : `⚠️ Your ${plan.type.toUpperCase()} plan has expired. Upgrade to continue accessing all features.`}
            </div>
          )}

          {/* Plan cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
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
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>14-day trial period</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.7 }}>
                Get started and explore the platform. Perfect for new dealerships.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {["5 vehicle listings", "50 leads / month", "10 invoices / month", "Basic analytics", "Email notifications"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMid }}>
                    <span style={{ color: C.success }}>✓</span> {f}
                  </div>
                ))}
                {["Marketplace listing", "WhatsApp alerts", "Follow-up reminders", "Priority support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textDim }}>
                    <span style={{ color: C.textDim }}>—</span> {f}
                  </div>
                ))}
              </div>
              <Btn label={isFreeActive ? "Current Plan" : "Get Started Free"} color={C.primary} outline fullWidth disabled={isFreeActive} />
            </Card>

            {/* Pro Plan */}
            <Card style={{ border: `2px solid ${C.primary}`, background: `linear-gradient(180deg,${C.primary}08 0%,#fff 100%)`, position: "relative" }}>
              <div style={{ position: "absolute", top: -12, right: 20, background: `linear-gradient(90deg,${C.accent},${C.primary})`, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>
                {isPro ? "CURRENT PLAN" : "MOST POPULAR"}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "1px", marginBottom: 6 }}>PRO PLAN</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.primary }}>₹999</div>
                  <div style={{ fontSize: 13, color: C.textMid, marginBottom: 6 }}>/month</div>
                </div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>or ₹9,999/year (save 17%)</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.7 }}>
                Everything you need to grow your dealership. Unlimited access, all features.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {["Unlimited vehicle listings", "Unlimited leads", "Unlimited invoices", "Advanced analytics + Export", "Email + WhatsApp + Push notifications", "Marketplace listing & visibility", "Follow-up & expiry reminders", "Priority support 24/7"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
                    <span style={{ color: C.success }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {isPro ? (
                <Btn label="Current Plan ✓" color={C.success} fullWidth disabled />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Btn label="⭐ Upgrade to Pro — ₹999/mo" color={C.primary} fullWidth onClick={onUpgrade} />
                  <div style={{ textAlign: "center", fontSize: 11, color: C.textDim }}>Contact our team to activate instantly</div>
                </div>
              )}
            </Card>
          </div>

          {/* Feature comparison table */}
          <Card padding={0}>
            <div style={{ padding: "16px 16px 0", fontWeight: 700, fontSize: 15, color: C.text }}>Feature Comparison</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}` }}>FEATURE</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, width: 160 }}>FREE TRIAL</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: C.primary, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, background: `${C.primary}08`, width: 160 }}>PRO ⭐</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map(f => <PlanFeatureRow key={f.label} {...f} />)}
                </tbody>
              </table>
            </div>
          </Card>

          {/* FAQ / support */}
          <div style={{ marginTop: 28, padding: "20px 24px", background: `linear-gradient(135deg,${C.primary}10,${C.accent}08)`, borderRadius: 12, border: `1px solid ${C.primary}22` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: C.text }}>Need help choosing?</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.8, marginBottom: 14 }}>
              Our team will help you pick the right plan and get you set up quickly.
              All plans include onboarding support and data migration.
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {SUPPORT_PHONE && <Btn label={`📞 Call ${SUPPORT_PHONE}`} color={C.primary} outline size="sm" onClick={() => window.open(`tel:${SUPPORT_PHONE}`)} />}
              {SUPPORT_WA    && <Btn label="💬 WhatsApp Us" color={C.success} size="sm" onClick={() => window.open(`https://wa.me/${SUPPORT_WA.replace(/\D/g,"")}?text=Hi+I+need+help+with+eRickshawDekho`, "_blank")} />}
              <Btn label={`✉️ Email ${SUPPORT_EMAIL}`} color={C.info} outline size="sm" onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`)} />
              {!SUPPORT_PHONE && !SUPPORT_WA && <Btn label="📬 Contact Support" color={C.primary} size="sm" onClick={onUpgrade} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PWA INSTALL PROMPT
// ═══════════════════════════════════════════════════════
function PWAInstallPrompt() {
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
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Install eRickshawDekho App</div>
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
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "";
const SUPPORT_WA    = import.meta.env.VITE_SUPPORT_WA    || "";
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@erikshawdekho.com";

function ContactSupportModal({ onClose, onNavigate }) {
  return (
    <Modal title="Upgrade to Pro" onClose={onClose} width={440}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "4px 0 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.primary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>⭐</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>Unlock Pro Features</div>
        <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.75 }}>
          Get unlimited vehicles, leads, invoices, WhatsApp alerts and priority support.
        </div>
      </div>

      {/* Pricing callout */}
      <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}22`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>₹999</div>
          <div style={{ fontSize: 11, color: C.textMid }}>per month</div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>₹9,999</div>
          <div style={{ fontSize: 11, color: C.textMid }}>per year <span style={{ color: C.success, fontWeight: 700 }}>Save 17%</span></div>
        </div>
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

// ═══════════════════════════════════════════════════════
// LANDING PAGE (shown before any auth choice)
// ═══════════════════════════════════════════════════════
function LandingPage({ onDealer, onMarketplace }) {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primaryD} 0%,${C.primary} 45%,#1a6b44 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
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
// PUBLIC MARKETPLACE PAGE (no dealer auth required)
// ═══════════════════════════════════════════════════════
function PublicMarketplacePage({ onDealerPortal, onBack }) {
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
          <span style={{ fontSize: 12, color: C.textDim }}>Are you a dealer?</span>
          <button onClick={onDealerPortal} style={{ padding: "7px 16px", borderRadius: 8, background: C.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Dealer Portal →
          </button>
        </div>
      </div>
      <Marketplace />
      <PWAInstallPrompt />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("erd_access");
    const dealer = JSON.parse(localStorage.getItem("erd_dealer") || "null");
    return token ? { token, dealer } : null;
  });
  // appMode: null = landing, 'dealer' = dealer auth/portal, 'public' = public marketplace
  const [appMode, setAppMode] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [plan, setPlan] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch plan once on login
  useEffect(() => {
    if (auth) {
      api.dashboard().then(d => setPlan(d.plan)).catch(() => {});
    }
  }, [auth]);

  const handleAuth = (data) => {
    localStorage.setItem("erd_access", data.access);
    if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
    localStorage.setItem("erd_dealer", JSON.stringify(data.dealer));
    setAuth(data);
    setAppMode("dealer");
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
    setPlan(null);
    setAppMode(null);
  };

  // 1. No auth + no mode chosen → landing page
  if (!auth && appMode === null) {
    return (
      <ToastProvider>
        <LandingPage onDealer={() => setAppMode("dealer")} onMarketplace={() => setAppMode("public")} />
      </ToastProvider>
    );
  }

  // 2. Public marketplace (driver/buyer, no auth required)
  if (!auth && appMode === "public") {
    return (
      <ToastProvider>
        <PublicMarketplacePage onDealerPortal={() => setAppMode("dealer")} onBack={() => setAppMode(null)} />
      </ToastProvider>
    );
  }

  // 3. Dealer auth flow
  if (!auth) {
    return (
      <ToastProvider>
        <AuthPage onAuth={handleAuth} />
        <div style={{ textAlign: "center", padding: "10px 0 20px", fontFamily: "'Nunito',sans-serif", fontSize: 13 }}>
          <button onClick={() => setAppMode(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13 }}>
            ← Back to home
          </button>
        </div>
      </ToastProvider>
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
      case "reports":     return <PlanGate plan={plan} feature="Reports" onUpgrade={goUpgrade}><Reports /></PlanGate>;
      case "marketplace": return <Marketplace />;
      case "plans":       return <PlansPage onUpgrade={goUpgrade} />;
      case "account":     return <AccountPage dealer={dealer} onLogout={handleLogout} />;
      default:            return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <ToastProvider>
      <PlanCtx.Provider value={plan}>
        <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: ${C.bg}; }
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: ${C.bg}; }
            ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
            select option { background: #fff; color: ${C.text}; }
          `}</style>

          <Sidebar page={page} setPage={setPage} dealer={dealer} onLogout={handleLogout} />

          <div className="erd-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
            <Topbar dealer={dealer} page={page} onAddNew={() => setShowAddVehicle(true)} onProfile={() => setPage("account")} />
            <main style={{ flex: 1 }}>
              {renderPage()}
            </main>
          </div>

          {showUpgradeModal && <ContactSupportModal onClose={() => setShowUpgradeModal(false)} onNavigate={setPage} />}
          <PWAInstallPrompt />
        </div>
      </PlanCtx.Provider>
    </ToastProvider>
  );
}
