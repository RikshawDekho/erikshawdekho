/**
 * Reports.jsx — Sales & performance reports
 */
import { useState, useEffect } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { fmtINR, Card, StatCard, Spinner, DateFilter, BarChart, DonutChart } from "./ui";
import { useToast } from "./contexts";

function Reports() {
  const C = useC();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.reports(`?period=${period}`).then(setData).finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>📈 Analytics & Reports</div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>Track your dealership performance over time</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: C.bg, padding: 4, borderRadius: 10 }}>
          {["week","month","year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: 13, transition: "all 0.15s",
              background: period === p ? C.surface : "transparent",
              color: period === p ? C.primary : C.textMid,
              boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : !data ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>Could not load report data</div>
      ) : (
        <>
          {/* KPI stat cards */}
          <div className="erd-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard icon="💰" label="Revenue"         value={fmtINR(data.revenue)}          color={C.primary} />
            <StatCard icon="🛺" label="Sales"           value={data.sale_count}               color={C.success} />
            <StatCard icon="👥" label="New Leads"       value={data.lead_count}               color={C.info}    />
            <StatCard icon="✅" label="Conversion Rate" value={`${data.conversion_rate}%`}   color={C.accent}  />
            <StatCard icon="📊" label="Avg Sale Value"  value={fmtINR(data.avg_sale_value)}  color={C.warning} />
            <StatCard icon="🎯" label="Leads Converted" value={data.converted_leads}          color={C.success} />
          </div>

          {/* Sales by Fuel Type */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚡</span> Sales by Vehicle Type
            </div>
            {!data.fuel_sales?.length ? (
              <div style={{ textAlign: "center", padding: 24, color: C.textDim, fontSize: 13 }}>No sales data for this period</div>
            ) : (
              <div>
                {data.fuel_sales.map((f, i) => {
                  const maxRev = Math.max(...data.fuel_sales.map(x => x.revenue || 0));
                  const pct = maxRev > 0 ? ((f.revenue || 0) / maxRev) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: FUEL_COLOR[f.vehicle__fuel_type] || "#94a3b8", flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{f.vehicle__fuel_type || "Unknown"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 24 }}>
                          <span style={{ color: C.textMid }}>Units: <b style={{ color: C.text }}>{f.count}</b></span>
                          <span style={{ color: C.primary }}>Revenue: <b>{fmtINR(f.revenue)}</b></span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: FUEL_COLOR[f.vehicle__fuel_type] || C.primary, borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Period summary */}
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>📅 Period Summary — {period.charAt(0).toUpperCase() + period.slice(1)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {[
                { label: "Total Revenue", value: fmtINR(data.revenue), icon: "💰", color: C.primary },
                { label: "Sales Made", value: data.sale_count, icon: "🛺", color: C.success },
                { label: "Leads Received", value: data.lead_count, icon: "📩", color: C.info },
                { label: "Leads Converted", value: data.converted_leads, icon: "✅", color: C.accent },
                { label: "Average Sale", value: fmtINR(data.avg_sale_value), icon: "📊", color: C.warning },
                { label: "Conversion %", value: `${data.conversion_rate}%`, icon: "🎯", color: C.success },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}


export default Reports;
