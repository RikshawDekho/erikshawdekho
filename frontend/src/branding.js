const APP_ENV = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "prod").toLowerCase();
const IS_DEMO_ENV = APP_ENV === "demo";

function asBool(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const DEMO_WHITE_LABEL_ENABLED = IS_DEMO_ENV && asBool(import.meta.env.VITE_DEMO_WHITE_LABEL);

const DEFAULTS = {
  platformName: "ErikshawDekho",
  platformTagline: "India's Most Trusted E-Rickshaw Platform",
  supportEmail: "support@erikshawdekho.com",
  supportPhone: "+91-XXXXXXXXXX",
  supportWhatsApp: "919876543210",
  platformUrl: IS_DEMO_ENV ? "https://demo.erikshawdekho.com" : "https://www.erikshawdekho.com",
  invoiceEmail: "info@erikshawdekho.com",
};

function pickDemoOverride(value, fallback) {
  const trimmed = String(value || "").trim();
  if (DEMO_WHITE_LABEL_ENABLED && trimmed) return trimmed;
  return fallback;
}

function cleanHost(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.host.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

const platformName = pickDemoOverride(import.meta.env.VITE_DEMO_BRAND_NAME, DEFAULTS.platformName);
const platformTagline = pickDemoOverride(import.meta.env.VITE_DEMO_BRAND_TAGLINE, DEFAULTS.platformTagline);
const platformUrl = pickDemoOverride(
  import.meta.env.VITE_DEMO_PLATFORM_URL,
  (import.meta.env.VITE_PLATFORM_URL || "").trim() || DEFAULTS.platformUrl
);

const supportEmail = pickDemoOverride(
  import.meta.env.VITE_DEMO_SUPPORT_EMAIL,
  (import.meta.env.VITE_SUPPORT_EMAIL || "").trim() || DEFAULTS.supportEmail
);
const supportPhone = pickDemoOverride(
  import.meta.env.VITE_DEMO_SUPPORT_PHONE,
  (import.meta.env.VITE_SUPPORT_PHONE || "").trim() || DEFAULTS.supportPhone
);
const supportWhatsApp = pickDemoOverride(
  import.meta.env.VITE_DEMO_SUPPORT_WHATSAPP,
  (import.meta.env.VITE_SUPPORT_WA || "").trim() || DEFAULTS.supportWhatsApp
);
const invoiceEmail = pickDemoOverride(import.meta.env.VITE_DEMO_INVOICE_EMAIL, DEFAULTS.invoiceEmail);

export const BRANDING = {
  appEnv: APP_ENV,
  isDemoEnv: IS_DEMO_ENV,
  whiteLabelDemoEnabled: DEMO_WHITE_LABEL_ENABLED,
  platformName,
  platformTagline,
  platformUrl,
  platformHost: cleanHost(platformUrl),
  invoiceEmail,
  support: {
    email: supportEmail,
    phone: supportPhone,
    whatsapp: supportWhatsApp,
    whatsappDigits: normalizePhoneDigits(supportWhatsApp),
  },
};

export function buildWhatsAppLink(message = "") {
  const digits = BRANDING.support.whatsappDigits;
  if (!digits) return "";
  const text = String(message || "").trim();
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export function buildMailtoLink(subject = "") {
  if (!BRANDING.support.email) return "";
  const text = String(subject || "").trim();
  return text
    ? `mailto:${BRANDING.support.email}?subject=${encodeURIComponent(text)}`
    : `mailto:${BRANDING.support.email}`;
}
