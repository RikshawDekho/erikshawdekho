import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";
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

function VehicleCard({ v }) {
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
          <Link to="/marketplace" style={{ background: G, color: "#fff", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            जानें →
          </Link>
        </div>
      </div>
    </div>
  );
}

function LeadForm() {
  const [form, setForm] = useState({ name: "", phone: "", city: "", model: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: form.name, phone: form.phone, city: form.city, notes: form.model ? `Model preference: ${form.model}` : "" }),
      });
      if (res.ok) { setSent(true); }
      else { setErr("कुछ गलत हुआ। फिर कोशिश करें।"); }
    } catch { setErr("Network error. Please try again."); }
  };

  if (sent) return (
    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700, color: G, fontSize: 16 }}>धन्यवाद! आपकी enquiry मिल गई।</div>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>हमारे dealer आपसे 24 घंटों में contact करेंगे।</div>
    </div>
  );

  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

  return (
    <form onSubmit={submit}>
      {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input style={inp} placeholder="आपका नाम *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
        <input style={inp} placeholder="Mobile Number *" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
        <input style={inp} placeholder="City / जिला" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
        <input style={inp} placeholder="कौन सा model चाहिए?" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
      </div>
      <button type="submit" style={{ width: "100%", background: G, color: "#fff", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        Best Price जानें →
      </button>
    </form>
  );
}

export default function HomePage() {
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats]       = useState({ dealer_count: 0, vehicle_count: 0, city_count: 0 });

  useEffect(() => {
    publicFetch("/marketplace/?featured=true").then(d => d?.results && setVehicles(d.results.slice(0, 6)));
    publicFetch("/stats/").then(d => d && setStats(d));
  }, []);

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
            <LeadForm />
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

      {/* ── FEATURED VEHICLES ────────────────────────────── */}
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
            {vehicles.map(v => <VehicleCard key={v.id} v={v} />)}
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
    </div>
  );
}
