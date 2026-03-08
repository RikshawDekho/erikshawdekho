import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL;
const G   = "#16a34a";
const D   = "#1e3a8a";

function StarRating({ rating, size = 14 }) {
  if (!rating) return <span style={{ fontSize: size - 2, color: "#9ca3af" }}>No reviews yet</span>;
  return (
    <span style={{ fontSize: size, color: "#f59e0b" }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
      <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

function DealerCard({ d, onContact }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 12 }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: `linear-gradient(135deg, ${G}20, ${D}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
          {d.logo ? <img src={d.logo} alt={d.dealer_name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} /> : "🏪"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 2 }}>{d.dealer_name}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>📍 {d.city}{d.state ? `, ${d.state}` : ""}</div>
          <div style={{ marginTop: 4 }}><StarRating rating={d.avg_rating} /></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 14px", flex: 1, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: G }}>{d.vehicle_count}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Vehicles</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 14px", flex: 1, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#374151" }}>{d.review_count}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Reviews</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {d.phone && (
          <a href={`tel:${d.phone}`} style={{ flex: 1, background: G, color: "#fff", padding: "9px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            📞 Call Now
          </a>
        )}
        <button onClick={() => onContact(d)}
          style={{ flex: 1, background: "#fff", color: D, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1.5px solid ${D}`, cursor: "pointer", fontFamily: "inherit" }}>
          Enquiry भेजें
        </button>
      </div>
    </div>
  );
}

function ContactModal({ dealer, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", model: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr]   = useState("");
  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 };

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      const res = await fetch(`${API}/public/enquiry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: form.name, phone: form.phone, city: form.city, notes: form.model ? `Model preference: ${form.model}` : "" }),
      });
      if (res.ok) setSent(true);
      else setErr("Error. Please try again.");
    } catch { setErr("Network error."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "100%", padding: 28 }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: G, fontSize: 17 }}>Enquiry भेजी गई!</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{dealer.dealer_name} आपसे जल्द contact करेंगे।</div>
            <button onClick={onClose} style={{ marginTop: 20, background: G, color: "#fff", border: "none", padding: "10px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Enquiry — {dealer.dealer_name}</div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}
            <form onSubmit={submit}>
              <input style={inp} placeholder="आपका नाम *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              <input style={inp} placeholder="Mobile Number *" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
              <input style={inp} placeholder="आपका शहर" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <input style={inp} placeholder="कौन सा model चाहिए?" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
              <button type="submit" style={{ width: "100%", background: G, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                Enquiry भेजें →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function DealerDirectoryPage() {
  const [dealers, setDealers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [city, setCity]         = useState("");
  const [contact, setContact]   = useState(null);
  const [total, setTotal]       = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (city)   q.set("city", city);
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

  const inp = { padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" };

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", background: "#f9fafb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <Navbar />

      <div style={{ background: `linear-gradient(135deg, ${D}, #2563eb)`, color: "#fff", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, marginBottom: 4 }}>Dealer Directory</h1>
          <p style={{ color: "#bfdbfe", fontSize: 14 }}>अपने शहर के verified E-Rickshaw dealers खोजें</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 24px", position: "sticky", top: 64, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, minWidth: 180 }} placeholder="🔍 Search dealer name or city..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <input style={{ ...inp, width: 160 }} placeholder="City / जिला" value={city}
            onChange={e => setCity(e.target.value)} />
          {(search || city) && (
            <button onClick={() => { setSearch(""); setCity(""); }}
              style={{ padding: "10px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
              Clear ✕
            </button>
          )}
          <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>{total} dealers found</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px", width: "100%", flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>Loading dealers...
          </div>
        ) : dealers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <div style={{ fontWeight: 700, color: "#374151" }}>No dealers found</div>
            <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 6 }}>Try a different city or search term</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {dealers.map(d => <DealerCard key={d.id} d={d} onContact={setContact} />)}
          </div>
        )}
      </div>

      {/* Are you a dealer? */}
      <div style={{ background: `linear-gradient(135deg, ${G}, #15803d)`, color: "#fff", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(18px,3vw,24px)", marginBottom: 10 }}>क्या आप dealer हैं?</h2>
          <p style={{ color: "#bbf7d0", fontSize: 14, marginBottom: 20 }}>अपनी showroom free में list करें और हजारों buyers से connect करें</p>
          <Link to="/dashboard" style={{ background: "#fff", color: G, padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
            Register Your Showroom →
          </Link>
        </div>
      </div>

      {contact && <ContactModal dealer={contact} onClose={() => setContact(null)} />}
      <Footer />
    </div>
  );
}
