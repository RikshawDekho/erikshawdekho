/**
 * DriverDealerDirectoryPage — Dealer showroom directory
 * Benchmark: Zomato restaurant listing / App Store card standards
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { useI18n } from "../i18n";
import { CardSkeleton } from "../components/PageSkeleton";
import { ROLE_C, TYPO, RADIUS, CONTROL, LAYOUT } from "../theme";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");
const G = ROLE_C.driver;
const D = ROLE_C.dealer;

function StarRating({ rating, count, size = 13 }) {
  if (!rating) return <span style={{ fontSize: size - 1, color: "#9ca3af" }}>No reviews yet</span>;
  const rounded = Math.round(rating);
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: size }}>
      <span style={{ color: "#f59e0b" }}>{"★".repeat(rounded)}{"☆".repeat(5 - rounded)}</span>
      <span style={{ color: "#374151", fontWeight: 700 }}>{rating.toFixed(1)}</span>
      {count > 0 && <span style={{ color: "#9ca3af" }}>({count})</span>}
    </span>
  );
}

function DealerCard({ d, onContact, t }) {
  const coverBg = `linear-gradient(135deg, ${D}cc, #1d4ed8cc)`;

  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      display: "flex", flexDirection: "column",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = ""; }}>

      {/* Cover Image / Banner — 148px min per AGENTS.md */}
      <div style={{ position: "relative", height: 148, background: coverBg, flexShrink: 0, overflow: "hidden" }}>
        {d.cover_image ? (
          <img src={d.cover_image} alt={d.dealer_name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, opacity: 0.3, color: "#fff" }}>🏪</div>
        )}

        {/* Verified badge */}
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(22,163,74,0.9)", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          ✅ Verified
        </div>

        {/* Logo overlapping cover at bottom-left */}
        <div style={{ position: "absolute", bottom: -22, left: 16, width: 56, height: 56, borderRadius: 12, background: "#fff", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          {d.logo
            ? <img src={d.logo} alt={d.dealer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
            : "🏪"}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "30px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Name + location */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#111827", lineHeight: 1.3 }}>{d.dealer_name}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>📍 {d.city}{d.state ? `, ${d.state}` : ""}</div>
        </div>

        {/* Rating */}
        <StarRating rating={d.avg_rating} count={d.review_count} />

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "6px 12px", flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: G }}>{d.vehicle_count || 0}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{t("spec.vehicles")}</div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "6px 12px", flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#374151" }}>{d.review_count || 0}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{t("spec.reviews")}</div>
          </div>
        </div>

        {/* Description */}
        {d.description ? (
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {d.description}
          </p>
        ) : null}

        {/* CTAs — full width per AGENTS.md */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
          {d.phone && (
            <a href={`tel:${d.phone}`} style={{ flex: 1, background: G, color: "#fff", padding: "11px 0", borderRadius: 10, textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 44 }}>
              📞 {t("dir.call")}
            </a>
          )}
          <button onClick={() => onContact(d)}
            style={{ flex: 1, background: "#fff", color: D, padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, border: `2px solid ${D}`, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
            {t("market.enquiry")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ dealer, onClose, t, lang }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", model: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const inp = { width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.md, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10, minHeight: CONTROL.md };

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) return setErr(t("err.phone_invalid"));
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: form.name, phone: form.phone, city: form.city, dealer: dealer.id, notes: form.model ? `Model preference: ${form.model}` : "" }),
      });
      if (res.ok) setSent(true); else setErr(t("err.generic"));
    } catch { setErr(t("err.network")); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "100%", padding: 28 }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: G, fontSize: 17 }}>{t("success.enquiry")}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{dealer.dealer_name} — {t("success.dealer_contact")}</div>
            <button onClick={onClose} style={{ marginTop: 20, background: G, color: "#fff", border: "none", padding: "10px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("action.close")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{t("market.enquiry")} — {dealer.dealer_name}</div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
            <form onSubmit={submit}>
              <input style={inp} placeholder={`${t("form.name")} *`} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              <input style={inp} placeholder={`${t("form.phone")} *`} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} inputMode="numeric" />
              <input style={inp} placeholder={t("form.city")} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <input style={inp} placeholder={lang === "en" ? "Which model are you looking for?" : "कौन सा model चाहिए?"} value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
              <button type="submit" style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", minHeight: 52 }}>
                {t("market.enquiry")} →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function DriverDealerDirectoryPage() {
  const { t, lang } = useI18n();
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => { localStorage.setItem("erd_last_page", "/driver/dealers"); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (city) q.set("city", city);
    if (search) q.set("search", search);
    const res = await fetch(`${API}/dealers/?${q}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setDealers(d.results || []);
      setTotal(d.count || 0);
    }
    setLoading(false);
  }, [city, search]);

  useEffect(() => { load(); }, [load]);

  const inp = { padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.md, fontSize: 15, fontFamily: "inherit", outline: "none", minHeight: CONTROL.md };

  return (
    <div style={{ fontFamily: TYPO.body, background: "#f9fafb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <Navbar />

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${D}, #2563eb)`, color: "#fff", padding: "28px 24px 32px" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 800, marginBottom: 6 }}>{t("dir.title")}</h1>
          <p style={{ color: "#bfdbfe", fontSize: 14, marginBottom: 0 }}>{t("dir.subtitle")}</p>
        </div>
      </div>

      {/* Sticky Filters */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", position: "sticky", top: 60, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, minWidth: 180 }} placeholder={`🔍 ${t("dir.search")}`} value={search}
            onChange={e => setSearch(e.target.value)} />
          <input style={{ ...inp, width: 150 }} placeholder={`📍 ${t("form.city")}`} value={city}
            onChange={e => setCity(e.target.value)} />
          {(search || city) && (
            <button onClick={() => { setSearch(""); setCity(""); }}
              style={{ padding: "10px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", minHeight: 46 }}>
              {t("action.clear")} ✕
            </button>
          )}
          <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto", flexShrink: 0 }}>{total} {t("dir.dealers_found")}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: LAYOUT.contentWidth, margin: "0 auto", padding: "24px 24px 40px", width: "100%", flex: 1 }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            <CardSkeleton count={6} />
          </div>
        ) : dealers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <div style={{ fontWeight: 700, color: "#374151" }}>{t("market.none")}</div>
            <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 6 }}>{t("market.try_filter")}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {dealers.map(d => <DealerCard key={d.id} d={d} onContact={setContact} t={t} />)}
          </div>
        )}
      </div>

      {/* Are you a dealer? CTA */}
      <div style={{ background: `linear-gradient(135deg, ${G}, #15803d)`, color: "#fff", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(18px,3vw,24px)", marginBottom: 10 }}>{t("dir.are_you_dealer")}</h2>
          <p style={{ color: "#bbf7d0", fontSize: 14, marginBottom: 20 }}>{t("dir.list_free")}</p>
          <Link to="/dealer" style={{ background: "#fff", color: G, padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
            {t("dir.register")}
          </Link>
        </div>
      </div>

      {contact && <ContactModal dealer={contact} onClose={() => setContact(null)} t={t} lang={lang} />}
      <FooterNew />

      <div style={{ height: 60 }} className="mobile-bottom-spacer" />
      <style>{`@media (min-width: 769px) { .mobile-bottom-spacer { display: none; } }`}</style>
    </div>
  );
}
