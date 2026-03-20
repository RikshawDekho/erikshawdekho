/**
 * Customers.jsx — Customer management
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { fmtDate, Card, Btn, Modal, Field, Input, Spinner, Table, Pagination } from "./ui";
import { useToast } from "./contexts";

function Customers() {
  const C = useC();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "", gstin: "" });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toast = useToast();
  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (dateFrom)        p.set("date_from", dateFrom);
    if (dateTo)          p.set("date_to", dateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.customers.list(qs).then(d => setCustomers(d.results || d)).finally(() => setLoading(false));
  }, [debouncedSearch, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);
  const setF = k => v => setForm(p => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast("Customer name is required.", "warning"); return; }
    if (!form.phone.trim()) { toast("Phone number is required.", "warning"); return; }
    try {
      await api.customers.create(form);
      toast("Customer added!", "success");
      setShowAdd(false); load();
    } catch(err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add customer.";
      toast(msg, "error");
    }
  };

  const cols = [
    { label: "Name",      render: r => <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: C.textDim }}>{r.email}</div></div> },
    { label: "Phone",     key: "phone" },
    { label: "City",      key: "city" },
    { label: "Purchases", render: r => <Badge label={r.total_purchases} color={C.primary} /> },
    { label: "Spent",     render: r => <span style={{ fontWeight: 600 }}>{fmtINR(r.total_spent)}</span> },
    { label: "Joined",    render: r => <span style={{ fontSize: 12, color: C.textDim }}>{fmtDate(r.created_at)}</span> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / phone..."
            style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
          <DateFilter from={dateFrom} to={dateTo} onChange={(f,t) => { setDateFrom(f); setDateTo(t); }} />
          <Btn label="↺ Refresh" size="sm" outline onClick={load} />
          <Btn label="+ Add Customer" onClick={() => setShowAdd(true)} />
        </div>
      </Card>
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>All Customers</div>
        {loading ? <Spinner /> : <Table cols={cols} rows={customers} />}
      </Card>
      {showAdd && (
        <Modal title="Add Customer" onClose={() => setShowAdd(false)}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Name" required><Input value={form.name} onChange={setF("name")} required /></Field>
              <Field label="Phone" required><Input value={form.phone} onChange={setF("phone")} required /></Field>
              <Field label="Email"><Input value={form.email} onChange={setF("email")} type="email" /></Field>
              <Field label="City"><Input value={form.city} onChange={setF("city")} /></Field>
              <Field label="GSTIN"><Input value={form.gstin} onChange={setF("gstin")} placeholder="09XXXXX" /></Field>
            </div>
            <Field label="Address"><Input value={form.address} onChange={setF("address")} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAdd(false)} />
              <Btn label="Add Customer" color={C.primary} type="submit" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


export default Customers;
