/**
 * Navbar — 3 Ecosystem Tabs: Driver / Dealer / Financer
 * Language switcher + Hard refresh button
 * Mobile: bottom tab bar for thumb-friendly access
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n, LanguageSwitcher } from "../i18n";
import { ROLE_C, TYPO, RADIUS, LAYOUT } from "../theme";
import { BRANDING } from "../branding";

const G = ROLE_C.driver;
const D = ROLE_C.dealer;
const P = ROLE_C.financer;

const ECOSYSTEMS = [
  { key: "driver",   icon: "🛺", color: G, paths: ["/", "/driver", "/driver/marketplace", "/driver/dealers", "/driver/learn"] },
  { key: "dealer",   icon: "🏪", color: D, paths: ["/dealer", "/dealer/dashboard", "/dashboard", "/login"] },
  { key: "financer", icon: "🏦", color: P, paths: ["/financer", "/financer/dashboard"] },
];

function hardRefresh() {
  if ("caches" in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
  window.location.reload();
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const loc = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    const detectInstalled = () => {
      const standalone = Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);
      setIsInstalled(standalone);
      if (standalone) {
        setCanInstall(false);
        setInstallPrompt(null);
      }
    };

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      detectInstalled();
    };

    detectInstalled();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const media = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
    media?.addEventListener?.("change", detectInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      media?.removeEventListener?.("change", detectInstalled);
    };
  }, []);

  const getActive = () => {
    for (const eco of ECOSYSTEMS) {
      if (eco.paths.some(p => loc.pathname === p || (p !== "/" && loc.pathname.startsWith(p)))) {
        return eco.key;
      }
    }
    return "driver";
  };

  const activeEco = getActive();

  const promptInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // Ignore prompt errors to avoid blocking navigation.
    } finally {
      setInstallPrompt(null);
      setCanInstall(false);
    }
  };

  return (
    <>
      <style>{`
        .eco-tab { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: ${RADIUS.md}px; font-weight: 700; font-size: 13px; text-decoration: none; transition: all 0.18s; border: 2px solid transparent; cursor: pointer; white-space: nowrap; }
        .eco-tab:hover { transform: translateY(-1px); }
        .bottom-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; font-size: 10px; font-weight: 700; text-decoration: none; transition: all 0.15s; flex: 1; border: none; background: none; cursor: pointer; }
        html, body { max-width: 100%; overflow-x: hidden; }
        #root { overflow-x: hidden; }

        /* Drawer */
        @keyframes drawerIn  { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes drawerOut { from { transform: translateX(0); }    to { transform: translateX(100%); } }
        @keyframes fadeInBd  { from { opacity: 0; }                  to { opacity: 1; } }
        .nav-drawer          { animation: drawerIn 0.28s cubic-bezier(0.4,0,0.2,1) both; }
        .nav-backdrop        { animation: fadeInBd 0.22s ease both; }
        .drawer-item         { display: flex; align-items: center; gap: 14px; padding: 13px 20px; text-decoration: none; transition: background 0.15s; border-radius: 10px; margin: 2px 8px; }
        .drawer-item:hover, .drawer-item:active { background: #f3f4f6; }
        .drawer-item.active  { background: #f0fdf4; }

        @media (min-width: 769px) { .mobile-bottom-nav { display: none !important; } }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .navbar-right-btns .install-btn { display: none !important; }
          .navbar-right-btns .refresh-btn { display: none !important; }
          body { padding-bottom: calc(60px + env(safe-area-inset-bottom, 8px)) !important; }
        }
        @supports (height: 100dvh) {
          @media (max-width: 768px) { body { min-height: 100dvh; } }
        }
      `}</style>

      {/* ── Top Nav ── */}
      <nav style={{
        background: "#fff",
        borderBottom: "none",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        fontFamily: TYPO.body,
      }}>
        {/* Green accent line at top */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${G}, #15803d, #4ade80)` }} />

        <div style={{
          maxWidth: LAYOUT.navWidth, margin: "0 auto",
          padding: "0 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", height: 58,
        }}>

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, background: `linear-gradient(135deg, ${G}, #15803d)`,
              borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: `0 2px 8px ${G}40`, flexShrink: 0,
            }}>🛺</div>
            <div>
              <div style={{ fontFamily: TYPO.heading, fontWeight: 800, fontSize: 15, color: "#1e293b", lineHeight: 1 }}>
                <span style={{ color: G }}>{BRANDING.platformName.slice(0,8)}</span>{BRANDING.platformName.slice(8)}
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1, marginTop: 2, fontFamily: TYPO.hindi, letterSpacing: 0.2 }}>
                {BRANDING.platformTagline}
              </div>
            </div>
          </Link>

          {/* Desktop: Ecosystem Tabs — underline active style */}
          <div className="desktop-nav" style={{ display: "flex", alignItems: "stretch", gap: 0, height: 58 }}>
            {[
              { to: "/",                   icon: "🏠", label: t("nav.home"),     active: loc.pathname === "/" },
              { to: "/driver/marketplace", icon: "🛺", label: t("nav.driver"),   active: loc.pathname === "/driver/marketplace" },
              { to: "/driver/learn",       icon: "🎓", label: t("nav.learn"),    active: loc.pathname.startsWith("/driver/learn") },
              { to: "/driver/dealers",     icon: "📍", label: t("nav.dealers"),  active: loc.pathname === "/driver/dealers" },
              { to: "/dealer",             icon: "🏪", label: t("nav.dealer"),   active: activeEco === "dealer", color: D },
              { to: "/financer",           icon: "🏦", label: t("nav.financer"), active: activeEco === "financer", color: P },
            ].map(tab => {
              const ac = tab.active;
              const col = ac ? (tab.color || G) : "#6b7280";
              return (
                <Link key={tab.to} to={tab.to} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "0 14px",
                  textDecoration: "none", fontWeight: ac ? 700 : 600, fontSize: 13,
                  color: col, position: "relative", transition: "color 0.15s",
                  borderBottom: ac ? `3px solid ${tab.color || G}` : "3px solid transparent",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 14 }}>{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Language + Install + Refresh + Hamburger */}
          <div className="navbar-right-btns" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Compact language toggle — single button */}
            <LanguageSwitcher compact />

            {canInstall && !isInstalled && (
              <button onClick={promptInstall} title="Install app" className="install-btn"
                style={{
                  background: G, border: "none", borderRadius: 8,
                  padding: "7px 12px", cursor: "pointer", fontSize: 12, color: "#fff",
                  display: "flex", alignItems: "center", gap: 4, fontWeight: 700,
                  boxShadow: `0 2px 8px ${G}40`,
                }}>
                📲 Install
              </button>
            )}

            {/* Hard Refresh — desktop only */}
            <button onClick={hardRefresh} title={t("action.hard_refresh")} className="refresh-btn"
              style={{
                background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "7px 9px", cursor: "pointer", fontSize: 14, color: "#6b7280",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; e.currentTarget.style.background = "#f0fdf4"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "#f8fafc"; }}>
              🔄
            </button>

            {/* Hamburger — mobile, proper touch target */}
            <button onClick={() => setOpen(o => !o)} className="hamburger-btn"
              style={{
                display: "none", background: open ? "#f0fdf4" : "#f8fafc",
                border: `1.5px solid ${open ? G + "60" : "#e5e7eb"}`,
                borderRadius: 9, cursor: "pointer", padding: "8px 9px",
                alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 4, transition: "all 0.2s",
                minWidth: 40, minHeight: 40,
              }}>
              <span style={{ display: "block", width: 18, height: 2, background: open ? G : "#374151", borderRadius: 2, transition: "all 0.22s", transform: open ? "rotate(45deg) translate(0, 6px)" : "" }} />
              <span style={{ display: "block", width: 18, height: 2, background: open ? G : "#374151", borderRadius: 2, transition: "all 0.22s", opacity: open ? 0 : 1 }} />
              <span style={{ display: "block", width: 18, height: 2, background: open ? G : "#374151", borderRadius: 2, transition: "all 0.22s", transform: open ? "rotate(-45deg) translate(0, -6px)" : "" }} />
            </button>
          </div>
        </div>

      </nav>

      {/* ── Mobile Drawer (full-height slide-in from right) ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="nav-backdrop"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
            }}
          />

          {/* Drawer Panel */}
          <div
            className="nav-drawer"
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 9999,
              width: "min(300px, 82vw)",
              background: "#fff",
              display: "flex", flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
              fontFamily: TYPO.body,
              overflowY: "auto",
            }}
          >
            {/* Drawer Header */}
            <div style={{
              background: `linear-gradient(135deg, #052e16, ${G})`,
              padding: "20px 16px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <Link to="/" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <div style={{ width: 38, height: 38, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛺</div>
                <div>
                  <div style={{ fontFamily: TYPO.heading, fontWeight: 800, fontSize: 16, color: "#fff", lineHeight: 1 }}>{BRANDING.platformName}</div>
                  <div style={{ fontSize: 10, color: "#bbf7d0", marginTop: 2, fontFamily: TYPO.hindi }}>{BRANDING.platformTagline}</div>
                </div>
              </Link>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                  width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                  fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >✕</button>
            </div>

            {/* Nav Items */}
            <div style={{ padding: "10px 0", flex: 1 }}>

              {/* Buyer section label */}
              <div style={{ padding: "8px 20px 4px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
                For Buyers
              </div>

              {[
                { to: "/", icon: "🏠", iconBg: "#dcfce7", label: t("nav.home"), sub: "Homepage", color: G, active: loc.pathname === "/" },
                { to: "/driver/marketplace", icon: "🛺", iconBg: "#dcfce7", label: t("nav.driver"), sub: t("driver.subtitle"), color: G, active: loc.pathname === "/driver/marketplace" },
                { to: "/driver/dealers", icon: "📍", iconBg: "#dbeafe", label: t("nav.dealers"), sub: t("dealer.subtitle_find"), color: "#1d4ed8", active: loc.pathname === "/driver/dealers" },
                { to: "/driver/learn", icon: "🎓", iconBg: "#ede9fe", label: t("nav.learn"), sub: "Guides & Tips", color: "#7c3aed", active: loc.pathname.startsWith("/driver/learn") },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`drawer-item${item.active ? " active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: item.active ? item.color : "#1e293b", lineHeight: 1.2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{item.sub}</div>
                  </div>
                  {item.active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />}
                  <span style={{ color: "#d1d5db", fontSize: 14, flexShrink: 0 }}>›</span>
                </Link>
              ))}

              {/* Divider */}
              <div style={{ margin: "10px 20px", borderTop: "1px solid #f1f5f9" }} />
              <div style={{ padding: "4px 20px 4px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
                For Business
              </div>

              {[
                { to: "/dealer", icon: "🏪", iconBg: "#dbeafe", label: t("nav.dealer"), sub: t("dealer.subtitle"), color: D, active: activeEco === "dealer" },
                { to: "/financer", icon: "🏦", iconBg: "#fce7f3", label: t("nav.financer"), sub: t("financer.subtitle"), color: "#be185d", active: activeEco === "financer" },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`drawer-item${item.active ? " active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: item.active ? item.color : "#1e293b", lineHeight: 1.2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{item.sub}</div>
                  </div>
                  {item.active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />}
                  <span style={{ color: "#d1d5db", fontSize: 14, flexShrink: 0 }}>›</span>
                </Link>
              ))}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
              {canInstall && !isInstalled && (
                <button
                  onClick={() => { setOpen(false); promptInstall(); }}
                  style={{
                    width: "100%", padding: "12px 16px", background: `linear-gradient(135deg,${G},#15803d)`,
                    color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
                    marginBottom: 8, boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>📲</span> Install ErikshawDekho App
                </button>
              )}
              <div style={{ textAlign: "center", fontSize: 10, color: "#9ca3af" }}>
                © {new Date().getFullYear()} ErikshawDekho · Made in India 🇮🇳
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="mobile-bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998,
        background: "#fff", borderTop: "1px solid #e5e7eb",
        display: "flex", justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom, 4px)",
        boxShadow: "0 -3px 16px rgba(0,0,0,0.08)",
        fontFamily: TYPO.body, width: "100%",
      }}>
        {[
          { to: "/",                  icon: "🏠", label: t("nav.home"),     active: loc.pathname === "/" },
          { to: "/driver/marketplace",icon: "🛺", label: t("nav.driver"),   active: loc.pathname === "/driver/marketplace" },
          { to: "/driver/dealers",    icon: "📍", label: t("nav.dealers"),  active: loc.pathname === "/driver/dealers" },
          { to: "/dealer",            icon: "🏪", label: t("nav.dealer"),   active: activeEco === "dealer" },
          { to: "/financer",          icon: "🏦", label: t("nav.financer"), active: activeEco === "financer" },
        ].map(tab => (
          <Link key={tab.to} to={tab.to} className="bottom-tab" style={{ color: tab.active ? G : "#9ca3af", position: "relative" }}>
            {tab.active && (
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, background: G, borderRadius: "0 0 3px 3px" }} />
            )}
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontWeight: tab.active ? 700 : 600 }}>{tab.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
