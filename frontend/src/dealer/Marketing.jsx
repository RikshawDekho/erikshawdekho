/**
 * Marketing.jsx — WhatsApp/SMS/Email marketing campaigns
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api, apiFetch } from "./api";
import { Card, Btn, Modal, Field, Input, Select, Spinner } from "./ui";
import { useToast } from "./contexts";

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


export default MarketingPage;
