import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");
const G   = "#16a34a";
const D   = "#1e3a8a";

async function publicFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) return null;
  return res.json();
}

const FUEL_EMOJI = { electric: "⚡", petrol: "⛽", cng: "🔵", lpg: "🟣", diesel: "🖤" };
const FUEL_COLOR = { electric: "#16a34a", petrol: "#ea580c", cng: "#0891b2", lpg: "#7c3aed", diesel: "#475569" };

function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

/* ── Star Rating ─────────────────────────────────── */
function StarRating({ rating, size = 13 }) {
  if (!rating) return <span style={{ fontSize: size - 2, color: "#9ca3af" }}>No reviews</span>;
  const r = Math.round(rating);
  return (
    <span style={{ fontSize: size, color: "#f59e0b" }}>
      {"★".repeat(r)}{"☆".repeat(5 - r)}
      <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>{Number(rating).toFixed(1)}</span>
    </span>
  );
}

/* ── Vehicle Card ────────────────────────────────── */
function VehicleCard({ v, onEnquire }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; }}>
      <div style={{ height: 160, background: `linear-gradient(135deg, ${G}18, #fbbf2420)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
        {v.thumbnail ? <img src={v.thumbnail} alt={v.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : "🛺"}
      </div>
      <div style={{ padding: "14px 16px" }}>
        {v.is_featured && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, marginBottom: 6, display: "inline-block" }}>⭐ Featured</span>}
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{v.brand_name} {v.model_name}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ background: `${FUEL_COLOR[v.fuel_type]}18`, color: FUEL_COLOR[v.fuel_type], fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
            {FUEL_EMOJI[v.fuel_type]} {v.fuel_type}
          </span>
          {v.range_km && <span style={{ background: "#f0fdf4", color: G, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>⚡ {v.range_km} km range</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Starting at</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: G }}>{fmtINR(v.price)}</div>
          </div>
          {onEnquire ? (
            <button onClick={() => onEnquire(v)} style={{ background: G, color: "#fff", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Enquiry भेजें
            </button>
          ) : (
            <Link to="/marketplace" style={{ background: G, color: "#fff", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
              जानें →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lead / Enquiry Form (v3 — targeted: brand → dealer) ── */
function LeadForm({ presetBrand, presetDealerId, presetDealerName, vehicleId, allBrands }) {
  const [brands, setBrands] = useState(allBrands || []);
  const [form, setForm] = useState({ name: "", phone: "", city: "", pincode: "", notes: "" });
  const [chosenBrand, setChosenBrand] = useState(presetBrand || "");
  const [dealers, setDealers] = useState([]);
  const [chosenDealer, setChosenDealer] = useState(presetDealerId || "");
  const [chosenDealerName, setChosenDealerName] = useState(presetDealerName || "");
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  // Fetch brands once if not passed via props
  useEffect(() => {
    if (brands.length > 0) return;
    publicFetch("/brands/").then(d => {
      if (Array.isArray(d)) setBrands(d);
      else if (d?.results) setBrands(d.results);
    });
  }, []);

  // Pre-populate notes when brand changes
  useEffect(() => {
    if (chosenBrand) {
      setForm(p => ({ ...p, notes: `I am interested in ${chosenBrand} e-rickshaw. Please contact me with the best price and availability.` }));
    }
  }, [chosenBrand]);

  // Load dealers when brand changes
  useEffect(() => {
    if (!chosenBrand) { setDealers([]); setChosenDealer(""); setChosenDealerName(""); return; }
    if (presetDealerId) return; // Skip if dealer is preset (from vehicle card)
    setLoadingDealers(true);
    publicFetch(`/public/dealers-by-brand/?brand=${encodeURIComponent(chosenBrand)}`)
      .then(d => { setDealers(d?.results || []); setChosenDealer(""); setChosenDealerName(""); })
      .finally(() => setLoadingDealers(false));
  }, [chosenBrand]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!chosenBrand) return setErr("Brand select करें।");
    if (!chosenDealer && !presetDealerId) return setErr("Dealer select करें।");
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) return setErr("Valid 10-digit Indian mobile number डालें (6-9 से शुरू)।");
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) return setErr("Valid 6-digit pincode डालें।");
    try {
      const body = {
        customer_name: form.name,
        phone: form.phone,
        city: form.city,
        pincode: form.pincode,
        brand_name: chosenBrand,
        dealer: chosenDealer || presetDealerId,
        notes: form.notes,
      };
      if (vehicleId) body.vehicle = vehicleId;
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setSent(true);
      else setErr("कुछ गलत हुआ। फिर कोशिश करें।");
    } catch { setErr("Network error. Please try again."); }
  };

  if (sent) return (
    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700, color: G, fontSize: 16 }}>धन्यवाद! आपकी enquiry भेजी गई।</div>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
        {chosenDealerName || presetDealerName
          ? `${chosenDealerName || presetDealerName} आपसे 24 घंटों में contact करेंगे।`
          : "Dealer आपसे 24 घंटों में contact करेंगे।"}
      </div>
    </div>
  );

  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const sel = { ...inp, background: "#fff", cursor: "pointer" };

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input style={inp} placeholder="आपका नाम *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
        <input style={inp} placeholder="Mobile Number * (10 digits)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} />

        {/* Brand selector */}
        {presetBrand ? (
          <input style={{ ...inp, background: "#f9fafb" }} value={presetBrand} readOnly />
        ) : (
          <select style={sel} value={chosenBrand} onChange={e => setChosenBrand(e.target.value)} required>
            <option value="">— Brand चुनें * —</option>
            {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        )}

        {/* Dealer selector (loads after brand) */}
        {presetDealerId ? (
          <input style={{ ...inp, background: "#f9fafb" }} value={presetDealerName || "Selected Dealer"} readOnly />
        ) : (
          <select style={sel} value={chosenDealer} onChange={e => { setChosenDealer(e.target.value); setChosenDealerName(e.target.options[e.target.selectedIndex]?.text || ""); }} required disabled={!chosenBrand || loadingDealers}>
            <option value="">{loadingDealers ? "Loading dealers..." : !chosenBrand ? "— पहले brand चुनें —" : dealers.length === 0 ? "— No dealers found —" : "— Dealer चुनें * —"}</option>
            {dealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name} — {d.city}{d.avg_rating ? ` (⭐ ${Number(d.avg_rating).toFixed(1)})` : ""}</option>)}
          </select>
        )}

        <input style={inp} placeholder="Pincode * (6 digits)" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} required maxLength={6} />
        <input style={inp} placeholder="City / जिला" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
      </div>
      <textarea style={{ ...inp, marginBottom: 12, minHeight: 60, resize: "vertical" }} placeholder="Notes (auto-filled, editable)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      <button type="submit" style={{ width: "100%", background: G, color: "#fff", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        🛺 Best Price जानें →
      </button>
    </form>
  );
}

/* ── Dealer Query Modal (for brand-based dealer selection) ─── */
function DealerQueryModal({ brand, dealers, onClose }) {
  const [selectedDealer, setSelectedDealer] = useState(null);

  if (selectedDealer) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: "#fff", borderRadius: 16, width: 520, maxWidth: "100%", padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Enquiry — {selectedDealer.dealer_name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>📍 {selectedDealer.city} · ⭐ {selectedDealer.avg_rating || "New"} · {selectedDealer.vehicle_count} vehicles</div>
            </div>
            <button onClick={() => setSelectedDealer(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" }}>←</button>
          </div>
          <LeadForm presetBrand={brand} presetDealerId={selectedDealer.id} presetDealerName={selectedDealer.dealer_name} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 540, maxWidth: "100%", padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>Select a Dealer — {brand}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Sorted by rating & reviews</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        {dealers.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No dealers found for this brand.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dealers.map(d => (
              <div key={d.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.15s" }}
                onClick={() => setSelectedDealer(d)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.background = "#f0fdf4"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{d.dealer_name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📍 {d.city}{d.state ? `, ${d.state}` : ""}</div>
                  <div style={{ marginTop: 4 }}><StarRating rating={d.avg_rating} /></div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{d.vehicle_count} vehicles · {d.review_count || 0} reviews</div>
                </div>
                <button style={{ background: G, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Send Query →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Featured Product Enquiry Modal ──────────────── */
function FeaturedEnquiryModal({ vehicle, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 520, maxWidth: "100%", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{vehicle.brand_name} {vehicle.model_name}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{fmtINR(vehicle.price)} · {vehicle.dealer_city || "India"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        <LeadForm presetBrand={vehicle.brand_name} presetDealerId={vehicle.dealer_id} presetDealerName={vehicle.dealer_name} vehicleId={vehicle.id} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats]       = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });
  const [brands, setBrands]     = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandDealers, setBrandDealers]   = useState([]);
  const [brandLoading, setBrandLoading]   = useState(false);
  const [enquireVehicle, setEnquireVehicle] = useState(null);

  useEffect(() => {
    publicFetch("/marketplace/?featured=true").then(d => d?.results && setVehicles(d.results.slice(0, 6)));
    publicFetch("/stats/").then(d => d && setStats(d));
    publicFetch("/brands/").then(d => { if (Array.isArray(d)) setBrands(d); else if (d?.results) setBrands(d.results); });
  }, []);

  const handleBrandSelect = async (brand) => {
    setBrandLoading(true);
    setSelectedBrand(brand.name);
    const data = await publicFetch(`/public/dealers-by-brand/?brand=${encodeURIComponent(brand.name)}`);
    setBrandDealers(data?.results || []);
    setBrandLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", background: "#fafafa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .hero-text { animation: fadeUp 0.6s ease both; }
        .hero-sub   { animation: fadeUp 0.6s 0.15s ease both; }
        .hero-cta   { animation: fadeUp 0.6s 0.3s ease both; }
      `}</style>

      <Navbar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg, ${D} 0%, #1e40af 40%, ${G} 100%)`, color: "#fff", padding: "80px 24px 72px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(22,163,74,0.3) 0%, transparent 50%)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <div className="hero-text" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, lineHeight: 1.3, marginBottom: 12, textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            भारत का सबसे भरोसेमंद<br />ई-रिक्शा प्लेटफॉर्म
          </div>
          <div className="hero-sub" style={{ fontSize: "clamp(15px,2vw,19px)", color: "#bfdbfe", marginBottom: 8, fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
            Sabse sahi E-Rickshaw yahin milega
          </div>
          <div style={{ fontSize: 14, color: "#93c5fd", marginBottom: 36 }}>Compare करें और best price पाएँ</div>

          {/* Lead form in hero */}
          <div className="hero-cta" style={{ background: "rgba(255,255,255,0.97)", borderRadius: 16, padding: 24, maxWidth: 560, margin: "0 auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", color: "#111" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 16 }}>Free Quote पाएँ — 2 मिनट में</div>
            <LeadForm allBrands={brands} />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "center", gap: "clamp(24px,6vw,80px)", flexWrap: "wrap", textAlign: "center" }}>
          {[
            { n: `${stats.dealer_count}+`, l: "Verified Dealers" },
            { n: `${stats.vehicle_count}+`, l: "Vehicles Listed" },
            { n: `${stats.city_count}+`, l: "Cities Covered" },
            { n: "₹0", l: "Enquiry Charge" },
          ].map(({ n, l }) => (
            <div key={l}>
              <div style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, color: G, fontFamily: "'Poppins',sans-serif" }}>{n}</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROFILE SELECTION (Customer / Dealer / Financer) ── */}
      <section style={{ padding: "48px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>आप कौन हैं?</h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 32, fontSize: 14 }}>अपना profile चुनें और dedicated ecosystem access करें</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {[
            { icon: "🛺", title: "Customer / Buyer", desc: "E-Rickshaw compare करें, best pricing पाएँ, nearest dealer खोजें", link: "/marketplace", color: G, label: "Browse Vehicles →" },
            { icon: "🏪", title: "Dealer / Showroom", desc: "अपनी showroom manage करें, leads track करें, invoice generate करें", link: "/dashboard", color: D, label: "Dealer Login →" },
            { icon: "🏦", title: "Financer / NBFC", desc: "E-Rickshaw loans offer करें, dealers से connect हों, documents upload करें", link: "/financer", color: "#7c3aed", label: "Financer Portal →" },
          ].map(({ icon, title, desc, link, color, label }) => (
            <Link key={title} to={link} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 28, border: "2px solid #e5e7eb", textAlign: "center", transition: "all 0.2s", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, marginBottom: 16 }}>{desc}</div>
                <span style={{ background: color, color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, display: "inline-block" }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BRAND CATEGORY SELECTOR → DEALER QUERY ────── */}
      {brands.length > 0 && (
        <section style={{ background: "#f9fafb", padding: "48px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>Brand से Dealer खोजें</h2>
            <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 28, fontSize: 14 }}>Brand select करें → verified dealers देखें → enquiry भेजें</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {brands.map(b => (
                <button key={b.id} onClick={() => handleBrandSelect(b)}
                  style={{ background: "#fff", border: "2px solid #e5e7eb", padding: "12px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", color: "#111827" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.background = "#f0fdf4"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}>
                  {b.logo && <img src={b.logo} alt="" style={{ width: 20, height: 20, objectFit: "contain", marginRight: 6, verticalAlign: "middle" }} />}
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={{ padding: "56px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>यह कैसे काम करता है?</h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 40, fontSize: 14 }}>3 simple steps में best E-Rickshaw पाएँ</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {[
            { step: "1", icon: "🔍", title: "Search & Compare", desc: "अपने budget और जरूरत के हिसाब से E-Rickshaw खोजें। Brand, fuel type, price range — सब filter करें।" },
            { step: "2", icon: "📞", title: "Dealer से मिलें", desc: "अपने शहर के verified dealer से directly contact करें। Free test drive book करें।" },
            { step: "3", icon: "🛺", title: "Best Price पाएँ", desc: "Multiple quotes compare करें। EMI calculator use करें। सबसे अच्छा deal पक्का करें।" },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #e5e7eb", textAlign: "center", position: "relative" }}>
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: G, color: "#fff", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{step}</div>
              <div style={{ fontSize: 40, marginBottom: 12, marginTop: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED VEHICLES (with enquiry) ──────────────── */}
      {vehicles.length > 0 && (
        <section style={{ padding: "0 24px 56px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, color: "#111827" }}>Featured E-Rickshaws</h2>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Top models — best value for Bharat</p>
            </div>
            <Link to="/marketplace" style={{ color: G, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>सभी देखें →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {vehicles.map(v => <VehicleCard key={v.id} v={v} onEnquire={setEnquireVehicle} />)}
          </div>
        </section>
      )}

      {/* ── FUEL TYPE SHORTCUTS ───────────────────────────── */}
      <section style={{ background: "#f9fafb", padding: "40px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 800, color: "#111827", marginBottom: 24 }}>अपना Fuel Type चुनें</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            {[["electric", "⚡ Electric"], ["cng", "🔵 CNG"], ["petrol", "⛽ Petrol"], ["lpg", "🟣 LPG"]].map(([fuel, label]) => (
              <Link key={fuel} to={`/marketplace?fuel=${fuel}`}
                style={{ background: "#fff", border: `2px solid ${FUEL_COLOR[fuel]}`, color: FUEL_COLOR[fuel], padding: "10px 20px", borderRadius: 50, fontWeight: 700, fontSize: 14, textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = FUEL_COLOR[fuel]; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = FUEL_COLOR[fuel]; }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEALER CTA ────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg, ${D}, #1e40af)`, color: "#fff", padding: "56px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
          <h2 style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, marginBottom: 10 }}>
            क्या आप E-Rickshaw dealer हैं?
          </h2>
          <p style={{ color: "#bfdbfe", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            अपनी showroom ErikshawDekho पर list करें। हजारों buyers तक free में पहुँचें। आज ही join करें!
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/dashboard" style={{ background: "#fff", color: D, padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              Dealer Login
            </Link>
            <Link to="/dealers" style={{ background: "transparent", color: "#fff", padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", border: "2px solid rgba(255,255,255,0.5)" }}>
              Showroom Register करें
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── MODALS ────────────────────────────────────────── */}
      {selectedBrand && !brandLoading && (
        <DealerQueryModal brand={selectedBrand} dealers={brandDealers} onClose={() => { setSelectedBrand(null); setBrandDealers([]); }} />
      )}
      {enquireVehicle && (
        <FeaturedEnquiryModal vehicle={enquireVehicle} onClose={() => setEnquireVehicle(null)} />
      )}
    </div>
  );
}
