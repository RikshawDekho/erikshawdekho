import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// This file replaces the Sales section in App.jsx
// Drop SalesPage and InvoicePrint as standalone components
// or paste them directly into App.jsx replacing the old Sales()
// ═══════════════════════════════════════════════════════════════

const API = "http://localhost:8000/api";
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("erd_token");
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Token ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw await res.json();
  if (res.status === 204) return null;
  return res.json();
}
const api = {
  vehicles: { list: (p="") => apiFetch(`/vehicles/${p}`) },
  sales: {
    list:    (p="") => apiFetch(`/sales/${p}`),
    create:  (d)    => apiFetch("/sales/", { method:"POST", body: JSON.stringify(d) }),
    invoice: (id)   => apiFetch(`/sales/${id}/invoice/`),
  },
};

const C = {
  primary:"#1a7c4f", primaryL:"#22a866", primaryD:"#115c38",
  accent:"#f59e0b", bg:"#f0f4f8", surface:"#ffffff",
  border:"#e2e8f0", text:"#1e293b", textMid:"#475569", textDim:"#94a3b8",
  danger:"#ef4444", warning:"#f59e0b", success:"#10b981", info:"#3b82f6",
};

const fmtINR  = (n) => `₹${Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const fmtDateLong = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "—";

const PAYMENT_LABEL = { cash:"Cash",upi:"UPI",loan:"Loan / Finance",bank_transfer:"Bank Transfer",cheque:"Cheque" };
const PAYMENT_COLOR = { cash:C.success,upi:C.info,loan:C.warning,bank_transfer:C.primary,cheque:C.textMid };

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Btn({ label, onClick, color=C.primary, outline, size="md", icon, disabled, fullWidth, type="button" }) {
  const pad = size==="sm"?"5px 12px":size==="lg"?"13px 28px":"8px 18px";
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background:outline?"transparent":disabled?"#e2e8f0":color,
      border:`2px solid ${disabled?"#e2e8f0":color}`,
      color:outline?color:disabled?C.textDim:"#fff",
      padding:pad, borderRadius:8, cursor:disabled?"not-allowed":"pointer",
      fontSize:size==="sm"?12:13, fontWeight:600, fontFamily:"inherit",
      display:"inline-flex", alignItems:"center", gap:6,
      width:fullWidth?"100%":"auto", justifyContent:"center",
      transition:"all 0.15s",
    }}>
      {icon&&<span>{icon}</span>}{label}
    </button>
  );
}
function Card({ children, style={}, padding=20 }) {
  return <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",...style}}>{children}</div>;
}
function Badge({ label, color=C.primary }) {
  return <span style={{background:`${color}18`,color,border:`1px solid ${color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{label}</span>;
}
function Field({ label, children, required }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>{label}{required&&<span style={{color:C.danger}}> *</span>}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type="text", required, style={} }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}
      style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:7,fontSize:13,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none",boxSizing:"border-box",...style}}
      onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
  );
}
function Select({ value, onChange, options, placeholder, style={} }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:7,fontSize:13,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none",boxSizing:"border-box",cursor:"pointer",...style}}>
      {placeholder&&<option value="">{placeholder}</option>}
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Modal({ title, children, onClose, width=640 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose?.()}>
      <div style={{background:C.surface,borderRadius:14,width,maxWidth:"100%",maxHeight:"92vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.surface,zIndex:1}}>
          <div style={{fontWeight:700,fontSize:16,color:C.text}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.textDim,lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:22}}>{children}</div>
      </div>
    </div>
  );
}
function Spinner() {
  return <div style={{display:"flex",justifyContent:"center",padding:48}}>
    <div style={{width:36,height:36,borderRadius:"50%",border:`4px solid ${C.border}`,borderTop:`4px solid ${C.primary}`,animation:"spin 0.8s linear infinite"}}/>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// INVOICE PRINT — pixel-perfect match to Image 5 reference
// ═══════════════════════════════════════════════════════════════
function InvoicePrint({ inv, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('','_blank','width=820,height=1160');
    win.document.write(`
      <html><head><title>Invoice ${inv.invoice_number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; background: #fff; color: #1e293b; font-size: 11px; }
        .inv-pg { padding: 22px 26px; }
        @media print {
          @page { margin: 8mm 10mm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .inv-pg { padding: 0; }
        }
      </style></head>
      <body><div class="inv-pg">${content}</div></body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!inv) return null;

  const subtotal    = inv.unit_price * inv.quantity;
  const cgstAmt     = subtotal * (inv.cgst_rate / 100);
  const sgstAmt     = subtotal * (inv.sgst_rate / 100);
  const totalAmount = subtotal + cgstAmt + sgstAmt;

  return (
    <div>
      {/* Action bar */}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:12}}>
        <Btn label="✕ Close"    outline color={C.textMid}  onClick={onClose}     size="sm"/>
        <Btn label="🖨 Print"    color={C.primary}          onClick={handlePrint} size="sm"/>
        <Btn label="⬇ Download" color={C.primaryD}         onClick={handlePrint} size="sm"/>
      </div>

      {/* ── Invoice body ── */}
      <div ref={printRef} style={{
        background:"#fff", width:"100%", maxWidth:680,
        margin:"0 auto", fontFamily:"'Nunito',sans-serif",
        fontSize:11, color:"#1e293b",
        border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden",
      }}>
        {/* Top accent bar */}
        <div style={{height:4,background:"linear-gradient(90deg,#1a7c4f,#22a866,#f59e0b)"}}/>

        <div style={{padding:"16px 20px"}}>

          {/* ── Header ── */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,paddingBottom:10,borderBottom:"1.5px solid #e2e8f0"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                <div style={{width:30,height:30,background:"linear-gradient(135deg,#1a7c4f,#22a866)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🛺</div>
                <div style={{fontSize:15,fontWeight:900,letterSpacing:-0.5}}>
                  erikshaw<span style={{color:"#f59e0b"}}>Dekho</span><span style={{color:"#1a7c4f"}}>.com</span>
                </div>
              </div>
              <div style={{color:"#475569",fontSize:10,lineHeight:1.65}}>
                {inv.dealer?.address}{inv.dealer?.address ? ", " : ""}{inv.dealer?.city}, India
              </div>
              <div style={{fontSize:10,color:"#475569",marginTop:2}}>
                📞 <span style={{fontWeight:600}}>{inv.dealer?.phone}</span>
                &nbsp;&nbsp;✉ info@erikshawdekho.com
              </div>
              {inv.dealer?.gstin && (
                <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>
                  GSTIN: <span style={{fontWeight:700,color:"#475569"}}>{inv.dealer.gstin}</span>
                </div>
              )}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:24,fontWeight:900,letterSpacing:3,color:"#1e293b",marginBottom:6}}>INVOICE</div>
              <table style={{fontSize:10,marginLeft:"auto",borderCollapse:"collapse"}}>
                <tbody>
                  {[
                    ["Invoice No.",  inv.invoice_number],
                    ["Invoice Date", fmtDateLong(inv.sale_date)],
                    ["Due Date",     fmtDateLong(inv.sale_date)],
                  ].map(([l,v])=>(
                    <tr key={l}>
                      <td style={{padding:"1px 6px 1px 0",color:"#475569",whiteSpace:"nowrap"}}>{l}</td>
                      <td style={{padding:"1px 0",fontWeight:700,color:"#1e293b"}}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{display:"inline-block",marginTop:6,border:"1.5px solid #10b981",borderRadius:5,padding:"2px 10px",color:"#10b981",fontWeight:800,fontSize:10,letterSpacing:1}}>✓ PAID</div>
            </div>
          </div>

          {/* ── Bill To + Summary ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 195px",gap:12,marginBottom:10}}>
            <div>
              <div style={{fontWeight:800,fontSize:9,color:"#1a7c4f",letterSpacing:1,marginBottom:4}}>BILL TO</div>
              <div style={{fontWeight:700,fontSize:12}}>{inv.customer?.name}</div>
              <div style={{color:"#475569",fontSize:10,lineHeight:1.6,marginTop:2}}>
                {inv.customer?.address && <div>{inv.customer.address}</div>}
                {inv.customer?.gstin   && <div>GSTIN: <span style={{fontWeight:600}}>{inv.customer.gstin}</span></div>}
                <div>📞 {inv.customer?.phone}</div>
                {inv.customer?.email   && <div>✉ {inv.customer.email}</div>}
              </div>
            </div>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,padding:"8px 10px",fontSize:10}}>
              {[
                ["Invoice Vehicle", inv.vehicle?.name || "—"],
                ["HSN/SAC",         inv.vehicle?.hsn  || "8703"],
                ["Unit Price",      fmtINR(inv.unit_price)],
                ["Amount",          fmtINR(subtotal)],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4,paddingBottom:4,borderBottom:"1px solid #e2e8f0"}}>
                  <span style={{color:"#475569"}}>{l}</span>
                  <span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:1}}>
                <span style={{color:"#475569",fontWeight:600}}>Net Balance</span>
                <span style={{fontWeight:800,color:"#10b981"}}>₹0.00</span>
              </div>
            </div>
          </div>

          {/* ── Line items table ── */}
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:8}}>
            <thead>
              <tr style={{background:"#1a7c4f",color:"#fff"}}>
                {["Item Description","HSN/SAC","Unit Price","Qty","Amount"].map((h,i)=>(
                  <th key={h} style={{padding:"7px 9px",textAlign:i===0?"left":"right",fontSize:10,fontWeight:700,letterSpacing:0.2}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom:"1px solid #e2e8f0"}}>
                <td style={{padding:"9px 9px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:36,height:28,background:"linear-gradient(135deg,#1a7c4f18,#f59e0b18)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,border:"1px solid #e2e8f0",flexShrink:0}}>🛺</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:11}}>{inv.vehicle?.name} <span style={{fontWeight:400,color:"#94a3b8",fontSize:9}}>™</span></div>
                      <div style={{fontSize:9,color:"#94a3b8",textTransform:"capitalize",marginTop:1}}>{inv.vehicle?.fuel_type} Rickshaw</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"9px 9px",textAlign:"right",color:"#475569",fontSize:10}}>{inv.vehicle?.hsn||"8703"}</td>
                <td style={{padding:"9px 9px",textAlign:"right",fontSize:10}}>{fmtINR(inv.unit_price)}</td>
                <td style={{padding:"9px 9px",textAlign:"right",fontWeight:600,fontSize:10}}>{inv.quantity}</td>
                <td style={{padding:"9px 9px",textAlign:"right",fontWeight:700,fontSize:10}}>{fmtINR(subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div style={{display:"flex",justifyContent:"flex-end",borderTop:"1px solid #e2e8f0",paddingTop:8,marginBottom:12}}>
            <div style={{width:250}}>
              {[
                ["Subtotal",              fmtINR(subtotal)],
                [`CGST ${inv.cgst_rate}%`,fmtINR(cgstAmt)],
                [`SGST ${inv.sgst_rate}%`,fmtINR(sgstAmt)],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10,borderBottom:"1px solid #e2e8f0"}}>
                  <span style={{color:"#475569"}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",marginTop:5,background:"#1a7c4f",color:"#fff",borderRadius:5,fontWeight:800,fontSize:12}}>
                <span>Total Amount</span><span>{fmtINR(totalAmount)}</span>
              </div>
              <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderTop:"none",borderRadius:"0 0 5px 5px",padding:"6px 10px",fontSize:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{color:"#475569"}}>Payment Amount</span><span style={{fontWeight:700}}>{fmtINR(totalAmount)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#475569",fontWeight:600}}>Balance Due</span>
                  <span style={{fontWeight:800,color:"#10b981",fontSize:11}}>₹0.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Payment Details + PAID stamp ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 130px",gap:12,paddingTop:10,borderTop:"1px solid #e2e8f0"}}>
            <div>
              <div style={{fontWeight:800,fontSize:9,color:"#1a7c4f",letterSpacing:1,marginBottom:5}}>PAYMENT DETAILS</div>
              <div style={{fontSize:10,color:"#475569",lineHeight:1.7}}>
                <div>Bank Name: <span style={{fontWeight:600,color:"#1e293b"}}>HDFC Bank</span></div>
                <div>Account Number: <span style={{fontWeight:600,color:"#1e293b"}}>234567890</span></div>
                <div>IFSC Code: <span style={{fontWeight:600,color:"#1e293b"}}>HDFC000123</span></div>
                <div>UPI ID: <span style={{fontWeight:600,color:"#1e293b"}}>erikshawdekho@hdfc</span></div>
              </div>
              <div style={{marginTop:7}}>
                <div style={{fontWeight:800,fontSize:9,color:"#1a7c4f",letterSpacing:1,marginBottom:3}}>TERMS & CONDITIONS</div>
                <div style={{fontSize:9,color:"#94a3b8",lineHeight:1.6}}>
                  <div>1) Goods once sold will not be taken back or exchanged.</div>
                  <div>2) Interest @ 10% p.a. will be charged on overdue bills.</div>
                  <div>3) Please make the payment to the above bank account.</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",textAlign:"center"}}>
              <div style={{width:68,height:68,borderRadius:"50%",border:"2.5px solid #1a7c4f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
                <div style={{position:"absolute",inset:3,borderRadius:"50%",border:"1.5px dashed #1a7c4f",opacity:0.4}}/>
                <div style={{fontSize:7,fontWeight:800,color:"#1a7c4f",letterSpacing:1,zIndex:1}}>THANK YOU</div>
                <div style={{fontSize:12,fontWeight:900,color:"#1a7c4f",letterSpacing:2,zIndex:1}}>PAID</div>
                <div style={{fontSize:7,fontWeight:800,color:"#1a7c4f",letterSpacing:1,zIndex:1}}>THANK YOU</div>
              </div>
              <div style={{marginTop:6,fontSize:10}}>
                <div style={{fontStyle:"italic",color:"#475569",marginBottom:1}}>Sanjay Mehra</div>
                <div style={{fontSize:9,color:"#94a3b8"}}>Sales Manager</div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{padding:"8px 20px",borderTop:"2px solid #1a7c4f",background:"#f8fafc",textAlign:"center",fontSize:9.5,color:"#475569",lineHeight:1.6}}>
          <div style={{marginBottom:3}}>Thank you for your business! Contact us at <strong>{inv.dealer?.phone}</strong> or <strong>info@erikshawdekho.com</strong></div>
          <div style={{display:"flex",justifyContent:"center",gap:20}}>
            <span>🌐 www.erikshawdekho.com</span>
            <span>📞 {inv.dealer?.phone}</span>
            <span>✉ info@erikshawdekho.com</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SALES PAGE — full list + stats + new sale form
// ═══════════════════════════════════════════════════════════════
export function SalesPage() {
  const [sales,    setSales]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [invoice,  setInvoice]  = useState(null);   // invoice data for modal
  const [invLoading, setInvLoading] = useState(null); // id of invoice being fetched
  const [vehicles, setVehicles] = useState([]);
  const [search,   setSearch]   = useState("");
  const [stats,    setStats]    = useState({ total:0, thisMonth:0, revenue:0, pending:0 });

  const [form, setForm] = useState({
    vehicle:"", customer_name:"", customer_phone:"",
    customer_email:"", customer_address:"", customer_gstin:"",
    sale_price:"", quantity:1,
    payment_method:"cash", delivery_date:"",
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = search ? `?search=${encodeURIComponent(search)}` : "";
    api.sales.list(p).then(d => {
      const list = d.results || d;
      setSales(list);
      const now = new Date();
      const thisMonth = list.filter(s => {
        const d = new Date(s.sale_date);
        return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
      });
      setStats({
        total:     list.length,
        thisMonth: thisMonth.length,
        revenue:   thisMonth.reduce((a,s)=>a+parseFloat(s.sale_price||0),0),
        pending:   list.filter(s=>!s.is_delivered).length,
      });
    }).finally(()=>setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.vehicles.list().then(d => setVehicles(d.results || d));
  }, []);

  const setF = k => v => setForm(p=>({...p,[k]:v}));

  const handleVehicleSelect = (id) => {
    setF("vehicle")(id);
    const v = vehicles.find(v => String(v.id) === String(id));
    if (v && !form.sale_price) setF("sale_price")(v.price);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.vehicle)        return setFormErr("Please select a vehicle.");
    if (!form.customer_name)  return setFormErr("Customer name is required.");
    if (!form.customer_phone) return setFormErr("Customer phone is required.");
    if (!form.sale_price)     return setFormErr("Sale price is required.");
    setFormErr(""); setSaving(true);
    try {
      await api.sales.create(form);
      setShowAdd(false);
      setForm({ vehicle:"", customer_name:"", customer_phone:"", customer_email:"",
                customer_address:"", customer_gstin:"", sale_price:"", quantity:1,
                payment_method:"cash", delivery_date:"" });
      load();
    } catch (err) {
      setFormErr(typeof err==="object" ? Object.values(err).flat().join(" ") : "Failed to record sale.");
    }
    setSaving(false);
  };

  const viewInvoice = async (id) => {
    setInvLoading(id);
    try {
      const inv = await api.sales.invoice(id);
      setInvoice(inv);
    } catch { alert("Could not load invoice."); }
    setInvLoading(null);
  };

  // Compute GST preview for form
  const salePrice  = parseFloat(form.sale_price) || 0;
  const qty        = parseInt(form.quantity)      || 1;
  const subtotal_  = salePrice * qty;
  const cgst_      = subtotal_ * 0.09;
  const sgst_      = subtotal_ * 0.09;
  const total_     = subtotal_ + cgst_ + sgst_;

  return (
    <div style={{padding:24}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Stats row ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {[
          {icon:"🛺",label:"Total Sales",       value:stats.total,                     color:C.primary},
          {icon:"📅",label:"This Month",         value:stats.thisMonth,                 color:C.info},
          {icon:"💰",label:"Monthly Revenue",    value:fmtINR(stats.revenue),           color:C.success},
          {icon:"🚚",label:"Pending Delivery",   value:stats.pending,                   color:C.warning},
        ].map(s=>(
          <Card key={s.label}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:11,color:C.textMid,marginBottom:4,fontWeight:600,letterSpacing:"0.3px"}}>{s.label.toUpperCase()}</div>
                <div style={{fontSize:26,fontWeight:800,color:s.color,fontFamily:"Georgia,serif"}}>{s.value}</div>
              </div>
              <div style={{width:42,height:42,borderRadius:10,background:`${s.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by customer or invoice..."
          style={{flex:1,minWidth:200,padding:"9px 14px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff"}}
          onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        <Btn label="+ Record New Sale" color={C.primary} icon="💰" onClick={()=>setShowAdd(true)}/>
      </div>

      {/* ── Sales table ── */}
      <Card padding={0}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:15}}>All Sales</span>
          <span style={{fontSize:12,color:C.textDim}}>{sales.length} records</span>
        </div>

        {loading ? <Spinner /> : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["Invoice No","Customer","Vehicle","Sale Price","Payment","Delivery","Status","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",color:C.textMid,fontWeight:700,fontSize:11,letterSpacing:"0.5px",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.length===0 && (
                  <tr><td colSpan={8} style={{padding:40,textAlign:"center",color:C.textDim}}>
                    <div style={{fontSize:32,marginBottom:8}}>📋</div>
                    No sales recorded yet. Click "Record New Sale" to add one.
                  </td></tr>
                )}
                {sales.map((s,i)=>(
                  <tr key={s.id}
                    style={{borderBottom:`1px solid ${C.border}`,transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    {/* Invoice number */}
                    <td style={{padding:"12px 14px"}}>
                      <span style={{fontWeight:700,color:C.primary,fontFamily:"monospace",fontSize:13}}>{s.invoice_number}</span>
                    </td>
                    {/* Customer */}
                    <td style={{padding:"12px 14px"}}>
                      <div style={{fontWeight:600}}>{s.customer_name}</div>
                      <div style={{fontSize:11,color:C.textDim,marginTop:1}}>{s.customer_phone}</div>
                    </td>
                    {/* Vehicle */}
                    <td style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:32,height:24,background:`${C.primary}12`,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🛺</div>
                        <span style={{fontSize:12}}>{s.vehicle_name}</span>
                      </div>
                    </td>
                    {/* Sale price */}
                    <td style={{padding:"12px 14px"}}>
                      <div style={{fontWeight:700,fontSize:14}}>{fmtINR(s.total_amount||s.sale_price)}</div>
                      <div style={{fontSize:10,color:C.textDim}}>incl. GST</div>
                    </td>
                    {/* Payment method */}
                    <td style={{padding:"12px 14px"}}>
                      <Badge label={PAYMENT_LABEL[s.payment_method]||s.payment_method} color={PAYMENT_COLOR[s.payment_method]||C.textMid}/>
                    </td>
                    {/* Delivery date */}
                    <td style={{padding:"12px 14px",fontSize:12,color:C.textMid,whiteSpace:"nowrap"}}>
                      {s.delivery_date ? fmtDate(s.delivery_date) : "—"}
                    </td>
                    {/* Delivered status */}
                    <td style={{padding:"12px 14px"}}>
                      {s.is_delivered
                        ? <Badge label="✓ Delivered" color={C.success}/>
                        : <Badge label="⏳ Pending"  color={C.warning}/>}
                    </td>
                    {/* Actions */}
                    <td style={{padding:"12px 14px"}}>
                      <button
                        onClick={()=>viewInvoice(s.id)}
                        disabled={invLoading===s.id}
                        style={{
                          padding:"5px 14px",borderRadius:6,border:`1.5px solid ${C.primary}`,
                          background:invLoading===s.id?C.bg:"#fff",
                          color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",
                          fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",
                        }}>
                        {invLoading===s.id ? "⏳" : "🧾"} Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ════════════════════════════════════════════════
          ADD SALE MODAL
          ════════════════════════════════════════════════ */}
      {showAdd && (
        <Modal title="💰 Record New Sale" onClose={()=>setShowAdd(false)} width={700}>
          <form onSubmit={submit}>
            {/* Vehicle selection */}
            <div style={{background:`${C.primary}08`,border:`1.5px solid ${C.primary}25`,borderRadius:10,padding:16,marginBottom:18}}>
              <div style={{fontWeight:700,fontSize:13,color:C.primary,marginBottom:12}}>🛺 Vehicle Details</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{gridColumn:"span 2"}}>
                  <Field label="Select Vehicle" required>
                    <Select value={form.vehicle} onChange={handleVehicleSelect}
                      placeholder="Choose vehicle..."
                      options={vehicles.map(v=>({
                        value:v.id,
                        label:`${v.brand_name} ${v.model_name} — ${fmtINR(v.price)} (${v.stock_status.replace("_"," ")})`
                      }))}/>
                  </Field>
                </div>
                <Field label="Sale Price (₹)" required>
                  <Input value={form.sale_price} onChange={setF("sale_price")} type="number" placeholder="e.g. 220000" required/>
                </Field>
                <Field label="Quantity">
                  <Input value={form.quantity} onChange={setF("quantity")} type="number" placeholder="1"/>
                </Field>
              </div>

              {/* GST Preview */}
              {salePrice > 0 && (
                <div style={{marginTop:12,background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:12}}>
                  {[
                    ["Subtotal",  fmtINR(subtotal_), C.text],
                    ["CGST 9%",   fmtINR(cgst_),     C.textMid],
                    ["SGST 9%",   fmtINR(sgst_),     C.textMid],
                    ["Total",     fmtINR(total_),     C.primary],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{textAlign:"center",padding:"6px 0",borderRight:`1px solid ${C.border}`}}>
                      <div style={{color:C.textDim,marginBottom:2}}>{l}</div>
                      <div style={{fontWeight:700,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer details */}
            <div style={{background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:18}}>
              <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>👤 Customer Details</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Customer Name" required>
                  <Input value={form.customer_name} onChange={setF("customer_name")} placeholder="Ramesh Kumar" required/>
                </Field>
                <Field label="Phone Number" required>
                  <Input value={form.customer_phone} onChange={setF("customer_phone")} placeholder="+91 98765 43210" required/>
                </Field>
                <Field label="Email Address">
                  <Input value={form.customer_email} onChange={setF("customer_email")} type="email" placeholder="customer@email.com"/>
                </Field>
                <Field label="Customer GSTIN">
                  <Input value={form.customer_gstin} onChange={setF("customer_gstin")} placeholder="09XYZ5678T9ZX"/>
                </Field>
                <div style={{gridColumn:"span 2"}}>
                  <Field label="Full Address">
                    <Input value={form.customer_address} onChange={setF("customer_address")} placeholder="Shop No., Road, City, State - PIN"/>
                  </Field>
                </div>
              </div>
            </div>

            {/* Payment + delivery */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
              <Field label="Payment Method">
                <Select value={form.payment_method} onChange={setF("payment_method")} options={[
                  {value:"cash",         label:"💵 Cash"},
                  {value:"upi",          label:"📱 UPI"},
                  {value:"loan",         label:"🏦 Loan / Finance"},
                  {value:"bank_transfer",label:"🔁 Bank Transfer"},
                  {value:"cheque",       label:"📋 Cheque"},
                ]}/>
              </Field>
              <Field label="Expected Delivery Date">
                <Input value={form.delivery_date} onChange={setF("delivery_date")} type="date"/>
              </Field>
            </div>

            {/* Error */}
            {formErr && (
              <div style={{background:"#fef2f2",border:`1px solid ${C.danger}33`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.danger,marginBottom:14}}>
                ⚠ {formErr}
              </div>
            )}

            {/* Submit row */}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
              <Btn label="Cancel" outline color={C.textMid} onClick={()=>setShowAdd(false)}/>
              <Btn label={saving?"Recording...":"✓ Record Sale & Generate Invoice"} color={C.primary} type="submit" disabled={saving} size="lg"/>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          INVOICE MODAL — pixel-perfect Image 5 match
          ════════════════════════════════════════════════ */}
      {invoice && (
        <Modal title={`Invoice — ${invoice.invoice_number}`} onClose={()=>setInvoice(null)} width={740}>
          <InvoicePrint inv={invoice} onClose={()=>setInvoice(null)}/>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT — use this to preview standalone
// ═══════════════════════════════════════════════════════════════
export default function SalesPreview() {
  return (
    <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",background:"#f0f4f8",minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{background:"#fff",padding:"12px 24px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>🛺</span>
        <span style={{fontWeight:800,fontSize:16}}>erikshaw<span style={{color:"#f59e0b"}}>Dekho</span>.com</span>
        <span style={{marginLeft:8,fontSize:13,color:"#94a3b8"}}>/ Sales</span>
      </div>
      <SalesPage/>
    </div>
  );
}
