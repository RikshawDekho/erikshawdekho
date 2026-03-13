/**
 * DealerMarketplace.jsx — Public marketplace view within dealer portal
 */
import { useState, useEffect } from "react";
import { useC } from "../theme";
import { api, API } from "./api";
import { fmtINR, Card, Spinner, FUEL_COLOR } from "./ui";
import VehicleDetailModal from "./VehicleDetail";

function Marketplace() {
  const C = useC();
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ fuel_type: "", search: "", city: "" });
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const pendingCityAction = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams(Object.fromEntries(Object.entries({ ...filter, city: cityFilter || filter.city }).filter(([, v]) => v)));
    if (sortBy) p.set("ordering", sortBy);
    api.marketplace(`?${p}`).then(d => setVehicles(d.results || [])).finally(() => setLoading(false));
  }, [filter, cityFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleNearMe = () => {
    pendingCityAction.current = (city) => { setCityFilter(city); };
    setShowCityModal(true);
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 16, padding: "32px 28px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", fontSize: 72, opacity: 0.25 }}>🛺</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>India's #1 Marketplace for eRickshaw & Auto-rickshaws</div>
        <div style={{ opacity: 0.85, marginBottom: 18 }}>Search, Compare & Buy New and Used eRickshaws in India</div>
        <div style={{ display: "flex", gap: 10, maxWidth: 520 }}>
          <Input value={filter.search} onChange={v => setFilter(p => ({ ...p, search: v }))} placeholder="Search by model or brand..." style={{ background: "rgba(255,255,255,0.9)", border: "none" }} />
          <Btn label="Search" color={C.accent} onClick={load} />
        </div>
      </div>

      {/* Fuel filter tabs + city + sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {["", "electric", "petrol", "cng", "lpg"].map(f => (
          <button key={f} onClick={() => setFilter(p => ({ ...p, fuel_type: f }))}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${filter.fuel_type === f ? C.primary : C.border}`, background: filter.fuel_type === f ? C.primary : "#fff", color: filter.fuel_type === f ? "#fff" : C.textMid, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All eRickshaws"}
          </button>
        ))}
        <button onClick={handleNearMe}
          style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${cityFilter ? C.success : C.border}`, background: cityFilter ? C.success : "#fff", color: cityFilter ? "#fff" : C.textMid, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
          📍 {cityFilter ? `Near: ${cityFilter}` : "Near Me"}
        </button>
        {cityFilter && (
          <button onClick={() => setCityFilter("")}
            style={{ padding: "5px 10px", borderRadius: 14, border: `1.5px solid ${C.danger}40`, background: `${C.danger}10`, color: C.danger, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
            ✕ Clear City
          </button>
        )}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", color: C.textMid, cursor: "pointer", background: C.surface }}>
          <option value="">Sort: Default</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
          <option value="best_price">Best Price Near Me</option>
        </select>
      </div>

      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, color: C.text }}>Browse New & Popular Models</div>

      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {vehicles.map(v => (
            <Card key={v.id} style={{ transition: "all 0.2s", border: `1.5px solid ${C.border}`, cursor: "pointer" }}
              onClick={() => setDetailVehicle(v)}>
              {(v.thumbnail || v.thumbnail_url)
                ? <img src={v.thumbnail || v.thumbnail_url} alt={v.model_name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />
                : <div style={{ height: 120, background: `linear-gradient(135deg,${C.primary}15,${C.accent}15)`, borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🛺</div>}
              <div style={{ fontWeight: 700, fontSize: 14 }}>{v.model_name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 6, flexWrap: "wrap" }}>
                <Badge label={v.fuel_type} color={FUEL_COLOR[v.fuel_type]} />
                <Badge label={v.brand_name} color={C.textMid} />
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>📍 {v.dealer_city}</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 12 }}>Starting at <span style={{ color: C.primary, fontWeight: 700, fontSize: 15 }}>{fmtINR(v.price)}</span></div>
              <Btn label="View Details & Price" color={C.primary} fullWidth size="sm" onClick={e => { e.stopPropagation(); setDetailVehicle(v); }} /></Card>
          ))}
        </div>
      )}

      {detailVehicle && <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />}

      {showCityModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Find Nearby Dealers</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>Enter your city to find dealers near you:</div>
            <input
              type="text"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && cityInput.trim()) { pendingCityAction.current?.(cityInput.trim()); setShowCityModal(false); setCityInput(""); } }}
              placeholder="e.g. Delhi, Mumbai, Lucknow"
              autoFocus
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", marginBottom: 16, background: C.bg, color: C.text, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCityModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMid, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => { if (cityInput.trim()) { pendingCityAction.current?.(cityInput.trim()); setShowCityModal(false); setCityInput(""); } }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Find Dealers</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default Marketplace;
