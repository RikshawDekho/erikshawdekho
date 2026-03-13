/**
 * Misc.jsx — PWA install prompt + Contact support modal
 */
import { useState, useEffect } from "react";
import { useC } from "../theme";

function PWAInstallPrompt() {
  const C = useC();
  const [prompt, setPrompt] = useState(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("erd_pwa_dismissed") === "1");

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isIOS && !isStandalone && !dismissed) setShowIOS(true);

    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem("erd_pwa_dismissed", "1");
    setDismissed(true); setPrompt(null); setShowIOS(false);
  };

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  };

  if (dismissed || (!prompt && !showIOS)) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: C.surface, border: `1.5px solid ${C.primary}`, borderRadius: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "14px 20px", zIndex: 9998,
      display: "flex", alignItems: "center", gap: 14, maxWidth: 400, width: "calc(100% - 40px)",
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>🛺</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Install eRickshawDekho App</div>
        <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>
          {showIOS ? "Tap Share → Add to Home Screen for faster access." : "Get faster access and offline support."}
        </div>
      </div>
      {!showIOS && <Btn label="Install" color={C.primary} size="sm" onClick={install} />}
      <button onClick={dismiss} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textDim, padding: 0, flexShrink: 0 }}>✕</button>
    </div>
  );
}

// Support contact — set VITE_SUPPORT_PHONE / VITE_SUPPORT_WA in .env.local
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "";
const SUPPORT_WA    = import.meta.env.VITE_SUPPORT_WA    || "";
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@erikshawdekho.com";

function ContactSupportModal({ onClose, onNavigate }) {
  const C = useC();
  return (
    <Modal title="Upgrade to Early Dealer Plan" onClose={onClose} width={440}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "4px 0 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.primary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>⭐</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>Unlock Early Dealer Features</div>
        <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.75 }}>
          Get unlimited vehicles, leads, invoices, WhatsApp alerts and priority support.
        </div>
      </div>

      {/* Early Dealer Plan */}
      <div style={{ background: `${C.primary}08`, border: `2px solid ${C.primary}33`, borderRadius: 12, padding: "16px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 4 }}>Early Dealer Plan</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>₹5,000</div>
        <div style={{ fontSize: 12, color: C.textMid, marginBottom: 8 }}>per year · Unlimited Listings · Priority Ranking</div>
        <div style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>⚡ Only 100 dealers — First come, first served</div>
      </div>

      {/* Contact options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SUPPORT_WA && (
          <Btn label="💬 WhatsApp Us — Get started in minutes" color={C.success} fullWidth
            onClick={() => window.open(`https://wa.me/${SUPPORT_WA.replace(/\D/g, "")}?text=Hi+I+want+to+upgrade+to+Pro+plan`, "_blank")} />
        )}
        {SUPPORT_PHONE && (
          <Btn label={`📞 Call Us — ${SUPPORT_PHONE}`} color={C.primary} fullWidth
            onClick={() => window.open(`tel:${SUPPORT_PHONE}`)} />
        )}
        <Btn label={`✉️ Email — ${SUPPORT_EMAIL}`} color={C.info} outline fullWidth
          onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=Pro%20Plan%20Upgrade%20Request&body=Hi%2C%20I%27d%20like%20to%20upgrade%20to%20the%20Pro%20plan.%20Please%20get%20in%20touch.`)} />
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: C.textDim, textAlign: "center", lineHeight: 1.6 }}>
        We'll activate your account within minutes during business hours.<br />
        No hidden charges. Cancel anytime.
      </div>
    </Modal>
  );
}


export { PWAInstallPrompt, ContactSupportModal };
