/**
 * Learn.jsx — Video library + Blog management
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { Card, Btn, Modal, Field, Input, Select, Spinner, Pagination } from "./ui";
import { useToast } from "./contexts";

const VIDEO_CATS = [
  { id: "",            label: "All Videos" },
  { id: "tutorial",   label: "🛺 How to Drive" },
  { id: "maintenance",label: "🔧 Maintenance" },
  { id: "earning",    label: "💰 Earn More" },
  { id: "review",     label: "⭐ Expert Reviews" },
  { id: "general",    label: "ℹ️ General Info" },
];

function extractVideoId(url) {
  for (const pat of [/youtube\.com\/watch\?v=([^&\s]+)/, /youtu\.be\/([^?\s]+)/, /youtube\.com\/embed\/([^?\s]+)/]) {
    const m = url?.match(pat);
    if (m) return m[1];
  }
  return null;
}

function VideoCard({ v, onDelete, onWatch }) {
  const C = useC();
  const [inlineWatch, setInlineWatch] = useState(null);
  const thumb = v.thumbnail_url || (v.video_id ? `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg` : null)
    || (extractVideoId(v.youtube_url) ? `https://img.youtube.com/vi/${extractVideoId(v.youtube_url)}/hqdefault.jpg` : null);
  const catColors = { tutorial: C.primary, maintenance: C.warning, earning: C.success, review: C.info, general: C.textMid };
  const catLabels = { tutorial: "How to Drive", maintenance: "Maintenance", earning: "Earn More", review: "Expert Review", general: "General" };

  const handleWatch = () => {
    if (onWatch) { onWatch(v); return; }
    // fallback: show inline iframe modal instead of opening new tab
    const vid = extractVideoId(v.youtube_url);
    if (vid) setInlineWatch(vid);
  };

  return (
    <>
    {inlineWatch && (
      <div onClick={() => setInlineWatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 760 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setInlineWatch(null)} style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer" }}>×</button>
          <div style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe src={`https://www.youtube.com/embed/${inlineWatch}?autoplay=1&rel=0`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={v.title} />
          </div>
        </div>
      </div>
    )}
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column" }}
      onClick={handleWatch}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${C.primary}18`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      {/* Thumbnail */}
      <div style={{ position: "relative", paddingTop: "56.25%", background: "#0f172a", overflow: "hidden" }}>
        {thumb
          ? <img src={thumb} alt={v.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 40 }}>▶</div>
        }
        {/* Play overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = 1; }} onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}>
          <div style={{ width: 48, height: 48, background: "#ff0000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>▶</div>
        </div>
        {/* Category badge */}
        <div style={{ position: "absolute", top: 8, left: 8, background: catColors[v.category] || C.textMid, color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
          {catLabels[v.category] || v.category}
        </div>
        {v.dealer && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 9 }}>Dealer</div>}
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{v.title}</div>
        {v.description && <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, flex: 1 }}>{v.description.slice(0, 90)}{v.description.length > 90 ? "…" : ""}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div style={{ fontSize: 10, color: C.textMid }}>{v.dealer_name || "eRickshawDekho"}</div>
          {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(v.id); }} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 11, padding: "2px 6px" }}>✕ Delete</button>}
        </div>
      </div>
    </div>
    </>
  );
}

const BLOG_CATS = [
  { id: "",            label: "All Posts" },
  { id: "maintenance", label: "🔧 Maintenance" },
  { id: "earning",     label: "💰 Earn More" },
  { id: "news",        label: "📰 News" },
  { id: "scheme",      label: "🏛 Schemes" },
  { id: "general",     label: "📝 General" },
];

function BlogPostCard({ post, onDelete }) {
  const C = useC();
  const [showContent, setShowContent] = useState(false);
  const auth = JSON.parse(localStorage.getItem("erd_dealer") || "null");
  const canDelete = auth && (post.dealer === null ? false : true);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "transform 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      {post.cover_image_url && (
        <img src={post.cover_image_url} alt={post.title}
          style={{ width: "100%", height: 140, objectFit: "cover" }}
          onError={e => e.target.style.display = "none"} />
      )}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 0.5, background: `${C.primary}12`, padding: "2px 8px", borderRadius: 20 }}>
            {BLOG_CATS.find(c => c.id === post.category)?.label?.replace(/^[^\s]+\s/, '') || post.category}
          </span>
          {canDelete && <button onClick={() => onDelete(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 14, padding: 2 }}>✕</button>}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>{post.title}</div>
        {post.excerpt && <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6, flex: 1, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.excerpt}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <span style={{ fontSize: 11, color: C.textDim }}>{new Date(post.created_at).toLocaleDateString("en-IN")}</span>
          <button onClick={() => post.url ? window.open(post.url, "_blank") : setShowContent(true)} style={{ fontSize: 12, color: C.primary, fontWeight: 700, padding: "4px 12px", border: `1.5px solid ${C.primary}`, borderRadius: 20, background: `${C.primary}08`, cursor: "pointer", fontFamily: "inherit" }}>
            {post.url ? "Read More →" : "Read →"}
          </button>
          {showContent && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowContent(false)}>
              <div style={{ background: "var(--erd-card, #fff)", borderRadius: 16, padding: 24, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.4 }}>{post.title}</div>
                  <button onClick={() => setShowContent(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textDim, marginLeft: 8 }}>×</button>
                </div>
                <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{post.content}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>By {post.dealer_name || "eRickshawDekho"}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUPPORT PAGE
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// MARKETING PAGE
// ═══════════════════════════════════════════════════════
const MARKETING_TEMPLATES = {
  whatsapp: [
    { id: "enquiry_followup", label: "Enquiry Follow-up", text: "नमस्ते {name} जी! 🙏\n\nआपने हमारे eRickshaw के बारे में enquiry की थी। क्या आप इसके बारे में और जानना चाहते हैं?\n\nहमारे पास latest models available हैं। Call करें: {phone}\n\n- {dealer_name}" },
    { id: "offer", label: "Special Offer", text: "नमस्ते {name} जी! 🎉\n\nआज हमारे पास एक special offer है — eRickshaw पर ₹{amount} की छूट!\n\nसीमित समय के लिए। आज ही संपर्क करें: {phone}\n\n- {dealer_name}" },
    { id: "new_model", label: "New Model Launch", text: "नमस्ते {name} जी! 🚀\n\nहमारे showroom में नया model आ गया है — {model}!\n\nBest price और EMI options के लिए आज ही आएं।\n\n📍 {address}\n📞 {phone}\n\n- {dealer_name}" },
  ],
  sms: [
    { id: "sms_offer", label: "SMS Offer", text: "Namaste {name}! Special offer on eRickshaw at {dealer_name}. Save Rs.{amount}. Call {phone} today!" },
    { id: "sms_reminder", label: "SMS Reminder", text: "Hi {name}, this is {dealer_name}. Your eRickshaw enquiry is pending. Call {phone} to know more." },
  ],
  email: [
    { id: "email_welcome", label: "Welcome Email", text: "Subject: Welcome to {dealer_name} — Your eRickshaw Journey Starts Here!\n\nDear {name},\n\nThank you for your interest in our eRickshaw vehicles. We are committed to providing you with the best electric vehicles at competitive prices.\n\nOur showroom is open Monday–Saturday, 9 AM to 7 PM.\n\nFor queries: {phone}\n\nWarm regards,\n{dealer_name}" },
    { id: "email_invoice", label: "Invoice Ready", text: "Subject: Your eRickshaw Invoice is Ready — {dealer_name}\n\nDear {name},\n\nYour invoice for the eRickshaw purchase is attached. Please review and let us know if you have any questions.\n\nThank you for choosing {dealer_name}!\n\nRegards,\n{dealer_name}" },
  ],
};

function MarketingPage() {
  const C = useC();
  const toast = useToast();
  const [tab, setTab] = useState("whatsapp"); // whatsapp | sms | email
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateText, setTemplateText] = useState("");
  const [contacts, setContacts] = useState(""); // newline-separated numbers/emails
  const [variables, setVariables] = useState({ name: "", phone: "", dealer_name: "", amount: "", model: "", address: "" });
  const [sending, setSending] = useState(false);
  const [apiKeys, setApiKeys] = useState({ twilio: false, whatsapp_business: false, gmail_smtp: false });

  // Check configured API keys
  useEffect(() => {
    api.dealer.apiKeys()
      .then(keys => {
        setApiKeys({
          twilio: keys.some(k => k.service === "twilio" && k.is_active),
          whatsapp_business: keys.some(k => k.service === "whatsapp_business" && k.is_active),
          gmail_smtp: keys.some(k => k.service === "gmail_smtp" && k.is_active),
        });
      })
      .catch(err => {
        console.error("Failed to fetch API keys:", err);
      });
  }, []);

  const templates = MARKETING_TEMPLATES[tab] || [];

  const selectTemplate = (t) => {
    setSelectedTemplate(t.id);
    setTemplateText(t.text);
  };

  const resolveText = () => {
    return templateText
      .replace(/\{name\}/g, variables.name || "{name}")
      .replace(/\{phone\}/g, variables.phone || "{phone}")
      .replace(/\{dealer_name\}/g, variables.dealer_name || "{dealer_name}")
      .replace(/\{amount\}/g, variables.amount || "{amount}")
      .replace(/\{model\}/g, variables.model || "{model}")
      .replace(/\{address\}/g, variables.address || "{address}");
  };

  const contactList = contacts.split("\n").map(c => c.trim()).filter(Boolean);

  const handleSend = async () => {
    if (!templateText.trim()) { toast("Please select or write a template.", "warning"); return; }
    if (contactList.length === 0) { toast("Please add at least one contact.", "warning"); return; }
    const apiKeyNeeded = tab === "email" ? "gmail_smtp" : tab === "whatsapp" ? "whatsapp_business" : "twilio";
    if (!apiKeys[apiKeyNeeded]) {
      toast(`Connect your ${tab === "email" ? "Email Service" : tab === "whatsapp" ? "WhatsApp Business" : "SMS Service"} in Settings → Integrations first.`, "warning");
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch("/marketing/send/", {
        method: "POST",
        body: JSON.stringify({ channel: tab, message: resolveText(), contacts: contactList }),
      });
      if (result.failed > 0) {
        toast(`Sent: ${result.sent}, Failed: ${result.failed}. ${result.errors?.[0] || "Check API key settings."}`, result.sent > 0 ? "warning" : "error");
      } else {
        toast(`Campaign sent to ${result.sent} contact${result.sent !== 1 ? "s" : ""}!`, "success");
      }
      if (result.sent > 0) setContacts("");
    } catch (err) {
      const msg = typeof err === "object" ? (err.error || Object.values(err).flat().join(" ")) : "Failed to send. Check API keys in Settings.";
      toast(msg, "error");
    }
    setSending(false);
  };

  const tabInfo = {
    whatsapp: { icon: "💬", label: "WhatsApp", apiKey: "whatsapp_business", apiLabel: "WhatsApp Business API" },
    sms:      { icon: "📱", label: "SMS",       apiKey: "twilio",           apiLabel: "SMS Provider" },
    email:    { icon: "✉️", label: "Email",      apiKey: "gmail_smtp",       apiLabel: "Gmail SMTP API" },
  };
  const info = tabInfo[tab];
  const hasKey = apiKeys[info.apiKey];

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>📣 Marketing Campaigns</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>Send WhatsApp, SMS, or Email campaigns to your customers and leads.</div>
      </div>

      {/* Channel tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {Object.entries(tabInfo).map(([id, t]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 700, fontSize: 13, background: tab === id ? C.surface : "transparent",
            color: tab === id ? C.primary : C.textMid, boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* API key warning */}
      {!hasKey && (
        <div style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.warning, display: "flex", alignItems: "center", gap: 10 }}>
          ⚠️ <span><b>{info.apiLabel}</b> is not connected. Go to <b>Settings → API Keys</b> to add your key. You can still compose messages, but sending will be disabled.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: Template picker + editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📋 Message Templates</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => selectTemplate(t)} style={{
                  padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${selectedTemplate === t.id ? C.primary : C.border}`,
                  background: selectedTemplate === t.id ? `${C.primary}12` : C.bg, cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left", fontSize: 13, fontWeight: selectedTemplate === t.id ? 700 : 400, color: C.text,
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: C.textMid }}>✏️ Edit Message</div>
            <textarea value={templateText} onChange={e => setTemplateText(e.target.value)} rows={6}
              placeholder={`Write your ${info.label} message here...\nUse {name}, {phone}, {dealer_name}, {amount}, {model}, {address} as placeholders.`}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.bg, lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Variables: {"{"+"name}"}, {"{"+"phone}"}, {"{"+"dealer_name}"}, {"{"+"amount}"}, {"{"+"model}"}, {"{"+"address}"}</div>
          </div>

          {/* Variable substitution */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🔤 Fill Variables</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.entries({ name: "Customer Name", phone: "Your Phone", dealer_name: "Dealer Name", amount: "Offer Amount (₹)", model: "Vehicle Model", address: "Showroom Address" }).map(([k, label]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: C.textMid, marginBottom: 3 }}>{label}</div>
                  <input value={variables[k]} onChange={e => setVariables(p => ({ ...p, [k]: e.target.value }))}
                    placeholder={`{${k}}`}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Contacts + preview + send */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Contact list */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
              👥 Contact List <span style={{ fontSize: 12, color: C.textDim, fontWeight: 400 }}>({contactList.length} contacts)</span>
            </div>
            <textarea value={contacts} onChange={e => setContacts(e.target.value)} rows={8}
              placeholder={tab === "email" ? "Enter email addresses, one per line:\njohn@example.com\nsuresh@example.com" : "Enter phone numbers, one per line:\n9876543210\n9123456789"}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.bg }} />
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
              {tab === "email" ? "One email per line." : "One 10-digit mobile number per line (Indian numbers)."}
            </div>
          </div>

          {/* Live preview */}
          {templateText && (
            <div style={{ background: tab === "whatsapp" ? "#e7fdd8" : C.surface, border: `1px solid ${tab === "whatsapp" ? "#25D36644" : C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: tab === "whatsapp" ? "#128c7e" : C.text }}>
                {info.icon} Preview
              </div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#333", background: tab === "whatsapp" ? "#dcf8c6" : C.bg, padding: 12, borderRadius: 10 }}>
                {resolveText()}
              </div>
            </div>
          )}

          {/* Send button */}
          <button onClick={handleSend} disabled={sending || !hasKey}
            style={{ padding: "14px 24px", borderRadius: 10, background: hasKey ? C.primary : C.border, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: hasKey ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {sending ? "📤 Sending..." : `${info.icon} Send to ${contactList.length} contact${contactList.length !== 1 ? "s" : ""}`}
          </button>
          {!hasKey && (
            <div style={{ fontSize: 12, color: C.textDim, textAlign: "center" }}>
              Connect <b>{info.apiLabel}</b> in Settings → API Keys to enable sending.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LearnPage() {
  const C = useC();
  const toast = useToast();
  // tab: "videos" | "blogs"
  const [tab, setTab] = useState("videos");

  // ── Videos state ──
  const [videos, setVideos] = useState([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoCat, setVideoCat] = useState("");
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [addVideoForm, setAddVideoForm] = useState({ title: "", youtube_url: "", description: "", category: "tutorial", is_public: true });
  const [addingVideo, setAddingVideo] = useState(false);
  const [videoPreview, setVideoPreview] = useState(null);

  // ── Blog posts state ──
  const [posts, setPosts] = useState([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postCat, setPostCat] = useState("");
  const [showAddPost, setShowAddPost] = useState(false);
  const [addPostForm, setAddPostForm] = useState({ title: "", excerpt: "", content: "", url: "", category: "general", cover_image_url: "", is_published: true });
  const [addingPost, setAddingPost] = useState(false);

  const loadVideos = useCallback(() => {
    setVideoLoading(true);
    const q = videoCat ? `?category=${videoCat}` : "";
    api.videos.list(q).then(d => setVideos(d.results || d)).finally(() => setVideoLoading(false));
  }, [videoCat]);

  const loadPosts = useCallback(() => {
    setPostLoading(true);
    const q = postCat ? `?category=${postCat}` : "";
    api.blogs.list(q).then(d => setPosts(d.results || d)).finally(() => setPostLoading(false));
  }, [postCat]);

  useEffect(() => { loadVideos(); }, [loadVideos]);
  useEffect(() => { if (tab === "blogs") loadPosts(); }, [tab, loadPosts]);

  // Live preview for video URL
  useEffect(() => {
    const vid = extractVideoId(addVideoForm.youtube_url);
    setVideoPreview(vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null);
  }, [addVideoForm.youtube_url]);

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!addVideoForm.title.trim()) { toast("Title is required.", "warning"); return; }
    const vid = extractVideoId(addVideoForm.youtube_url);
    if (!vid) { toast("Enter a valid YouTube URL (e.g. https://youtube.com/watch?v=XXXX).", "warning"); return; }
    setAddingVideo(true);
    try {
      await api.videos.create(addVideoForm);
      toast("Video added successfully!", "success");
      setShowAddVideo(false);
      setAddVideoForm({ title: "", youtube_url: "", description: "", category: "tutorial", is_public: true });
      loadVideos();
    } catch (err) {
      toast(err?.message || "Failed to add video. Please try again.", "error");
    }
    setAddingVideo(false);
  };

  const handleDeleteVideo = async (id) => {
    if (!confirm("Delete this video?")) return;
    await api.videos.delete(id);
    setVideos(v => v.filter(x => x.id !== id));
    toast("Video deleted.", "success");
  };

  const handleAddPost = async (e) => {
    e.preventDefault();
    if (!addPostForm.title.trim()) { toast("Title is required.", "warning"); return; }
    if (!addPostForm.excerpt.trim() && !addPostForm.content.trim() && !addPostForm.url.trim()) {
      toast("Add an excerpt, content, or URL for the post.", "warning"); return;
    }
    setAddingPost(true);
    try {
      await api.blogs.create(addPostForm);
      toast("Blog post added!", "success");
      setShowAddPost(false);
      setAddPostForm({ title: "", excerpt: "", content: "", url: "", category: "general", cover_image_url: "", is_published: true });
      loadPosts();
    } catch (err) {
      toast(err?.message || "Failed to add post.", "error");
    }
    setAddingPost(false);
  };

  const handleDeletePost = async (id) => {
    if (!confirm("Delete this post?")) return;
    await api.blogs.delete(id);
    setPosts(p => p.filter(x => x.id !== id));
    toast("Post deleted.", "success");
  };

  return (
    <div className="erd-page-pad" style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>🎓 Learning Hub</div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>Tutorials, maintenance tips, earning guides, expert reviews & blog posts</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "videos" && (
            <button onClick={() => setShowAddVideo(true)} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              + Add Video
            </button>
          )}
          {tab === "blogs" && (
            <button onClick={() => setShowAddPost(true)} style={{ background: C.info, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              + Write Post
            </button>
          )}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[{id:"videos",label:"🎬 Videos"},{id:"blogs",label:"📝 Blog Posts"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
            background: tab === t.id ? C.surface : "transparent",
            color: tab === t.id ? C.primary : C.textMid,
            boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "videos" && (
        <>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {VIDEO_CATS.map(c => (
              <button key={c.id} onClick={() => setVideoCat(c.id)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1.5px solid ${videoCat === c.id ? C.primary : C.border}`,
                background: videoCat === c.id ? C.primary : C.surface,
                color: videoCat === c.id ? "#fff" : C.textMid,
                fontWeight: videoCat === c.id ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{c.label}</button>
            ))}
          </div>
          {videoLoading ? <Spinner /> : videos.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <div style={{ fontWeight: 600 }}>No videos in this category</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Add a helpful eRickshaw video!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {videos.map(v => <VideoCard key={v.id} v={v} onDelete={handleDeleteVideo} />)}
            </div>
          )}
        </>
      )}

      {tab === "blogs" && (
        <>
          {/* Blog category filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {BLOG_CATS.map(c => (
              <button key={c.id} onClick={() => setPostCat(c.id)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1.5px solid ${postCat === c.id ? C.info : C.border}`,
                background: postCat === c.id ? C.info : C.surface,
                color: postCat === c.id ? "#fff" : C.textMid,
                fontWeight: postCat === c.id ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{c.label}</button>
            ))}
          </div>
          {postLoading ? <Spinner /> : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontWeight: 600 }}>No blog posts yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Share your knowledge with the eRickshaw community!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {posts.map(p => <BlogPostCard key={p.id} post={p} onDelete={handleDeletePost} />)}
            </div>
          )}
        </>
      )}

      {/* Info cards (shown on both tabs) */}
      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {[
          { icon: "⚡", title: "Zero Fuel Cost", body: "Electric power costs ₹1–2 per km vs ₹5–6 for petrol. Save ₹3000–5000 per month on fuel alone.", color: C.success },
          { icon: "💰", title: "Earn ₹800–1500/Day", body: "With proper route planning in high-demand areas — schools, markets, hospitals — drivers can earn significantly more.", color: C.primary },
          { icon: "🔋", title: "Battery Life Tips", body: "Charge to 90%, avoid full discharge. Park in shade. Clean terminals monthly. Battery lasts 3–5 years with good care.", color: C.warning },
          { icon: "📋", title: "Registration & License", body: "eRickshaw needs: Driving License (LMV), RC Book, Insurance, Permit. Yellow plate required for commercial use.", color: C.info },
        ].map(({ icon, title, body, color }) => (
          <div key={title} style={{ background: C.surface, border: `1.5px solid ${color}25`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>{body}</div>
          </div>
        ))}
      </div>

      {/* Add Video modal */}
      {showAddVideo && (
        <Modal title="Add YouTube Video" onClose={() => setShowAddVideo(false)}>
          <form onSubmit={handleAddVideo}>
            <Field label="YouTube URL *">
              <Input value={addVideoForm.youtube_url} onChange={v => setAddVideoForm(p => ({ ...p, youtube_url: v }))} placeholder="https://www.youtube.com/watch?v=..." />
            </Field>
            {videoPreview && (
              <div style={{ marginBottom: 14, borderRadius: 8, overflow: "hidden", maxHeight: 160 }}>
                <img src={videoPreview} alt="preview" style={{ width: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
              </div>
            )}
            <Field label="Title *">
              <Input value={addVideoForm.title} onChange={v => setAddVideoForm(p => ({ ...p, title: v }))} placeholder="e.g. Battery maintenance tips" />
            </Field>
            <Field label="Category">
              <Select value={addVideoForm.category} onChange={v => setAddVideoForm(p => ({ ...p, category: v }))} options={VIDEO_CATS.filter(c => c.id).map(c => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label="Description">
              <Input value={addVideoForm.description} onChange={v => setAddVideoForm(p => ({ ...p, description: v }))} placeholder="Brief description..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAddVideo(false)} />
              <Btn label={addingVideo ? "Adding..." : "Add Video"} color={C.primary} type="submit" disabled={addingVideo} />
            </div>
          </form>
        </Modal>
      )}

      {/* Add Blog Post modal */}
      {showAddPost && (
        <Modal title="Write a Blog Post" onClose={() => setShowAddPost(false)}>
          <form onSubmit={handleAddPost}>
            <Field label="Title *">
              <Input value={addPostForm.title} onChange={v => setAddPostForm(p => ({ ...p, title: v }))} placeholder="e.g. Battery maintenance tips for 5-year life" />
            </Field>
            <Field label="Category">
              <Select value={addPostForm.category} onChange={v => setAddPostForm(p => ({ ...p, category: v }))} options={BLOG_CATS.filter(c => c.id).map(c => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label="Short Excerpt (shown in card)">
              <textarea value={addPostForm.excerpt} onChange={e => setAddPostForm(p => ({ ...p, excerpt: e.target.value }))}
                rows={2} placeholder="Brief description of this post..."
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, resize: "vertical", boxSizing: "border-box" }} />
            </Field>
            <Field label="External URL (optional — link to article)">
              <Input value={addPostForm.url} onChange={v => setAddPostForm(p => ({ ...p, url: v }))} placeholder="https://example.com/article" />
            </Field>
            <Field label="Full Content (optional — write your article here)">
              <textarea value={addPostForm.content} onChange={e => setAddPostForm(p => ({ ...p, content: e.target.value }))}
                rows={4} placeholder="Write your full article content here..."
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, resize: "vertical", boxSizing: "border-box" }} />
            </Field>
            <Field label="Cover Image URL (optional)">
              <Input value={addPostForm.cover_image_url} onChange={v => setAddPostForm(p => ({ ...p, cover_image_url: v }))} placeholder="https://images.unsplash.com/..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowAddPost(false)} />
              <Btn label={addingPost ? "Publishing..." : "Publish Post"} color={C.info} type="submit" disabled={addingPost} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


export default LearnPage;
