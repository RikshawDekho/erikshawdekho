/**
 * LandingPage — Brand-first entry at www.erikshawdekho.com
 * Full ErikshawDekho branding + 3 ecosystem entry cards
 * No login wall — clean, fast, accessible
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n, LanguageSwitcher } from "../i18n";

const G = "#16a34a";
const D = "#1e3a8a";
const P = "#7c3aed";
const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [stats, setStats] = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });

  useEffect(() => {
    fetch(`${API}/stats/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, []);

  const lastPage = typeof window !== "undefined" ? localStorage.getItem("erd_last_page") : null;

  const ecosystems = [
    {
      key: "driver",
      icon: "🛺",
      color: G,
      bgLight: "#f0fdf4",
      path: "/driver/marketplace",
      badge: t("driver.subtitle"),
      features: [t("driver.explore"), t("driver.compare"), t("driver.find_dealer"), t("driver.free_enquiry"), t("driver.emi")],
    },
    {
      key: "dealer",
      icon: "🏪",
      color: D,
      bgLight: "#eff6ff",
      path: "/dealer",
      badge: t("dealer.subtitle"),
      features: [t("dealer.leads"), t("dealer.invoice"), t("dealer.analytics"), t("dealer.marketing")],
    },
    {
      key: "financer",
      icon: "🏦",
      color: P,
      bgLight: "#faf5ff",
      path: "/financer",
      badge: t("financer.subtitle"),
      features: [],
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        .eco-card:hover { transform: translateY(-8px) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.14) !important; }
        .eco-card { transition: transform 0.25s ease, box-shadow 0.25s ease; cursor: pointer; }
        .cta-btn:hover { opacity: 0.92; transform: scale(1.03); }
        .cta-btn { transition: all 0.18s ease; }
      `}</style>

      {/* ── Slim Top Bar ── */}
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🛺</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: G, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>ErikshawDekho</div>
            <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'Noto Sans Devanagari',sans-serif" }}>भारत का ई-रिक्शा प्लेटफॉर्म</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LanguageSwitcher />
          {/* Hard Refresh */}
          <button onClick={() => { if ("caches" in window) caches.keys().then(names => names.forEach(n => caches.delete(n))); window.location.reload(); }}
            title={t("action.hard_refresh")}
            style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14, color: "#6b7280", transition: "all 0.15s" }}>
            🔄
          </button>
        </div>
      </header>

      {/* ── Hero Section — Full Brand Identity ── */}
      <section style={{
        background: `linear-gradient(135deg, ${D} 0%, #1e40af 35%, ${G} 100%)`,
        color: "#fff", padding: "clamp(48px,8vw,80px) 24px clamp(40px,7vw,72px)", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(22,163,74,0.3) 0%, transparent 50%)" }} />
        <div style={{ maxWidth: 740, margin: "0 auto", position: "relative" }}>
          {/* Big logo + name */}
          <div style={{ animation: "fadeUp 0.6s ease both" }}>
            <div style={{ fontSize: "clamp(56px,10vw,80px)", marginBottom: 8, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }}>🛺</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "clamp(30px,6vw,52px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 6, textShadow: "0 2px 16px rgba(0,0,0,0.25)" }}>
              ErikshawDekho
            </div>
          </div>

          <div style={{ animation: "fadeUp 0.6s 0.15s ease both" }}>
            <div style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: "clamp(18px,3.5vw,28px)", fontWeight: 700, color: "#bbf7d0", marginBottom: 4 }}>
              {lang === "en" ? "India's Most Trusted E-Rickshaw Platform" : "भारत का सबसे भरोसेमंद ई-रिक्शा प्लेटफॉर्म"}
            </div>
            <div style={{ fontSize: "clamp(13px,2vw,16px)", color: "#93c5fd", marginBottom: 32 }}>
              {t("landing.hero.subtitle")}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px,5vw,56px)", flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s ease both" }}>
            {[
              { n: `${stats.dealer_count || "500"}+`, l: t("landing.stats.dealers") },
              { n: `${stats.vehicle_count || "2000"}+`, l: t("landing.stats.vehicles") },
              { n: `${stats.city_count || "50"}+`, l: t("landing.stats.cities") },
              { n: "₹0", l: t("landing.hero.free") },
            ].map(({ n, l }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, fontFamily: "'Poppins',sans-serif" }}>{n}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 Ecosystem Cards ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px", flex: 1 }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3.5vw,30px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>
          {t("who.title")}
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 40, fontSize: 14 }}>
          {t("who.subtitle")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {ecosystems.map(({ key, icon, color, bgLight, path, badge, features }) => (
            <div key={key} className="eco-card"
              style={{ background: "#fff", borderRadius: 20, border: "2px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}
              onClick={() => navigate(path)}
            >
              {/* Card header */}
              <div style={{ background: bgLight, padding: "28px 24px 20px", borderBottom: `3px solid ${color}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ fontSize: 52 }}>{icon}</div>
                  <span style={{ background: `${color}14`, color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>
                    {badge}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 21, color: "#111827", marginBottom: 4 }}>{t(`${key}.title`)}</div>
                <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, marginTop: 8 }}>{t(`${key}.desc`)}</p>
              </div>

              {/* Features */}
              {features.length > 0 && (
                <div style={{ padding: "16px 24px" }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                    {features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                        <span style={{ color, fontWeight: 700 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div style={{ padding: "0 24px 24px" }}>
                <Link to={path} className="cta-btn"
                  onClick={e => e.stopPropagation()}
                  style={{ display: "block", background: color, color: "#fff", textAlign: "center", padding: "13px 0", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
                  {t(`${key}.${key === "driver" ? "cta" : "portal"}`)}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Session restore banner */}
        {lastPage && (
          <div style={{ marginTop: 32, background: "#fff", border: "1px solid #e5e7eb", borderLeft: `4px solid ${G}`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{t("action.welcome_back")} 👋</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{t("action.session_saved")}</div>
            </div>
            <Link to={lastPage} style={{ background: G, color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              {t("action.continue")}
            </Link>
          </div>
        )}
      </main>

      {/* ── Trust Section ── */}
      <section style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
            {lang === "en" ? "Trusted by dealers & drivers across India" : "पूरे भारत में dealers और drivers का भरोसा"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(24px,5vw,48px)", flexWrap: "wrap" }}>
            {[
              { icon: "🔒", text: lang === "en" ? "Secure Platform" : "सुरक्षित प्लेटफॉर्म" },
              { icon: "✅", text: lang === "en" ? "Verified Dealers" : "सत्यापित डीलर" },
              { icon: "💰", text: lang === "en" ? "Best Prices" : "सबसे अच्छी कीमत" },
              { icon: "📞", text: lang === "en" ? "24/7 Support" : "24/7 सहायता" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", fontWeight: 600 }}>
                <span style={{ fontSize: 18 }}>{icon}</span> {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#111827", color: "#9ca3af", padding: "24px", textAlign: "center", fontSize: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: "#e5e7eb" }}>ErikshawDekho</span>
          {" "}{lang === "en" ? "— India's Most Trusted E-Rickshaw Platform" : "— भारत का सबसे भरोसेमंद E-Rickshaw Platform"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
          <Link to="/driver/marketplace" style={{ color: "#9ca3af", textDecoration: "none" }}>{t("nav.marketplace")}</Link>
          <Link to="/driver/dealers" style={{ color: "#9ca3af", textDecoration: "none" }}>{t("nav.dealers")}</Link>
          <Link to="/dealer" style={{ color: "#9ca3af", textDecoration: "none" }}>{t("nav.dealer")}</Link>
          <Link to="/financer" style={{ color: "#9ca3af", textDecoration: "none" }}>{t("nav.financer")}</Link>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          © {new Date().getFullYear()} ErikshawDekho · support@erikshawdekho.com · {t("footer.designed")}
        </div>
      </footer>
    </div>
  );
}
