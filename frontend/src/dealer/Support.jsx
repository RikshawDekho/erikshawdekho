/**
 * Support.jsx — Help center, FAQs, contact support
 */
import { useState } from "react";
import { useC } from "../theme";
import { Card, Btn } from "./ui";

function SupportPage() {
  const C = useC();
  const [settings, setSettings] = useState({
    support_phone: "1800-XXX-XXXX",
    support_email: "support@erikshawdekho.com",
    support_whatsapp: "919876543210",
  });

  useEffect(() => {
    apiFetch("/platform/settings/")
      .then(data => {
        setSettings({
          support_phone: data.support_phone || "1800-XXX-XXXX",
          support_email: data.support_email || "support@erikshawdekho.com",
          support_whatsapp: data.support_whatsapp || "919876543210",
        });
      })
      .catch(err => {
        console.error("Failed to load support settings:", err);
      });
  }, []);

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>🛟 Support Center</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>We're here to help. Reach us anytime.</div>
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }} className="erd-two-col">
        {/* Dealer Support */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.primary, marginBottom: 4 }}>🏪 Dealer Support</div>
          <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>For showroom owners and dealers on our platform</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "📞", label: "Call Us", value: settings.support_phone, action: () => window.open(`tel:${settings.support_phone}`) },
              { icon: "💬", label: "WhatsApp", value: "Chat with us", action: () => window.open(`https://wa.me/${settings.support_whatsapp.replace(/\D/g,"")}?text=Hi+I+need+help+with+my+dealer+account`) },
              { icon: "✉️", label: "Email", value: settings.support_email, action: () => window.open(`mailto:${settings.support_email}?subject=Dealer Support`) },
            ].map(({ icon, label, value, action }) => (
              <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{value}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, background: `${C.primary}08`, border: `1px solid ${C.primary}22`, borderRadius: 8, padding: "12px 14px", fontSize: 12, color: C.textMid }}>
            <div style={{ fontWeight: 700, color: C.primary, marginBottom: 4 }}>Onboarding Help</div>
            <div>Need help setting up your dealer profile, adding vehicles, or getting your first leads? Our team guides you through the whole process.</div>
          </div>
        </Card>

        {/* Driver / Buyer Support */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.info, marginBottom: 4 }}>🛺 Driver Support</div>
          <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>For eRickshaw drivers and buyers using the platform</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "📞", label: "Driver Helpline", value: settings.support_phone, action: () => window.open(`tel:${settings.support_phone}`) },
              { icon: "💬", label: "WhatsApp Help", value: "Get vehicle advice", action: () => window.open(`https://wa.me/${settings.support_whatsapp.replace(/\D/g,"")}?text=Hi+I+need+help+finding+an+eRickshaw`) },
              { icon: "✉️", label: "Email Support", value: settings.support_email, action: () => window.open(`mailto:${settings.support_email}?subject=Driver Support`) },
            ].map(({ icon, label, value, action }) => (
              <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{value}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, background: `${C.info}08`, border: `1px solid ${C.info}22`, borderRadius: 8, padding: "12px 14px", fontSize: 12, color: C.textMid }}>
            <div style={{ fontWeight: 700, color: C.info, marginBottom: 4 }}>Buying Guidance</div>
            <div>Compare eRickshaw models, understand EMI options, and connect with verified dealers. We help you make the right purchase decision.</div>
          </div>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 18 }}>❓ Frequently Asked Questions</div>
        {[
          { q: "My account is under verification. How long does it take?", a: "Admin verification typically takes 24-48 hours on business days. You'll receive an email once approved." },
          { q: "How do I upgrade to Early Dealer Plan?", a: "Go to Plans & Pricing from the left navigation and click 'Upgrade Now'. ₹5000/year gets you unlimited listings + priority ranking." },
          { q: "I forgot my password. How do I reset it?", a: "On the login screen, click 'Forgot password?' and enter your registered email address. You'll receive a 6-digit OTP." },
          { q: "How do I add more than 3 vehicles?", a: "The Free Plan allows 3 vehicle listings. Upgrade to Early Dealer Plan for unlimited listings." },
          { q: "How are leads distributed to dealers?", a: "When a buyer submits an enquiry, leads go to dealers matching the vehicle type and location. Priority dealers appear first." },
          { q: "Can I use the platform on mobile?", a: "Yes! Install our app from your browser — tap 'Add to Home Screen' on Chrome/Safari. Fully works as PWA." },
        ].map(({ q, a }, i) => (
          <details key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 0" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.text, listStyle: "none", display: "flex", justifyContent: "space-between" }}>
              {q} <span style={{ color: C.primary, fontSize: 16 }}>+</span>
            </summary>
            <div style={{ fontSize: 13, color: C.textMid, marginTop: 10, lineHeight: 1.7 }}>{a}</div>
          </details>
        ))}
      </Card>

      {/* Pro plan CTA */}
      <div style={{ marginTop: 20, background: `linear-gradient(135deg,${C.primary}12,${C.accent}08)`, border: `1.5px solid ${C.primary}33`, borderRadius: 14, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.primary }}>Need Pro Plan Assistance?</div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>Our team activates your Early Dealer Plan within minutes during business hours.</div>
        </div>
        <Btn label="⭐ Upgrade to Early Dealer — ₹5000/yr" color={C.primary} onClick={() => window.open(`https://wa.me/${settings.support_whatsapp.replace(/\D/g,"")}?text=Hi+I+want+to+upgrade+to+Early+Dealer+Plan`)} />
      </div>
    </div>
  );
}


export default SupportPage;
