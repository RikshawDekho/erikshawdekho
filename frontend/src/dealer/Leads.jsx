/**
 * Leads.jsx — Lead management, enquiries
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { fmtINR, fmtDate, Card, Badge, Btn, Modal, Field, Input, Select, Spinner, Table, Pagination, DateFilter, LEAD_COLOR } from "./ui";
import { useToast } from "./contexts";

function Leads({ onNavigate }) {
  const C = useC();
  const toast = useToast();
  const plan = usePlan();
  const [tab, setTab] = useState("leads"); // "leads" | "enquiries"
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", email: "", source: "website", status: "new", notes: "", vehicle: "" });
  const [vehicles, setVehicles] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const debouncedLeadSearch = useDebounce(leadSearch, 300);
  const [enquiryPage, setEnquiryPage] = useState(1);
  const [enquiryTotal, setEnquiryTotal] = useState(0);
  const [enquirySearch, setEnquirySearch] = useState("");
  const debouncedEnquirySearch = useDebounce(enquirySearch, 350);
  const [enquiryDateFrom, setEnquiryDateFrom] = useState("");
  const [enquiryDateTo, setEnquiryDateTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.leads.list(qs)
      .then(d => setLeads(d.results || d))
      .catch(err => { console.error("Failed to load leads:", err); setError("Failed to load leads. Please try again."); })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const loadEnquiries = useCallback(() => {
    setEnquiriesLoading(true);
    const p = new URLSearchParams();
    if (debouncedEnquirySearch) p.set("search", debouncedEnquirySearch);
    if (enquiryDateFrom)        p.set("date_from", enquiryDateFrom);
    if (enquiryDateTo)          p.set("date_to", enquiryDateTo);
    p.set("page", enquiryPage);
    api.enquiries.list(`?${p}`).then(d => { setEnquiries(d.results || []); setEnquiryTotal(d.count || 0); }).catch(() => {}).finally(() => setEnquiriesLoading(false));
  }, [debouncedEnquirySearch, enquiryDateFrom, enquiryDateTo, enquiryPage]);

  useEffect(() => {
    load();
    api.vehicles.list()
      .then(d => setVehicles(d.results || d))
      .catch(err => console.error("Failed to load vehicles:", err));
  }, [load]);

  // Poll enquiries every 30 seconds when on that tab
  useEffect(() => {
    if (tab !== "enquiries") return;
    loadEnquiries();
    const id = setInterval(loadEnquiries, 30000);
    return () => clearInterval(id);
  }, [tab, loadEnquiries]);

  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { toast("Customer name is required.", "warning"); return; }
    if (!form.phone.trim()) { toast("Phone number is required.", "warning"); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      toast("Please enter a valid 10-digit Indian mobile number.", "warning"); return;
    }
    try {
      await api.leads.create(form);
      toast("Lead added successfully!", "success");
      setShowAdd(false); load();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add lead.";
      toast(msg, "error");
    }
  };

  const updateStatus = async (id, status) => {
    await api.leads.update(id, { status });
    setLeads(p => p.map(l => l.id === id ? { ...l, status } : l));
  };

  const markEnquiryProcessed = async (id) => {
    await api.enquiries.markProcessed(id);
    setEnquiries(p => p.map(e => e.id === id ? { ...e, is_processed: true } : e));
    toast("Marked as processed.", "success");
  };

  const filteredLeads = leads.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (debouncedLeadSearch) {
      const q = debouncedLeadSearch.toLowerCase();
      return l.customer_name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q) || l.notes?.toLowerCase().includes(q);
    }
    return true;
  });

  const cols = [
    { label: "Customer", render: r => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
        <a href={`tel:${r.phone}`} style={{ fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600 }}>📞 {r.phone}</a>
        {r.email && <div style={{ fontSize: 10, color: C.textDim }}>{r.email}</div>}
      </div>
    )},
    { label: "Vehicle",  render: r => <span style={{ fontSize: 12 }}>{r.vehicle_name || "—"}</span> },
    { label: "Source",   render: r => <Badge label={r.source.replace("_"," ")} color={C.info} /> },
    { label: "Status",   render: r => (
      <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
        style={{ border: `1.5px solid ${LEAD_COLOR[r.status]}55`, borderRadius: 6, padding: "3px 8px", fontSize: 12, background: `${LEAD_COLOR[r.status]}15`, color: LEAD_COLOR[r.status], cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
        {["new","interested","follow_up","converted","lost"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
      </select>
    )},
    { label: "Notes", render: r => <span style={{ fontSize: 11, color: C.textMid, maxWidth: 160, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.notes}>{r.notes || "—"}</span> },
    { label: "Date", render: r => <span style={{ fontSize: 12, color: C.textDim }}>{fmtDate(r.created_at)}</span> },
    { label: "Actions", render: r => (
      <div style={{ display: "flex", gap: 6 }}>
        <a href={`tel:${r.phone}`} style={{ padding: "4px 10px", borderRadius: 6, background: `${C.success}15`, border: `1px solid ${C.success}44`, color: C.success, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>📞 Call</a>
        {r.email && <a href={`mailto:${r.email}`} style={{ padding: "4px 10px", borderRadius: 6, background: `${C.info}15`, border: `1px solid ${C.info}44`, color: C.info, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>✉ Email</a>}
        <Btn label="Delete" size="sm" outline color={C.danger} onClick={() => { if (confirm(`Delete lead for ${r.customer_name}?`)) api.leads.delete(r.id).then(load); }} />
      </div>
    )},
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: C.bg, borderRadius: 8, padding: 4, width: "fit-content" }}>
        {[["leads","Pipeline Leads"],["enquiries","Buyer Enquiries"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 20px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
            fontWeight: 600, fontSize: 13, background: tab === id ? C.primary : "transparent",
            color: tab === id ? "#fff" : C.textMid,
          }}>
            {label}
            {id === "enquiries" && enquiries.filter(e => !e.is_processed).length > 0 && (
              <span style={{ marginLeft: 6, background: C.danger, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>
                {enquiries.filter(e => !e.is_processed).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "leads" && (
        <>
          <Card padding={12} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Search name / phone / notes…"
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", minWidth: 180 }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, cursor: "pointer" }}>
                  <option value="">All Statuses</option>
                  {["new","interested","follow_up","converted","lost"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                </select>
                <DateFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label="↺ Refresh" size="sm" outline color={C.primary} onClick={load} />
                <Btn label="+ Add Lead" color={C.primary} onClick={() => setShowAdd(true)} />
              </div>
            </div>
          </Card>
          <Card padding={0}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>
              Pipeline Leads ({filteredLeads.length}{filteredLeads.length !== leads.length ? ` of ${leads.length}` : ""}){(dateFrom || dateTo || statusFilter || leadSearch) && <span style={{ fontSize: 12, color: C.primary, fontWeight: 400, marginLeft: 8 }}>filtered</span>}
            </div>
            {loading ? <Spinner /> : <Table cols={cols} rows={filteredLeads} />}
          </Card>
        </>
      )}

      {tab === "enquiries" && (
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Buyer Enquiries from Marketplace</div>
          </div>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={enquirySearch} onChange={e => { setEnquirySearch(e.target.value); setEnquiryPage(1); }}
              placeholder="Search buyer name / phone..." style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
            <DateFilter from={enquiryDateFrom} to={enquiryDateTo} onChange={(f,t) => { setEnquiryDateFrom(f); setEnquiryDateTo(t); setEnquiryPage(1); }} />
            <Btn label="Refresh" size="sm" outline onClick={loadEnquiries} />
          </div>
          {enquiriesLoading && enquiries.length === 0 ? <Spinner /> : (
            <div style={{ overflowX: "auto" }}>
              {enquiries.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  No buyer enquiries yet. Enquiries from the public marketplace will appear here.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Buyer", "Phone", "City", "Vehicle Interest", "Message", "Time", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(e => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: e.is_processed ? C.surface : `${C.primary}08`, opacity: e.is_processed ? 0.65 : 1 }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600 }}>{e.customer_name}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <a href={`tel:${e.phone}`} style={{ color: C.primary, fontWeight: 600, textDecoration: "none" }}>{e.phone}</a>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid, fontSize: 12 }}>{e.city || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12 }}>{e.vehicle || "General Inquiry"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textMid, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.notes || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 11, color: C.textDim, whiteSpace: "nowrap" }}>
                          {new Date(e.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {e.is_processed
                            ? <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>✓ Done</span>
                            : <Btn label="Mark Done" size="sm" color={C.success} onClick={() => markEnquiryProcessed(e.id)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <Pagination page={enquiryPage} totalPages={Math.ceil(enquiryTotal/20)} onPage={setEnquiryPage} />
        </Card>
      )}

      {showAdd && (
        <Modal title="Add New Lead" onClose={() => setShowAdd(false)}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Customer Name" required><Input value={form.customer_name} onChange={setF("customer_name")} required /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={setF("phone")} type="tel" required /></Field>
              <Field label="Email"><Input value={form.email} onChange={setF("email")} type="email" placeholder="optional" /></Field>
              <Field label="Source">
                <Select value={form.source} onChange={setF("source")} options={[{value:"walk_in",label:"Walk-in"},{value:"phone",label:"Phone"},{value:"website",label:"Website"},{value:"referral",label:"Referral"},{value:"social",label:"Social Media"},{value:"marketplace",label:"Marketplace"}]} />
              </Field>
              <Field label="Initial Status">
                <Select value={form.status} onChange={setF("status")} options={["new","interested","follow_up","converted","lost"].map(s => ({ value: s, label: s.replace("_"," ") }))} />
              </Field>
              <Field label="Vehicle Interest">
                <Select value={form.vehicle} onChange={setF("vehicle")} placeholder="Select vehicle" options={vehicles.map(v => ({ value: v.id, label: `${v.brand_name} ${v.model_name}` }))} />
              </Field>
            </div>
            <Field label="Notes"><textarea value={form.notes} onChange={e => setF("notes")(e.target.value)} rows={2} style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAdd(false)} />
              <Btn label="Add Lead" color={C.primary} type="submit" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


export default Leads;
