/**
 * FooterNew — Updated footer with 3-ecosystem navigation + i18n
 * Support contact is fetched from /api/platform/settings/ so admin changes take effect immediately.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { ROLE_C, TYPO, RADIUS, LAYOUT } from "../theme";
import { BRANDING } from "../branding";

const G = ROLE_C.driver;

// Cache the fetched settings so every footer mount doesn't re-fetch
let _cachedSettings = null;

async function fetchPlatformSettings() {
  if (_cachedSettings) return _cachedSettings;
  try {
    const res = await fetch("/api/platform/settings/");
    if (res.ok) {
      _cachedSettings = await res.json();
      return _cachedSettings;
    }
  } catch {}
  return null;
}

export default function FooterNew() {
  const { t } = useI18n();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchPlatformSettings().then(s => { if (s) setSettings(s); });
  }, []);

  const supportEmail   = settings?.support_email   || BRANDING.support.email;
  const supportPhone   = settings?.support_phone   || BRANDING.support.phone || "";
  const supportWA      = settings?.support_whatsapp || BRANDING.support.whatsappDigits || supportPhone;
  const supportName    = settings?.support_name    || BRANDING.platformName;

  const displayPhone = supportPhone || (supportWA ? `+${supportWA}` : null);

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
            {supportEmail && (
              <div>
                <a href={`mailto:${supportEmail}`} style={{ color: "#9ca3af", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = G}
                  onMouseLeave={e => e.target.style.color = "#9ca3af"}>
                  📧 {supportEmail}
                </a>
              </div>
            )}
            {displayPhone && (
              <div>
                <a href={`tel:${displayPhone.replace(/\D/g,'')}`} style={{ color: "#9ca3af", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = G}
                  onMouseLeave={e => e.target.style.color = "#9ca3af"}>
                  📱 {displayPhone}
                </a>
              </div>
            )}
            {supportWA && (
              <div>
                <a href={`https://wa.me/${String(supportWA).replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#9ca3af", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = "#25d366"}
                  onMouseLeave={e => e.target.style.color = "#9ca3af"}>
                  💬 WhatsApp Support
                </a>
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>🕐 Mon–Sat, 9 AM – 7 PM IST</div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1f2937", padding: "20px 24px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>
        <div style={{ marginBottom: 6 }}>
          © {new Date().getFullYear()} {BRANDING.platformName}. {t("footer.copyright")} | {t("footer.designed")}
        </div>
        <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.8 }}>
          ErikshawDekho LLC, Registered in the United States of America.
          &nbsp;·&nbsp; Operations: India
        </div>
      </div>
    </footer>
  );
}
