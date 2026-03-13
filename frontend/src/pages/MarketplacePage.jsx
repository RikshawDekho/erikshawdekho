import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";
const G   = "#16a34a";

const FUEL_COLOR = { electric: "#16a34a", petrol: "#ea580c", cng: "#0891b2", lpg: "#7c3aed", diesel: "#475569" };
const FUEL_EMOJI = { electric: "⚡", petrol: "⛽", cng: "🔵", lpg: "🟣", diesel: "🖤" };
function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

/* ── Enquiry Modal (targeted lead — brand/dealer/pincode mandatory) ── */
function EnquiryModal({ vehicle, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", pincode: "", notes: vehicle ? `I am interested in ${vehicle.brand_name} ${vehicle.model_name}. Please contact me with the best price.` : "" });
  const [sent, setSent] = useState(false);
  const [err, setErr]   = useState("");
  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) return setErr("Valid 10-digit Indian mobile number डालें (6-9 से शुरू)।");
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) return setErr("Valid 6-digit pincode डालें।");
    try {
      const body = {
        customer_name: form.name,
        phone: form.phone,
        city: form.city,
        pincode: form.pincode,
        brand_name: vehicle.brand_name,
        notes: form.notes,
        vehicle: vehicle.id,
      };
      if (vehicle.dealer_id) body.dealer = vehicle.dealer_id;
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setSent(true);
      else setErr("Error submitting. Please try again.");
    } catch { setErr("Network error."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "100%", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: G, fontSize: 17 }}>Enquiry भेजी गई!</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
              {vehicle.dealer_name ? `${vehicle.dealer_name} 24 घंटों में contact करेगा।` : "Dealer 24 घंटों में contact करेगा।"}
            </div>
            <button onClick={onClose} style={{ marginTop: 20, background: G, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Enquiry भेजें — {vehicle.brand_name} {vehicle.model_name}</div>
                {vehicle.dealer_name && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📍 {vehicle.dealer_name} · {vehicle.dealer_city}</div>}
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
            <form onSubmit={submit}>
              <input style={inp} placeholder="आपका नाम *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              <input style={inp} placeholder="Mobile Number * (10 digits)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} />
              <input style={inp} placeholder="Pincode * (6 digits)" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} required maxLength={6} />
              <input style={inp} placeholder="City / District" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              <button type="submit" style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                🛺 Best Price जानें →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Vehicle Detail Modal (full product details) ──────── */
function VehicleDetailModal({ vehicle, onClose, onEnquire, onCompare, compareIds }) {
  const isInCompare = compareIds.includes(vehicle.id);
  const specs = [
    vehicle.fuel_type && { label: "Fuel Type", val: `${FUEL_EMOJI[vehicle.fuel_type]} ${vehicle.fuel_type}` },
    vehicle.range_km && { label: "Range", val: `${vehicle.range_km} km` },
    vehicle.battery_capacity && { label: "Battery", val: vehicle.battery_capacity },
    vehicle.max_speed && { label: "Max Speed", val: `${vehicle.max_speed} km/h` },
    vehicle.payload_kg && { label: "Payload", val: `${vehicle.payload_kg} kg` },
    vehicle.seating_capacity && { label: "Seating", val: `${vehicle.seating_capacity} passengers` },
    vehicle.warranty_years && { label: "Warranty", val: `${vehicle.warranty_years} years` },
    vehicle.year && { label: "Year", val: vehicle.year },
    vehicle.vehicle_type && { label: "Type", val: vehicle.vehicle_type },
    vehicle.hsn_code && { label: "HSN Code", val: vehicle.hsn_code },
  ].filter(Boolean);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 600, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Image */}
        <div style={{ height: 200, background: `linear-gradient(135deg, ${G}12, #fbbf2415)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, position: "relative" }}>
          {vehicle.thumbnail ? <img src={vehicle.thumbnail} alt={vehicle.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : "🛺"}
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", width: 32, height: 32, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              {vehicle.is_featured && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, display: "inline-block", marginBottom: 6 }}>⭐ Featured</span>}
              <div style={{ fontWeight: 800, fontSize: 20, color: "#111827" }}>{vehicle.brand_name} {vehicle.model_name}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>📍 {vehicle.dealer_name} · {vehicle.dealer_city}{vehicle.dealer_state ? `, ${vehicle.dealer_state}` : ""}</div>
              {vehicle.dealer_verified && <span style={{ fontSize: 11, color: G, fontWeight: 600 }}>✅ Verified Dealer</span>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Starting at</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: G }}>{fmtINR(vehicle.price)}</div>
            </div>
          </div>

          {/* Description */}
          {vehicle.description && (
            <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, marginBottom: 20, padding: 14, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
              {vehicle.description}
            </div>
          )}

          {/* Specs grid */}
          {specs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 12 }}>Specifications</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {specs.map(({ label, val }) => (
                  <div key={label} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock status */}
          {vehicle.stock_status && (
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 16, color: vehicle.stock_status === "in_stock" ? G : vehicle.stock_status === "low_stock" ? "#f59e0b" : "#dc2626" }}>
              {vehicle.stock_status === "in_stock" ? "✅ In Stock" : vehicle.stock_status === "low_stock" ? "⚠️ Limited Stock" : "❌ Out of Stock"}
              {vehicle.stock_quantity > 0 && ` · ${vehicle.stock_quantity} units available`}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { onClose(); onEnquire(vehicle); }}
              style={{ flex: 1, background: G, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              Enquiry भेजें →
            </button>
            <button onClick={() => onCompare(vehicle.id)}
              style={{ padding: "12px 20px", background: isInCompare ? "#dbeafe" : "#f3f4f6", color: isInCompare ? "#1d4ed8" : "#374151", border: isInCompare ? "2px solid #3b82f6" : "2px solid #e5e7eb", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {isInCompare ? "✓ Added" : "⚖ Compare"}
            </button>
          </div>

          {/* Dealer contact */}
          {vehicle.dealer_phone && (
            <div style={{ marginTop: 16, padding: 14, background: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Direct Dealer Contact</div>
              <a href={`tel:${vehicle.dealer_phone}`} style={{ fontWeight: 700, fontSize: 16, color: G, textDecoration: "none" }}>
                📞 {vehicle.dealer_phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Compare Modal ────────────────────────────────────── */
function CompareModal({ compareIds, onClose, onRemove }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (compareIds.length === 0) return;
    setLoading(true);
    fetch(`${API}/public/vehicles/compare/?ids=${compareIds.join(",")}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setVehicles(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [compareIds]);

  const ROWS = [
    { label: "Price", key: "price", fmt: v => fmtINR(v) },
    { label: "Fuel Type", key: "fuel_type", fmt: v => `${FUEL_EMOJI[v] || ""} ${v}` },
    { label: "Range (km)", key: "range_km", fmt: v => v ? `${v} km` : "—" },
    { label: "Battery", key: "battery_capacity", fmt: v => v || "—" },
    { label: "Max Speed", key: "max_speed", fmt: v => v ? `${v} km/h` : "—" },
    { label: "Payload", key: "payload_kg", fmt: v => v ? `${v} kg` : "—" },
    { label: "Seating", key: "seating_capacity", fmt: v => v ? `${v} seats` : "—" },
    { label: "Warranty", key: "warranty_years", fmt: v => v ? `${v} yrs` : "—" },
    { label: "Year", key: "year", fmt: v => v || "—" },
    { label: "Dealer", key: "dealer_name", fmt: v => v || "—" },
    { label: "City", key: "dealer_city", fmt: v => v || "—" },
    { label: "Stock", key: "stock_status", fmt: v => v === "in_stock" ? "✅ In Stock" : v === "low_stock" ? "⚠️ Low" : "❌ Out" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 800, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>⚖ Compare Vehicles</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{vehicles.length} vehicles selected</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading comparison...</div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No vehicles to compare.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 600, minWidth: 100 }}>Feature</th>
                  {vehicles.map(v => (
                    <th key={v.id} style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid #e5e7eb", minWidth: 140 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{v.brand_name} {v.model_name}</div>
                      <button onClick={() => onRemove(v.id)} style={{ fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>Remove</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ label, key, fmt }, i) => (
                  <tr key={key} style={{ background: i % 2 ? "#f9fafb" : "#fff" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{label}</td>
                    {vehicles.map(v => {
                      const val = fmt(v[key]);
                      // Highlight best price (lowest)
                      const isBest = key === "price" && v.price === Math.min(...vehicles.map(x => x.price || Infinity));
                      return (
                        <td key={v.id} style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #f3f4f6", fontWeight: isBest ? 800 : 400, color: isBest ? G : "#111827" }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Vehicle Card ─────────────────────────────────────── */
function VehicleCard({ v, onEnquire, onDetail, onCompare, isInCompare }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: isInCompare ? `2px solid #3b82f6` : "1px solid #e5e7eb", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}>
      <div onClick={() => onDetail(v)} style={{ height: 150, background: `linear-gradient(135deg, ${G}12, #fbbf2415)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, position: "relative", cursor: "pointer" }}>
        {v.thumbnail ? <img src={v.thumbnail} alt={v.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : "🛺"}
        {v.is_featured && <span style={{ position: "absolute", top: 8, right: 8, background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>⭐ Featured</span>}
        {v.is_used && <span style={{ position: "absolute", top: 8, left: 8, background: "#f3f4f6", color: "#374151", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Used</span>}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div onClick={() => onDetail(v)} style={{ cursor: "pointer" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.brand_name} {v.model_name}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>📍 {v.dealer_city || "India"} · {v.year}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ background: `${FUEL_COLOR[v.fuel_type]}15`, color: FUEL_COLOR[v.fuel_type], fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
            {FUEL_EMOJI[v.fuel_type]} {v.fuel_type}
          </span>
          {v.range_km && <span style={{ background: "#f0fdf4", color: G, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>⚡ {v.range_km} km</span>}
          {v.seating_capacity && <span style={{ background: "#f8fafc", color: "#475569", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>👥 {v.seating_capacity} seat</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: G }}>{fmtINR(v.price)}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onCompare(v.id)} title="Compare"
              style={{ background: isInCompare ? "#dbeafe" : "#f3f4f6", color: isInCompare ? "#1d4ed8" : "#6b7280", border: "none", padding: "7px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              ⚖
            </button>
            <button onClick={() => onEnquire(v)}
              style={{ background: G, color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Enquiry भेजें
            </button>
          </div>
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
  const [detail, setDetail]     = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
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

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const handleDetail = async (v) => {
    // Fetch full detail
    try {
      const res = await fetch(`${API}/public/vehicles/${v.id}/`);
      if (res.ok) { const data = await res.json(); setDetail(data); }
      else setDetail(v); // fallback to card data
    } catch { setDetail(v); }
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
          {/* Compare button */}
          {compareIds.length > 0 && (
            <button onClick={() => setShowCompare(true)}
              style={{ padding: "10px 18px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
              ⚖ Compare ({compareIds.length})
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
            {vehicles.map(v => (
              <VehicleCard key={v.id} v={v}
                onEnquire={setEnquire}
                onDetail={handleDetail}
                onCompare={toggleCompare}
                isInCompare={compareIds.includes(v.id)} />
            ))}
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
      {detail && <VehicleDetailModal vehicle={detail} onClose={() => setDetail(null)} onEnquire={setEnquire} onCompare={toggleCompare} compareIds={compareIds} />}
      {showCompare && <CompareModal compareIds={compareIds} onClose={() => setShowCompare(false)} onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))} />}
      <Footer />
    </div>
  );
}
