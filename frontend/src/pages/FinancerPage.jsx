import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavbarNew";
import FooterNew from "../components/FooterNew";
import { SectionSkeleton } from "../components/PageSkeleton";
import { ROLE_C, TYPO, RADIUS, CONTROL, LAYOUT } from "../theme";

const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");
const G = ROLE_C.driver;
const P = ROLE_C.financer;

function fmtINR(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

const STATUS_BADGE = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "⏳ Pending" },
  approved: { bg: "#dcfce7", color: "#166534", label: "✅ Approved" },
  rejected: { bg: "#fef2f2", color: "#dc2626", label: "❌ Rejected" },
  suspended: { bg: "#f3f4f6", color: "#6b7280", label: "🚫 Suspended" },
  submitted: { bg: "#dbeafe", color: "#1e40af", label: "📤 Submitted" },
  under_review: { bg: "#fef3c7", color: "#92400e", label: "🔍 Under Review" },
  docs_required: { bg: "#fff7ed", color: "#c2410c", label: "📋 Docs Required" },
  disbursed: { bg: "#dcfce7", color: "#166534", label: "💰 Disbursed" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280", label: "🚫 Cancelled" },
  draft: { bg: "#f3f4f6", color: "#6b7280", label: "📝 Draft" },
};

function Badge({ status }) {
  const s = STATUS_BADGE[status] || { bg: "#f3f4f6", color: "#6b7280", label: status };
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
}

/* ─── Login Form ────────────────────────────────────────── */
function FinancerLoginForm({ onSuccess }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inp = { width: "100%", padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.sm, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: CONTROL.md };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.access) {
        onSuccess(data);
      } else {
        setErr(data.detail || data.error || "Login failed. Check credentials.");
      }
    } catch { setErr("Network error."); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20, textAlign: "center", color: "#111827" }}>🔐 Financer Login</div>
      {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <input style={inp} placeholder="Email or Username *" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
        <input style={inp} type="password" placeholder="Password *" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
      </div>
      <button type="submit" disabled={loading}
        style={{ width: "100%", background: P, color: "#fff", padding: "13px", borderRadius: RADIUS.md, fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1, minHeight: CONTROL.md }}>
        {loading ? "Logging in..." : "Login →"}
      </button>
    </form>
  );
}

/* ─── Registration Form ─────────────────────────────────── */
function FinancerRegForm({ onSuccess }) {
  const [form, setForm] = useState({ email: "", password: "", company_name: "", contact_person: "", phone: "", city: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: RADIUS.sm, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: CONTROL.md };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) { setErr("Valid 10-digit Indian mobile number required."); setLoading(false); return; }
    if (form.password.length < 8) { setErr("Password must be at least 8 characters."); setLoading(false); return; }
    try {
      const res = await fetch(`${API}/auth/register/financer/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) onSuccess(data);
      else setErr(typeof data === "object" ? Object.values(data).flat().join(" ") : "Registration failed.");
    } catch { setErr("Network error."); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20, textAlign: "center", color: "#111827" }}>🏦 Financer Registration</div>
      {err && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input style={inp} type="email" placeholder="Email *" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
        <input style={inp} type="password" placeholder="Password * (min 8 chars)" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
        <input style={inp} placeholder="Company Name *" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} required />
        <input style={inp} placeholder="Contact Person" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
        <input style={inp} placeholder="Phone * (10 digits)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required maxLength={10} inputMode="numeric" />
        <input style={inp} placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
      </div>
      <button type="submit" disabled={loading}
        style={{ width: "100%", background: P, color: "#fff", padding: "13px", borderRadius: RADIUS.md, fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1, minHeight: CONTROL.md }}>
        {loading ? "Registering..." : "Register as Financer →"}
      </button>
    </form>
  );
}

/* ─── Dashboard Tab: Profile ────────────────────────────── */
function ProfileTab({ profile }) {
  if (!profile) return <SectionSkeleton rows={4} style={{ padding: 40 }} />;
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#111827" }}>Profile Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { l: "Company", v: profile.company_name },
          { l: "License", v: profile.license_number || "—" },
          { l: "Phone", v: profile.phone || "—" },
          { l: "Location", v: [profile.city, profile.state].filter(Boolean).join(", ") || "—" },
          { l: "Interest Rate", v: profile.interest_rate_min && profile.interest_rate_max ? `${profile.interest_rate_min}% — ${profile.interest_rate_max}%` : "—" },
          { l: "Loan Range", v: profile.min_loan_amount && profile.max_loan_amount ? `${fmtINR(profile.min_loan_amount)} — ${fmtINR(profile.max_loan_amount)}` : "—" },
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
  );
}

/* ─── Dashboard Tab: Dealer Associations ────────────────── */
function DealersTab({ authFetch }) {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    const qs = p.toString() ? `?${p}` : "";
    authFetch(`/financer/dealers/${qs}`)
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => { setDealers(Array.isArray(d) ? d : d?.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authFetch, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (dealerId, act) => {
    setActionLoading(dealerId);
    const res = await authFetch(`/financer/dealers/${dealerId}/approve/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: act }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showToast(data.message || `Dealer ${act}.`);
    } else {
      showToast(data.error || "Action failed.", "error");
    }
    load();
    setActionLoading(null);
  };

  const approvedCount = dealers.filter(d => d.association_status === "approved").length;

  if (loading) return <SectionSkeleton rows={3} style={{ padding: 40 }} />;

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: "10px 18px", borderRadius: 10, background: toast.type === "error" ? "#fef2f2" : "#dcfce7", color: toast.type === "error" ? "#dc2626" : "#166534", fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
          {toast.msg}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Dealer Network</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{approvedCount} approved dealers in your network</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="text" placeholder="Search dealers..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", minWidth: 160 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
            <option value="">All Dealers</option>
            <option value="approved">My Network (Approved)</option>
            <option value="pending">Pending Approval</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {dealers.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          {statusFilter ? `No dealers with status "${statusFilter}".` : "No verified dealers found."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dealers.map(d => (
            <div key={d.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{d.dealer_name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>📍 {d.city}{d.state ? `, ${d.state}` : ""} · {d.vehicle_count || 0} vehicles · 📞 {d.phone || "—"}</div>
                <div style={{ marginTop: 6 }}>
                  {d.association_status ? <Badge status={d.association_status} /> : <span style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Not Connected</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Financer proactively adds a dealer (no existing association) */}
                {!d.association_status && (
                  <button onClick={() => handleAction(d.id, "approved")} disabled={actionLoading === d.id}
                    style={{ background: P, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: actionLoading === d.id ? 0.6 : 1 }}>
                    {actionLoading === d.id ? "Adding..." : "➕ Add to Network"}
                  </button>
                )}
                {d.association_status === "pending" && (
                  <>
                    <button onClick={() => handleAction(d.id, "approved")} disabled={actionLoading === d.id}
                      style={{ background: G, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => handleAction(d.id, "rejected")} disabled={actionLoading === d.id}
                      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      ❌ Reject
                    </button>
                  </>
                )}
                {d.association_status === "approved" && (
                  <button onClick={() => handleAction(d.id, "suspended")} disabled={actionLoading === d.id}
                    style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Suspend
                  </button>
                )}
                {d.association_status === "suspended" && (
                  <button onClick={() => handleAction(d.id, "approved")} disabled={actionLoading === d.id}
                    style={{ background: G, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    ♻️ Re-activate
                  </button>
                )}
                {d.association_status === "rejected" && (
                  <button onClick={() => handleAction(d.id, "approved")} disabled={actionLoading === d.id}
                    style={{ background: P, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    ➕ Add Anyway
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Tab: Required Documents ─────────────────── */
function RequiredDocsTab({ authFetch }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDocType, setNewDocType] = useState("aadhaar");
  const [newDocDesc, setNewDocDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const DOC_TYPES = ["aadhaar", "pan", "voter_id", "driving_license", "bank_statement", "income_proof", "address_proof", "passport_photo", "vehicle_quotation", "form_16", "other"];

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/financer/required-documents/").then(r => r.ok ? r.json() : []).then(d => { setDocs(Array.isArray(d) ? d : d?.results || []); setLoading(false); }).catch(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const addDoc = async (e) => {
    e.preventDefault();
    setAdding(true);
    const res = await authFetch("/financer/required-documents/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_type: newDocType, description: newDocDesc, is_mandatory: true }),
    });
    if (res.ok) { load(); setNewDocDesc(""); }
    setAdding(false);
  };

  const deleteDoc = async (id) => {
    await authFetch(`/financer/required-documents/${id}/`, { method: "DELETE" });
    load();
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#111827" }}>Required Documents for Dealers</div>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Define which documents dealers must upload when applying for finance. These will be shown to dealers when they create finance applications.</p>

      {docs.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{(d.doc_type || d.document_type)?.replace(/_/g, " ").toUpperCase()}</span>
                {d.description && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>— {d.description}</span>}
                {d.is_mandatory && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, marginLeft: 8 }}>Mandatory</span>}
              </div>
              <button onClick={() => deleteDoc(d.id)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#dc2626" }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addDoc} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <select value={newDocType} onChange={e => setNewDocType(e.target.value)}
          style={{ padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</option>)}
        </select>
        <input type="text" placeholder="Description (optional)" value={newDocDesc} onChange={e => setNewDocDesc(e.target.value)}
          style={{ padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", flex: 1, minWidth: 160 }} />
        <button type="submit" disabled={adding}
          style={{ background: P, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: adding ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {adding ? "Adding..." : "+ Add Requirement"}
        </button>
      </form>
    </div>
  );
}

/* ─── Remarks Thread (shared component) ─────────────────── */
function RemarksThread({ remarks, onPost, posting, role }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [remarks]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onPost(text.trim());
    setText("");
  };

  return (
    <div style={{ border: "1px solid #e9d5ff", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", background: "#faf5ff", borderBottom: "1px solid #e9d5ff", fontWeight: 600, fontSize: 12, color: P }}>
        💬 Remarks Thread ({remarks.length})
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {remarks.length === 0 && <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: "10px 0" }}>No remarks yet. Start the conversation.</div>}
        {remarks.map(r => {
          const isMe = r.author_type === role;
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%", padding: "8px 12px", borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0",
                background: isMe ? P : "#f3f4f6", color: isMe ? "#fff" : "#111827", fontSize: 13,
              }}>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 3 }}>
                  {isMe ? "You" : (r.author_type === "financer" ? "Financer" : "Dealer")} · {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </div>
                {r.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid #e9d5ff", background: "#faf5ff" }}>
        <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Add a remark..."
          style={{ flex: 1, padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        <button type="submit" disabled={posting || !text.trim()}
          style={{ background: P, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: posting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: posting ? 0.6 : 1 }}>
          {posting ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

/* ─── Dashboard Tab: Finance Applications ───────────────── */
function ApplicationsTab({ authFetch }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ notes: "" });
  const [postingRemark, setPostingRemark] = useState(false);
  const [localRemarks, setLocalRemarks] = useState({}); // appId → remarks[]

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/financer/applications/").then(r => r.ok ? r.json() : []).then(d => {
      const list = Array.isArray(d) ? d : d?.results || [];
      setApps(list);
      // Build local remarks cache from embedded data
      const rm = {};
      list.forEach(a => { if (a.remarks) rm[a.id] = a.remarks; });
      setLocalRemarks(rm);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (appId, newStatus) => {
    await authFetch(`/financer/applications/${appId}/update-status/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, status_notes: statusUpdate.notes }),
    });
    setStatusUpdate({ notes: "" });
    setExpanded(null);
    load();
  };

  const postRemark = async (appId, content) => {
    setPostingRemark(true);
    const res = await authFetch(`/financer/applications/${appId}/remarks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const remark = await res.json();
      setLocalRemarks(prev => ({ ...prev, [appId]: [...(prev[appId] || []), remark] }));
    }
    setPostingRemark(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading applications...</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#111827" }}>Finance Applications ({apps.length})</div>
      {apps.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No applications yet. Dealers will submit loan applications here.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {apps.map(app => (
            <div key={app.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", flexWrap: "wrap", gap: 8 }}
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                    {app.customer_name} — {fmtINR(app.loan_amount_requested || app.loan_amount)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Dealer: {app.dealer_name || "—"} · {app.customer_phone} · Tenure: {app.loan_tenure_months || app.tenure_months}mo
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge status={app.status} />
                    {(localRemarks[app.id]?.length || 0) > 0 && (
                      <span style={{ background: "#ede9fe", color: P, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                        💬 {localRemarks[app.id].length} remark{localRemarks[app.id].length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: "#9ca3af" }}>{expanded === app.id ? "▲" : "▼"}</span>
              </div>

              {expanded === app.id && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, marginBottom: 16 }}>
                    {[
                      { l: "Vehicle", v: app.vehicle_description || app.vehicle || "—" },
                      { l: "Loan Amount", v: fmtINR(app.loan_amount_requested || app.loan_amount) },
                      { l: "Down Payment", v: fmtINR(app.down_payment) },
                      { l: "Tenure", v: `${app.loan_tenure_months || app.tenure_months} months` },
                      { l: "Customer Phone", v: app.customer_phone },
                      { l: "Customer Aadhaar", v: app.customer_aadhaar || "—" },
                      { l: "Customer PAN", v: app.customer_pan || "—" },
                      { l: "Submitted", v: app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "—" },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>{l}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Documents uploaded by dealer */}
                  {app.documents && app.documents.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 8 }}>📄 Uploaded Documents ({app.documents.length})</div>
                      {app.documents.map(doc => (
                        <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: "#f9fafb", borderRadius: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#374151" }}>{doc.doc_type?.replace(/_/g, " ").toUpperCase()} {doc.notes ? `— ${doc.notes}` : ""}</span>
                          {doc.file && <a href={doc.file} target="_blank" rel="noreferrer" style={{ color: P, fontWeight: 600, fontSize: 11 }}>View ↗</a>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status update */}
                  {["submitted", "under_review", "docs_required", "approved"].includes(app.status) && (
                    <div style={{ padding: 14, background: "#faf5ff", borderRadius: 10, border: "1px solid #e9d5ff", marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: P, marginBottom: 8 }}>Update Status</div>
                      <input type="text" placeholder="Notes for dealer (optional)" value={statusUpdate.notes} onChange={e => setStatusUpdate({ notes: e.target.value })}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {app.status === "submitted" && (
                          <button onClick={() => updateStatus(app.id, "under_review")} style={{ background: "#fef3c7", color: "#92400e", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            🔍 Start Review
                          </button>
                        )}
                        <button onClick={() => updateStatus(app.id, "docs_required")} style={{ background: "#fff7ed", color: "#c2410c", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          📋 Request Docs
                        </button>
                        <button onClick={() => updateStatus(app.id, "approved")} style={{ background: "#dcfce7", color: "#166534", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => updateStatus(app.id, "rejected")} style={{ background: "#fef2f2", color: "#dc2626", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          ❌ Reject
                        </button>
                        {app.status !== "submitted" && (
                          <button onClick={() => updateStatus(app.id, "disbursed")} style={{ background: P, color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            💰 Mark Disbursed
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Remarks thread */}
                  <RemarksThread
                    remarks={localRemarks[app.id] || []}
                    onPost={(content) => postRemark(app.id, content)}
                    posting={postingRemark}
                    role="financer"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Tab: Subscription & Plans ───────────────── */
function SubscriptionTab({ authFetch }) {
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch("/financer/subscription/").then(r => r.ok ? r.json() : null),
      fetch(`${API}/financer/plans/`).then(r => r.ok ? r.json() : []),
    ]).then(([s, p]) => {
      setSub(s);
      setPlans(Array.isArray(p) ? p : p?.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authFetch]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div>
      {/* Current subscription */}
      {sub && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#111827" }}>Current Subscription</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "10px 14px", background: "#faf5ff", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Plan</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: P, marginTop: 2 }}>{sub.plan_name || "Free Trial"}</div>
            </div>
            <div style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Applications Used</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2 }}>
                {sub.applications_used || 0} / {sub.max_applications === 0 ? "∞" : (sub.max_applications || 5)}
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Dealer Limit</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2 }}>
                {sub.max_dealer_associations === 0 ? "Unlimited" : (sub.max_dealer_associations ?? 2)}
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Commission / Lead</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2 }}>
                {sub.commission_per_lead ? fmtINR(sub.commission_per_lead) : "—"}
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Expires</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2 }}>{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("en-IN") : "No expiry"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Available plans */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#111827" }}>Available Plans</div>
      {plans.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No plans configured yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {plans.map(plan => {
            // Compare using plan_slug (API field) vs plan.slug
            const isCurrent = sub && sub.plan_slug === plan.slug;
            return (
              <div key={plan.id} style={{
                background: isCurrent ? "#faf5ff" : "#fff", borderRadius: 14, padding: 24,
                border: isCurrent ? `2px solid ${P}` : "1px solid #e5e7eb", textAlign: "center",
              }}>
                {isCurrent && <div style={{ background: P, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, display: "inline-block", marginBottom: 10 }}>✓ Current Plan</div>}
                <div style={{ fontWeight: 800, fontSize: 18, color: "#111827", marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: P, marginBottom: 4 }}>
                  {plan.price_per_year > 0 ? `${fmtINR(plan.price_per_year)}/yr` : "Free"}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.8 }}>
                  {plan.max_dealer_associations === 0 ? "Unlimited dealers" : `Up to ${plan.max_dealer_associations} dealers`}<br />
                  {plan.max_finance_applications === 0 ? "Unlimited applications" : `${plan.max_finance_applications} applications`}<br />
                  {plan.commission_per_lead && `${fmtINR(plan.commission_per_lead)} commission/lead`}
                </div>
                {!isCurrent && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Contact admin to upgrade</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Tab: My Documents ───────────────────────── */
function MyDocsTab({ authFetch }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("pan");
  const [docDesc, setDocDesc] = useState("");
  const [docFile, setDocFile] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/financer/documents/").then(r => r.ok ? r.json() : []).then(d => { setDocs(Array.isArray(d) ? d : d?.results || []); setLoading(false); }).catch(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("doc_type", docType);
    fd.append("description", docDesc);
    fd.append("file", docFile);
    const res = await authFetch("/financer/documents/", { method: "POST", body: fd });
    if (res.ok) { load(); setDocFile(null); setDocDesc(""); }
    setUploading(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#111827" }}>📄 My Documents</div>
      {docs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {docs.map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8, marginBottom: 8, border: "1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{(d.doc_type || d.document_type)?.replace(/_/g, " ").toUpperCase()} — {d.description || d.title || "No description"}</div>
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
  );
}

/* ─── Public Financer listing ───────────────────────────── */
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
              {f.min_loan_amount && f.max_loan_amount && (
                <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
                  Loan: {fmtINR(f.min_loan_amount)} — {fmtINR(f.max_loan_amount)}
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

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function FinancerPage() {
  const [mode, setMode] = useState("browse"); // browse | login | register | dashboard
  const [token, setToken] = useState(() => localStorage.getItem("erd_financer_token") || null);
  const [dashTab, setDashTab] = useState("profile");
  const [profile, setProfile] = useState(null);

  const authFetch = useCallback((path, opts = {}) => {
    const headers = { Authorization: `Bearer ${token}`, ...(opts.headers || {}) };
    return fetch(`${API}${path}`, { ...opts, headers });
  }, [token]);

  // Load profile when token is available
  useEffect(() => {
    if (!token) return;
    authFetch("/financer/profile/").then(r => {
      if (r.ok) return r.json();
      // Token expired
      localStorage.removeItem("erd_financer_token");
      setToken(null);
      setMode("login");
      return null;
    }).then(d => d && setProfile(d));
  }, [token, authFetch]);

  const handleLoginSuccess = (data) => {
    if (data.access) {
      localStorage.setItem("erd_financer_token", data.access);
      if (data.refresh) localStorage.setItem("erd_financer_refresh", data.refresh);
      setToken(data.access);
      setMode("dashboard");
    }
  };

  const handleRegSuccess = (data) => {
    if (data.access) {
      localStorage.setItem("erd_financer_token", data.access);
      if (data.refresh) localStorage.setItem("erd_financer_refresh", data.refresh);
      setToken(data.access);
      setMode("dashboard");
    } else {
      setMode("login");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("erd_financer_token");
    localStorage.removeItem("erd_financer_refresh");
    setToken(null);
    setProfile(null);
    setMode("browse");
  };

  // Auto-login if token exists
  useEffect(() => {
    if (token) setMode("dashboard");
  }, []);

  const DASH_TABS = [
    { id: "profile", label: "👤 Profile" },
    { id: "dealers", label: "🤝 Dealers" },
    { id: "requirements", label: "📋 Required Docs" },
    { id: "applications", label: "📨 Applications" },
    { id: "documents", label: "📄 My Docs" },
    { id: "subscription", label: "💎 Plans" },
  ];

  return (
    <div style={{ fontFamily: TYPO.body, background: "#fafafa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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

      {/* Top tab bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto" }}>
          {[
            { id: "browse", label: "Browse Financers" },
            { id: "login", label: "Login" },
            { id: "register", label: "Register" },
            ...(token ? [{ id: "dashboard", label: "Dashboard" }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              style={{ padding: "14px 20px", background: "none", border: "none", borderBottom: mode === t.id ? `3px solid ${P}` : "3px solid transparent", fontWeight: mode === t.id ? 700 : 500, fontSize: 14, color: mode === t.id ? P : "#6b7280", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: LAYOUT.contentWidthNarrow, margin: "0 auto", padding: "28px 24px", width: "100%", flex: 1 }}>
        {mode === "browse" && <FinancerListing />}
        {mode === "login" && (
          <div>
            <FinancerLoginForm onSuccess={handleLoginSuccess} />
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6b7280" }}>
              Don't have an account? <button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: P, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Register →</button>
            </div>
          </div>
        )}
        {mode === "register" && (
          <div>
            <FinancerRegForm onSuccess={handleRegSuccess} />
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6b7280" }}>
              Already registered? <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: P, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Login →</button>
            </div>
          </div>
        )}
        {mode === "dashboard" && token && (
          <div>
            {/* Dashboard header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 22, color: "#111827" }}>🏦 {profile?.company_name || "Dashboard"}</div>
                {profile && <div style={{ fontSize: 13, color: "#6b7280" }}>📍 {profile.city}{profile.state ? `, ${profile.state}` : ""} · {profile.is_verified ? "✅ Verified" : "⏳ Pending verification"}</div>}
              </div>
              <button onClick={handleLogout} style={{ background: "#f3f4f6", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
            </div>

            {/* Dashboard sub-tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
              {DASH_TABS.map(t => (
                <button key={t.id} onClick={() => setDashTab(t.id)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: dashTab === t.id ? 700 : 500,
                    background: dashTab === t.id ? P : "#f3f4f6", color: dashTab === t.id ? "#fff" : "#374151",
                    border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {dashTab === "profile" && <ProfileTab profile={profile} />}
            {dashTab === "dealers" && <DealersTab authFetch={authFetch} />}
            {dashTab === "requirements" && <RequiredDocsTab authFetch={authFetch} />}
            {dashTab === "applications" && <ApplicationsTab authFetch={authFetch} />}
            {dashTab === "documents" && <MyDocsTab authFetch={authFetch} />}
            {dashTab === "subscription" && <SubscriptionTab authFetch={authFetch} />}
          </div>
        )}
        {mode === "dashboard" && !token && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
            <div style={{ fontWeight: 700, color: "#111827", marginBottom: 8 }}>Login Required</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Please login to access your dashboard.</div>
            <button onClick={() => setMode("login")} style={{ background: P, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Login Now →</button>
          </div>
        )}
      </div>

      <FooterNew />
      {/* Bottom spacer for mobile nav */}
      <div style={{ height: 60 }} className="mobile-bottom-spacer" />
      <style>{`@media (min-width: 769px) { .mobile-bottom-spacer { display: none; } }`}</style>
    </div>
  );
}
