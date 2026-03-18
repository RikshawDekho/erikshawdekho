/**
 * DriverLandingPage — Full homepage for Hindi-speaking e-rickshaw drivers/buyers
 * ErikshawDekho green (#16a34a) theme, Bahubali-style professional layout
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { useI18n } from "../i18n";
import { ROLE_C, TYPO, RADIUS, LAYOUT } from "../theme";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");

const G = ROLE_C.driver;   // #16a34a green
const D = ROLE_C.dealer;   // #1e3a8a blue

function fmtINR(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

// ─── AnnouncementBar ─────────────────────────────────────────────────────────
function AnnouncementBar({ text, link, hi }) {
  if (!text) return null;
  return (
    <div style={{
      background: "#1e40af", color: "#fff", padding: "10px 20px",
      textAlign: "center", fontSize: 14, fontWeight: 500,
      fontFamily: hi ? TYPO.hindi : TYPO.body,
    }}>
      📢 {text}
      {link && (
        <a href={link} style={{ color: "#fbbf24", marginLeft: 12, fontWeight: 700, textDecoration: "underline" }}>
          {hi ? "और जानें →" : "Learn More →"}
        </a>
      )}
    </div>
  );
}

// ─── TopContactBar ───────────────────────────────────────────────────────────
function TopContactBar({ phone, whatsapp, email, hi }) {
  if (!phone && !email) return null;
  const digits = (whatsapp || phone || "").replace(/\D/g, "");
  return (
    <div style={{
      background: "#f3f4f6", padding: "8px 20px",
      display: "flex", justifyContent: "flex-end", alignItems: "center",
      gap: 20, fontSize: 13, fontFamily: TYPO.body,
    }}>
      {phone && (
        <a href={`tel:${phone}`} style={{ color: "#1e293b", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          📞 {phone}
        </a>
      )}
      {(whatsapp || phone) && (
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"
          style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>
          💬 WhatsApp
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} style={{ color: "#475569", textDecoration: "none" }}>
          ✉ {email}
        </a>
      )}
    </div>
  );
}

// ─── SimpleEnquiryForm ───────────────────────────────────────────────────────
function SimpleEnquiryForm({ lang }) {
  const hi = lang === "hi";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [interest, setInterest] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%", padding: "13px 14px", fontSize: 16, border: "1.5px solid #d1d5db",
    borderRadius: RADIUS.md, fontFamily: TYPO.body, outline: "none",
    background: "#fff", color: "#1e293b", boxSizing: "border-box",
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) { setErr(hi ? "नाम डालें" : "Enter your name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setErr(hi ? "Valid 10-digit mobile डालें (6-9 से शुरू)" : "Enter valid 10-digit mobile (starts 6–9)"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name, phone, city,
          brand_name: interest,
          notes: interest ? "Interested in: " + interest : "",
        }),
      });
      if (res.ok) { setSent(true); }
      else { setErr(hi ? "कुछ गलत हुआ। फिर कोशिश करें।" : "Something went wrong. Try again."); }
    } catch {
      setErr(hi ? "नेटवर्क एरर। फिर कोशिश करें।" : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ fontSize: 52 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: G, marginTop: 12, fontFamily: TYPO.hindi }}>
          {hi ? "एंक्वायरी भेजी गई!" : "Enquiry Sent!"}
        </div>
        <div style={{ color: "#475569", marginTop: 8, fontSize: 15, fontFamily: TYPO.body }}>
          {hi ? "डीलर जल्द संपर्क करेगा" : "Dealer will contact you soon"}
        </div>
        <button onClick={() => { setSent(false); setName(""); setPhone(""); setCity(""); setInterest(""); }}
          style={{
            marginTop: 20, padding: "12px 28px", background: G, color: "#fff",
            border: "none", borderRadius: RADIUS.lg, fontSize: 15, fontWeight: 600,
            cursor: "pointer", fontFamily: TYPO.body,
          }}>
          {hi ? "नई एंक्वायरी" : "New Enquiry"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={`👤 ${hi ? "आपका नाम" : "Your Name"}`}
        required style={inputStyle} />
      <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder={`📞 ${hi ? "मोबाइल नंबर (10 अंक)" : "Mobile Number (10 digits)"}`}
        inputMode="numeric" required style={inputStyle} />
      <input value={city} onChange={e => setCity(e.target.value)}
        placeholder={`📍 ${hi ? "शहर / जिला (वैकल्पिक)" : "City / District (optional)"}`}
        style={inputStyle} />
      <input value={interest} onChange={e => setInterest(e.target.value)}
        placeholder={`🛺 ${hi ? "कौन सा मॉडल/ब्रांड चाहिए? (वैकल्पिक)" : "Which model/brand? (optional)"}`}
        style={inputStyle} />
      {err && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>{err}</div>}
      <button type="submit" disabled={loading}
        style={{
          padding: "16px", background: loading ? "#86efac" : G, color: "#fff",
          border: "none", borderRadius: RADIUS.lg, fontSize: 16, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer", fontFamily: TYPO.hindi,
          minHeight: 52, letterSpacing: 0.3,
        }}>
        {loading ? (hi ? "भेजा जा रहा है..." : "Sending...") : (hi ? "🛺 बेस्ट प्राइस जानें →" : "🛺 Get Best Price →")}
      </button>
      <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
        {hi ? "✅ बिल्कुल मुफ्त • कोई छुपी फीस नहीं" : "✅ Completely Free • No hidden charges"}
      </div>
    </form>
  );
}

// ─── VehicleCard ─────────────────────────────────────────────────────────────
function VehicleCard({ v, lang, onEnquire }) {
  const hi = lang === "hi";
  const fuelColors = { electric: "#16a34a", cng: "#0284c7", petrol: "#d97706", lpg: "#7c3aed", diesel: "#374151" };
  const fc = fuelColors[(v.fuel_type || "").toLowerCase()] || "#475569";

  return (
    <div className="veh-card" style={{
      background: "#fff", borderRadius: RADIUS.xl, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      overflow: "hidden", position: "relative", display: "flex", flexDirection: "column",
    }}>
      {/* Image */}
      <div style={{ height: 160, background: "#f1f5f9", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {v.thumbnail
          ? <img src={v.thumbnail} alt={v.model_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 64 }}>🛺</span>
        }
        {v.is_featured && (
          <div style={{
            position: "absolute", top: 10, right: 10, background: "#f59e0b", color: "#fff",
            padding: "3px 10px", borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 700,
          }}>⭐ {hi ? "फीचर्ड" : "Featured"}</div>
        )}
        {v.gallery_images?.length > 0 && (
          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: RADIUS.pill, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>
            📷 {v.gallery_images.length + 1}
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: TYPO.body, lineHeight: 1.3 }}>
          {v.brand_name} {v.model_name}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
          📍 {[v.city, v.state].filter(Boolean).join(", ")}
          {v.is_verified && <span style={{ color: G, fontWeight: 600, fontSize: 11 }}> ✓ {hi ? "वेरिफाइड" : "Verified"}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {v.fuel_type && (
            <span style={{ background: fc + "18", color: fc, padding: "3px 10px", borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600 }}>
              {v.fuel_type}
            </span>
          )}
          {v.range_km && (
            <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600 }}>
              🔋 {v.range_km} km
            </span>
          )}
        </div>
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{hi ? "शुरू" : "Starting at"}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: G, fontFamily: TYPO.body }}>
            {v.starting_price ? fmtINR(v.starting_price) : (hi ? "कीमत जानें" : "Get Price")}
          </div>
        </div>
        <button onClick={() => onEnquire(v)}
          style={{
            width: "100%", padding: "12px", background: G, color: "#fff",
            border: "none", borderRadius: RADIUS.md, fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: TYPO.hindi, minHeight: 48,
          }}>
          {hi ? "एंक्वायरी करें" : "Enquire"}
        </button>
      </div>
    </div>
  );
}

// ─── VehicleEnquiryModal ──────────────────────────────────────────────────────
function VehicleEnquiryModal({ vehicle, lang, onClose }) {
  const hi = lang === "hi";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  // Build all images: thumbnail first, then gallery
  const allImages = [
    ...(vehicle.thumbnail ? [vehicle.thumbnail] : []),
    ...(vehicle.gallery_images || []).map(g => g.url),
  ];

  const inputStyle = {
    width: "100%", padding: "13px 14px", fontSize: 16, border: "1.5px solid #d1d5db",
    borderRadius: RADIUS.md, fontFamily: TYPO.body, outline: "none", boxSizing: "border-box",
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!/^[6-9]\d{9}$/.test(phone)) { setErr(hi ? "Valid 10-digit mobile डालें" : "Enter valid 10-digit mobile"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name || (hi ? "ग्राहक" : "Customer"),
          phone, city,
          vehicle_id: vehicle.id,
          dealer_id: vehicle.dealer_id,
          brand_name: vehicle.brand_name,
          notes: `Enquiry for ${vehicle.brand_name} ${vehicle.model_name}`,
        }),
      });
      if (res.ok) setSent(true);
      else setErr(hi ? "कुछ गलत हुआ।" : "Something went wrong.");
    } catch {
      setErr(hi ? "नेटवर्क एरर।" : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "flex-end", justifyContent: "center",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480,
        padding: "24px 20px 32px", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", fontFamily: TYPO.body }}>
              {vehicle.brand_name} {vehicle.model_name}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              {vehicle.city && `📍 ${vehicle.city}`}
              {vehicle.starting_price && ` • ${fmtINR(vehicle.starting_price)}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", padding: 4 }}>✕</button>
        </div>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div style={{ marginBottom: 16, borderRadius: RADIUS.lg, overflow: "hidden", position: "relative" }}>
            <img src={allImages[imgIdx]} alt={vehicle.model_name}
              style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
            {allImages.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)}
                  style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                <button onClick={() => setImgIdx(i => (i + 1) % allImages.length)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
                  {allImages.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      style={{ width: i === imgIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "width 0.2s", padding: 0 }} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: G, marginTop: 10, fontFamily: TYPO.hindi }}>
              {hi ? "एंक्वायरी भेजी गई!" : "Enquiry Sent!"}
            </div>
            <div style={{ color: "#475569", marginTop: 6 }}>{hi ? "डीलर जल्द संपर्क करेगा।" : "Dealer will contact you soon."}</div>
            <button onClick={onClose} style={{
              marginTop: 18, padding: "12px 32px", background: G, color: "#fff",
              border: "none", borderRadius: RADIUS.lg, fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}>OK</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={`👤 ${hi ? "आपका नाम (वैकल्पिक)" : "Your Name (optional)"}`} style={inputStyle} />
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder={`📞 ${hi ? "मोबाइल नंबर*" : "Mobile Number*"}`}
              inputMode="numeric" required style={inputStyle} />
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder={`📍 ${hi ? "शहर (वैकल्पिक)" : "City (optional)"}`} style={inputStyle} />
            {err && <div style={{ color: "#ef4444", fontSize: 13 }}>{err}</div>}
            <button type="submit" disabled={loading} style={{
              padding: "15px", background: loading ? "#86efac" : G, color: "#fff", border: "none",
              borderRadius: RADIUS.lg, fontSize: 16, fontWeight: 700, cursor: "pointer",
              fontFamily: TYPO.hindi, minHeight: 52,
            }}>
              {loading ? "..." : (hi ? "🛺 एंक्वायरी भेजें →" : "🛺 Send Enquiry →")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: RADIUS.xl, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="skeleton-pulse" style={{ height: 160, background: "#e5e7eb" }} />
      <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton-pulse" style={{ height: 16, borderRadius: 8, background: "#e5e7eb", width: "70%" }} />
        <div className="skeleton-pulse" style={{ height: 12, borderRadius: 8, background: "#e5e7eb", width: "50%" }} />
        <div className="skeleton-pulse" style={{ height: 12, borderRadius: 8, background: "#e5e7eb", width: "40%" }} />
        <div className="skeleton-pulse" style={{ height: 44, borderRadius: 10, background: "#e5e7eb", marginTop: 8 }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DriverLandingPage() {
  const { lang } = useI18n();
  const hi = lang === "hi";

  const [content, setContent] = useState({});
  const [stats, setStats] = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [loadingVeh, setLoadingVeh] = useState(true);
  const [enquireVehicle, setEnquireVehicle] = useState(null);
  const [cityFilter, setCityFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("erd_last_page", "/");
    fetch(`${API}/public/homepage/`).then(r => r.ok ? r.json() : null).then(d => d && setContent(d)).catch(() => {});
    fetch(`${API}/stats/`).then(r => r.ok ? r.json() : null).then(d => d && setStats(d)).catch(() => {});
    fetch(`${API}/marketplace/`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setVehicles(Array.isArray(d) ? d : (d.results || []));
      setLoadingVeh(false);
    }).catch(() => setLoadingVeh(false));
  }, []);

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    const cityMatch = !cityFilter || (v.city || "").toLowerCase().includes(cityFilter.toLowerCase()) || (v.state || "").toLowerCase().includes(cityFilter.toLowerCase());
    const fuelMatch = !fuelFilter || (v.fuel_type || "").toLowerCase() === fuelFilter.toLowerCase();
    return cityMatch && fuelMatch;
  });
  const PAGE_SIZE = 12;
  const displayedVehicles = showAll ? filteredVehicles : filteredVehicles.slice(0, PAGE_SIZE);
  const remaining = filteredVehicles.length - PAGE_SIZE;

  const statPills = [
    { label: hi ? "डीलर्स" : "Dealers", value: (stats.dealer_count || "50") + "+", icon: "🏪" },
    { label: hi ? "गाड़ियाँ" : "Vehicles", value: (stats.vehicle_count || "200") + "+", icon: "🛺" },
    { label: hi ? "शहर" : "Cities", value: (stats.city_count || "30") + "+", icon: "📍" },
    { label: "₹0 Fee", value: hi ? "बिल्कुल मुफ्त" : "Free", icon: "✅" },
  ];

  const quickActions = [
    { icon: "🔍", label: hi ? "ब्राउज़ करें" : "Browse", to: "/driver/marketplace" },
    { icon: "📍", label: hi ? "डीलर खोजें" : "Dealers", to: "/driver/dealers" },
    { icon: "💰", label: hi ? "EMI कैलकुलेटर" : "EMI Calc", to: "/driver/marketplace?tab=emi" },
    { icon: "🎓", label: hi ? "सीखें" : "Learn", to: "/driver/learn" },
    { icon: "⚖", label: hi ? "Compare" : "Compare", to: "/driver/marketplace?compare=1" },
  ];

  const fuelShortcuts = [
    { label: hi ? "⚡ इलेक्ट्रिक" : "⚡ Electric", fuel: "electric", bg: "#dcfce7", color: "#16a34a" },
    { label: hi ? "🔵 CNG" : "🔵 CNG", fuel: "cng", bg: "#dbeafe", color: "#1d4ed8" },
    { label: hi ? "🔴 पेट्रोल" : "🔴 Petrol", fuel: "petrol", bg: "#fef3c7", color: "#d97706" },
    { label: hi ? "🟣 LPG" : "🟣 LPG", fuel: "lpg", bg: "#ede9fe", color: "#7c3aed" },
  ];

  const heroTitle = hi
    ? (content.hero_title_hi || "भारत का सबसे भरोसेमंद\nई-रिक्शा प्लेटफॉर्म")
    : (content.hero_title_en || "India's Most Trusted\nE-Rickshaw Platform");
  const heroSubtitle = hi
    ? (content.hero_subtitle_hi || "ई-रिक्शा खरीदें, compare करें, verified dealers से best price पाएँ — बिल्कुल मुफ्त")
    : (content.hero_subtitle_en || "Find, compare and get best price on e-rickshaws from verified dealers — completely free");

  return (
    <div style={{ fontFamily: TYPO.body, minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .skeleton-pulse { animation: pulse 1.4s ease-in-out infinite; }
        .veh-card { transition: transform 0.22s ease, box-shadow 0.22s ease; cursor: default; }
        .veh-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(0,0,0,0.13) !important; }
        .quick-tile:hover { background: #f0fdf4 !important; }
        .fuel-pill:hover { transform: scale(1.05); }
        .fuel-pill { transition: transform 0.15s ease; }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-form-col { order: 2; }
          .hero-text-col { order: 1; }
          .step-grid { grid-template-columns: 1fr !important; }
          .cta-two-col { grid-template-columns: 1fr !important; }
          .mobile-bottom-pad { display: block !important; }
        }
      `}</style>

      {/* 1. Announcement Bar */}
      <AnnouncementBar text={content.announcement_text} link={content.announcement_link} hi={hi} />

      {/* 2. Top Contact Bar */}
      <TopContactBar phone={content.support_phone} whatsapp={content.support_whatsapp} email={content.support_email} hi={hi} />

      {/* 3. Navbar */}
      <Navbar />

      {/* 4. Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%)",
        padding: "56px 20px 48px", color: "#fff",
      }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 40, alignItems: "center" }}>

            {/* Left: Text */}
            <div className="hero-text-col" style={{ animation: "fadeUp 0.6s ease both" }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", padding: "5px 14px", borderRadius: RADIUS.pill, fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: 0.4 }}>
                🛺 ErikshawDekho
              </div>
              <h1 style={{
                fontFamily: TYPO.hindi, fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800,
                lineHeight: 1.25, marginBottom: 16, whiteSpace: "pre-line",
                textShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}>
                {heroTitle}
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: "#bbf7d0", marginBottom: 28, fontFamily: hi ? TYPO.hindi : TYPO.body }}>
                {heroSubtitle}
              </p>

              {/* Stats Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
                {statPills.map(s => (
                  <div key={s.label} style={{
                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: RADIUS.lg, padding: "10px 18px", textAlign: "center", minWidth: 90,
                  }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#bbf7d0", marginTop: 1, fontFamily: hi ? TYPO.hindi : TYPO.body }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Link to="/driver/marketplace" style={{
                  background: "#fff", color: G, padding: "14px 28px", borderRadius: RADIUS.lg,
                  fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-flex",
                  alignItems: "center", gap: 6, minHeight: 50, fontFamily: hi ? TYPO.hindi : TYPO.body,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                }}>
                  🔍 {hi ? "सभी गाड़ी देखें" : "Browse All Vehicles"}
                </Link>
                <Link to="/driver/dealers" style={{
                  background: "transparent", color: "#fff", padding: "14px 28px", borderRadius: RADIUS.lg,
                  fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-flex",
                  alignItems: "center", gap: 6, border: "2px solid rgba(255,255,255,0.6)", minHeight: 50,
                  fontFamily: hi ? TYPO.hindi : TYPO.body,
                }}>
                  📍 {hi ? "डीलर खोजें" : "Find Dealers"}
                </Link>
              </div>
            </div>

            {/* Right: Enquiry Form Card */}
            <div className="hero-form-col" style={{ animation: "fadeUp 0.7s ease 0.1s both" }}>
              <div style={{
                background: "#fff", borderRadius: RADIUS.xl + 4, padding: "28px 24px",
                boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
              }}>
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", fontFamily: TYPO.hindi }}>
                    {hi ? "🛺 बेस्ट प्राइस पाएँ" : "🛺 Get Best Price"}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    {hi ? "2 मिनट में — बिल्कुल मुफ्त" : "In 2 minutes — completely free"}
                  </div>
                </div>
                <SimpleEnquiryForm lang={lang} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Quick Actions Bar */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", display: "flex", justifyContent: "center" }}>
          {quickActions.map(a => (
            <Link key={a.to} to={a.to} className="quick-tile" style={{
              flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 5, padding: "18px 8px", textDecoration: "none",
              color: "#374151", borderRight: "1px solid #f1f5f9", cursor: "pointer",
              transition: "background 0.15s", minHeight: 72,
            }}>
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: hi ? TYPO.hindi : TYPO.body, textAlign: "center" }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Available Vehicles */}
      <section style={{ padding: "48px 20px", background: "#f8fafc" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          {/* Heading */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: TYPO.hindi, fontSize: 26, fontWeight: 800, color: "#1e293b" }}>
                {hi ? "उपलब्ध ई-रिक्शा" : "Available E-Rickshaws"}
              </h2>
              {!loadingVeh && (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  {filteredVehicles.length} {hi ? "गाड़ी मिली" : "vehicles found"}
                </div>
              )}
            </div>
            <Link to="/driver/marketplace" style={{ color: G, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
              {hi ? "सभी देखें →" : "View All →"}
            </Link>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <input value={cityFilter} onChange={e => { setCityFilter(e.target.value); setShowAll(false); }}
              placeholder={`📍 ${hi ? "शहर / राज्य से खोजें..." : "Search by city / state..."}`}
              style={{
                flex: "1 1 180px", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e2e8f0",
                borderRadius: RADIUS.md, fontFamily: TYPO.body, outline: "none", background: "#fff",
              }} />
            <select value={fuelFilter} onChange={e => { setFuelFilter(e.target.value); setShowAll(false); }}
              style={{
                flex: "0 0 auto", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e2e8f0",
                borderRadius: RADIUS.md, fontFamily: hi ? TYPO.hindi : TYPO.body, outline: "none",
                background: "#fff", cursor: "pointer", minWidth: 150,
              }}>
              <option value="">{hi ? "सभी ईंधन प्रकार" : "All Fuel Types"}</option>
              <option value="electric">{hi ? "इलेक्ट्रिक" : "Electric"}</option>
              <option value="cng">CNG</option>
              <option value="petrol">{hi ? "पेट्रोल" : "Petrol"}</option>
              <option value="lpg">LPG</option>
            </select>
          </div>

          {/* Vehicle Grid */}
          {loadingVeh ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
              {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: TYPO.hindi, color: "#475569" }}>
                {hi ? "कोई गाड़ी नहीं मिली" : "No vehicles found"}
              </div>
              <div style={{ marginTop: 6, fontSize: 14 }}>{hi ? "अलग filter आज़माएँ" : "Try changing your filters"}</div>
              <button onClick={() => { setCityFilter(""); setFuelFilter(""); }}
                style={{
                  marginTop: 16, padding: "10px 24px", background: G, color: "#fff",
                  border: "none", borderRadius: RADIUS.lg, cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}>
                {hi ? "फिल्टर हटाएँ" : "Clear Filters"}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
                {displayedVehicles.map(v => (
                  <VehicleCard key={v.id} v={v} lang={lang} onEnquire={setEnquireVehicle} />
                ))}
              </div>
              {!showAll && remaining > 0 && (
                <div style={{ textAlign: "center", marginTop: 32 }}>
                  <button onClick={() => setShowAll(true)}
                    style={{
                      padding: "14px 36px", background: "#fff", color: G, border: `2px solid ${G}`,
                      borderRadius: RADIUS.lg, fontSize: 15, fontWeight: 700, cursor: "pointer",
                      fontFamily: hi ? TYPO.hindi : TYPO.body, minHeight: 50,
                    }}>
                    {hi ? `+${remaining} और देखें` : `Show ${remaining} More`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 7. How It Works */}
      <section style={{ background: "#fff", padding: "56px 20px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: TYPO.hindi, fontSize: 28, fontWeight: 800, color: "#1e293b" }}>
              {hi ? "यह कैसे काम करता है?" : "How It Works"}
            </h2>
            <p style={{ color: "#64748b", marginTop: 8, fontSize: 15 }}>
              {hi ? "3 आसान steps में best E-Rickshaw पाएँ" : "Get your best E-Rickshaw in 3 simple steps"}
            </p>
          </div>
          <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { n: 1, icon: "📱", title: hi ? "नंबर डालें" : "Enter Number", desc: hi ? "अपना नाम और मोबाइल नंबर भरें — बिल्कुल मुफ्त, कोई login नहीं" : "Enter your name and mobile number — free, no login needed" },
              { n: 2, icon: "📞", title: hi ? "डीलर कॉल करेगा" : "Dealer Calls You", desc: hi ? "Verified dealer 24 घंटों में आपसे संपर्क करेगा" : "Verified dealer contacts you within 24 hours" },
              { n: 3, icon: "🛺", title: hi ? "रिक्शा खरीदें" : "Buy Rickshaw", desc: hi ? "Best price negotiate करें, test drive लें और अपना ई-रिक्शा लेकर जाएँ" : "Negotiate best price, take a test drive and drive away" },
            ].map(step => (
              <div key={step.n} style={{
                background: "#f8fafc", borderRadius: RADIUS.xl, padding: "28px 20px",
                textAlign: "center", border: "1px solid #e2e8f0",
              }}>
                <div style={{
                  width: 48, height: 48, background: G, color: "#fff", borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, marginBottom: 14,
                }}>{step.n}</div>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{step.icon}</div>
                <div style={{ fontFamily: TYPO.hindi, fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, fontFamily: hi ? TYPO.hindi : TYPO.body }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Fuel Type Shortcuts */}
      <section style={{ background: "#f0fdf4", padding: "40px 20px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <h3 style={{ fontFamily: TYPO.hindi, fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 20, textAlign: "center" }}>
            {hi ? "अपना Fuel Type चुनें" : "Choose Your Fuel Type"}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            {fuelShortcuts.map(f => (
              <Link key={f.fuel} to={`/driver/marketplace?fuel=${f.fuel}`} className="fuel-pill"
                style={{
                  background: f.bg, color: f.color, padding: "14px 28px", borderRadius: RADIUS.pill,
                  fontWeight: 700, fontSize: 16, textDecoration: "none", border: `2px solid ${f.color}30`,
                  fontFamily: hi ? TYPO.hindi : TYPO.body, display: "inline-flex", alignItems: "center", minHeight: 50,
                }}>
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Dealer + Financer CTA */}
      <section style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)", padding: "56px 20px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <div className="cta-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Dealer CTA */}
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: RADIUS.xl, padding: "32px 24px", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
              <h3 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                {hi ? "क्या आप E-Rickshaw Dealer हैं?" : "Are you an E-Rickshaw Dealer?"}
              </h3>
              <p style={{ color: "#bfdbfe", fontSize: 14, lineHeight: 1.6, marginBottom: 20, fontFamily: hi ? TYPO.hindi : TYPO.body }}>
                {hi ? "अपनी showroom ErikshawDekho पर list करें। हजारों buyers तक free में पहुँचें।" : "List your showroom on ErikshawDekho. Reach thousands of buyers for free."}
              </p>
              <Link to="/dealer/register" style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: D,
                padding: "14px 24px", borderRadius: RADIUS.lg, fontWeight: 700, fontSize: 15,
                textDecoration: "none", minHeight: 50, fontFamily: hi ? TYPO.hindi : TYPO.body,
              }}>
                {hi ? "शोरूम रजिस्टर करें →" : "Register Showroom →"}
              </Link>
            </div>
            {/* Financer CTA */}
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: RADIUS.xl, padding: "32px 24px", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
              <h3 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                {hi ? "फाइनेंस / NBFC पार्टनर?" : "Finance / NBFC Partner?"}
              </h3>
              <p style={{ color: "#bfdbfe", fontSize: 14, lineHeight: 1.6, marginBottom: 20, fontFamily: hi ? TYPO.hindi : TYPO.body }}>
                {hi ? "E-Rickshaw loans offer करें, dealers onboard करें और finance applications manage करें।" : "Offer e-rickshaw loans, onboard dealers, and manage finance applications."}
              </p>
              <Link to="/financer" style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)",
                color: "#fff", padding: "14px 24px", borderRadius: RADIUS.lg, fontWeight: 700, fontSize: 15,
                textDecoration: "none", border: "2px solid rgba(255,255,255,0.4)", minHeight: 50,
                fontFamily: hi ? TYPO.hindi : TYPO.body,
              }}>
                {hi ? "फाइनेंसर पोर्टल →" : "Financer Portal →"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <FooterNew />

      {/* 11. Vehicle Enquiry Modal */}
      {enquireVehicle && (
        <VehicleEnquiryModal vehicle={enquireVehicle} lang={lang} onClose={() => setEnquireVehicle(null)} />
      )}

      {/* 12. Mobile bottom padding spacer */}
      <div className="mobile-bottom-pad" style={{ height: 68, display: "none" }} />
    </div>
  );
}
