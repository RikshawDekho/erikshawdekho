/**
 * FooterNew — Updated footer with 3-ecosystem navigation + i18n
 */
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { ROLE_C, TYPO, RADIUS, LAYOUT } from "../theme";
import { BRANDING } from "../branding";

const G = ROLE_C.driver;

export default function FooterNew() {
  const { t } = useI18n();
  const supportNumber = BRANDING.support.phone || (BRANDING.support.whatsappDigits ? `+${BRANDING.support.whatsappDigits}` : "WhatsApp");

  return (
    <footer style={{ background: "#111827", color: "#d1d5db", marginTop: "auto", fontFamily: TYPO.body }}>
      <div style={{ maxWidth: LAYOUT.navWidth, margin: "0 auto", padding: "48px 24px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>

        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🛺</span>
            <span style={{ fontFamily: TYPO.heading, fontWeight: 800, fontSize: 18, color: G }}>{BRANDING.platformName}</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#9ca3af" }}>
            {t("footer.brand_desc")}
          </p>
          <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>{t("footer.made_in_india")}</div>
        </div>

        {/* Buyers / Drivers */}
        <div>
          <div style={{ fontWeight: 700, color: "#f9fafb", marginBottom: 14, fontSize: 14 }}>{t("footer.buyers")}</div>
          {[
            [t("footer.browse"), "/driver/marketplace"],
            [t("footer.find_dealers"), "/driver/dealers"],
            [t("nav.learn"), "/driver/learn"],
            [t("driver.emi"), "/driver/marketplace"],
          ].map(([label, href]) => (
            <Link key={label} to={href} style={{ display: "block", color: "#9ca3af", fontSize: 13, marginBottom: 8, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = G}
              onMouseLeave={e => e.target.style.color = "#9ca3af"}>
              {label}
            </Link>
          ))}
        </div>

        {/* Dealers */}
        <div>
          <div style={{ fontWeight: 700, color: "#f9fafb", marginBottom: 14, fontSize: 14 }}>{t("footer.for_dealers")}</div>
          {[
            [t("footer.dealer_login"), "/dealer"],
            [t("footer.register_showroom"), "/dealer"],
            [t("footer.manage_inventory"), "/dealer/dashboard"],
          ].map(([label, href]) => (
            <Link key={label + href} to={href} style={{ display: "block", color: "#9ca3af", fontSize: 13, marginBottom: 8, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = G}
              onMouseLeave={e => e.target.style.color = "#9ca3af"}>
              {label}
            </Link>
          ))}
        </div>

        {/* Contact */}
        <div>
          <div style={{ fontWeight: 700, color: "#f9fafb", marginBottom: 14, fontSize: 14 }}>{t("footer.contact")}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 2 }}>
            <div>📧 {BRANDING.support.email}</div>
            <div>📱 WhatsApp: {supportNumber}</div>
            <div>🕐 Mon–Sat, 9 AM – 7 PM IST</div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1f2937", padding: "16px 24px", textAlign: "center", fontSize: 12, color: "#6b7280", borderRadius: `${RADIUS.sm}px ${RADIUS.sm}px 0 0` }}>
        © {new Date().getFullYear()} {BRANDING.platformName}. {t("footer.copyright")} | {t("footer.designed")}
      </div>
    </footer>
  );
}
