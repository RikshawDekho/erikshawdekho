/**
 * RoleLandingPage — First screen at www.erikshawdekho.com
 * Shows 3 role cards: Driver / Dealer / Financer
 * No login required for driver exploration.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const G = "#16a34a";
const D = "#1e3a8a";
const P = "#7c3aed";

export default function RoleLandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });

  // Fetch live platform stats for social proof
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";
    fetch(`${API}/stats/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, []);

  // If driver was browsing previously (session restore hint)
  const lastDriverPage = typeof window !== "undefined" ? localStorage.getItem("erd_last_page") : null;

  const roles = [
    {
      icon: "🛺",
      title: "Driver / Buyer",
      titleHindi: "ड्राइवर / खरीदार",
      desc: "Browse E-Rickshaws, compare prices & features, get best deals from verified dealers.",
      descHindi: "E-Rickshaw खोजें, prices compare करें, verified dealers से best deal पाएँ।",
      cta: "Explore Now →",
      ctaHindi: "अभी देखें →",
      path: "/marketplace",
      color: G,
      bgLight: "#f0fdf4",
      badge: "No Login Required",
      badgeColor: "#16a34a",
      features: ["Compare Vehicles", "EMI Calculator", "Dealer Directory", "Free Enquiry"],
    },
    {
      icon: "🏪",
      title: "Dealer / Showroom",
      titleHindi: "डीलर / शोरूम",
      desc: "Manage your showroom CRM, track leads, generate invoices, grow your business.",
      descHindi: "अपनी showroom manage करें, leads track करें, invoices बनाएँ, business बढ़ाएँ।",
      cta: "Dealer Portal →",
      ctaHindi: "Dealer पोर्टल →",
      path: "/dashboard",
      color: D,
      bgLight: "#eff6ff",
      badge: "Login Required",
      badgeColor: "#1e3a8a",
      features: ["Lead Management", "Invoice Generator", "Analytics", "Marketing Tools"],
    },
    {
      icon: "🏦",
      title: "Financer / NBFC",
      titleHindi: "फाइनेंसर / NBFC",
      desc: "Offer E-Rickshaw loans, onboard dealers, manage finance applications & documents.",
      descHindi: "E-Rickshaw loans offer करें, dealers onboard करें, finance applications manage करें।",
      cta: "Financer Portal →",
      ctaHindi: "Financer पोर्टल →",
      path: "/financer",
      color: P,
      bgLight: "#faf5ff",
      badge: "Approval Required",
      badgeColor: "#7c3aed",
      features: ["Dealer Onboarding", "Document Management", "Application Tracking", "Subscription Plans"],
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .role-card:hover { transform: translateY(-8px) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.14) !important; }
        .role-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .cta-btn:hover { opacity: 0.92; transform: scale(1.03); }
        .cta-btn { transition: all 0.18s ease; }
      `}</style>

      {/* ── Top bar ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🛺</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: D, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>eRickshawDekho</div>
            <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'Noto Sans Devanagari',sans-serif" }}>भारत का ई-रिक्शा प्लेटफॉर्म</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/marketplace" style={{ fontSize: 13, color: "#374151", textDecoration: "none", padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb" }}>
            Browse Vehicles
          </Link>
          <Link to="/dashboard" style={{ fontSize: 13, background: D, color: "#fff", textDecoration: "none", padding: "6px 14px", borderRadius: 6, fontWeight: 600 }}>
            Dealer Login
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ background: `linear-gradient(135deg, ${D} 0%, #1e40af 40%, ${G} 100%)`, color: "#fff", padding: "56px 24px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: "clamp(28px,5vw,46px)", fontWeight: 800, lineHeight: 1.25, marginBottom: 12, fontFamily: "'Poppins',sans-serif", animation: "fadeUp 0.6s ease both" }}>
            India's Most Trusted<br />
            <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: "clamp(26px,4.5vw,42px)" }}>ई-रिक्शा Platform</span>
          </div>
          <p style={{ fontSize: 15, color: "#bfdbfe", marginBottom: 28, animation: "fadeUp 0.6s 0.15s ease both" }}>
            Connecting Drivers, Dealers & Financers across India — ₹0 enquiry charge
          </p>
          {/* Stats bar */}
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px,5vw,56px)", flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s ease both" }}>
            {[
              { n: `${stats.dealer_count || "500"}+`, l: "Verified Dealers" },
              { n: `${stats.vehicle_count || "2000"}+`, l: "Vehicles Listed" },
              { n: `${stats.city_count || "50"}+`, l: "Cities" },
              { n: "₹0", l: "Enquiry Fee" },
            ].map(({ n, l }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(20px,3.5vw,32px)", fontWeight: 800, fontFamily: "'Poppins',sans-serif" }}>{n}</div>
                <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role Cards ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px", flex: 1 }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>
          आप कौन हैं? <span style={{ fontSize: "60%", color: "#6b7280", fontFamily: "Inter, sans-serif" }}>/ Who are you?</span>
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 40, fontSize: 14 }}>
          अपना role चुनें और dedicated ecosystem access करें
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {roles.map(({ icon, title, titleHindi, desc, descHindi, cta, ctaHindi, path, color, bgLight, badge, badgeColor, features }) => (
            <div
              key={title}
              className="role-card"
              style={{ background: "#fff", borderRadius: 20, border: `2px solid #e5e7eb`, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", cursor: "pointer" }}
              onClick={() => navigate(path)}
            >
              {/* Card header */}
              <div style={{ background: bgLight, padding: "28px 28px 20px", borderBottom: `3px solid ${color}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ fontSize: 52 }}>{icon}</div>
                  <span style={{ background: `${badgeColor}18`, color: badgeColor, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                    {badge}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 21, color: "#111827", marginBottom: 4 }}>{title}</div>
                <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontWeight: 700, fontSize: 15, color: color, marginBottom: 12 }}>{titleHindi}</div>
                <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7 }}>{desc}</p>
                <p style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 12, color: "#6b7280", lineHeight: 1.7, marginTop: 4 }}>{descHindi}</p>
              </div>

              {/* Features list */}
              <div style={{ padding: "16px 28px" }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                      <span style={{ color: color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA button */}
              <div style={{ padding: "0 28px 24px" }}>
                <Link
                  to={path}
                  className="cta-btn"
                  onClick={e => e.stopPropagation()}
                  style={{ display: "block", background: color, color: "#fff", textAlign: "center", padding: "13px 0", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none" }}
                >
                  {cta} <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", opacity: 0.85 }}>/ {ctaHindi}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Continue session banner for returning drivers */}
        {lastDriverPage && (
          <div style={{ marginTop: 32, background: "#fff", border: "1px solid #e5e7eb", borderLeft: `4px solid ${G}`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Welcome back! 👋</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Continue where you left off — your browsing session is saved.</div>
            </div>
            <Link to={lastDriverPage} style={{ background: G, color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Continue Browsing →
            </Link>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "#111827", color: "#9ca3af", padding: "24px", textAlign: "center", fontSize: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: "#e5e7eb" }}>eRickshawDekho</span>
          {" "}— भारत का सबसे भरोसेमंद E-Rickshaw Platform
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          <Link to="/marketplace" style={{ color: "#9ca3af", textDecoration: "none" }}>Marketplace</Link>
          <Link to="/dealers" style={{ color: "#9ca3af", textDecoration: "none" }}>Find Dealers</Link>
          <Link to="/financer" style={{ color: "#9ca3af", textDecoration: "none" }}>Financing</Link>
          <Link to="/dashboard" style={{ color: "#9ca3af", textDecoration: "none" }}>Dealer Login</Link>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#6b7280" }}>
          © {new Date().getFullYear()} eRickshawDekho · support@erikshawdekho.com
        </div>
      </footer>
    </div>
  );
}
