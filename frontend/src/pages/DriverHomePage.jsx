/**
 * DriverHomePage — Unified driver ecosystem entry point
 * No login required. Hindi by default. Big buttons, icon-heavy.
 * Combines: Featured vehicles + Lead form + Brand selector + How it works
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { useI18n } from "../i18n";

const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";
const G = "#16a34a";
const D = "#1e3a8a";

async function publicFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) return null;
  return res.json();
}

const FUEL_EMOJI = { electric: "⚡", petrol: "⛽", cng: "🔵", lpg: "🟣", diesel: "🖤" };
const FUEL_COLOR = { electric: "#16a34a", petrol: "#ea580c", cng: "#0891b2", lpg: "#7c3aed", diesel: "#475569" };

function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

/* ── Star Rating ── */
function StarRating({ rating, size = 13 }) {
  if (!rating) return null;
  const r = Math.round(rating);
  return (
    <span style={{ fontSize: size, color: "#f59e0b" }}>
      {"★".repeat(r)}{"☆".repeat(5 - r)}
      <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>{Number(rating).toFixed(1)}</span>
    </span>
  );
}

/* ── Vehicle Card ── */
function VehicleCard({ v, onEnquire, t }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; }}>
      <div style={{ height: 160, background: `linear-gradient(135deg, ${G}18, #fbbf2420)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
        {v.thumbnail ? <img src={v.thumbnail} alt={v.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : "🛺"}
      </div>
      <div style={{ padding: "14px 16px" }}>
        {v.is_featured && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, marginBottom: 6, display: "inline-block" }}>⭐ {t("market.featured")}</span>}
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{v.brand_name} {v.model_name}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ background: `${FUEL_COLOR[v.fuel_type]}18`, color: FUEL_COLOR[v.fuel_type], fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
            {FUEL_EMOJI[v.fuel_type]} {v.fuel_type}
          </span>
          {v.range_km && <span style={{ background: "#f0fdf4", color: G, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>⚡ {v.range_km} km</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{t("market.starting_at")}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: G }}>{fmtINR(v.price)}</div>
          </div>
          <button onClick={() => onEnquire(v)} style={{ background: G, color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", minHeight: 40 }}>
            {t("market.enquiry")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Lead Form (existing logic, with i18n) ── */
function LeadForm({ presetBrand, presetDealerId, presetDealerName, vehicleId, allBrands, t }) {
  const [brands, setBrands] = useState(allBrands || []);
  const [form, setForm] = useState({ name: "", phone: "", city: "", pincode: "", notes: "" });
  const [chosenBrand, setChosenBrand] = useState(presetBrand || "");
  const [dealers, setDealers] = useState([]);
  const [chosenDealer, setChosenDealer] = useState(presetDealerId || "");
  const [chosenDealerName, setChosenDealerName] = useState(presetDealerName || "");
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (brands.length > 0) return;
    publicFetch("/brands/").then(d => {
      if (Array.isArray(d)) setBrands(d);
      else if (d?.results) setBrands(d.results);
    });
  }, []);

  useEffect(() => {
    if (chosenBrand) {
      setForm(p => ({ ...p, notes: `I am interested in ${chosenBrand} e-rickshaw. Please contact me with the best price and availability.` }));
    }
  }, [chosenBrand]);

  useEffect(() => {
    if (!chosenBrand) { setDealers([]); setChosenDealer(""); setChosenDealerName(""); return; }
    if (presetDealerId) return;
    setLoadingDealers(true);
    publicFetch(`/public/dealers-by-brand/?brand=${encodeURIComponent(chosenBrand)}`)
      .then(d => { setDealers(d?.results || []); setChosenDealer(""); setChosenDealerName(""); })
      .finally(() => setLoadingDealers(false));
  }, [chosenBrand]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!chosenBrand) return setErr(t("err.brand_required"));
    if (!chosenDealer && !presetDealerId) return setErr(t("err.dealer_required"));
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) return setErr(t("err.phone_invalid"));
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) return setErr(t("err.pincode_invalid"));
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
      else setErr(t("err.generic"));
    } catch { setErr(t("err.network")); }
  };

  if (sent) return (
    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700, color: G, fontSize: 16 }}>{t("success.enquiry")}</div>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
        {chosenDealerName || presetDealerName
          ? `${chosenDealerName || presetDealerName} — ${t("success.dealer_contact")}`
          : t("success.dealer_contact")}
      </div>
    </div>
  );

  const inp = { width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 46 };
  const sel = { ...inp, background: "#fff", cursor: "pointer" };

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input style={inp} placeholder={`${t("form.name")} *`} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
        <input style={inp} placeholder={`${t("form.phone")} *`} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} inputMode="numeric" />

        {presetBrand ? (
          <input style={{ ...inp, background: "#f9fafb" }} value={presetBrand} readOnly />
        ) : (
          <select style={sel} value={chosenBrand} onChange={e => setChosenBrand(e.target.value)} required>
            <option value="">— {t("form.brand")} * —</option>
            {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        )}

        {presetDealerId ? (
          <input style={{ ...inp, background: "#f9fafb" }} value={presetDealerName || "Selected Dealer"} readOnly />
        ) : (
          <select style={sel} value={chosenDealer} onChange={e => { setChosenDealer(e.target.value); setChosenDealerName(e.target.options[e.target.selectedIndex]?.text || ""); }} required disabled={!chosenBrand || loadingDealers}>
            <option value="">{loadingDealers ? t("form.loading_dealers") : !chosenBrand ? `— ${t("form.select_brand_first")} —` : dealers.length === 0 ? `— ${t("form.no_dealers")} —` : `— ${t("form.dealer")} * —`}</option>
            {dealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name} — {d.city}{d.avg_rating ? ` (⭐ ${Number(d.avg_rating).toFixed(1)})` : ""}</option>)}
          </select>
        )}

        <input style={inp} placeholder={`${t("form.pincode")} *`} value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} required maxLength={6} inputMode="numeric" />
        <input style={inp} placeholder={t("form.city")} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
      </div>
      <textarea style={{ ...inp, marginBottom: 12, minHeight: 60, resize: "vertical" }} placeholder={t("form.notes")} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      <button type="submit" style={{ width: "100%", background: G, color: "#fff", padding: "14px", borderRadius: 12, fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", minHeight: 52 }}>
        {t("form.submit")}
      </button>
    </form>
  );
}

/* ── Dealer Query Modal ── */
function DealerQueryModal({ brand, dealers, onClose, t }) {
  const [selectedDealer, setSelectedDealer] = useState(null);

  if (selectedDealer) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: "#fff", borderRadius: 16, width: 520, maxWidth: "100%", padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{t("market.enquiry")} — {selectedDealer.dealer_name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>📍 {selectedDealer.city} · {selectedDealer.vehicle_count} {t("spec.vehicles")}</div>
            </div>
            <button onClick={() => setSelectedDealer(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" }}>←</button>
          </div>
          <LeadForm presetBrand={brand} presetDealerId={selectedDealer.id} presetDealerName={selectedDealer.dealer_name} t={t} />
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
            <div style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>{t("brand.select_dealer")} — {brand}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{t("brand.sorted_rating")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        {dealers.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>{t("form.no_dealers")}</div>
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
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{d.vehicle_count} {t("spec.vehicles")} · {d.review_count || 0} {t("spec.reviews")}</div>
                </div>
                <button style={{ background: G, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 40 }}>
                  {t("brand.send_query")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Enquiry Modal for Featured Vehicles ── */
function FeaturedEnquiryModal({ vehicle, onClose, t }) {
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
        <LeadForm presetBrand={vehicle.brand_name} presetDealerId={vehicle.dealer_id} presetDealerName={vehicle.dealer_name} vehicleId={vehicle.id} t={t} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN DRIVER HOME PAGE
   ══════════════════════════════════════════════════════════ */
export default function DriverHomePage() {
  const { t, lang } = useI18n();
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandDealers, setBrandDealers] = useState([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [enquireVehicle, setEnquireVehicle] = useState(null);

  useEffect(() => {
    // Save last page for session restore
    localStorage.setItem("erd_last_page", "/driver");
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
        .hero-sub  { animation: fadeUp 0.6s 0.15s ease both; }
        .hero-cta  { animation: fadeUp 0.6s 0.3s ease both; }
      `}</style>

      <Navbar />

      {/* ── HERO with Lead Form ── */}
      <section style={{ background: `linear-gradient(135deg, ${D} 0%, #1e40af 40%, ${G} 100%)`, color: "#fff", padding: "60px 24px 52px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(22,163,74,0.3) 0%, transparent 50%)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <div className="hero-text" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: "clamp(26px,5vw,44px)", fontWeight: 800, lineHeight: 1.3, marginBottom: 10, textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            {lang === "en" ? "India's Most Trusted\nE-Rickshaw Platform" : "भारत का सबसे भरोसेमंद\nई-रिक्शा प्लेटफॉर्म"}
          </div>
          <div className="hero-sub" style={{ fontSize: 15, color: "#bfdbfe", marginBottom: 8, fontWeight: 600 }}>
            {lang === "en" ? "Best E-Rickshaw deals from verified dealers" : "Sabse sahi E-Rickshaw yahin milega"}
          </div>
          <div style={{ fontSize: 13, color: "#93c5fd", marginBottom: 28 }}>
            {lang === "en" ? "Compare and get the best price" : "Compare करें और best price पाएँ"}
          </div>

          {/* Lead form in hero */}
          <div className="hero-cta" style={{ background: "rgba(255,255,255,0.97)", borderRadius: 16, padding: 24, maxWidth: 560, margin: "0 auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", color: "#111" }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#111827", marginBottom: 16 }}>{t("form.get_quote")}</div>
            <LeadForm allBrands={brands} t={t} />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "center", gap: "clamp(24px,6vw,80px)", flexWrap: "wrap", textAlign: "center" }}>
          {[
            { n: `${stats.dealer_count}+`, l: t("landing.stats.dealers") },
            { n: `${stats.vehicle_count}+`, l: t("landing.stats.vehicles") },
            { n: `${stats.city_count}+`, l: t("landing.stats.cities") },
            { n: "₹0", l: t("landing.hero.free") },
          ].map(({ n, l }) => (
            <div key={l}>
              <div style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, color: G, fontFamily: "'Poppins',sans-serif" }}>{n}</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUICK ACTIONS (big touch targets for drivers) ── */}
      <section style={{ padding: "36px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {[
            { icon: "🔍", link: "/driver/marketplace", label: t("driver.explore") },
            { icon: "📍", link: "/driver/dealers", label: t("driver.find_dealer") },
            { icon: "⚖", link: "/driver/marketplace", label: t("driver.compare") },
            { icon: "💰", link: "/driver/marketplace", label: t("driver.emi") },
          ].map(({ icon, link, label }) => (
            <Link key={label} to={link} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", border: "2px solid #e5e7eb", textAlign: "center", transition: "all 0.2s", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BRAND → DEALER SELECTOR ── */}
      {brands.length > 0 && (
        <section style={{ background: "#f9fafb", padding: "40px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>{t("brand.find_by")}</h2>
            <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 24, fontSize: 14 }}>{t("brand.select_see")}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {brands.map(b => (
                <button key={b.id} onClick={() => handleBrandSelect(b)}
                  style={{ background: "#fff", border: "2px solid #e5e7eb", padding: "14px 24px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", color: "#111827", minHeight: 48 }}
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

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "48px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: "#111827", marginBottom: 8 }}>{t("how.title")}</h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 36, fontSize: 14 }}>{t("how.subtitle")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {[
            { step: "1", icon: "🔍", title: t("how.step1.title"), desc: t("how.step1.desc") },
            { step: "2", icon: "📞", title: t("how.step2.title"), desc: t("how.step2.desc") },
            { step: "3", icon: "🛺", title: t("how.step3.title"), desc: t("how.step3.desc") },
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

      {/* ── FEATURED VEHICLES ── */}
      {vehicles.length > 0 && (
        <section style={{ padding: "0 24px 48px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, color: "#111827" }}>
                {lang === "en" ? "Featured E-Rickshaws" : "फीचर्ड ई-रिक्शा"}
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {lang === "en" ? "Top models — best value for Bharat" : "Top models — Bharat के लिए best value"}
              </p>
            </div>
            <Link to="/driver/marketplace" style={{ color: G, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>{t("action.view_all")}</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {vehicles.map(v => <VehicleCard key={v.id} v={v} onEnquire={setEnquireVehicle} t={t} />)}
          </div>
        </section>
      )}

      {/* ── FUEL TYPE SHORTCUTS ── */}
      <section style={{ background: "#f9fafb", padding: "40px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 800, color: "#111827", marginBottom: 24 }}>{t("fuel.choose")}</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            {[["electric", `⚡ ${t("fuel.electric")}`], ["cng", `🔵 ${t("fuel.cng")}`], ["petrol", `⛽ ${t("fuel.petrol")}`], ["lpg", `🟣 ${t("fuel.lpg")}`]].map(([fuel, label]) => (
              <Link key={fuel} to={`/driver/marketplace?fuel=${fuel}`}
                style={{ background: "#fff", border: `2px solid ${FUEL_COLOR[fuel]}`, color: FUEL_COLOR[fuel], padding: "12px 24px", borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: "none", transition: "all 0.15s", minHeight: 46, display: "flex", alignItems: "center" }}
                onMouseEnter={e => { e.currentTarget.style.background = FUEL_COLOR[fuel]; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = FUEL_COLOR[fuel]; }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEALER CTA ── */}
      <section style={{ background: `linear-gradient(135deg, ${D}, #1e40af)`, color: "#fff", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
          <h2 style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, marginBottom: 10 }}>
            {t("cta.are_you_dealer")}
          </h2>
          <p style={{ color: "#bfdbfe", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            {t("cta.list_showroom")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/dealer" style={{ background: "#fff", color: D, padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              {t("footer.dealer_login")}
            </Link>
            <Link to="/dealer" style={{ background: "transparent", color: "#fff", padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", border: "2px solid rgba(255,255,255,0.5)" }}>
              {t("cta.register_showroom")}
            </Link>
          </div>
        </div>
      </section>

      <FooterNew />

      {/* ── MODALS ── */}
      {selectedBrand && !brandLoading && (
        <DealerQueryModal brand={selectedBrand} dealers={brandDealers} onClose={() => { setSelectedBrand(null); setBrandDealers([]); }} t={t} />
      )}
      {enquireVehicle && (
        <FeaturedEnquiryModal vehicle={enquireVehicle} onClose={() => setEnquireVehicle(null)} t={t} />
      )}

      {/* Bottom padding for mobile bottom nav */}
      <div style={{ height: 60 }} className="mobile-bottom-spacer" />
      <style>{`@media (min-width: 769px) { .mobile-bottom-spacer { display: none; } }`}</style>
    </div>
  );
}
