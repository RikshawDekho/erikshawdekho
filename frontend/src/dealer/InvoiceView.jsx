/**
 * InvoiceView.jsx — Invoice display/print component
 */
import { useC } from "../theme";
import { fmtINR, fmtDate } from "./ui";

function InvoiceView({ inv }) {
  const C = useC();
  if (!inv) return null;
  return (
    <div style={{ fontFamily: "inherit", fontSize: 13, color: C.text }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 18, borderBottom: `2px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Georgia, serif" }}>
            🛺 eRickshaw<span style={{ color: C.accent }}>Dekho</span>.com
          </div>
          <div style={{ color: C.textMid, marginTop: 4, fontSize: 12 }}>{inv.dealer?.address}, {inv.dealer?.city}</div>
          <div style={{ color: C.textMid, fontSize: 12 }}>📞 {inv.dealer?.phone}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>GSTIN: {inv.dealer?.gstin}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: C.primary }}>INVOICE</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>Invoice No. <b>{inv.invoice_number}</b></div>
          <div style={{ fontSize: 12 }}>Date: <b>{fmtDate(inv.sale_date)}</b></div>
          <div style={{ marginTop: 8, background: `${C.success}15`, border: `2px solid ${C.success}`, borderRadius: 6, padding: "5px 14px", display: "inline-block", color: C.success, fontWeight: 700, fontSize: 13 }}>✓ PAID</div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.primary }}>BILL TO</div>
        <div style={{ fontWeight: 700 }}>{inv.customer?.name}</div>
        <div style={{ color: C.textMid, fontSize: 12 }}>{inv.customer?.address}</div>
        {inv.customer?.gstin && <div style={{ color: C.textDim, fontSize: 11 }}>GSTIN: {inv.customer.gstin}</div>}
        <div style={{ color: C.textMid, fontSize: 12 }}>📞 {inv.customer?.phone}</div>
      </div>

      {/* Line items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr style={{ background: C.primary, color: "#fff" }}>
            {["Item Description","HSN/SAC","Unit Price","Qty","Amount"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: h === "Item Description" ? "left" : "right", fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: "14px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 48, height: 36, background: `${C.primary}12`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛺</div>
              <div>
                <div style={{ fontWeight: 600 }}>{inv.vehicle?.name}</div>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "capitalize" }}>{inv.vehicle?.fuel_type} Rickshaw™</div>
              </div>
            </td>
            <td style={{ padding: "14px 12px", textAlign: "right" }}>{inv.vehicle?.hsn}</td>
            <td style={{ padding: "14px 12px", textAlign: "right" }}>{fmtINR(inv.unit_price)}</td>
            <td style={{ padding: "14px 12px", textAlign: "right" }}>{inv.quantity}</td>
            <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 600 }}>{fmtINR(inv.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 260 }}>
          {[
            ["Subtotal",  fmtINR(inv.subtotal),  false],
            [`CGST ${inv.cgst_rate}%`, fmtINR(inv.cgst_amount), false],
            [`SGST ${inv.sgst_rate}%`, fmtINR(inv.sgst_amount), false],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textMid }}>{l}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 8, background: C.primary, color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 15 }}>
            <span>Total Amount</span><span>{fmtINR(inv.total_amount)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <Btn label="Print Invoice" color={C.primary} onClick={() => window.print()} />
      </div>
    </div>
  );
}


export default InvoiceView;
