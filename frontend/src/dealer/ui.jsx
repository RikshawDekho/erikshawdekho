/**
 * ui.jsx — Shared UI primitives for dealer portal
 * Badge, Btn, Card, StatCard, Table, Modal, Field, Input, Select, 
 * Spinner, ScreenSaver, DateFilter, Pagination, BarChart, DonutChart
 */
import { useState } from "react";
import { LIGHT_C, useC } from "../theme";

const C = LIGHT_C;

export const STOCK_COLOR = { in_stock: C.success, low_stock: C.warning, out_of_stock: C.danger };
export const LEAD_COLOR  = { new:"#6366f1", interested:C.info, follow_up:C.warning, converted:C.success, lost:C.danger };
export const FUEL_COLOR  = { electric:C.success, petrol:"#f97316", cng:"#06b6d4", lpg:"#8b5cf6", diesel:"#64748b" };

export const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

function Badge({ label, color }) {
  const C = useC();
  const col = color ?? C.primary;
  return (
    <span style={{ background: `${col}18`, color: col, border: `1px solid ${col}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Btn({ label, onClick, color, outline, size = "md", icon, disabled, fullWidth, type = "button" }) {
  const C = useC();
  const col = color ?? C.primary;
  const pad = size === "sm" ? "5px 12px" : size === "lg" ? "12px 28px" : "8px 18px";
  const fs  = size === "sm" ? 12 : size === "lg" ? 15 : 13;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: outline ? "transparent" : disabled ? C.border : col,
      border: `2px solid ${disabled ? C.border : col}`,
      color: outline ? col : disabled ? C.textDim : "#fff",
      padding: pad, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: fs, fontWeight: 600, fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
      width: fullWidth ? "100%" : "auto", justifyContent: "center",
      transition: "all 0.15s",
    }}>
      {icon && <span>{icon}</span>}{label}
    </button>
  );
}

function Card({ children, style = {}, padding = 20 }) {
  const C = useC();
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  const C = useC();
  const col = color ?? C.primary;
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: col, fontFamily: "Georgia, serif" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${col}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
      </div>
    </Card>
  );
}

function Table({ cols, rows, onRow }) {
  const C = useC();
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {cols.map(c => (
              <th key={c.key || c.label} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                {c.label.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No data found</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRow?.(row)} style={{ borderBottom: `1px solid ${C.border}`, cursor: onRow ? "pointer" : "default", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "inherit"}>
              {cols.map(c => (
                <td key={c.key || c.label} style={{ padding: "12px 14px", color: C.text, verticalAlign: "middle" }}>
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, children, onClose, width = 560 }) {
  const C = useC();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{ background: C.surface, borderRadius: 14, width, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textDim, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  const C = useC();
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 5 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", required, style = {} }) {
  const C = useC();
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = C.primary}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

function Select({ value, onChange, options, placeholder, style = {} }) {
  const C = useC();
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", boxSizing: "border-box", cursor: "pointer", ...style }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Spinner() {
  const C = useC();
  return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `4px solid ${C.border}`, borderTop: `4px solid ${C.primary}`, animation: "spin 0.8s linear infinite" }}/>
  </div>;
}

function ScreenSaver({ onWake }) {
  return (
    <div onClick={onWake} onKeyDown={onWake} tabIndex={0}
      style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", cursor: "pointer" }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>🛺</div>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, opacity: 0.8 }}>eRickshawDekho</div>
      <div style={{ color: "#fff", fontSize: 13, opacity: 0.5, marginTop: 8 }}>Click anywhere to wake</div>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.1);opacity:1} }`}</style>
    </div>
  );
}

function DateFilter({ from, to, onChange }) {
  const C = useC();
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const presets = [
    { label: 'Today',      f: fmt(today), t: fmt(today) },
    { label: 'This Week',  f: fmt(new Date(today - 6*86400000)), t: fmt(today) },
    { label: 'This Month', f: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), t: fmt(today) },
    { label: 'This Year',  f: fmt(new Date(today.getFullYear(), 0, 1)), t: fmt(today) },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {presets.map(p => {
        const active = from === p.f && to === p.t;
        return (
          <button key={p.label} onClick={() => onChange(p.f, p.t)}
            style={{ padding: '4px 10px', borderRadius: 14, border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary : C.surface, color: active ? '#fff' : C.textMid, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
            {p.label}
          </button>
        );
      })}
      <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
        style={{ padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: C.surface, color: C.text, colorScheme: 'inherit' }} />
      <span style={{ fontSize: 11, color: C.textDim }}>–</span>
      <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
        style={{ padding: '4px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: C.surface, color: C.text, colorScheme: 'inherit' }} />
      {(from || to) && (
        <button onClick={() => onChange('', '')}
          style={{ padding: '4px 8px', borderRadius: 14, border: `1.5px solid ${C.danger}40`, background: `${C.danger}10`, color: C.danger, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
          ✕ Clear
        </button>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  const C = useC();
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: page <= 1 ? "not-allowed" : "pointer", color: page <= 1 ? C.textDim : C.text }}>‹</button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPage(p)} style={{ width: 34, height: 34, border: `1px solid ${p === page ? C.primary : C.border}`, borderRadius: 6, background: p === page ? C.primary : C.surface, color: p === page ? "#fff" : C.text, cursor: "pointer", fontWeight: p === page ? 700 : 400 }}>{p}</button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} style={{ padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: page >= totalPages ? "not-allowed" : "pointer", color: page >= totalPages ? C.textDim : C.text }}>›</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MINI CHART
// ═══════════════════════════════════════════════════════
function BarChart({ data, height = 120 }) {
  const C = useC();
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.revenue || 0)) || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: `linear-gradient(180deg,${C.accent},${C.primary})`, borderRadius: "4px 4px 0 0", height: `${(d.revenue / max) * (height - 24)}px`, minHeight: 4, transition: "height 0.3s" }}/>
          <div style={{ fontSize: 9, color: C.textDim, whiteSpace: "nowrap" }}>{d.date?.split(" ")[1]}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, size = 100 }) {
  const C = useC();
  const total = Object.values(data || {}).reduce((a, b) => a + b, 0) || 1;
  const colors = { electric: C.success, petrol: "#f97316", cng: "#06b6d4", lpg: "#8b5cf6", diesel: "#64748b" };
  const entries = Object.entries(data || {});
  let offset = 0;
  const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14}/>
      {entries.map(([key, val], i) => {
        const pct = val / total;
        const dash = pct * circumference;
        const off = offset;
        offset += pct;
        return (
          <circle key={key} cx={cx} cy={cy} r={r} fill="none"
            stroke={colors[key] || "#94a3b8"} strokeWidth={14}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-off * circumference}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}/>
        );
      })}
      <text x={50} y={46} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: C.text }}>Total</text>
      <text x={50} y={60} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: C.primary }}>{total}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════

export { Badge, Btn, Card, StatCard, Table, Modal, Field, Input, Select, Spinner, ScreenSaver, DateFilter, Pagination, BarChart, DonutChart };
