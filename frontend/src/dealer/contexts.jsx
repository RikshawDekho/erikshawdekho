/**
 * contexts.jsx — Shared contexts for dealer portal
 */
import { createContext, useContext, useState, useCallback } from "react";
import { useC } from "../theme";

// Auth context
export const AuthCtx = createContext(null);

// Toast context  
const ToastCtx = createContext(() => {});
export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }) {
  const C = useC();
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  const ICONS = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  const COLORS = { success: C.success, error: C.danger, warning: C.warning, info: C.info };
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 8, maxWidth: 360, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: COLORS[t.type] || C.info, color: "#fff",
            padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "flex-start", gap: 8,
            animation: "slideUp 0.25s ease",
          }}>
            <span style={{ flexShrink: 0, fontSize: 15 }}>{ICONS[t.type]}</span>
            <span style={{ lineHeight: 1.5 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// Plan context
export const PlanCtx = createContext(null);
export function usePlan() { return useContext(PlanCtx); }

export function PlanGate({ children, feature = "This feature", onUpgrade, plan: planProp }) {
  const C = useC();
  const ctxPlan = usePlan();
  const plan = planProp ?? ctxPlan;
  if (!plan || plan.is_active) return children;
  return (
    <div style={{ position: "relative", minHeight: 200 }}>
      <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)", borderRadius: 12 }}>
        <div style={{ textAlign: "center", padding: 28, maxWidth: 320 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>{feature} — Plan Expired</div>
          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, marginBottom: 18 }}>
            Your free trial has ended. Upgrade to the Pro plan to continue using this feature.
          </div>
          <button onClick={onUpgrade} style={{
            background: C.primary, border: `2px solid ${C.primary}`, color: "#fff",
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
          }}>⭐ View Plans & Upgrade</button>
        </div>
      </div>
    </div>
  );
}
