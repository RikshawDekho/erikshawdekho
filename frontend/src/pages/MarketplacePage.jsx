import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL;
const G   = "#16a34a";

const FUEL_COLOR = { electric: "#16a34a", petrol: "#ea580c", cng: "#0891b2", lpg: "#7c3aed", diesel: "#475569" };
const FUEL_EMOJI = { electric: "⚡", petrol: "⛽", cng: "🔵", lpg: "🟣", diesel: "🖤" };
function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

function EnquiryModal({ vehicle, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr]   = useState("");
  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: form.name, phone: form.phone, city: form.city, vehicle: vehicle.id }),
      });
      if (res.ok) setSent(true);
      else setErr("Error submitting. Please try again.");
    } catch { setErr("Network error."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 420, maxWidth: "100%", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: G, fontSize: 17 }}>Enquiry भेजी गई!</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>Dealer 24 घंटों में contact करेगा।</div>
            <button onClick={onClose} style={{ marginTop: 20, background: G, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Enquiry भेजें — {vehicle.brand_name} {vehicle.model_name}</div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
            <form onSubmit={submit}>
              <input style={inp} placeholder="आपका नाम *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              <input style={inp} placeholder="Mobile Number *" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
              <input style={inp} placeholder="City / District" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <button type="submit" style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                Best Price जानें →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function VehicleCard({ v, onEnquire }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}>
      <div style={{ height: 150, background: `linear-gradient(135deg, ${G}12, #fbbf2415)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, position: "relative" }}>
        {v.thumbnail ? <img src={v.thumbnail} alt={v.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : "🛺"}
        {v.is_featured && <span style={{ position: "absolute", top: 8, right: 8, background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>⭐ Featured</span>}
        {v.is_used && <span style={{ position: "absolute", top: 8, left: 8, background: "#f3f4f6", color: "#374151", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Used</span>}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.brand_name} {v.model_name}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>📍 {v.dealer_city || "India"} · {v.year}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ background: `${FUEL_COLOR[v.fuel_type]}15`, color: FUEL_COLOR[v.fuel_type], fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
            {FUEL_EMOJI[v.fuel_type]} {v.fuel_type}
          </span>
          {v.range_km && <span style={{ background: "#f0fdf4", color: G, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>⚡ {v.range_km} km</span>}
          {v.seating_capacity && <span style={{ background: "#f8fafc", color: "#475569", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>👥 {v.seating_capacity} seat</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: G }}>{fmtINR(v.price)}</div>
          <button onClick={() => onEnquire(v)}
            style={{ background: G, color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Enquiry भेजें
          </button>
        </div>
        {v.stock_status === "low_stock" && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, fontWeight: 600 }}>⚠️ Limited stock</div>}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [params, setParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [enquire, setEnquire]   = useState(null);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  const fuel   = params.get("fuel")   || "";
  const search = params.get("search") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (fuel)   q.set("fuel_type", fuel);
    if (search) q.set("search", search);
    q.set("page", page);
    const res = await fetch(`${API}/marketplace/?${q}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setVehicles(d.results || []);
      setTotal(d.count || 0);
    }
    setLoading(false);
  }, [fuel, search, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => {
    const p = new URLSearchParams(params);
    if (val) p.set(key, val); else p.delete(key);
    setParams(p); setPage(1);
  };

  const inp = { padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" };

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", background: "#f9fafb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <Navbar />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${G}, #15803d)`, color: "#fff", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, marginBottom: 4 }}>E-Rickshaw Marketplace</h1>
          <p style={{ color: "#bbf7d0", fontSize: 14 }}>भारत के top dealers से सीधे compare करें</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 24px", position: "sticky", top: 64, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, minWidth: 180 }} placeholder="🔍 Search by brand or model..." value={search}
            onChange={e => setFilter("search", e.target.value)} />
          <select style={inp} value={fuel} onChange={e => setFilter("fuel", e.target.value)}>
            <option value="">All Fuel Types</option>
            <option value="electric">⚡ Electric</option>
            <option value="cng">🔵 CNG</option>
            <option value="petrol">⛽ Petrol</option>
            <option value="lpg">🟣 LPG</option>
            <option value="diesel">🖤 Diesel</option>
          </select>
          {(fuel || search) && (
            <button onClick={() => setParams({})} style={{ padding: "10px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#374151" }}>
              Clear Filters ✕
            </button>
          )}
          <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>{total} vehicles found</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px", width: "100%", flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div>Loading vehicles...</div>
          </div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <div style={{ fontWeight: 700, color: "#374151" }}>No vehicles found</div>
            <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 6 }}>Try changing your filters</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {vehicles.map(v => <VehicleCard key={v.id} v={v} onEnquire={setEnquire} />)}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 32 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: page === 1 ? "not-allowed" : "pointer", background: "#fff", fontFamily: "inherit" }}>‹ Prev</button>
            <span style={{ padding: "8px 16px", background: G, color: "#fff", borderRadius: 8, fontWeight: 700 }}>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={vehicles.length < 20}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: vehicles.length < 20 ? "not-allowed" : "pointer", background: "#fff", fontFamily: "inherit" }}>Next ›</button>
          </div>
        )}
      </div>

      {enquire && <EnquiryModal vehicle={enquire} onClose={() => setEnquire(null)} />}
      <Footer />
    </div>
  );
}
