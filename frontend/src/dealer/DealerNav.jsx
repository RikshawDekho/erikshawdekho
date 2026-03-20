/**
 * DealerNav.jsx — Sidebar, Topbar, NAV constants
 */
import { useState, useEffect, useContext } from "react";
import i18n from "i18next";
import { LIGHT_C, DARK_C, ThemeCtx, useC } from "../theme";
import { api } from "./api";
import { Btn } from "./ui";

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

export { NAV, BOTTOM_NAV, Sidebar, Topbar };
