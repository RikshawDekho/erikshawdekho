/**
 * VehicleDetail.jsx — Vehicle detail modal with specs, reviews, dealer info
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api, API } from "./api";
import { fmtINR, fmtDate, Card, Badge, Btn, Modal, Spinner, FUEL_COLOR } from "./ui";
import { useToast } from "./contexts";

function StarRating({ value, onChange, max = 5, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span key={star}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            fontSize: size, cursor: readOnly ? "default" : "pointer",
            color: star <= (hover || value) ? "#f59e0b" : "#e2e8f0",
            transition: "color 0.1s", userSelect: "none",
          }}>★</span>
      ))}
    </div>
  );
}

function AvgStars({ avg, count }) {
  if (!avg) return <span style={{ fontSize: 12, color: C.textDim }}>No reviews yet</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <StarRating value={Math.round(avg)} readOnly size={14} />
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{avg}</span>
      <span style={{ fontSize: 12, color: C.textDim }}>({count} review{count !== 1 ? "s" : ""})</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VEHICLE DETAIL MODAL
// ═══════════════════════════════════════════════════════
function VehicleDetailModal({ vehicle: v, onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState("overview"); // overview | reviews | enquiry
  const [dealerInfo, setDealerInfo] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ reviewer_name: "", reviewer_phone: "", rating: 0, comment: "" });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({ customer_name: "", phone: "", email: "", pincode: "", notes: `Interested in ${v.brand_name} ${v.model_name}` });
  const [enquirySending, setEnquirySending] = useState(false);

  useEffect(() => {
    if (v.dealer_id) {
      api.dealers.detail(v.dealer_id).then(d => {
        setDealerInfo(d.dealer);
        setReviews(d.reviews || []);
      }).catch(() => {});
    }
  }, [v.dealer_id]);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.reviewer_name.trim()) { toast("Please enter your name.", "warning"); return; }
    if (!reviewForm.reviewer_phone.trim()) { toast("Please enter your phone number.", "warning"); return; }
    if (reviewForm.rating === 0) { toast("Please select a star rating.", "warning"); return; }
    if (!reviewForm.comment.trim()) { toast("Please write a comment.", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(reviewForm.reviewer_phone.replace(/\D/g,"").slice(-10))) {
      toast("Enter a valid 10-digit Indian mobile number.", "warning"); return;
    }
    setReviewSaving(true);
    try {
      const r = await api.dealers.review(v.dealer_id, reviewForm);
      setReviews(prev => [r, ...prev]);
      setReviewForm({ reviewer_name: "", reviewer_phone: "", rating: 0, comment: "" });
      toast("Review submitted! Thank you.", "success");
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to submit review.";
      toast(msg, "error");
    }
    setReviewSaving(false);
  };

  const submitEnquiry = async (e) => {
    e.preventDefault();
    if (!enquiryForm.customer_name.trim()) { toast("नाम डालना ज़रूरी है। (Name is required.)", "warning"); return; }
    if (!enquiryForm.phone.trim()) { toast("मोबाइल नंबर डालना ज़रूरी है। (Mobile number is required.)", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(enquiryForm.phone.replace(/\D/g, "").slice(-10))) {
      toast("10 अंकों का सही मोबाइल नंबर डालें। (Enter valid 10-digit mobile.)", "warning"); return;
    }
    if (enquiryForm.pincode && !/^\d{6}$/.test(enquiryForm.pincode.trim())) {
      toast("Pin code 6 digits होना चाहिए। (Pin code must be 6 digits.)", "warning"); return;
    }
    if (enquiryForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiryForm.email)) {
      toast("Valid email address डालें।", "warning"); return;
    }
    setEnquirySending(true);
    try {
      const city = enquiryForm.pincode ? `PIN: ${enquiryForm.pincode}` : "";
      await api.enquiry({ ...enquiryForm, city, vehicle: v.id });
      toast("Enquiry भेज दी गई! Dealer 24 घंटों में call करेगा।", "success");
      setTab("overview");
      setEnquiryForm({ customer_name: "", phone: "", email: "", pincode: "", notes: `Interested in ${v.brand_name} ${v.model_name}` });
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Enquiry नहीं भेजी जा सकी। फिर कोशिश करें।";
      toast(msg, "error");
    }
    setEnquirySending(false);
  };

  const SPECS = [
    v.range_km         && ["Range",           `${v.range_km} km`],
    v.battery_capacity && ["Battery",          v.battery_capacity],
    v.max_speed        && ["Max Speed",        `${v.max_speed} km/h`],
    v.payload_kg       && ["Payload",          `${v.payload_kg} kg`],
    v.seating_capacity && ["Seating",          `${v.seating_capacity} persons`],
    v.warranty_years   && ["Warranty",         `${v.warranty_years} year${v.warranty_years > 1 ? "s" : ""}`],
    v.year             && ["Year",             v.year],
    v.hsn_code         && ["HSN Code",         v.hsn_code],
  ].filter(Boolean);

  return (
    <Modal title={`${v.brand_name} ${v.model_name}`} onClose={onClose} width={640}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: C.bg, borderRadius: 8, padding: 4 }}>
        {[["overview","Overview"],["reviews","Reviews"],["enquiry","Get Price"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "8px 4px", border: "none", borderRadius: 6,
            background: tab === id ? C.primary : "transparent",
            color: tab === id ? "#fff" : C.textMid,
            fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {/* Vehicle hero */}
          <div style={{ height: 140, background: `linear-gradient(135deg,${C.primary}15,${C.accent}15)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, marginBottom: 16 }}>🛺</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{fmtINR(v.price)}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>Ex-showroom price (incl. GST)</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge label={v.fuel_type} color={FUEL_COLOR[v.fuel_type]} />
              {v.stock_status === "out_of_stock" ? <Badge label="Out of Stock" color={C.danger} /> : <Badge label={`${v.stock_quantity || ""} in Stock`} color={C.success} />}
              {v.is_featured && <Badge label="Featured" color={C.accent} />}
            </div>
          </div>

          {v.description && <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, marginBottom: 16 }}>{v.description}</p>}

          {/* Specs grid */}
          {SPECS.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8 }}>Technical Specifications</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
                {SPECS.map(([label, val]) => (
                  <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label.toUpperCase()}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dealer info */}
          <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}22`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.text }}>🏪 Dealer Details</div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{dealerInfo?.dealer_name || v.dealer_name}</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>📍 {dealerInfo?.address || ""}{dealerInfo?.address ? ", " : ""}{v.dealer_city}, {v.dealer_state || ""}</div>
            {dealerInfo?.avg_rating && <div style={{ marginTop: 6 }}><AvgStars avg={dealerInfo.avg_rating} count={dealerInfo.review_count || 0} /></div>}
            {(dealerInfo?.phone || v.dealer_phone) && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`tel:${(dealerInfo?.phone || v.dealer_phone).replace(/\s/g,"")}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.success, color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  📞 Call Dealer — {dealerInfo?.phone || v.dealer_phone}
                </a>
                <Btn label="💬 Send Enquiry" color={C.primary} size="sm" onClick={() => setTab("enquiry")} />
              </div>
            )}
          </div>

          <Btn label="⭐ Rate This Dealer" color={C.accent} outline fullWidth size="sm" onClick={() => setTab("reviews")} />
        </div>
      )}

      {tab === "reviews" && (
        <div>
          {/* Average */}
          <div style={{ textAlign: "center", padding: "12px 0 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.text }}>{avgRating || "—"}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <StarRating value={Math.round(Number(avgRating) || 0)} readOnly size={20} />
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""} for {v.dealer_name}</div>
          </div>

          {/* Submit review form */}
          <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Write a Review</div>
            <form onSubmit={submitReview}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Field label="Your Name"><Input value={reviewForm.reviewer_name} onChange={v => setReviewForm(p => ({ ...p, reviewer_name: v }))} placeholder="Ramesh Kumar" /></Field>
                <Field label="Mobile Number"><Input value={reviewForm.reviewer_phone} onChange={v => setReviewForm(p => ({ ...p, reviewer_phone: v }))} placeholder="9876543210" /></Field>
              </div>
              <Field label="Rating">
                <StarRating value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} size={28} />
              </Field>
              <Field label="Your Review">
                <textarea value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} rows={3}
                  style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                  placeholder="How was your experience with this dealer?" />
              </Field>
              <Btn label={reviewSaving ? "Submitting..." : "Submit Review"} color={C.primary} type="submit" disabled={reviewSaving} />
            </form>
          </div>

          {/* Existing reviews */}
          {reviews.length === 0 && <div style={{ textAlign: "center", color: C.textDim, padding: 20, fontSize: 13 }}>No reviews yet. Be the first to review!</div>}
          {reviews.map((r, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.reviewer_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <StarRating value={r.rating} readOnly size={14} />
                  <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(r.created_at)}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, margin: 0 }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "enquiry" && (
        <div>
          <div style={{ background: `${C.primary}08`, borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13, color: C.primary }}>
            🛺 <b>{v.brand_name} {v.model_name}</b> — Starting at {fmtINR(v.price)}
          </div>
          <div style={{ background: `${C.success}12`, border: `1px solid ${C.success}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            🏪 Your enquiry will be sent to: <b>{v.dealer_name}</b>
            {v.dealer_city && <span style={{ color: C.textMid }}> · {v.dealer_city}</span>}
            {v.dealer_verified && <span style={{ marginLeft: 6, color: C.success, fontWeight: 600 }}>✓ Verified</span>}
          </div>
          {/* On-road price info banner */}
          <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>🛣️ On-Road Price में शामिल है:</div>
            <div style={{ color: C.textMid, lineHeight: 1.7 }}>
              Ex-Showroom: <b>{fmtINR(v.price)}</b> + Registration + Insurance + State Tax
              <br/>Dealer आपको exact on-road price बताएगा।
            </div>
          </div>
          <form onSubmit={submitEnquiry}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="आपका नाम / Your Name" required>
                <Input value={enquiryForm.customer_name} onChange={v2 => setEnquiryForm(p => ({ ...p, customer_name: v2 }))} placeholder="Ramesh Kumar" required />
              </Field>
              <Field label="Mobile Number *" required>
                <Input value={enquiryForm.phone} onChange={v2 => setEnquiryForm(p => ({ ...p, phone: v2 }))} placeholder="9876543210" type="tel" required />
              </Field>
              <Field label="Pin Code / पिन कोड">
                <Input value={enquiryForm.pincode} onChange={v2 => setEnquiryForm(p => ({ ...p, pincode: v2 }))} placeholder="110001" type="number" style={{ appearance: "none" }} />
              </Field>
              <Field label="Email (Optional)">
                <Input value={enquiryForm.email} onChange={v2 => setEnquiryForm(p => ({ ...p, email: v2 }))} placeholder="you@email.com" type="email" />
              </Field>
            </div>
            <Field label="Message / संदेश">
              <textarea value={enquiryForm.notes} onChange={e => setEnquiryForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                placeholder="Koi vishesh requirement... (Any specific requirements...)" />
            </Field>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14, lineHeight: 1.7 }}>
              ✓ Dealer 24 घंटों में संपर्क करेगा। &nbsp;✓ आपका नंबर किसी third party को नहीं दिया जाएगा।
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn label="वापस / Back" outline color={C.textMid} onClick={() => setTab("overview")} />
              <Btn label={enquirySending ? "भेज रहे हैं..." : "🛣️ Best Price / On-Road Price पाएं →"} color={C.primary} type="submit" disabled={enquirySending} fullWidth />
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}


export { StarRating, AvgStars };
export default VehicleDetailModal;
