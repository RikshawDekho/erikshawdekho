/**
 * Finance.jsx — Loan management, EMI calculator, financer ecosystem
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { fmtINR, fmtDate, Card, Badge, Btn, Modal, Field, Input, Select, Spinner, Table, Pagination } from "./ui";
import { useToast } from "./contexts";

function Finance() {
  const C = useC();
  const toast = useToast();
  const [emiForm, setEmiForm] = useState({ principal: 150000, rate: 12, tenure: 36 });
  const [emiResult, setEmiResult] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loanSearch, setLoanSearch] = useState("");
  const debouncedLoanSearch = useDebounce(loanSearch, 350);
  const [loanDateFrom, setLoanDateFrom] = useState("");
  const [loanDateTo, setLoanDateTo] = useState("");
  const [showNewLoan, setShowNewLoan] = useState(false);
  const [newLoan, setNewLoan] = useState({ customer_name: "", loan_amount: "", interest_rate: "12.0", tenure_months: "36", bank_name: "", status: "pending" });
  const [savingLoan, setSavingLoan] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const setF = k => v => setEmiForm(p => ({ ...p, [k]: v }));
  const setNL = k => v => setNewLoan(p => ({ ...p, [k]: v }));

  const STATUS_COLORS = { pending: C.warning, approved: C.success, rejected: C.danger, disbursed: C.info };
  const STATUS_NEXT = { pending: ["approved","rejected"], approved: ["disbursed","rejected"], rejected: [], disbursed: [] };

  const loadLoans = useCallback(() => {
    const p = new URLSearchParams();
    if (debouncedLoanSearch) p.set("search", debouncedLoanSearch);
    if (loanDateFrom)        p.set("date_from", loanDateFrom);
    if (loanDateTo)          p.set("date_to", loanDateTo);
    const qs = p.toString() ? `?${p}` : "";
    api.finance.loans(qs).then(d => setLoans(d.results || d));
  }, [debouncedLoanSearch, loanDateFrom, loanDateTo]);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const calcEMI = async () => {
    try {
      const r = await api.finance.emi({ ...emiForm });
      setEmiResult(r);
    } catch { toast("EMI calculation failed.", "error"); }
  };

  const handleNewLoan = async (e) => {
    e.preventDefault();
    if (!newLoan.customer_name.trim()) { toast("Customer name required.", "warning"); return; }
    if (!newLoan.loan_amount || parseFloat(newLoan.loan_amount) <= 0) { toast("Valid loan amount required.", "warning"); return; }
    setSavingLoan(true);
    try {
      // Auto-calculate EMI before saving
      let emi_amount = null;
      try {
        const r = await api.finance.emi({ principal: newLoan.loan_amount, rate: newLoan.interest_rate, tenure: newLoan.tenure_months });
        emi_amount = r.emi;
      } catch { /* ignore EMI calc failure */ }
      await api.finance.create({ ...newLoan, emi_amount });
      toast("Loan application created!", "success");
      setShowNewLoan(false);
      setNewLoan({ customer_name: "", loan_amount: "", interest_rate: "12.0", tenure_months: "36", bank_name: "", status: "pending" });
      loadLoans();
    } catch (err) { toast(err?.message || "Failed to create loan.", "error"); }
    setSavingLoan(false);
  };

  const updateStatus = async (loan, newStatus) => {
    try {
      await api.finance.updateLoan(loan.id, { status: newStatus });
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: newStatus } : l));
      toast(`Status updated to ${newStatus}.`, "success");
    } catch { toast("Failed to update status.", "error"); }
  };

  return (
    <div className="erd-page-pad erd-finance-layout" style={{ padding: 24, display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
      {/* Left: EMI Calculator */}
      <div>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: C.text }}>💰 EMI Calculator</div>
          <Field label="Loan Amount (₹)"><Input value={emiForm.principal} onChange={setF("principal")} type="number" /></Field>
          <Field label="Interest Rate (% p.a.)"><Input value={emiForm.rate} onChange={setF("rate")} type="number" step="0.1" /></Field>
          <Field label="Tenure (months)"><Input value={emiForm.tenure} onChange={setF("tenure")} type="number" /></Field>
          <Btn label="Calculate EMI" color={C.primary} onClick={calcEMI} fullWidth />
          {emiResult && (
            <div style={{ marginTop: 18, background: `${C.primary}08`, border: `1.5px solid ${C.primary}33`, borderRadius: 10, padding: 16 }}>
              {[
                ["Monthly EMI",    fmtINR(emiResult.emi),           C.primary],
                ["Total Payment",  fmtINR(emiResult.total_payment), C.text],
                ["Total Interest", fmtINR(emiResult.total_interest),C.danger],
                ["Principal",      fmtINR(emiResult.principal),     C.text],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: C.textMid }}>{l}</span>
                  <span style={{ fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick stats */}
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: C.text }}>📊 Loan Summary</div>
          {[
            ["Total Loans", loans.length, C.text],
            ["Pending",  loans.filter(l => l.status === "pending").length,  C.warning],
            ["Approved", loans.filter(l => l.status === "approved").length, C.success],
            ["Disbursed",loans.filter(l => l.status === "disbursed").length,C.info],
            ["Rejected", loans.filter(l => l.status === "rejected").length, C.danger],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.textMid }}>{l}</span>
              <span style={{ fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Right: Loans table */}
      <div>
        <Card style={{ marginBottom: 14, padding: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder="Search customer / bank..."
              style={{ flex: 1, minWidth: 160, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
            <DateFilter from={loanDateFrom} to={loanDateTo} onChange={(f,t) => { setLoanDateFrom(f); setLoanDateTo(t); }} />
            <Btn label="↺" size="sm" outline onClick={loadLoans} />
            <Btn label="+ New Loan" color={C.primary} size="sm" onClick={() => setShowNewLoan(true)} />
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Loan Applications</span>
            <span style={{ fontSize: 12, color: C.textDim }}>{loans.length} total</span>
          </div>
          <div className="erd-table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Customer","Amount","EMI","Tenure","Bank","Status","Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMid, whiteSpace: "nowrap", letterSpacing: 0.3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textDim }}>No loan applications. Click "+ New Loan" to add one.</td></tr>
                ) : loans.map((loan, i) => (
                  <tr key={loan.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : `${C.bg}80` }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{loan.customer_name}</td>
                    <td style={{ padding: "10px 14px", color: C.primary, fontWeight: 700 }}>{fmtINR(loan.loan_amount)}</td>
                    <td style={{ padding: "10px 14px", color: C.textMid }}>{loan.emi_amount ? fmtINR(loan.emi_amount) : "—"}</td>
                    <td style={{ padding: "10px 14px", color: C.textMid }}>{loan.tenure_months}m</td>
                    <td style={{ padding: "10px 14px", color: C.textMid }}>{loan.bank_name || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <Badge label={loan.status} color={STATUS_COLORS[loan.status] || C.textMid} />
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                        {(STATUS_NEXT[loan.status] || []).map(s => (
                          <button key={s} onClick={() => updateStatus(loan, s)} style={{
                            padding: "3px 10px", borderRadius: 6, border: `1.5px solid ${STATUS_COLORS[s]}`,
                            background: `${STATUS_COLORS[s]}12`, color: STATUS_COLORS[s],
                            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                        ))}
                        <button onClick={() => setSelectedLoan(loan)} style={{
                          padding: "3px 10px", borderRadius: 6, border: `1.5px solid ${C.border}`,
                          background: "transparent", color: C.textMid,
                          fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        }}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* New Loan Modal */}
      {showNewLoan && (
        <Modal title="New Loan Application" onClose={() => setShowNewLoan(false)}>
          <form onSubmit={handleNewLoan}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Customer Name *">
                  <Input value={newLoan.customer_name} onChange={setNL("customer_name")} placeholder="Full name" />
                </Field>
              </div>
              <Field label="Loan Amount (₹) *">
                <Input value={newLoan.loan_amount} onChange={setNL("loan_amount")} type="number" placeholder="150000" />
              </Field>
              <Field label="Interest Rate (% p.a.)">
                <Input value={newLoan.interest_rate} onChange={setNL("interest_rate")} type="number" step="0.1" placeholder="12.0" />
              </Field>
              <Field label="Tenure (months)">
                <Input value={newLoan.tenure_months} onChange={setNL("tenure_months")} type="number" placeholder="36" />
              </Field>
              <Field label="Bank / Financer">
                <Input value={newLoan.bank_name} onChange={setNL("bank_name")} placeholder="HDFC Bank, SBI, etc." />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Status">
                  <Select value={newLoan.status} onChange={setNL("status")}
                    options={[{value:"pending",label:"Pending"},{value:"approved",label:"Approved"},{value:"disbursed",label:"Disbursed"},{value:"rejected",label:"Rejected"}]} />
                </Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowNewLoan(false)} />
              <Btn label={savingLoan ? "Saving..." : "Create Application"} color={C.primary} type="submit" disabled={savingLoan} />
            </div>
          </form>
        </Modal>
      )}

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <Modal title={`Loan — ${selectedLoan.customer_name}`} onClose={() => setSelectedLoan(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["Customer",    selectedLoan.customer_name],
              ["Loan Amount", fmtINR(selectedLoan.loan_amount)],
              ["Monthly EMI", selectedLoan.emi_amount ? fmtINR(selectedLoan.emi_amount) : "—"],
              ["Interest",    `${selectedLoan.interest_rate}% p.a.`],
              ["Tenure",      `${selectedLoan.tenure_months} months`],
              ["Bank",        selectedLoan.bank_name || "—"],
              ["Status",      selectedLoan.status],
              ["Applied On",  new Date(selectedLoan.applied_date).toLocaleDateString("en-IN")],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMid }}>{l}</span>
                <span style={{ fontWeight: 700, color: C.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(STATUS_NEXT[selectedLoan.status] || []).map(s => (
              <Btn key={s} label={`Mark ${s}`} color={STATUS_COLORS[s] || C.primary} size="sm"
                onClick={() => { updateStatus(selectedLoan, s); setSelectedLoan(l => l ? { ...l, status: s } : l); }} />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}


export default Finance;
