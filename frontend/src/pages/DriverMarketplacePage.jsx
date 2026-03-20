/**
 * DriverMarketplacePage — Vehicle browsing for drivers
 * Uses new NavbarNew + FooterNew + i18n. No login required.
 * Reuses existing marketplace logic with translations.
 */
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { useI18n } from "../i18n";
import { CardSkeleton } from "../components/PageSkeleton";
import { ROLE_C, TYPO, RADIUS, CONTROL, LAYOUT } from "../theme";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");
const G = ROLE_C.driver;

const FUEL_COLOR = { electric: "#16a34a", petrol: "#ea580c", cng: "#0891b2", lpg: "#7c3aed", diesel: "#475569" };
const FUEL_EMOJI = { electric: "⚡", petrol: "⛽", cng: "🔵", lpg: "🟣", diesel: "🖤" };
function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

/* ── Enquiry Modal ── */
function EnquiryModal({ vehicle, onClose, t }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", pincode: "", notes: vehicle ? `I am interested in ${vehicle.brand_name} ${vehicle.model_name}. Please contact me with the best price.` : "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const inp = { width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.md, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10, minHeight: CONTROL.md };

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) return setErr(t("err.phone_invalid"));
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) return setErr(t("err.pincode_invalid"));
    try {
      const body = { customer_name: form.name, phone: form.phone, city: form.city, pincode: form.pincode, brand_name: vehicle.brand_name, notes: form.notes, vehicle: vehicle.id };
      if (vehicle.dealer_id) body.dealer = vehicle.dealer_id;
      const res = await fetch(`${API}/public/enquiry/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) setSent(true); else setErr(t("err.generic"));
    } catch { setErr(t("err.network")); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "100%", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: G, fontSize: 17 }}>{t("success.enquiry")}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{vehicle.dealer_name ? `${vehicle.dealer_name} — ${t("success.dealer_contact")}` : t("success.dealer_contact")}</div>
            <button onClick={onClose} style={{ marginTop: 20, background: G, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("action.close")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{t("market.enquiry")} — {vehicle.brand_name} {vehicle.model_name}</div>
                {vehicle.dealer_name && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📍 {vehicle.dealer_name} · {vehicle.dealer_city}</div>}
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
            <form onSubmit={submit}>
              <input style={inp} placeholder={`${t("form.name")} *`} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              <input style={inp} placeholder={`${t("form.phone")} *`} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} inputMode="numeric" />
              <input style={inp} placeholder={`${t("form.pincode")} *`} value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} required maxLength={6} inputMode="numeric" />
              <input style={inp} placeholder={t("form.city")} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} placeholder={t("form.notes")} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              <button type="submit" style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", minHeight: 52 }}>
                {t("form.submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Stars helper ── */
function Stars({ value, size = 16 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= value ? "#f59e0b" : "#d1d5db" }}>★</span>
      ))}
    </span>
  );
}

/* ── Vehicle Detail Modal — Overview + Reviews + More from Dealer ── */
function VehicleDetailModal({ vehicle, onClose, onEnquire, onCompare, compareIds, t }) {
  const isInCompare = compareIds.includes(vehicle.id);
  const [tab, setTab] = useState("overview");
  const [imgIdx, setImgIdx] = useState(0);
  const [dealerData, setDealerData] = useState(null);
  const [reviewForm, setReviewForm] = useState({ reviewer_name: "", reviewer_phone: "", rating: 0, comment: "" });
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewErr, setReviewErr] = useState("");

  const allImgs = [vehicle.thumbnail, ...(vehicle.gallery_images || []).map(g => g.url)].filter(Boolean);

  useEffect(() => {
    if (!vehicle.dealer_id) return;
    fetch(`${API}/dealers/${vehicle.dealer_id}/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDealerData(d); })
      .catch(() => {});
  }, [vehicle.dealer_id]);

  const reviews = dealerData?.reviews || [];
  const moreVehicles = (dealerData?.vehicles || []).filter(v => v.id !== vehicle.id);
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const submitReview = async () => {
    setReviewErr("");
    if (!reviewForm.reviewer_name.trim()) return setReviewErr("Name is required.");
    if (!/^[6-9]\d{9}$/.test(reviewForm.reviewer_phone.replace(/\D/g,"").slice(-10))) return setReviewErr("Enter valid 10-digit mobile number.");
    if (!reviewForm.rating) return setReviewErr("Please select a star rating.");
    if (!reviewForm.comment.trim()) return setReviewErr("Please write a comment.");
    setReviewSending(true);
    try {
      const res = await fetch(`${API}/dealers/${vehicle.dealer_id}/reviews/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      if (res.ok) {
        const newReview = await res.json();
        setDealerData(prev => prev ? { ...prev, reviews: [newReview, ...prev.reviews] } : prev);
        setReviewSent(true);
        setReviewForm({ reviewer_name: "", reviewer_phone: "", rating: 0, comment: "" });
      } else setReviewErr("Failed to submit review. Try again.");
    } catch { setReviewErr("Network error. Try again."); }
    setReviewSending(false);
  };

  const specs = [
    vehicle.fuel_type && { label: t("spec.fuel_type"), val: `${FUEL_EMOJI[vehicle.fuel_type]} ${vehicle.fuel_type}` },
    vehicle.range_km && { label: t("spec.range"), val: `${vehicle.range_km} km` },
    vehicle.battery_capacity && { label: t("spec.battery"), val: vehicle.battery_capacity },
    vehicle.max_speed && { label: t("spec.max_speed"), val: `${vehicle.max_speed} km/h` },
    vehicle.payload_kg && { label: t("spec.payload"), val: `${vehicle.payload_kg} kg` },
    vehicle.seating_capacity && { label: t("spec.seating"), val: `${vehicle.seating_capacity}` },
    vehicle.warranty_years && { label: t("spec.warranty"), val: `${vehicle.warranty_years} yrs` },
    vehicle.year && { label: t("spec.year"), val: vehicle.year },
    vehicle.vehicle_type && { label: t("spec.type"), val: vehicle.vehicle_type },
  ].filter(Boolean);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "reviews",  label: `⭐ Reviews${reviews.length ? ` (${reviews.length})` : ""}` },
    { id: "more",     label: `🛺 More (${moreVehicles.length})` },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 620, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Image gallery */}
        <div style={{ height: 220, background: `linear-gradient(135deg,${G}12,#fbbf2415)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, position: "relative", overflow: "hidden", flexShrink: 0 }}>
          {allImgs.length > 0
            ? <img src={allImgs[imgIdx]} alt={vehicle.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} onError={e => e.target.style.display="none"} />
            : <span>🛺</span>}
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", width: 34, height: 34, borderRadius: "50%", fontSize: 18, cursor: "pointer" }}>✕</button>
          {allImgs.length > 1 && <>
            <button onClick={() => setImgIdx(i => (i - 1 + allImgs.length) % allImgs.length)}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 18 }}>‹</button>
            <button onClick={() => setImgIdx(i => (i + 1) % allImgs.length)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 18 }}>›</button>
            <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
              {allImgs.map((_, i) => <div key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s" }} />)}
            </div>
          </>}
          {vehicle.is_featured && <span style={{ position: "absolute", top: 12, left: 12, background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>⭐ Featured</span>}
        </div>

        {/* Header */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#111827" }}>{vehicle.brand_name} {vehicle.model_name}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>📍 {vehicle.dealer_name} · {vehicle.dealer_city}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                {vehicle.dealer_verified && <span style={{ fontSize: 11, color: G, fontWeight: 600 }}>✅ Verified Dealer</span>}
                {avgRating && <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>⭐ {avgRating} ({reviews.length} reviews)</span>}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Starting at</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: G }}>{fmtINR(vehicle.price)}</div>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 14 }}>
            <button onClick={() => { onClose(); onEnquire(vehicle); }}
              style={{ flex: 1, background: G, color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", minHeight: 48 }}>
              💬 Ask for Price
            </button>
            {vehicle.dealer_phone && (
              <a href={`tel:${vehicle.dealer_phone}`}
                style={{ flex: 1, background: "#f0fdf4", color: G, border: `2px solid ${G}`, padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", minHeight: 48, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                📞 Call Dealer
              </a>
            )}
            <button onClick={() => onCompare(vehicle.id)}
              style={{ padding: "13px 16px", background: isInCompare ? "#dbeafe" : "#f3f4f6", color: isInCompare ? "#1d4ed8" : "#374151", border: isInCompare ? "2px solid #3b82f6" : "2px solid #e5e7eb", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: 48 }}>
              {isInCompare ? "✓" : "⚖"}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: 16 }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 16px", border: "none", background: "none", fontWeight: tab === id ? 700 : 500, fontSize: 13, color: tab === id ? G : "#6b7280", borderBottom: tab === id ? `2px solid ${G}` : "2px solid transparent", marginBottom: -2, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: "0 20px 24px" }}>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div>
              {vehicle.description && (
                <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>{vehicle.description}</div>
              )}
              {vehicle.stock_status && (
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: vehicle.stock_status === "in_stock" ? G : vehicle.stock_status === "low_stock" ? "#f59e0b" : "#dc2626" }}>
                  {vehicle.stock_status === "in_stock" ? "✅ In Stock" : vehicle.stock_status === "low_stock" ? "⚠️ Limited Stock" : "❌ Out of Stock"}
                </div>
              )}
              {specs.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 10 }}>{t("spec.specifications")}</div>
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
            </div>
          )}

          {/* REVIEWS */}
          {tab === "reviews" && (
            <div>
              {/* Average rating */}
              {avgRating && (
                <div style={{ textAlign: "center", padding: "12px 0 20px", borderBottom: "1px solid #f3f4f6", marginBottom: 16 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: "#111827" }}>{avgRating}</div>
                  <Stars value={Math.round(Number(avgRating))} size={22} />
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""} for {vehicle.dealer_name}</div>
                </div>
              )}

              {/* Existing reviews */}
              {reviews.map((r, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f9fafb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{r.reviewer_name || "Customer"}</div>
                    <Stars value={r.rating} size={14} />
                  </div>
                  {r.comment && <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4, lineHeight: 1.6 }}>{r.comment}</div>}
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : ""}</div>
                </div>
              ))}

              {/* Submit review */}
              <div style={{ marginTop: 20, padding: 16, background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 12 }}>Rate {vehicle.dealer_name}</div>
                {reviewSent ? (
                  <div style={{ color: G, fontWeight: 600, textAlign: "center", padding: 12 }}>✅ Review submitted! Thank you.</div>
                ) : (
                  <>
                    {reviewErr && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{reviewErr}</div>}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setReviewForm(p => ({ ...p, rating: s }))}
                          style={{ fontSize: 26, background: "none", border: "none", cursor: "pointer", color: s <= reviewForm.rating ? "#f59e0b" : "#d1d5db", padding: "2px 4px", transition: "transform 0.1s" }}
                          onMouseEnter={e => e.target.style.transform = "scale(1.2)"}
                          onMouseLeave={e => e.target.style.transform = ""}>★</button>
                      ))}
                    </div>
                    <input placeholder="Your name *" value={reviewForm.reviewer_name} onChange={e => setReviewForm(p => ({ ...p, reviewer_name: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }} />
                    <input placeholder="Mobile number *" value={reviewForm.reviewer_phone} onChange={e => setReviewForm(p => ({ ...p, reviewer_phone: e.target.value.replace(/\D/g,"").slice(0,10) }))}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }} inputMode="numeric" maxLength={10} />
                    <textarea placeholder="Your experience with this dealer... *" value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} rows={3}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 10, boxSizing: "border-box" }} />
                    <button onClick={submitReview} disabled={reviewSending}
                      style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "12px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: reviewSending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: reviewSending ? 0.7 : 1 }}>
                      {reviewSending ? "Submitting..." : "⭐ Submit Review"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* MORE FROM DEALER */}
          {tab === "more" && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 14 }}>
                More vehicles from {vehicle.dealer_name}
              </div>
              {moreVehicles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13 }}>
                  No other vehicles listed by this dealer yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {moreVehicles.map(v => (
                    <div key={v.id} style={{ display: "flex", gap: 12, padding: 12, background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6", alignItems: "center" }}>
                      {(v.thumbnail || v.thumbnail_url)
                        ? <img src={v.thumbnail || v.thumbnail_url} alt={v.model_name} style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                        : <div style={{ width: 72, height: 56, background: `${G}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🛺</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.brand_name} {v.model_name}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>{FUEL_EMOJI[v.fuel_type]} {v.fuel_type} · {v.stock_status?.replace("_"," ")}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: G, marginTop: 2 }}>{fmtINR(v.price)}</div>
                      </div>
                      <button onClick={() => { onClose(); onEnquire(v); }}
                        style={{ background: G, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                        Ask Price
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── EMI Calculator Modal ── */
function EmiCalculatorModal({ onClose, t }) {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState(12);
  const [tenure, setTenure] = useState(36);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/emi-calculator/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principal: Number(principal) || 0, rate: Number(rate) || 0, tenure: Number(tenure) || 0 }),
      });
      if (res.ok) setResult(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const inp = { width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.md, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: CONTROL.md };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 460, maxWidth: "100%", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>💰 {t("emi.title")}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>{t("emi.principal")}</label>
            <input style={inp} type="number" inputMode="numeric" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 150000" min={0} step={5000} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>{t("emi.rate")}</label>
              <input style={inp} type="number" inputMode="decimal" value={rate} onChange={e => setRate(Number(e.target.value))} min={0} max={50} step={0.5} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>{t("emi.tenure")}</label>
              <input style={inp} type="number" inputMode="numeric" value={tenure} onChange={e => setTenure(Number(e.target.value))} min={1} max={120} />
            </div>
          </div>
        </div>
        <button onClick={calculate} disabled={loading || !Number(principal) || !Number(tenure)}
          style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", minHeight: 52, opacity: loading ? 0.6 : 1 }}>
          {loading ? "..." : `${t("emi.calculate")} →`}
        </button>
        {result && (
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #86efac" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{t("emi.monthly")}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: G }}>{fmtINR(result.emi)}</div>
            </div>
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #93c5fd" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{t("emi.total_payment")}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1d4ed8" }}>{fmtINR(result.total_payment)}</div>
            </div>
            <div style={{ background: "#fef3c7", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #fbbf24" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{t("emi.total_interest")}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#92400e" }}>{fmtINR(result.total_interest)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Compare Modal ── */
function CompareModal({ compareIds, onClose, onRemove, t }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

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
    { label: t("spec.fuel_type"), key: "fuel_type", fmt: v => `${FUEL_EMOJI[v] || ""} ${v}` },
    { label: `${t("spec.range")} (km)`, key: "range_km", fmt: v => v ? `${v} km` : "—" },
    { label: t("spec.battery"), key: "battery_capacity", fmt: v => v || "—" },
    { label: t("spec.max_speed"), key: "max_speed", fmt: v => v ? `${v} km/h` : "—" },
    { label: t("spec.payload"), key: "payload_kg", fmt: v => v ? `${v} kg` : "—" },
    { label: t("spec.seating"), key: "seating_capacity", fmt: v => v ? `${v}` : "—" },
    { label: t("spec.warranty"), key: "warranty_years", fmt: v => v ? `${v} yrs` : "—" },
    { label: t("spec.year"), key: "year", fmt: v => v || "—" },
    { label: t("nav.dealer"), key: "dealer_name", fmt: v => v || "—" },
    { label: t("form.city"), key: "dealer_city", fmt: v => v || "—" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 800, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>⚖ {t("compare.title")}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{vehicles.length} {t("compare.selected")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>{t("compare.loading")}</div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>{t("compare.none")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 600, minWidth: 100 }}>{t("compare.feature")}</th>
                  {vehicles.map(v => (
                    <th key={v.id} style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid #e5e7eb", minWidth: 140 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{v.brand_name} {v.model_name}</div>
                      <button onClick={() => onRemove(v.id)} style={{ fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>{t("compare.remove")}</button>
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
                      const isBest = key === "price" && v.price === Math.min(...vehicles.map(x => x.price || Infinity));
                      return (
                        <td key={v.id} style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #f3f4f6", fontWeight: isBest ? 800 : 400, color: isBest ? G : "#111827" }}>{val}</td>
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

/* ── Vehicle Card ── */
function VehicleCard({ v, onEnquire, onDetail, onCompare, isInCompare, t }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: isInCompare ? "2px solid #3b82f6" : "1px solid #e5e7eb", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}>
      <div onClick={() => onDetail(v)} style={{ height: 150, background: `linear-gradient(135deg, ${G}12, #fbbf2415)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, position: "relative", cursor: "pointer" }}>
        {v.thumbnail ? <img src={v.thumbnail} alt={v.model_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : "🛺"}
        {v.is_featured && <span style={{ position: "absolute", top: 8, right: 8, background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>⭐ {t("market.featured")}</span>}
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
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: G }}>{fmtINR(v.price)}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onCompare(v.id)} title={t("market.compare")}
              style={{ background: isInCompare ? "#dbeafe" : "#f3f4f6", color: isInCompare ? "#1d4ed8" : "#374151", border: isInCompare ? "2px solid #3b82f6" : "2px solid #e5e7eb", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 36, display: "flex", alignItems: "center", gap: 4 }}>{isInCompare ? "✓" : "⚖"} {t("market.compare")}</button>
            <button onClick={() => onEnquire(v)}
              style={{ background: G, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 36 }}>
              {t("market.enquiry")}
            </button>
          </div>
        </div>
        {v.stock_status === "low_stock" && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, fontWeight: 600 }}>⚠️ {t("market.low_stock")}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DRIVER MARKETPLACE PAGE
   ══════════════════════════════════════════════════════════ */
export default function DriverMarketplacePage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enquire, setEnquire] = useState(null);
  const [detail, setDetail] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showEmi, setShowEmi] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [featured, setFeatured] = useState([]);

  const fuel = params.get("fuel") || "";
  const search = params.get("search") || "";

  useEffect(() => { localStorage.setItem("erd_last_page", "/driver/marketplace"); }, []);

  // Fetch featured vehicles once on mount (independent of filters)
  useEffect(() => {
    fetch(`${API}/marketplace/?featured=true`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFeatured((d.results || []).slice(0, 8)); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (fuel) q.set("fuel_type", fuel);
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
    try {
      const res = await fetch(`${API}/public/vehicles/${v.id}/`);
      if (res.ok) { const data = await res.json(); setDetail(data); }
      else setDetail(v);
    } catch { setDetail(v); }
  };

  const inp = { padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.md, fontSize: 15, fontFamily: "inherit", outline: "none", minHeight: CONTROL.md };

  return (
    <div style={{ fontFamily: TYPO.body, background: "#f9fafb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <Navbar />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${G}, #15803d)`, color: "#fff", padding: "24px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, marginBottom: 4 }}>{t("market.title")}</h1>
          <p style={{ color: "#bbf7d0", fontSize: 14 }}>{t("market.subtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", position: "sticky", top: 60, zIndex: 50 }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, minWidth: 180 }} placeholder={`🔍 ${t("market.search")}`} value={search}
            onChange={e => setFilter("search", e.target.value)} />
          <select style={inp} value={fuel} onChange={e => setFilter("fuel", e.target.value)}>
            <option value="">{t("market.all_fuel")}</option>
            <option value="electric">⚡ {t("fuel.electric")}</option>
            <option value="cng">🔵 {t("fuel.cng")}</option>
            <option value="petrol">⛽ {t("fuel.petrol")}</option>
            <option value="lpg">🟣 {t("fuel.lpg")}</option>
            <option value="diesel">🖤 {t("fuel.diesel")}</option>
          </select>
          {(fuel || search) && (
            <button onClick={() => setParams({})} style={{ padding: "10px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#374151", minHeight: 46 }}>
              {t("market.clear")} ✕
            </button>
          )}
          {compareIds.length > 0 && (
            <button onClick={() => setShowCompare(true)}
              style={{ padding: "10px 18px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", minHeight: 46 }}>
              ⚖ {t("market.compare")} ({compareIds.length})
            </button>
          )}
          <button onClick={() => setShowEmi(true)}
            style={{ padding: "10px 18px", background: "#f0fdf4", color: G, border: `2px solid ${G}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", minHeight: 46 }}>
            💰 {t("emi.title")}
          </button>
          <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>{total} {t("market.vehicles_found")}</span>
        </div>
      </div>

      {/* ── Featured eRickshaws row (hidden when searching/filtering) ── */}
      {featured.length > 0 && !fuel && !search && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "20px 24px" }}>
          <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#92400e" }}>{t("market.featured") || "Featured eRickshaws"}</span>
              <span style={{ fontSize: 12, color: "#b45309", background: "#fef3c7", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                {featured.length} {t("market.vehicles_found") || "vehicles"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              <style>{`.erd-feat-scroll::-webkit-scrollbar{display:none}`}</style>
              {featured.map(v => {
                const img = v.thumbnail;
                return (
                  <div key={v.id} onClick={() => handleDetail(v)}
                    style={{ minWidth: 200, maxWidth: 200, background: "#fff", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "1.5px solid #fde68a", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "transform 0.15s", }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = ""}>
                    <div style={{ height: 110, background: "#f1f5f9", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {img ? <img src={img} alt={v.model_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /> : <span style={{ fontSize: 40 }}>🛺</span>}
                      <span style={{ position: "absolute", top: 6, left: 6, background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>⭐ Featured</span>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.model_name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.brand_name}</div>
                      <div style={{ fontWeight: 800, color: G, fontSize: 14 }}>₹{Number(v.price || 0).toLocaleString("en-IN")}</div>
                      {v.dealer_city && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>📍 {v.dealer_city}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", padding: "24px", width: "100%", flex: 1 }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            <CardSkeleton count={6} />
          </div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <div style={{ fontWeight: 700, color: "#374151" }}>{t("market.none")}</div>
            <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 6 }}>{t("market.try_filter")}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {vehicles.map(v => (
              <VehicleCard key={v.id} v={v}
                onEnquire={setEnquire}
                onDetail={handleDetail}
                onCompare={toggleCompare}
                isInCompare={compareIds.includes(v.id)}
                t={t} />
            ))}
          </div>
        )}

        {total > 20 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 32 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: page === 1 ? "not-allowed" : "pointer", background: "#fff", fontFamily: "inherit" }}>‹ {t("action.prev")}</button>
            <span style={{ padding: "8px 16px", background: G, color: "#fff", borderRadius: 8, fontWeight: 700 }}>{t("action.page")} {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={vehicles.length < 20}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: vehicles.length < 20 ? "not-allowed" : "pointer", background: "#fff", fontFamily: "inherit" }}>{t("action.next")} ›</button>
          </div>
        )}
      </div>

      {enquire && <EnquiryModal vehicle={enquire} onClose={() => setEnquire(null)} t={t} />}
      {detail && <VehicleDetailModal vehicle={detail} onClose={() => setDetail(null)} onEnquire={setEnquire} onCompare={toggleCompare} compareIds={compareIds} t={t} />}
      {showCompare && <CompareModal compareIds={compareIds} onClose={() => setShowCompare(false)} onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))} t={t} />}
      {showEmi && <EmiCalculatorModal onClose={() => setShowEmi(false)} t={t} />}
      <FooterNew />

      {/* Bottom spacer for mobile nav */}
      <div style={{ height: 60 }} className="mobile-bottom-spacer" />
      <style>{`@media (min-width: 769px) { .mobile-bottom-spacer { display: none; } }`}</style>
    </div>
  );
}
