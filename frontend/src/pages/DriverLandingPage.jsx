/**
 * DriverLandingPage — ErikshawDekho homepage
 * Green-first interactive theme, mobile-first, Hindi-friendly
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { useI18n } from "../i18n";
import { ROLE_C, TYPO, RADIUS, LAYOUT } from "../theme";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo"
  ? "https://demo-api.erikshawdekho.com/api"
  : import.meta.env.MODE === "development"
    ? "http://localhost:8000/api"
    : "https://api.erikshawdekho.com/api");

const G  = ROLE_C.driver;   // #16a34a
const D  = ROLE_C.dealer;   // #1e3a8a
const G2 = "#15803d";       // darker green
const G3 = "#dcfce7";       // light green bg

function fmtINR(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

// ─── AnnouncementBar ─────────────────────────────────────────────────────────
function AnnouncementBar({ text, link }) {
  const [visible, setVisible] = useState(true);
  if (!text || !visible) return null;
  return (
    <div style={{
      background: "linear-gradient(90deg,#1e40af,#1d4ed8)",
      color: "#fff", padding: "9px 20px",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 10, fontSize: 13, fontWeight: 500,
      fontFamily: TYPO.body, position: "relative",
    }}>
      <span style={{ background: "#fbbf24", color: "#1e1e1e", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>NEW</span>
      {text}
      {link && (
        <a href={link} style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>
          {hi ? "और जानें →" : "Learn More →"}
        </a>
      )}
      <button onClick={() => setVisible(false)} style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", color: "#93c5fd", cursor: "pointer", fontSize: 16, lineHeight: 1,
      }}>✕</button>
    </div>
  );
}

// ─── TopContactBar ───────────────────────────────────────────────────────────
function TopContactBar({ phone, whatsapp, email }) {
  if (!phone && !email) return null;
  const digits = (whatsapp || phone || "").replace(/\D/g, "");
  return (
    <>
      <style>{`
        .tcb-root { background:#f0fdf4; border-bottom:1px solid ${G3}; padding:7px 20px; display:flex; justify-content:flex-end; align-items:center; gap:20px; font-size:12px; font-family:${TYPO.body}; flex-wrap:nowrap; overflow:hidden; }
        .tcb-phone { color:#374151; text-decoration:none; display:flex; align-items:center; gap:4px; font-weight:500; white-space:nowrap; }
        .tcb-wa    { color:${G}; text-decoration:none; font-weight:700; display:flex; align-items:center; gap:4px; white-space:nowrap; }
        .tcb-email { color:#64748b; text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
        @media (max-width: 640px) { .tcb-phone { display:none !important; } .tcb-email { display:none !important; } }
        @media (max-width: 400px) { .tcb-root  { display:none !important; } }
      `}</style>
      <div className="tcb-root">
        {phone && (
          <a href={`tel:${phone}`} className="tcb-phone">📞 {phone}</a>
        )}
        {(whatsapp || phone) && (
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="tcb-wa">
            <span style={{ background: G, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>💬</span>
            WhatsApp
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="tcb-email">✉ {email}</a>
        )}
      </div>
    </>
  );
}

// ─── SimpleEnquiryForm ───────────────────────────────────────────────────────
function SimpleEnquiryForm({ lang }) {
  const hi = lang === "hi";
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [city, setCity]         = useState("");
  const [interest, setInterest] = useState("");
  const [sent, setSent]         = useState(false);
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);

  const inputStyle = {
    width: "100%", padding: "13px 14px", fontSize: 15,
    border: "1.5px solid #e2e8f0", borderRadius: RADIUS.md,
    fontFamily: hi ? TYPO.hindi : TYPO.body, outline: "none",
    background: "#f8fafc", color: "#1e293b", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim())                      { setErr(hi ? "नाम डालें" : "Enter your name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone))       { setErr(hi ? "सही 10-digit नंबर डालें" : "Enter valid 10-digit mobile"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: name, phone, city, brand_name: interest, notes: interest ? "Interested in: " + interest : "" }),
      });
      if (res.ok) setSent(true);
      else setErr(hi ? "कुछ गलत हुआ। फिर कोशिश करें।" : "Something went wrong. Try again.");
    } catch {
      setErr(hi ? "नेटवर्क एरर।" : "Network error. Please try again.");
    } finally { setLoading(false); }
  }

  if (sent) return (
    <div style={{ textAlign: "center", padding: "28px 16px" }}>
      <div style={{ width: 64, height: 64, background: "#dcfce7", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: G, fontFamily: TYPO.hindi }}>{hi ? "एंक्वायरी भेजी गई!" : "Enquiry Sent!"}</div>
      <div style={{ color: "#475569", marginTop: 8, fontSize: 14 }}>{hi ? "डीलर जल्द संपर्क करेगा" : "Dealer will contact you soon"}</div>
      <button onClick={() => { setSent(false); setName(""); setPhone(""); setCity(""); setInterest(""); }}
        style={{ marginTop: 16, padding: "11px 28px", background: G, color: "#fff", border: "none", borderRadius: RADIUS.lg, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        {hi ? "नई एंक्वायरी" : "New Enquiry"}
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder={`👤 ${hi ? "आपका नाम *" : "Your Name *"}`} required style={inputStyle}
        onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
      <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder={`📞 ${hi ? "मोबाइल नंबर *" : "Mobile Number *"}`}
        inputMode="numeric" required style={inputStyle}
        onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
      <input value={city} onChange={e => setCity(e.target.value)}
        placeholder={`📍 ${hi ? "शहर / जिला" : "City / District"}`} style={inputStyle}
        onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
      <input value={interest} onChange={e => setInterest(e.target.value)}
        placeholder={`🛺 ${hi ? "कौन सा मॉडल चाहिए?" : "Which model / brand?"}`} style={inputStyle}
        onFocus={e => e.target.style.borderColor = G} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
      {err && <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 500, padding: "6px 10px", background: "#fef2f2", borderRadius: 6 }}>⚠ {err}</div>}
      <button type="submit" disabled={loading} style={{
        padding: "15px", background: loading ? "#86efac" : `linear-gradient(135deg, ${G}, ${G2})`,
        color: "#fff", border: "none", borderRadius: RADIUS.lg, fontSize: 16, fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer", fontFamily: TYPO.hindi,
        minHeight: 52, boxShadow: loading ? "none" : "0 4px 14px rgba(22,163,74,0.35)",
        transition: "all 0.2s",
      }}>
        {loading ? "⏳ " + (hi ? "भेजा जा रहा है..." : "Sending...") : "🛺 " + (hi ? "बेस्ट प्राइस जानें →" : "Get Best Price →")}
      </button>
      <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>
        ✅ {hi ? "बिल्कुल मुफ्त • कोई छुपी फीस नहीं" : "Completely Free • No hidden charges"}
      </div>
    </form>
  );
}

// ─── VehicleCard ─────────────────────────────────────────────────────────────
function VehicleCard({ v, lang, onEnquire }) {
  const hi = lang === "hi";
  const [hovered, setHovered] = useState(false);
  const fuelColors = { electric: "#16a34a", cng: "#0284c7", petrol: "#d97706", lpg: "#7c3aed", diesel: "#374151" };
  const fc = fuelColors[(v.fuel_type || "").toLowerCase()] || "#475569";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff", borderRadius: RADIUS.xl, overflow: "hidden", position: "relative",
        display: "flex", flexDirection: "column", cursor: "default",
        boxShadow: hovered ? "0 16px 40px rgba(22,163,74,0.18)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hovered ? "translateY(-6px)" : "none",
        transition: "all 0.25s ease",
        border: hovered ? `1.5px solid ${G}40` : "1.5px solid #f1f5f9",
      }}
    >
      {/* Green top accent on hover */}
      <div style={{ height: 3, background: hovered ? `linear-gradient(90deg,${G},${G2})` : "transparent", transition: "all 0.25s" }} />
      {/* Image */}
      <div style={{ height: 165, background: "#f1f5f9", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 56, filter: "grayscale(0.2)" }}>🛺</span>
        {v.thumbnail && <img src={v.thumbnail} alt={v.model_name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: hovered ? "scale(1.04)" : "scale(1)" }} onError={e => { e.target.style.display = "none"; }} />}
        {v.is_featured && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", padding: "3px 10px", borderRadius: RADIUS.pill, fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>
            ⭐ {hi ? "फीचर्ड" : "Featured"}
          </div>
        )}
        {v.gallery_images?.length > 0 && (
          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: RADIUS.pill, padding: "2px 8px", fontSize: 10, fontWeight: 600, backdropFilter: "blur(4px)" }}>
            📷 {v.gallery_images.length + 1}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
          {v.brand_name} {v.model_name}
        </div>
        {(v.city || v.state) && (
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
            📍 {[v.city, v.state].filter(Boolean).join(", ")}
            {v.is_verified && <span style={{ color: G, fontWeight: 700, fontSize: 10, background: "#dcfce7", padding: "1px 6px", borderRadius: 4 }}>✓ {hi ? "वेरिफाइड" : "Verified"}</span>}
          </div>
        )}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {v.fuel_type && <span style={{ background: fc + "15", color: fc, padding: "3px 9px", borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600 }}>{v.fuel_type}</span>}
          {v.range_km && <span style={{ background: "#f0fdf4", color: G, padding: "3px 9px", borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600 }}>🔋 {v.range_km} km</span>}
          {v.seating_capacity && <span style={{ background: "#f8fafc", color: "#475569", padding: "3px 9px", borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600 }}>💺 {v.seating_capacity}</span>}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 6 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{hi ? "शुरुआती कीमत" : "Starting at"}</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: G }}>
            {v.starting_price ? fmtINR(v.starting_price) : (hi ? "कीमत जानें" : "Get Price")}
          </div>
        </div>
        <button onClick={() => onEnquire(v)} style={{
          width: "100%", padding: "11px", color: "#fff", border: "none",
          borderRadius: RADIUS.md, fontSize: 14, fontWeight: 700,
          cursor: "pointer", fontFamily: TYPO.hindi, minHeight: 46,
          background: hovered ? `linear-gradient(135deg,${G},${G2})` : G,
          boxShadow: hovered ? "0 4px 14px rgba(22,163,74,0.35)" : "none",
          transition: "all 0.2s",
        }}>
          {hi ? "एंक्वायरी करें" : "Enquire Now"}
        </button>
      </div>
    </div>
  );
}

// ─── VehicleEnquiryModal ──────────────────────────────────────────────────────
function VehicleEnquiryModal({ vehicle, lang, onClose }) {
  const hi = lang === "hi";
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [city, setCity]     = useState("");
  const [sent, setSent]     = useState(false);
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const allImages = [
    ...(vehicle.thumbnail ? [vehicle.thumbnail] : []),
    ...(vehicle.gallery_images || []).map(g => g.url),
  ];

  const inputStyle = {
    width: "100%", padding: "12px 14px", fontSize: 15, border: "1.5px solid #e2e8f0",
    borderRadius: RADIUS.md, fontFamily: hi ? TYPO.hindi : TYPO.body,
    outline: "none", boxSizing: "border-box", background: "#f8fafc",
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim())                { setErr(hi ? "नाम डालें" : "Enter your name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setErr(hi ? "सही 10-digit नंबर डालें" : "Enter valid 10-digit mobile"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name, phone, city,
          brand_name: `${vehicle.brand_name} ${vehicle.model_name}`,
          notes: `Vehicle enquiry: ${vehicle.brand_name} ${vehicle.model_name} (ID ${vehicle.id})`,
          vehicle: vehicle.id,
        }),
      });
      if (res.ok) setSent(true);
      else setErr(hi ? "कुछ गलत हुआ।" : "Something went wrong.");
    } catch { setErr(hi ? "नेटवर्क एरर।" : "Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9000, padding: 16, backdropFilter: "blur(3px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: RADIUS.xl, width: "100%", maxWidth: 480,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${G},${G2})`, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0` }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{vehicle.brand_name} {vehicle.model_name}</div>
            <div style={{ fontSize: 12, color: "#bbf7d0", marginTop: 2 }}>
              {vehicle.starting_price ? fmtINR(vehicle.starting_price) : (hi ? "कीमत जानें" : "Get Price")}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Images */}
        {allImages.length > 0 && (
          <div style={{ position: "relative", height: 200, background: "#f1f5f9", overflow: "hidden" }}>
            <img src={allImages[imgIdx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {allImages.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)}
                  style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                <button onClick={() => setImgIdx(i => (i + 1) % allImages.length)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
                  {allImages.map((_, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer" }} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ padding: "20px 20px 24px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 44 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: G, marginTop: 10, fontFamily: TYPO.hindi }}>{hi ? "एंक्वायरी भेजी गई!" : "Enquiry Sent!"}</div>
              <div style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>{hi ? "डीलर जल्द संपर्क करेगा" : "Dealer will contact you soon"}</div>
              <button onClick={onClose} style={{ marginTop: 16, padding: "10px 28px", background: G, color: "#fff", border: "none", borderRadius: RADIUS.lg, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                {hi ? "बंद करें" : "Close"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 4, fontFamily: TYPO.hindi }}>
                {hi ? "अपनी जानकारी भरें" : "Fill your details"}
              </div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={`👤 ${hi ? "आपका नाम *" : "Your Name *"}`} required style={inputStyle} />
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={`📞 ${hi ? "मोबाइल नंबर *" : "Mobile Number *"}`} inputMode="numeric" required style={inputStyle} />
              <input value={city} onChange={e => setCity(e.target.value)} placeholder={`📍 ${hi ? "शहर" : "City"}`} style={inputStyle} />
              {err && <div style={{ color: "#ef4444", fontSize: 12, background: "#fef2f2", padding: "6px 10px", borderRadius: 6 }}>⚠ {err}</div>}
              <button type="submit" disabled={loading} style={{
                padding: "13px", background: `linear-gradient(135deg,${G},${G2})`, color: "#fff",
                border: "none", borderRadius: RADIUS.lg, fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", minHeight: 48,
                boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
              }}>
                {loading ? "⏳ " + (hi ? "भेजा जा रहा है..." : "Sending...") : "🛺 " + (hi ? "एंक्वायरी भेजें →" : "Send Enquiry →")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HorizontalScrollRow ─────────────────────────────────────────────────────
// Apple HIG + Material Design 3 standard for card rows:
//   • User-controlled touch scroll (never auto-scrolls product cards)
//   • scroll-snap-type: x mandatory → each swipe snaps to next card
//   • Left edge always clean at 16px; right peek of ~25% signals "more"
//   • Scrollbar hidden on all browsers
function HorizontalScrollRow({ children }) {
  return (
    <>
      <style>{`.erd-hscroll::-webkit-scrollbar{display:none}`}</style>
      <div className="erd-hscroll" style={{
        overflowX: "scroll",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        gap: 12,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 8,
        scrollbarWidth: "none",
      }}>
        {children}
      </div>
    </>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: RADIUS.xl, overflow: "hidden", border: "1px solid #f1f5f9" }}>
      <div style={{ height: 165, background: "#f1f5f9" }} className="skeleton-pulse" />
      <div style={{ padding: 14 }}>
        <div style={{ height: 14, background: "#e5e7eb", borderRadius: 6, marginBottom: 8, width: "70%" }} className="skeleton-pulse" />
        <div style={{ height: 11, background: "#f1f5f9", borderRadius: 6, marginBottom: 10, width: "50%" }} className="skeleton-pulse" />
        <div style={{ height: 20, background: "#dcfce7", borderRadius: 6, marginBottom: 12, width: "40%" }} className="skeleton-pulse" />
        <div style={{ height: 42, background: "#f1f5f9", borderRadius: 8 }} className="skeleton-pulse" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DriverLandingPage() {
  const { lang } = useI18n();
  const hi = lang === "hi";

  const [content, setContent]           = useState({});
  const [stats, setStats]               = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });
  const [vehicles, setVehicles]         = useState([]);
  const [featured, setFeatured]         = useState([]);
  const [, setLoadingVeh]               = useState(true);
  const [enquireVehicle, setEnquireVehicle] = useState(null);
  const [dealers, setDealers]           = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("erd_last_page", "/");
    fetch(`${API}/public/homepage/`).then(r => r.ok ? r.json() : null).then(d => d && setContent(d)).catch(() => {});
    fetch(`${API}/stats/`).then(r => r.ok ? r.json() : null).then(d => d && setStats(d)).catch(() => {});
    fetch(`${API}/marketplace/`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setVehicles(Array.isArray(d) ? d : (d.results || []));
      setLoadingVeh(false);
    }).catch(() => setLoadingVeh(false));
    fetch(`${API}/marketplace/?featured=true`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setFeatured((Array.isArray(d) ? d : (d.results || [])).slice(0, 8));
    }).catch(() => {});
    fetch(`${API}/public/dealers/`).then(r => r.ok ? r.json() : null).then(d => d && setDealers(d.results || [])).catch(() => {});
  }, []);


  const heroTitle = hi
    ? (content.hero_title_hi || "भारत का सबसे भरोसेमंद\nई-रिक्शा प्लेटफॉर्म")
    : (content.hero_title_en || "India's Most Trusted\nE-Rickshaw Platform");
  const heroSubtitle = hi
    ? (content.hero_subtitle_hi || "ई-रिक्शा खरीदें, compare करें, verified dealers से best price पाएँ — बिल्कुल मुफ्त")
    : (content.hero_subtitle_en || "Find, compare and get best price on e-rickshaws from verified dealers — completely free");

  const statPills = [
    { label: hi ? "डीलर्स" : "Dealers",  value: (stats.dealer_count  || "50") + "+",  icon: "🏪" },
    { label: hi ? "गाड़ियाँ" : "Vehicles", value: (stats.vehicle_count || "200") + "+", icon: "🛺" },
    { label: hi ? "शहर" : "Cities",       value: (stats.city_count    || "30") + "+",  icon: "📍" },
    { label: hi ? "मुफ्त" : "Free",        value: "₹0",                                icon: "✅" },
  ];

  const quickActions = [
    { icon: "🔍", label: hi ? "गाड़ी ब्राउज़" : "Browse",      to: "/driver/marketplace", color: "#16a34a", bg: "#dcfce7" },
    { icon: "📍", label: hi ? "डीलर खोजें" : "Dealers",        to: "/driver/dealers",    color: "#1d4ed8", bg: "#dbeafe" },
    { icon: "💰", label: hi ? "EMI Calc" : "EMI Calc",          to: "/driver/marketplace?tab=emi", color: "#d97706", bg: "#fef3c7" },
    { icon: "🎓", label: hi ? "सीखें" : "Learn",               to: "/driver/learn",      color: "#7c3aed", bg: "#ede9fe" },
    { icon: "⚖️", label: hi ? "Compare" : "Compare",            to: "/driver/marketplace?compare=1", color: "#0891b2", bg: "#cffafe" },
    { icon: "🏪", label: hi ? "डीलर बनें" : "Be a Dealer",     to: "/dealer?tab=register", color: "#e11d48", bg: "#ffe4e6" },
  ];

  const fuelShortcuts = [
    { label: hi ? "⚡ इलेक्ट्रिक" : "⚡ Electric", fuel: "electric", color: "#16a34a", bg: "#dcfce7", dark: "#14532d" },
    { label: hi ? "🔵 CNG" : "🔵 CNG",              fuel: "cng",      color: "#1d4ed8", bg: "#dbeafe", dark: "#1e3a8a" },
    { label: hi ? "🔴 पेट्रोल" : "🔴 Petrol",       fuel: "petrol",   color: "#d97706", bg: "#fef3c7", dark: "#92400e" },
    { label: hi ? "🟣 LPG" : "🟣 LPG",              fuel: "lpg",      color: "#7c3aed", bg: "#ede9fe", dark: "#4c1d95" },
  ];

  return (
    <div className="dlp-root" style={{ fontFamily: TYPO.body, minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer { 0%{ background-position:-400px 0; } 100%{ background-position:400px 0; } }
        .skeleton-pulse { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:400px 100%; animation: shimmer 1.4s infinite; }
        .quick-tile { transition: all 0.22s ease !important; }
        .quick-tile:hover { transform: translateY(-6px) !important; }
        .fuel-pill { transition: all 0.18s ease; }
        .fuel-pill:hover { transform: scale(1.06); box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important; }
        .hero-badge { animation: fadeIn 0.5s ease both; }
        .dlp-root { width: 100%; max-width: 100vw; overflow-x: hidden; }
        .dlp-section { width: 100%; }
        @media (max-width: 768px) {
          .hero-grid       { grid-template-columns: 1fr !important; }
          .hero-form-col   { order: 2; }
          .hero-text-col   { order: 1; }
          .step-grid       { grid-template-columns: 1fr !important; gap: 14px !important; }
          .cta-two-col     { grid-template-columns: 1fr !important; }
          .quick-grid      { grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; }
          .mobile-bottom-pad { display: block !important; }
          .stat-pills      { gap: 8px !important; }
          .stat-pill       { min-width: 70px !important; padding: 8px 10px !important; }
          .hero-cta-row    { gap: 10px !important; }
          .hero-cta-btn    { padding: 12px 18px !important; font-size: 13px !important; }
          .hero-deco       { display: none !important; }
        }
        @media (max-width: 480px) {
          .quick-grid      { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
          .fuel-row        { gap: 8px !important; }
          .fuel-pill       { padding: 11px 16px !important; font-size: 13px !important; }
          .dlp-root section { padding-left: 12px !important; padding-right: 12px !important; }
          .erd-hscroll     { padding-left: 12px !important; padding-right: 12px !important; }
        }
      `}</style>

      {/* 1. Announcement */}
      <AnnouncementBar text={content.announcement_text} link={content.announcement_link} />

      {/* 2. Top Contact */}
      <TopContactBar phone={content.support_phone} whatsapp={content.support_whatsapp} email={content.support_email} />

      {/* 3. Navbar */}
      <Navbar />

      {/* 4. Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(140deg, #052e16 0%, #14532d 35%, #166534 65%, #15803d 100%)",
        padding: "52px 20px 56px", color: "#fff", position: "relative", overflow: "hidden",
      }}>
        {/* subtle decorative circles — hidden on mobile to prevent overflow */}
        <div className="hero-deco" style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div className="hero-deco" style={{ position: "absolute", bottom: -80, left: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", position: "relative" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 44, alignItems: "center" }}>

            {/* Left: Text */}
            <div className="hero-text-col" style={{ animation: "fadeUp 0.55s ease both" }}>
              <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: RADIUS.pill, fontSize: 12, fontWeight: 600, marginBottom: 18, backdropFilter: "blur(4px)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80" }} />
                🛺 ErikshawDekho — {hi ? "भारत का #1 प्लेटफॉर्म" : "India's #1 Platform"}
              </div>
              <h1 style={{
                fontFamily: TYPO.hindi, fontSize: "clamp(24px, 4.5vw, 42px)", fontWeight: 800,
                lineHeight: 1.22, marginBottom: 16, whiteSpace: "pre-line",
                textShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}>
                {heroTitle}
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: "#bbf7d0", marginBottom: 28, fontFamily: hi ? TYPO.hindi : TYPO.body, maxWidth: 480 }}>
                {heroSubtitle}
              </p>

              {/* Stat Pills */}
              <div className="stat-pills" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
                {statPills.map(s => (
                  <div key={s.label} className="stat-pill" style={{
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: RADIUS.lg, padding: "10px 16px", textAlign: "center", minWidth: 86,
                    backdropFilter: "blur(4px)",
                  }}>
                    <div style={{ fontSize: 18 }}>{s.icon}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#bbf7d0", marginTop: 1, fontFamily: hi ? TYPO.hindi : TYPO.body, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="hero-cta-row" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Link to="/driver/marketplace" className="hero-cta-btn" style={{
                  background: "#fff", color: G, padding: "14px 26px", borderRadius: RADIUS.lg,
                  fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-flex",
                  alignItems: "center", gap: 6, minHeight: 50, fontFamily: hi ? TYPO.hindi : TYPO.body,
                  boxShadow: "0 4px 18px rgba(0,0,0,0.2)",
                }}>
                  🔍 {hi ? "सभी गाड़ी देखें" : "Browse All"}
                </Link>
                <Link to="/driver/dealers" className="hero-cta-btn" style={{
                  background: "rgba(255,255,255,0.12)", color: "#fff", padding: "14px 26px",
                  borderRadius: RADIUS.lg, fontWeight: 700, fontSize: 15, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  border: "2px solid rgba(255,255,255,0.5)", minHeight: 50,
                  fontFamily: hi ? TYPO.hindi : TYPO.body, backdropFilter: "blur(4px)",
                }}>
                  📍 {hi ? "डीलर खोजें" : "Find Dealers"}
                </Link>
              </div>
            </div>

            {/* Right: Enquiry Form Card */}
            <div className="hero-form-col" style={{ animation: "fadeUp 0.65s ease 0.1s both" }}>
              <div style={{
                background: "#fff", borderRadius: RADIUS.xl + 4, overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
              }}>
                <div style={{ background: `linear-gradient(135deg,${G},${G2})`, padding: "18px 24px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: TYPO.hindi }}>
                    🛺 {hi ? "बेस्ट प्राइस पाएँ" : "Get Best Price"}
                  </div>
                  <div style={{ fontSize: 12, color: "#bbf7d0", marginTop: 3 }}>
                    {hi ? "2 मिनट में — बिल्कुल मुफ्त" : "In 2 minutes — completely free"}
                  </div>
                </div>
                <div style={{ padding: "20px 20px 24px" }}>
                  <SimpleEnquiryForm lang={lang} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 40 }}>
            <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* 5. Quick Actions ───────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "36px 20px 32px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <h2 style={{ fontFamily: TYPO.hindi, fontSize: 20, fontWeight: 800, color: "#1e293b" }}>
              {hi ? "क्या करना है?" : "What would you like to do?"}
            </h2>
          </div>
          <div className="quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
            {quickActions.map(a => (
              <Link key={a.to} to={a.to} className="quick-tile" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: "20px 10px 16px", textDecoration: "none", borderRadius: RADIUS.xl,
                background: "#fafafa", border: "1.5px solid #f1f5f9",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: RADIUS.lg, background: a.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, boxShadow: `0 4px 12px ${a.color}25`,
                }}>
                  {a.icon}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "#374151",
                  fontFamily: hi ? TYPO.hindi : TYPO.body,
                  textAlign: "center", lineHeight: 1.3,
                }}>{a.label}</span>
                <div style={{ width: 24, height: 3, borderRadius: 2, background: a.color, opacity: 0.6 }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5b. Featured Vehicles Carousel ─────────────────────────────────────── */}
      {featured.length > 0 && (
        <section style={{ padding: "40px 0 20px", background: "#fff", overflow: "hidden" }}>
          <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", paddingLeft: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 28, background: `linear-gradient(180deg,${G},${G2})`, borderRadius: 4 }} />
              <h2 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                ⭐ {hi ? "Featured गाड़ियाँ" : "Featured Vehicles"}
              </h2>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginLeft: 14 }}>
              {hi ? "Verified dealers की top-rated listings" : "Top-rated listings from verified dealers"}
            </p>
          </div>
          <HorizontalScrollRow>
              {featured.map(v => (
                <div key={v.id} onClick={() => setEnquireVehicle(v)} style={{
                  width: "min(74vw, 260px)", flexShrink: 0, scrollSnapAlign: "start",
                  background: "#fff", borderRadius: RADIUS.xl,
                  border: `1.5px solid ${G}30`, boxShadow: "0 2px 12px rgba(22,163,74,0.10)",
                  overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(22,163,74,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(22,163,74,0.10)"; }}
                >
                  <div style={{ height: 148, background: "#f1f5f9", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
                    🛺
                    {(v.thumbnail || v.thumbnail_url) && <img src={v.thumbnail || v.thumbnail_url} alt={v.model_name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />}
                    <div style={{ position: "absolute", top: 8, left: 8, background: `linear-gradient(135deg,${G},${G2})`, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>⭐ FEATURED</div>
                  </div>
                  <div style={{ padding: "12px 14px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.brand_name} {v.model_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{v.city || v.dealer_city || ""}</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: G, marginBottom: 10 }}>{v.price ? fmtINR(v.price) : (hi ? "कीमत जानें" : "Get Price")}</div>
                    <div style={{ padding: "8px 0", background: `linear-gradient(135deg,${G},${G2})`, color: "#fff", borderRadius: RADIUS.md, textAlign: "center", fontSize: 13, fontWeight: 700 }}>
                      {hi ? "एंक्वायरी करें" : "Enquire"}
                    </div>
                  </div>
                </div>
              ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* 5c. Featured Dealers Carousel ───────────────────────────────────────── */}
      {dealers.length > 0 && (
        <section style={{ padding: "32px 0 36px", background: "linear-gradient(135deg,#f0fdf4,#fff)", overflow: "hidden", borderTop: `1px solid ${G}15` }}>
          <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", paddingLeft: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 28, background: `linear-gradient(180deg,${D},#1e40af)`, borderRadius: 4 }} />
              <h2 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                🏪 {hi ? "Verified Dealers" : "Verified Dealers"}
              </h2>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginLeft: 14 }}>
              {hi ? "आपके पास के trusted showrooms" : "Trusted showrooms near you"}
            </p>
          </div>
          <HorizontalScrollRow>
              {dealers.map(d => (
                <Link key={d.id} to={`/driver/dealers`} style={{ textDecoration: "none" }}>
                  <div style={{
                    width: "min(42vw, 168px)", flexShrink: 0, scrollSnapAlign: "start",
                    background: "#fff", borderRadius: RADIUS.xl,
                    border: "1.5px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                    padding: "16px 14px", textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = `0 8px 20px ${G}20`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${G}20,${G}10)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 24, border: `1.5px solid ${G}30`, overflow: "hidden" }}>
                      {d.logo ? <img src={d.logo} alt={d.dealer_name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : "🏪"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.dealer_name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>📍 {d.city}</div>
                    {d.avg_rating && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        ⭐ {d.avg_rating}
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 11, color: G, fontWeight: 700 }}>{d.vehicle_count} {hi ? "गाड़ियाँ" : "vehicles"}</div>
                  </div>
                </Link>
              ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* 6. Marketplace CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: "40px 20px 48px", background: "#f8fafc" }}>
        <div style={{
          maxWidth: 480, margin: "0 auto",
          background: `linear-gradient(135deg, #052e16 0%, ${G} 60%, ${G2} 100%)`,
          borderRadius: 20, padding: "32px 28px", textAlign: "center",
          boxShadow: `0 12px 40px ${G}40`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛺</div>
          <h2 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
            {hi ? `${vehicles.length}+ E-Rickshaw Available` : `${vehicles.length}+ E-Rickshaws Available`}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            {hi ? "Verified dealers से compare करें, best price पाएँ — बिल्कुल free" : "Compare from verified dealers, get best price — completely free"}
          </p>
          <Link to="/driver/marketplace" style={{
            display: "block", padding: "14px 0",
            background: "#fff", color: G,
            borderRadius: RADIUS.lg, fontWeight: 800, fontSize: 16,
            textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
          >
            {hi ? "सभी गाड़ियाँ देखें →" : "Browse All Vehicles →"}
          </Link>
        </div>
      </section>

      {/* 7. How It Works ───────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "56px 20px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ display: "inline-block", background: "#dcfce7", color: G, padding: "5px 16px", borderRadius: RADIUS.pill, fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>
              {hi ? "यह काम कैसे करता है" : "HOW IT WORKS"}
            </div>
            <h2 style={{ fontFamily: TYPO.hindi, fontSize: 28, fontWeight: 800, color: "#1e293b" }}>
              {hi ? "3 आसान Steps" : "3 Simple Steps"}
            </h2>
            <p style={{ color: "#64748b", marginTop: 8, fontSize: 15, maxWidth: 480, margin: "8px auto 0" }}>
              {hi ? "मिनटों में best E-Rickshaw पाएँ" : "Get your best E-Rickshaw in minutes"}
            </p>
          </div>
          <div className="step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, position: "relative" }}>
            {/* connecting line on desktop */}
            <div style={{ position: "absolute", top: 36, left: "16%", right: "16%", height: 2, background: `linear-gradient(90deg,${G}40,${G},${G}40)`, zIndex: 0, borderRadius: 2 }} className="desktop-only" />
            {[
              { n: 1, icon: "📱", title: hi ? "नंबर डालें" : "Enter Number",    desc: hi ? "नाम और मोबाइल नंबर भरें — बिल्कुल मुफ्त" : "Enter name and mobile — completely free" },
              { n: 2, icon: "📞", title: hi ? "डीलर Call करेगा" : "Dealer Calls", desc: hi ? "Verified dealer 24 घंटों में संपर्क करेगा" : "Verified dealer contacts you within 24 hours" },
              { n: 3, icon: "🛺", title: hi ? "रिक्शा खरीदें" : "Buy Rickshaw",  desc: hi ? "Best price negotiate करें और अपना रिक्शा लेकर जाएँ" : "Negotiate best price and drive home" },
            ].map((step) => (
              <div key={step.n} style={{
                background: "#f8fafc", borderRadius: RADIUS.xl, padding: "30px 22px 26px",
                textAlign: "center", border: "1.5px solid #e2e8f0", position: "relative", zIndex: 1,
                transition: "all 0.22s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 8px 28px rgba(22,163,74,0.14)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{
                  width: 52, height: 52, background: `linear-gradient(135deg,${G},${G2})`, color: "#fff",
                  borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, marginBottom: 14,
                  boxShadow: `0 4px 16px ${G}50`,
                }}>{step.n}</div>
                <div style={{ fontSize: 38, marginBottom: 10 }}>{step.icon}</div>
                <div style={{ fontFamily: TYPO.hindi, fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, fontFamily: hi ? TYPO.hindi : TYPO.body }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Fuel Type ───────────────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", padding: "44px 20px", borderTop: `1px solid ${G}20`, borderBottom: `1px solid ${G}20` }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
            {hi ? "Fuel Type चुनें" : "Choose Fuel Type"}
          </h3>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
            {hi ? "अपनी जरूरत के हिसाब से filter करें" : "Filter by what suits you best"}
          </p>
          <div className="fuel-row" style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            {fuelShortcuts.map(f => (
              <Link key={f.fuel} to={`/driver/marketplace?fuel=${f.fuel}`} className="fuel-pill"
                style={{
                  background: f.bg, color: f.dark, padding: "14px 28px", borderRadius: RADIUS.pill,
                  fontWeight: 700, fontSize: 15, textDecoration: "none",
                  border: `2px solid ${f.color}40`,
                  fontFamily: hi ? TYPO.hindi : TYPO.body,
                  display: "inline-flex", alignItems: "center", minHeight: 50,
                  boxShadow: `0 2px 10px ${f.color}20`,
                }}>
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Dealer + Financer CTA ───────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(140deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)", padding: "60px 20px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", color: "#93c5fd", padding: "5px 16px", borderRadius: RADIUS.pill, fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>
              {hi ? "पार्टनर बनें" : "BECOME A PARTNER"}
            </div>
            <h2 style={{ fontFamily: TYPO.hindi, fontSize: 28, fontWeight: 800, color: "#fff" }}>
              {hi ? "ErikshawDekho के साथ बढ़ें" : "Grow with ErikshawDekho"}
            </h2>
          </div>
          <div className="cta-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Dealer */}
            <div style={{
              background: "rgba(255,255,255,0.07)", borderRadius: RADIUS.xl, padding: "32px 28px",
              border: "1px solid rgba(255,255,255,0.15)", transition: "all 0.22s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 40, marginBottom: 14 }}>🏪</div>
              <h3 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                {hi ? "क्या आप E-Rickshaw Dealer हैं?" : "Are you an E-Rickshaw Dealer?"}
              </h3>
              <p style={{ color: "#bfdbfe", fontSize: 14, lineHeight: 1.7, marginBottom: 22, fontFamily: hi ? TYPO.hindi : TYPO.body }}>
                {hi ? "अपनी showroom ErikshawDekho पर list करें। हजारों buyers तक free में पहुँचें।" : "List your showroom on ErikshawDekho. Reach thousands of buyers for free."}
              </p>
              <Link to="/dealer?tab=register" style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: D,
                padding: "13px 22px", borderRadius: RADIUS.lg, fontWeight: 700, fontSize: 14,
                textDecoration: "none", minHeight: 48, fontFamily: hi ? TYPO.hindi : TYPO.body,
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              }}>
                {hi ? "शोरूम रजिस्टर करें →" : "Register Showroom →"}
              </Link>
            </div>
            {/* Financer */}
            <div style={{
              background: "rgba(255,255,255,0.07)", borderRadius: RADIUS.xl, padding: "32px 28px",
              border: "1px solid rgba(255,255,255,0.15)", transition: "all 0.22s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 40, marginBottom: 14 }}>🏦</div>
              <h3 style={{ fontFamily: TYPO.hindi, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                {hi ? "फाइनेंस / NBFC पार्टनर?" : "Finance / NBFC Partner?"}
              </h3>
              <p style={{ color: "#bfdbfe", fontSize: 14, lineHeight: 1.7, marginBottom: 22, fontFamily: hi ? TYPO.hindi : TYPO.body }}>
                {hi ? "E-Rickshaw loans offer करें, dealers onboard करें और finance applications manage करें।" : "Offer e-rickshaw loans, onboard dealers, and manage finance applications."}
              </p>
              <Link to="/financer" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.15)", color: "#fff",
                padding: "13px 22px", borderRadius: RADIUS.lg, fontWeight: 700, fontSize: 14,
                textDecoration: "none", border: "2px solid rgba(255,255,255,0.4)", minHeight: 48,
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

      {/* Enquiry Modal */}
      {enquireVehicle && (
        <VehicleEnquiryModal vehicle={enquireVehicle} lang={lang} onClose={() => setEnquireVehicle(null)} />
      )}

      {/* Mobile bottom spacer */}
      <div className="mobile-bottom-pad" style={{ height: 68, display: "none" }} />
    </div>
  );
}
