import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { SalesPage } from './SalesPage';

// ═══════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════
const API = import.meta.env.VITE_API_URL;

async function apiFetch(path, opts = {}, _retry = false) {
  const token = localStorage.getItem("erd_access");
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
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
    create: (d)    => apiFetch("/vehicles/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/vehicles/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
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
};

// ═══════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════
const C = {
  primary: "#1a7c4f",   // deep green
  primaryL: "#22a866",
  primaryD: "#115c38",
  accent: "#f59e0b",    // amber - rickshaw yellow
  accentL: "#fbbf24",
  bg: "#f0f4f8",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  textMid: "#475569",
  textDim: "#94a3b8",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
  info: "#3b82f6",
};

const STOCK_COLOR = { in_stock: C.success, low_stock: C.warning, out_of_stock: C.danger };
const LEAD_COLOR  = { new:"#6366f1", interested:C.info, follow_up:C.warning, converted:C.success, lost:C.danger };
const FUEL_COLOR  = { electric:C.success, petrol:"#f97316", cng:"#06b6d4", lpg:"#8b5cf6", diesel:"#64748b" };

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════
function Badge({ label, color = C.primary }) {
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Btn({ label, onClick, color = C.primary, outline, size = "md", icon, disabled, fullWidth, type = "button" }) {
  const pad = size === "sm" ? "5px 12px" : size === "lg" ? "12px 28px" : "8px 18px";
  const fs  = size === "sm" ? 12 : size === "lg" ? 15 : 13;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: outline ? "transparent" : disabled ? "#e2e8f0" : color,
      border: `2px solid ${disabled ? "#e2e8f0" : color}`,
      color: outline ? color : disabled ? C.textDim : "#fff",
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
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color = C.primary, sub }) {
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "Georgia, serif" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
      </div>
    </Card>
  );
}

function Table({ cols, rows, onRow }) {
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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const data = mode === "login" ? await api.login({ username: form.username, password: form.password }) : await api.register(form);
      localStorage.setItem("erd_access", data.access);
      if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
      onAuth(data);
    } catch (e) {
      setErr(typeof e === "object" ? Object.values(e).flat().join(" ") : "Something went wrong");
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
            <Field label="Username" required><Input value={form.username} onChange={set("username")} placeholder="username" required /></Field>
            <Field label="Password" required><Input value={form.password} onChange={set("password")} type="password" placeholder="••••••" required /></Field>
            {mode === "register" && <>
              <Field label="Email"><Input value={form.email} onChange={set("email")} type="email" placeholder="you@email.com" /></Field>
              <Field label="Dealership Name" required><Input value={form.dealer_name} onChange={set("dealer_name")} placeholder="Kumar Electric Vehicles" required /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" required /></Field>
              <Field label="City"><Input value={form.city} onChange={set("city")} placeholder="Delhi" /></Field>
            </>}
            {err && <div style={{ background: "#fef2f2", border: `1px solid ${C.danger}33`, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14 }}>{err}</div>}
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

function Topbar({ dealer, page, onAddNew }) {
  const title = NAV.find(n => n.id === page)?.label || page;
  return (
    <div style={{ height: 60, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 12, color: C.textMid }}>🔔</div>
        {page === "inventory" && <Btn label="+ Add New Vehicle" color={C.primary} size="sm" onClick={onAddNew} />}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: C.bg, borderRadius: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${C.primary}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{dealer?.name || "Dealer"}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════
function Dashboard() {
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
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ <span>Your <b>{plan.type} plan</b> has expired. Contact support to renew your subscription.</span>
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining <= 7 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ <span>Your <b>{plan.type} plan</b> expires in <b>{plan.days_remaining} day{plan.days_remaining !== 1 ? "s" : ""}</b>. Contact support to upgrade.</span>
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
function Inventory({ showAdd, onAddClose }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inStock: 0, sold: 0, lowStock: 0 });
  const [filters, setFilters] = useState({ brand: "", fuel_type: "", stock_status: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState({ brand_id: "", model_name: "", fuel_type: "electric", price: "", stock_quantity: "", year: 2024, description: "" });
  const [saving, setSaving] = useState(false);

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
    e.preventDefault(); setSaving(true);
    try {
      await api.vehicles.create({ ...form, brand: form.brand_id });
      onAddClose(); load();
    } catch (err) { alert("Error: " + JSON.stringify(err)); }
    setSaving(false);
  };

  const cols = [
    { label: "ID",       render: r => <span style={{ color: C.textDim, fontSize: 12 }}>{r.id}</span> },
    { label: "Thumbnail",render: r => <div style={{ width: 56, height: 40, background: `${C.primary}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛺</div> },
    { label: "Model",    render: r => <div><div style={{ fontWeight: 600 }}>{r.model_name}</div><div style={{ fontSize: 11, color: C.textDim }}>{r.brand_name}</div></div> },
    { label: "Brand",    key:    "brand_name" },
    { label: "Fuel",     render: r => <Badge label={r.fuel_type} color={FUEL_COLOR[r.fuel_type]} /> },
    { label: "Price",    render: r => <span style={{ fontWeight: 600 }}>{fmtINR(r.price)}</span> },
    { label: "Stock",    render: r => <span style={{ fontWeight: 700, color: STOCK_COLOR[r.stock_status] }}>{r.stock_quantity}</span> },
    { label: "Status",   render: r => <Badge label={r.stock_status.replace("_", " ")} color={STOCK_COLOR[r.stock_status]} /> },
    { label: "Actions",  render: r => (
      <div style={{ display: "flex", gap: 6 }}>
        <Btn label="View" size="sm" outline color={C.info} />
        <Btn label="Edit" size="sm" outline color={C.primary} />
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
        <Modal title="Add New Vehicle" onClose={onAddClose} width={560}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Brand" required>
                <Select value={form.brand_id} onChange={setForm_("brand_id")} placeholder="Select brand"
                  options={brands.map(b => ({ value: b.id, label: b.name }))} />
              </Field>
              <Field label="Model Name" required><Input value={form.model_name} onChange={setForm_("model_name")} placeholder="e.g. YatriKing Pro" required /></Field>
              <Field label="Fuel Type" required>
                <Select value={form.fuel_type} onChange={setForm_("fuel_type")} options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"}]} />
              </Field>
              <Field label="Price (₹)" required><Input value={form.price} onChange={setForm_("price")} type="number" placeholder="150000" required /></Field>
              <Field label="Stock Quantity"><Input value={form.stock_quantity} onChange={setForm_("stock_quantity")} type="number" placeholder="10" /></Field>
              <Field label="Year"><Input value={form.year} onChange={setForm_("year")} type="number" placeholder="2024" /></Field>
            </div>
            <Field label="Description"><textarea value={form.description} onChange={e => setForm_(e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} placeholder="Vehicle description..." /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={onAddClose} />
              <Btn label={saving ? "Saving..." : "Add Vehicle"} color={C.primary} type="submit" disabled={saving} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LEADS PAGE
// ═══════════════════════════════════════════════════════
function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", source: "website", status: "new", notes: "", vehicle: "" });
  const [vehicles, setVehicles] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    api.leads.list().then(d => setLeads(d.results || d)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); api.vehicles.list().then(d => setVehicles(d.results || d)); }, [load]);

  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try { await api.leads.create(form); setShowAdd(false); load(); }
    catch (err) { alert("Error: " + JSON.stringify(err)); }
  };

  const updateStatus = async (id, status) => {
    await api.leads.update(id, { status });
    setLeads(p => p.map(l => l.id === id ? { ...l, status } : l));
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn label="+ Add Lead" color={C.primary} onClick={() => setShowAdd(true)} />
      </div>
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>All Leads ({leads.length})</div>
        {loading ? <Spinner /> : <Table cols={cols} rows={leads} />}
      </Card>

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

  const load = () => { setLoading(true); api.customers.list().then(d => setCustomers(d.results || d)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const setF = k => v => setForm(p => ({ ...p, [k]: v }));
  const submit = async (e) => { e.preventDefault(); try { await api.customers.create(form); setShowAdd(false); load(); } catch(err) { alert(JSON.stringify(err)); } };

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
function AccountPage({ dealer, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(d => setData(d)).finally(() => setLoading(false));
  }, []);

  const plan = data?.plan;

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      {/* Profile card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", flexShrink: 0 }}>
            {(dealer?.dealer_name || "D")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{dealer?.dealer_name || "Dealer"}</div>
            <div style={{ fontSize: 13, color: C.textMid }}>📍 {dealer?.city || "—"}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>Phone</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{dealer?.phone || "—"}</div>
          </div>
          <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>Verification</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {dealer?.is_verified
                ? <span style={{ color: C.success }}>✅ Verified</span>
                : <span style={{ color: C.warning }}>⏳ Pending</span>}
            </div>
          </div>
        </div>
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
// MARKETPLACE PAGE (public-facing)
// ═══════════════════════════════════════════════════════
function Marketplace() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ fuel_type: "", search: "" });

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
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
            <Card key={v.id} style={{ cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${C.border}` }}
              onMouseEnter={() => {}} onMouseLeave={() => {}}>
              <div style={{ height: 120, background: `linear-gradient(135deg,${C.primary}15,${C.accent}15)`, borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🛺</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{v.model_name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 8 }}>
                <Badge label={v.fuel_type} color={FUEL_COLOR[v.fuel_type]} />
                <Badge label={v.brand_name} color={C.textMid} />
              </div>
              <div style={{ fontSize: 13, color: C.textMid }}>Starting at <span style={{ color: C.primary, fontWeight: 700, fontSize: 15 }}>{fmtINR(v.price)}</span></div>
              <div style={{ marginTop: 12 }}><Btn label="View Details" color={C.primary} fullWidth size="sm" /></div>
            </Card>
          ))}
        </div>
      )}
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
  const [page, setPage] = useState("dashboard");
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const handleAuth = (data) => {
    localStorage.setItem("erd_access", data.access);
    if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
    localStorage.setItem("erd_dealer", JSON.stringify(data.dealer));
    setAuth(data);
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
  };

  if (!auth) return <AuthPage onAuth={handleAuth} />;

  const dealer = auth.dealer;

  const renderPage = () => {
    switch (page) {
      case "dashboard":   return <Dashboard />;
      case "inventory":   return <Inventory showAdd={showAddVehicle} onAddClose={() => setShowAddVehicle(false)} />;
      case "leads":       return <Leads />;
      case "sales":       return <SalesPage />;
      case "customers":   return <Customers />;
      case "finance":     return <Finance />;
      case "reports":     return <Reports />;
      case "marketplace": return <Marketplace />;
      case "account":     return <AccountPage dealer={dealer} onLogout={handleLogout} />;
      default:            return <Dashboard />;
    }
  };

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        select option { background: #fff; color: ${C.text}; }
      `}</style>

      <Sidebar page={page} setPage={setPage} dealer={dealer} onLogout={handleLogout} />

      <div className="erd-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        <Topbar dealer={dealer} page={page} onAddNew={() => setShowAddVehicle(true)} />
        <main style={{ flex: 1 }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
