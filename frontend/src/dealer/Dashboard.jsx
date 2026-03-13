/**
 * Dashboard.jsx — Dealer dashboard with stats, charts, recent activity
 */
import { useState, useEffect } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { fmtINR, fmtDate, Card, StatCard, Badge, Btn, Spinner, DateFilter, BarChart, DonutChart, LEAD_COLOR, STOCK_COLOR } from "./ui";
import { useToast } from "./contexts";

function Dashboard({ onNavigate }) {
  const C = useC();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doneTaskIds, setDoneTaskIds] = useState(new Set());

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch(err => {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, []);

  const markTaskDone = async (taskId) => {
    setDoneTaskIds(prev => new Set([...prev, taskId]));
    try {
      await api.tasks.update(taskId, { is_completed: true });
      toast("Task marked as done!", "success");
    } catch {
      setDoneTaskIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
      toast("Failed to update task.", "error");
    }
  };

  if (loading) return <Spinner />;
  if (error) return (
    <div style={{ padding: 24, textAlign: "center", color: C.error || "#ef4444" }}>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px", background: C.primary, color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
        Refresh Page
      </button>
    </div>
  );
  if (!data) return <Spinner />;

  const fuelColors = { electric: C.success, petrol: "#f97316", cng: "#06b6d4", lpg: "#8b5cf6" };
  const plan = data.plan;

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 1200 }}>
      {/* Welcome banner */}
      <div className="erd-welcome-banner" style={{ background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 14, padding: "22px 28px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Welcome back! 👋</div>
          <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Here's an overview of your dealership activity.</div>
        </div>
        <div className="erd-rickshaw-icon" style={{ fontSize: 48 }}>🛺</div>
      </div>

      {/* Verification warning */}
      {data && !data.is_verified && (
        <div style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: C.warning, display: "flex", alignItems: "center", gap: 8 }}>
          ⏳ <span>Your dealership is <b>pending verification</b>. Our team will review and approve it shortly.</span>
        </div>
      )}

      {/* Plan warnings */}
      {plan && !plan.is_active && (
        <div style={{ background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: C.danger, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>⚠️ Your <b>{plan.type} plan</b> has expired. Upgrade to continue accessing all features.</span>
          <Btn label="⭐ View Plans" color={C.danger} size="sm" onClick={() => onNavigate?.("plans")} />
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining <= 7 && (
        <div style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 13, color: C.warning, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>⚠️ Your <b>{plan.type} plan</b> expires in <b>{plan.days_remaining} day{plan.days_remaining !== 1 ? "s" : ""}</b>.</span>
          <Btn label="⭐ Upgrade Now" color={C.warning} size="sm" onClick={() => onNavigate?.("plans")} />
        </div>
      )}
      {plan && plan.is_active && plan.days_remaining !== null && plan.days_remaining > 7 && (
        <div style={{ marginBottom: 24 }} />
      )}

      {/* Stats row */}
      <div className="erd-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon="🚗" label="Total Vehicles" value={data.total_vehicles} color={C.primary} sub={`${data.in_stock} in stock`} />
        <StatCard icon="👥" label="Active Leads"   value={data.active_leads}   color={C.info} />
        <StatCard icon="💰" label="New Sales"      value={data.new_sales}      color={C.success} sub="this month" />
        <StatCard icon="📋" label="Pending Tasks"  value={data.pending_tasks}  color={C.warning} />
      </div>

      {/* Charts row */}
      <div className="erd-dash-chart-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sales Insights</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.primary, fontFamily: "Georgia, serif", marginBottom: 12 }}>{fmtINR(data.monthly_revenue)}</div>
          <BarChart data={data.sales_chart} height={110} />
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Inventory Overview</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <DonutChart data={data.fuel_breakdown} size={110} />
            <div style={{ flex: 1 }}>
              {Object.entries(data.fuel_breakdown || {}).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: fuelColors[k] || "#94a3b8" }} />
                    <span style={{ textTransform: "capitalize", color: C.textMid }}>{k}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
                <span>Total</span><span style={{ color: C.primary }}>{data.total_vehicles}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="erd-dash-bottom-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Recent Leads</div>
          </div>
          {(data.recent_leads || []).map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data.recent_leads.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.customer_name}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{l.vehicle_name}</div>
              </div>
              <Badge label={l.status.replace("_", " ")} color={LEAD_COLOR[l.status]} />
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Upcoming Deliveries</div>
          {(data.upcoming_deliveries || []).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data.upcoming_deliveries.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛺</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.customer_name}</div>
                <div style={{ fontSize: 11, color: C.textDim }}>{s.vehicle_name}</div>
              </div>
              <div style={{ fontSize: 11, color: C.textMid }}>{fmtDate(s.delivery_date)}</div>
            </div>
          ))}
          {data.upcoming_tasks && data.upcoming_tasks.filter(t => !doneTaskIds.has(t.id)).length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, margin: "14px 0 10px" }}>Upcoming Tasks</div>
              {data.upcoming_tasks.filter(t => !doneTaskIds.has(t.id)).map((t, i, arr) => (
                <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <button
                    onClick={() => markTaskDone(t.id)}
                    title="Mark as done"
                    style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${C.success}`, background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.success, fontSize: 11, padding: 0, lineHeight: 1 }}
                  >✓</button>
                  <div style={{ flex: 1, fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, whiteSpace: "nowrap" }}>{fmtDate(t.due_date)}</div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}


export default Dashboard;
