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

  const getEcoColor = () => ECOSYSTEMS.find(e => e.key === activeEco)?.color || G;

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
        .eco-tab { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: ${RADIUS.md}px; font-weight: 700; font-size: 13px; text-decoration: none; transition: all 0.18s; border: 2px solid transparent; cursor: pointer; }
        .eco-tab:hover { transform: translateY(-1px); }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .mobile-menu { animation: slideDown 0.2s ease; }
        .bottom-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; font-size: 10px; font-weight: 700; text-decoration: none; transition: all 0.15s; flex: 1; border: none; background: none; cursor: pointer; }
        @media (min-width: 769px) { .mobile-bottom-nav { display: none !important; } }
        @media (max-width: 768px) { .desktop-nav { display: none !important; } .hamburger-btn { display: flex !important; } body { padding-bottom: calc(66px + env(safe-area-inset-bottom)); } }
      `}</style>

      {/* ── Top Nav ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", fontFamily: TYPO.body }}>
        <div style={{ maxWidth: LAYOUT.navWidth, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
            <span style={{ fontSize: 24 }}>🛺</span>
            <div>
              <div style={{ fontFamily: TYPO.heading, fontWeight: 800, fontSize: 15, color: G, lineHeight: 1 }}>{BRANDING.platformName}</div>
              <div style={{ fontSize: 9, color: "#6b7280", lineHeight: 1, marginTop: 1, fontFamily: TYPO.hindi }}>{BRANDING.platformTagline}</div>
            </div>
          </Link>

          {/* Desktop: Ecosystem Tabs */}
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link to="/driver/marketplace" className="eco-tab"
              style={{ background: activeEco === "driver" ? `${G}12` : "transparent", color: activeEco === "driver" ? G : "#6b7280", borderColor: activeEco === "driver" ? `${G}40` : "transparent" }}>
              🛺 {t("nav.driver")}
            </Link>
            <Link to="/dealer" className="eco-tab"
              style={{ background: activeEco === "dealer" ? `${D}12` : "transparent", color: activeEco === "dealer" ? D : "#6b7280", borderColor: activeEco === "dealer" ? `${D}40` : "transparent" }}>
              🏪 {t("nav.dealer")}
            </Link>
            <Link to="/financer" className="eco-tab"
              style={{ background: activeEco === "financer" ? `${P}12` : "transparent", color: activeEco === "financer" ? P : "#6b7280", borderColor: activeEco === "financer" ? `${P}40` : "transparent" }}>
              🏦 {t("nav.financer")}
            </Link>
          </div>

          {/* Right: Language + Refresh + Hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LanguageSwitcher />

            {canInstall && !isInstalled && (
              <button onClick={promptInstall}
                title="Install app"
                style={{
                  background: "none", border: "1px solid #e5e7eb", borderRadius: RADIUS.sm,
                  padding: "6px 10px", cursor: "pointer", fontSize: 13, color: "#6b7280",
                  transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4, fontWeight: 700,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = getEcoColor(); e.currentTarget.style.color = getEcoColor(); }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}>
                ⬇ Install
              </button>
            )}

            {/* Hard Refresh */}
            <button onClick={hardRefresh}
              title={t("action.hard_refresh")}
              style={{
                background: "none", border: "1px solid #e5e7eb", borderRadius: RADIUS.sm,
                padding: "6px 10px", cursor: "pointer", fontSize: 14, color: "#6b7280",
                transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = getEcoColor(); e.currentTarget.style.color = getEcoColor(); }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}>
              🔄
            </button>

            {/* Hamburger (mobile) */}
            <button onClick={() => setOpen(o => !o)} className="hamburger-btn"
              style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 6, alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 20, height: 2, background: "#374151", margin: "3px 0", transition: "all 0.2s", transform: open ? "rotate(45deg) translate(3px,3px)" : "" }} />
              <div style={{ width: 20, height: 2, background: "#374151", margin: "3px 0", opacity: open ? 0 : 1 }} />
              <div style={{ width: 20, height: 2, background: "#374151", margin: "3px 0", transform: open ? "rotate(-45deg) translate(3px,-3px)" : "" }} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {open && (
          <div className="mobile-menu" style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px 16px" }}>
            <Link to="/driver/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: activeEco === "driver" ? G : "#374151", fontWeight: 700, fontSize: 15, textDecoration: "none" }} onClick={() => setOpen(false)}>
              🛺 {t("nav.driver")}
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>— {t("driver.subtitle")}</span>
            </Link>
            <Link to="/driver/learn" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", color: loc.pathname.startsWith("/driver/") ? G : "#374151", fontWeight: 700, fontSize: 14, textDecoration: "none" }} onClick={() => setOpen(false)}>
              🎓 {t("nav.learn")}
            </Link>
            <Link to="/dealer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: activeEco === "dealer" ? D : "#374151", fontWeight: 700, fontSize: 15, textDecoration: "none" }} onClick={() => setOpen(false)}>
              🏪 {t("nav.dealer")}
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>— {t("dealer.subtitle")}</span>
            </Link>
            <Link to="/financer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: activeEco === "financer" ? P : "#374151", fontWeight: 700, fontSize: 15, textDecoration: "none" }} onClick={() => setOpen(false)}>
              🏦 {t("nav.financer")}
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>— {t("financer.subtitle")}</span>
            </Link>
            {canInstall && !isInstalled && (
              <button onClick={() => { setOpen(false); promptInstall(); }}
                style={{
                  width: "100%", marginTop: 8, border: `1px solid ${getEcoColor()}44`, background: `${getEcoColor()}12`, color: getEcoColor(),
                  borderRadius: RADIUS.md, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}>
                ⬇ Install App
              </button>
            )}
          </div>
        )}
      </nav>

      {/* ── Mobile Bottom Tab Bar (thumb-friendly for drivers) ── */}
      <div className="mobile-bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "#fff", borderTop: "1px solid #e5e7eb",
        display: "flex", justifyContent: "space-around", padding: "4px 0 env(safe-area-inset-bottom, 4px)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
        fontFamily: TYPO.body,
      }}>
        <Link to="/driver/marketplace" className="bottom-tab"
          style={{ color: activeEco === "driver" ? G : "#9ca3af" }}>
          <span style={{ fontSize: 20 }}>🛺</span>
          <span>{t("nav.driver")}</span>
        </Link>
        <Link to="/driver/dealers" className="bottom-tab"
          style={{ color: loc.pathname === "/driver/dealers" ? G : "#9ca3af" }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <span>{t("nav.dealers")}</span>
        </Link>
        <Link to="/driver/learn" className="bottom-tab"
          style={{ color: loc.pathname.startsWith("/driver/learn") ? G : "#9ca3af" }}>
          <span style={{ fontSize: 20 }}>🎓</span>
          <span>{t("nav.learn")}</span>
        </Link>
        <Link to="/dealer" className="bottom-tab"
          style={{ color: activeEco === "dealer" ? D : "#9ca3af" }}>
          <span style={{ fontSize: 20 }}>🏪</span>
          <span>{t("nav.dealer")}</span>
        </Link>
        <Link to="/financer" className="bottom-tab"
          style={{ color: activeEco === "financer" ? P : "#9ca3af" }}>
          <span style={{ fontSize: 20 }}>🏦</span>
          <span>{t("nav.financer")}</span>
        </Link>
      </div>
    </>
  );
}
