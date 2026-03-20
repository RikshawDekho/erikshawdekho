/**
 * Plans.jsx — Plan listing & upgrade page
 */
import { useState, useEffect } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { Card, Btn, Spinner } from "./ui";
import { useToast, usePlan } from "./contexts";

const PLAN_FEATURES = [
  { label: "Vehicle Listings",              free: "3 vehicles only",      pro: "Unlimited" },
  { label: "Lead Management",               free: true,                   pro: true },
  { label: "Sales & Invoicing (GST)",       free: true,                   pro: true },
  { label: "Customer Database",             free: true,                   pro: true },
  { label: "Finance & EMI Calculator",      free: true,                   pro: true },
  { label: "Reports & Analytics",           free: "Basic",                pro: "Advanced + Export" },
  { label: "Priority Marketplace Ranking",  free: false,                  pro: true },
  { label: "Featured Dealer Badge",         free: false,                  pro: true },
  { label: "Email Notifications",           free: true,                   pro: true },
  { label: "WhatsApp Lead Alerts",          free: false,                  pro: true },
  { label: "Future Marketing Tools",        free: false,                  pro: true },
  { label: "Priority Support",              free: false,                  pro: true },
];

function PlanFeatureRow({ label, free, pro }) {
  const renderVal = (v) => {
    if (v === true)  return <span style={{ color: C.success, fontSize: 16 }}>✓</span>;
    if (v === false) return <span style={{ color: C.textDim, fontSize: 16 }}>—</span>;
    return <span style={{ fontSize: 12, color: C.textMid }}>{v}</span>;
  };
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: "11px 16px", fontSize: 13, color: C.text }}>{label}</td>
      <td style={{ padding: "11px 16px", textAlign: "center" }}>{renderVal(free)}</td>
      <td style={{ padding: "11px 16px", textAlign: "center", background: `${C.primary}08` }}>{renderVal(pro)}</td>
    </tr>
  );
}

function PlansPage({ onUpgrade }) {
  const C = useC();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  const plan = data?.plan;
  const isPro = plan?.type === "pro" && plan?.is_active;
  const isFreeActive = plan?.type === "free" && plan?.is_active;

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 6 }}>Plans & Pricing</div>
        <div style={{ fontSize: 14, color: C.textMid }}>Choose the right plan for your dealership. Start free, upgrade anytime.</div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Current plan status */}
          {plan && (
            <div style={{
              background: plan.is_active ? `${C.success}12` : `${C.danger}12`,
              border: `1px solid ${plan.is_active ? C.success + "44" : C.danger + "44"}`,
              borderRadius: 10, padding: "12px 18px", marginBottom: 24,
              fontSize: 13, color: plan.is_active ? C.success : C.danger,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {plan.is_active
                ? `✅ You are on the ${plan.type.toUpperCase()} plan — ${plan.days_remaining} day${plan.days_remaining !== 1 ? "s" : ""} remaining`
                : `⚠️ Your ${plan.type.toUpperCase()} plan has expired. Upgrade to continue accessing all features.`}
            </div>
          )}

          {/* Plan cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {/* Free Plan */}
            <Card style={{ border: isFreeActive ? `2px solid ${C.primary}` : `1px solid ${C.border}`, position: "relative" }}>
              {isFreeActive && (
                <div style={{ position: "absolute", top: -12, left: 20, background: C.primary, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>
                  CURRENT PLAN
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, letterSpacing: "1px", marginBottom: 6 }}>FREE PLAN</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.text }}>₹0</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Forever free</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.7 }}>
                Get started and explore the platform. Perfect for new dealerships.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {["3 vehicle listings", "Leads visible in dashboard", "Invoice generation", "EMI calculator", "Basic dashboard"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMid }}>
                    <span style={{ color: C.success }}>✓</span> {f}
                  </div>
                ))}
                {["Priority marketplace ranking", "Featured dealer badge", "WhatsApp lead alerts", "Advanced analytics"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textDim }}>
                    <span style={{ color: C.textDim }}>—</span> {f}
                  </div>
                ))}
              </div>
              <Btn label={isFreeActive ? "Current Plan" : "Get Started Free"} color={C.primary} outline fullWidth disabled={isFreeActive} />
            </Card>

            {/* Early Dealer Plan */}
            <Card style={{ border: `2px solid ${C.primary}`, background: `linear-gradient(180deg,${C.primary}08 0%,transparent 100%)`, position: "relative" }}>
              <div style={{ position: "absolute", top: -12, right: 20, background: `linear-gradient(90deg,${C.accent},${C.primary})`, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>
                {isPro ? "CURRENT PLAN" : "ONLY 100 DEALERS"}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "1px", marginBottom: 6 }}>EARLY DEALER PLAN</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.primary }}>₹5,000</div>
                  <div style={{ fontSize: 13, color: C.textMid, marginBottom: 6 }}>/year</div>
                </div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Limited to first 100 dealers • Lock in forever</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20, lineHeight: 1.7 }}>
                Everything unlimited. Priority ranking in search. Featured badge. All future tools included.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {["Unlimited vehicle listings", "Priority marketplace ranking", "Featured dealer badge", "WhatsApp lead alerts", "Advanced analytics", "All future marketing tools", "Priority support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
                    <span style={{ color: C.success }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {isPro ? (
                <Btn label="Current Plan ✓" color={C.success} fullWidth disabled />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Btn label="⭐ Get Early Dealer Plan — ₹5000/yr" color={C.primary} fullWidth onClick={onUpgrade} />
                  <div style={{ textAlign: "center", fontSize: 11, color: C.textDim }}>Contact our team to activate instantly • Limited spots</div>
                </div>
              )}
            </Card>
          </div>

          {/* Feature comparison table */}
          <Card padding={0}>
            <div style={{ padding: "16px 16px 0", fontWeight: 700, fontSize: 15, color: C.text }}>Feature Comparison</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}` }}>FEATURE</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: C.textMid, fontWeight: 600, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, width: 160 }}>FREE TRIAL</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: C.primary, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", borderBottom: `1px solid ${C.border}`, background: `${C.primary}08`, width: 160 }}>EARLY DEALER ⭐</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map(f => <PlanFeatureRow key={f.label} {...f} />)}
                </tbody>
              </table>
            </div>
          </Card>

          {/* FAQ / support */}
          <div style={{ marginTop: 28, padding: "20px 24px", background: `linear-gradient(135deg,${C.primary}10,${C.accent}08)`, borderRadius: 12, border: `1px solid ${C.primary}22` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: C.text }}>Need help choosing?</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.8, marginBottom: 14 }}>
              Our team will help you pick the right plan and get you set up quickly.
              All plans include onboarding support and data migration.
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {SUPPORT_PHONE && <Btn label={`📞 Call ${SUPPORT_PHONE}`} color={C.primary} outline size="sm" onClick={() => window.open(`tel:${SUPPORT_PHONE}`)} />}
              {SUPPORT_WA    && <Btn label="💬 WhatsApp Us" color={C.success} size="sm" onClick={() => window.open(`https://wa.me/${SUPPORT_WA.replace(/\D/g,"")}?text=Hi+I+need+help+with+eRickshawDekho`, "_blank")} />}
              <Btn label={`✉️ Email ${SUPPORT_EMAIL}`} color={C.info} outline size="sm" onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`)} />
              {!SUPPORT_PHONE && !SUPPORT_WA && <Btn label="📬 Contact Support" color={C.primary} size="sm" onClick={onUpgrade} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


export default PlansPage;
