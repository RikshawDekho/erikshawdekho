import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL || "https://api.erikshawdekho.com/api";
const G = "#16a34a";
const P = "#7c3aed";

function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

/* ── Financer Registration Form ── */
function FinancerRegForm({ onSuccess }) {
  const [form, setForm] = useState({ username: "", password: "", company_name: "", license_number: "", phone: "", city: "", state: "", interest_rate_min: "", interest_rate_max: "", loan_amount_min: "", loan_amount_max: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register/financer/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data);
      } else {
        setErr(typeof data === "object" ? Object.values(data).flat().join(" ") : "Registration failed.");
      }
    } catch { setErr("Network error."); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20, textAlign: "center", color: "#111827" }}>🏦 Financer Registration</div>
      {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input style={inp} placeholder="Username *" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
        <input style={inp} type="password" placeholder="Password *" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
        <input style={inp} placeholder="Company Name *" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} required />
        <input style={inp} placeholder="License Number" value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} />
        <input style={inp} placeholder="Phone *" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
        <input style={inp} placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
        <input style={inp} placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
        <input style={inp} type="number" step="0.1" placeholder="Min Interest Rate %" value={form.interest_rate_min} onChange={e => setForm(p => ({ ...p, interest_rate_min: e.target.value }))} />
        <input style={inp} type="number" step="0.1" placeholder="Max Interest Rate %" value={form.interest_rate_max} onChange={e => setForm(p => ({ ...p, interest_rate_max: e.target.value }))} />
        <input style={inp} type="number" placeholder="Min Loan Amount" value={form.loan_amount_min} onChange={e => setForm(p => ({ ...p, loan_amount_min: e.target.value }))} />
        <input style={inp} type="number" placeholder="Max Loan Amount" value={form.loan_amount_max} onChange={e => setForm(p => ({ ...p, loan_amount_max: e.target.value }))} />
      </div>
      <button type="submit" disabled={loading}
        style={{ width: "100%", background: P, color: "#fff", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
        {loading ? "Registering..." : "Register as Financer →"}
      </button>
    </form>
  );
}

/* ── Financer Dashboard (authenticated) ── */
function FinancerDashboard({ token, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("pan");
  const [docDesc, setDocDesc] = useState("");
  const [docFile, setDocFile] = useState(null);

  const authFetch = (path, opts = {}) => fetch(`${API}${path}`, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });

  useEffect(() => {
    authFetch("/financer/profile/").then(r => r.ok ? r.json() : null).then(d => d && setProfile(d));
    authFetch("/financer/documents/").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? setDocs(d) : setDocs(d?.results || []));
  }, []);

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("document_type", docType);
    fd.append("description", docDesc);
    fd.append("file", docFile);
    const res = await authFetch("/financer/documents/", { method: "POST", body: fd });
    if (res.ok) {
      const newDoc = await res.json();
      setDocs(prev => [...prev, newDoc]);
      setDocFile(null); setDocDesc("");
    }
    setUploading(false);
  };

  if (!profile) return <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#111827" }}>🏦 {profile.company_name}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>📍 {profile.city}{profile.state ? `, ${profile.state}` : ""} · {profile.phone}</div>
        </div>
        <button onClick={onLogout} style={{ background: "#f3f4f6", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
      </div>

      {/* Profile card */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb", marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#111827" }}>Profile Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { l: "License", v: profile.license_number || "—" },
            { l: "Interest Rate", v: profile.interest_rate_min && profile.interest_rate_max ? `${profile.interest_rate_min}% — ${profile.interest_rate_max}%` : "—" },
            { l: "Loan Range", v: profile.loan_amount_min && profile.loan_amount_max ? `${fmtINR(profile.loan_amount_min)} — ${fmtINR(profile.loan_amount_max)}` : "—" },
            { l: "Processing Fee", v: profile.processing_fee_pct ? `${profile.processing_fee_pct}%` : "—" },
            { l: "Status", v: profile.is_verified ? "✅ Verified" : "⏳ Pending Verification" },
          ].map(({ l, v }) => (
            <div key={l} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Document upload */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb", marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#111827" }}>📄 Documents</div>
        {docs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8, marginBottom: 8, border: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{d.document_type?.toUpperCase()} — {d.description || "No description"}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{d.is_verified ? "✅ Verified" : "⏳ Under review"}</div>
                </div>
                {d.file && <a href={d.file} target="_blank" rel="noreferrer" style={{ color: P, fontWeight: 600, fontSize: 12, textDecoration: "none" }}>View ↗</a>}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={uploadDoc} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <select value={docType} onChange={e => setDocType(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
            <option value="pan">PAN Card</option>
            <option value="aadhaar">Aadhaar</option>
            <option value="gst">GST Certificate</option>
            <option value="bank">Bank Statement</option>
            <option value="license">Business License</option>
            <option value="agreement">Agreement</option>
            <option value="other">Other</option>
          </select>
          <input type="text" placeholder="Description" value={docDesc} onChange={e => setDocDesc(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", flex: 1, minWidth: 140 }} />
          <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} style={{ fontSize: 12 }} />
          <button type="submit" disabled={uploading || !docFile}
            style={{ background: P, color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Public Financer listing ── */
function FinancerListing() {
  const [financers, setFinancers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/financers/`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setFinancers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading financers...</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: "#111827" }}>Available Financers</div>
      {financers.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No verified financers available yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {financers.map(f => (
            <div key={f.id} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{f.company_name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>📍 {f.city}{f.state ? `, ${f.state}` : ""}</div>
              {f.interest_rate_min && f.interest_rate_max && (
                <div style={{ fontSize: 13, color: P, fontWeight: 600, marginTop: 8 }}>
                  Interest: {f.interest_rate_min}% — {f.interest_rate_max}%
                </div>
              )}
              {f.loan_amount_min && f.loan_amount_max && (
                <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
                  Loan: {fmtINR(f.loan_amount_min)} — {fmtINR(f.loan_amount_max)}
                </div>
              )}
              {f.processing_fee_pct && (
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Processing fee: {f.processing_fee_pct}%</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FinancerPage() {
  const [mode, setMode] = useState("browse"); // browse, register, dashboard
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("erd_financer_token");
    return t || null;
  });

  const handleRegSuccess = (data) => {
    if (data.access) {
      localStorage.setItem("erd_financer_token", data.access);
      setToken(data.access);
      setMode("dashboard");
    } else {
      setMode("browse");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("erd_financer_token");
    setToken(null);
    setMode("browse");
  };

  // Auto-login if token exists
  useEffect(() => {
    if (token) setMode("dashboard");
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", background: "#fafafa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <Navbar />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${P}, #5b21b6)`, color: "#fff", padding: "36px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🏦</div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, marginBottom: 8 }}>E-Rickshaw Financer Ecosystem</h1>
          <p style={{ color: "#c4b5fd", fontSize: 15 }}>NBFC & financers — offer loans to e-rickshaw buyers across India</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 0 }}>
          {[
            { id: "browse", label: "Browse Financers" },
            { id: "register", label: "Register" },
            ...(token ? [{ id: "dashboard", label: "My Dashboard" }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              style={{ padding: "14px 20px", background: "none", border: "none", borderBottom: mode === t.id ? `3px solid ${P}` : "3px solid transparent", fontWeight: mode === t.id ? 700 : 500, fontSize: 14, color: mode === t.id ? P : "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px", width: "100%", flex: 1 }}>
        {mode === "browse" && <FinancerListing />}
        {mode === "register" && <FinancerRegForm onSuccess={handleRegSuccess} />}
        {mode === "dashboard" && token && <FinancerDashboard token={token} onLogout={handleLogout} />}
        {mode === "dashboard" && !token && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
            <div style={{ fontWeight: 700, color: "#111827", marginBottom: 8 }}>Login Required</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Please register first to access your dashboard.</div>
            <button onClick={() => setMode("register")} style={{ background: P, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Register Now</button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
