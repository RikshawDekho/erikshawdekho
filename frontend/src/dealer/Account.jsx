/**
 * Account.jsx — Dealer account settings, integrations, API keys, notifications
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { Card, Btn, Modal, Field, Input, Select, Spinner } from "./ui";
import { useToast } from "./contexts";

function ToggleSwitch({ checked, onChange, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: checked ? C.primary : C.border, transition: "background 0.2s", position: "relative", flexShrink: 0,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3, left: checked ? 23 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

function IntegrationsSection() {
  const C = useC();
  const toast = useToast();
  const [keys, setKeys] = useState([]);
  const [adding, setAdding] = useState(null);
  const [form, setForm] = useState({ api_key: "", api_secret: "", display_name: "", from_number: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.dealer.apiKeys().then(setKeys).catch(() => {}); }, []);

  const PROVIDER_OPTIONS = {
    whatsapp: [
      { id: "twilio", label: "Twilio", fields: ["api_key", "api_secret"], labels: { api_key: "Account SID", api_secret: "Auth Token" }, extraFields: [{ key: "from_number", label: "WhatsApp From Number", placeholder: "e.g. whatsapp:+14155238886" }] },
      { id: "gupshup", label: "Gupshup", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "source_number", label: "Source Number", placeholder: "e.g. 919876543210" }, { key: "app_name", label: "App Name", placeholder: "e.g. ErikshawDekho" }] },
      { id: "meta_cloud", label: "Meta Cloud API", fields: ["api_key"], labels: { api_key: "Access Token" }, extraFields: [{ key: "phone_number_id", label: "Phone Number ID", placeholder: "Your WABA phone number ID" }] },
      { id: "360dialog", label: "360dialog", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [] },
      { id: "wati", label: "Wati", fields: ["api_key"], labels: { api_key: "API Token" }, extraFields: [{ key: "api_url", label: "Wati Server URL", placeholder: "e.g. https://live-server-XXXXX.wati.io" }] },
      { id: "aisensy", label: "AiSensy", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "campaign_name", label: "Campaign Name", placeholder: "e.g. marketing" }] },
    ],
    sms: [
      { id: "twilio", label: "Twilio", fields: ["api_key", "api_secret"], labels: { api_key: "Account SID", api_secret: "Auth Token" }, extraFields: [{ key: "from_number", label: "SMS From Number", placeholder: "e.g. +1234567890" }] },
      { id: "gupshup", label: "Gupshup", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "source_number", label: "Source Number", placeholder: "e.g. 919876543210" }] },
      { id: "msg91", label: "MSG91", fields: ["api_key"], labels: { api_key: "Auth Key" }, extraFields: [{ key: "sender_id", label: "Sender ID", placeholder: "e.g. ERIKSH" }, { key: "template_id", label: "Template ID", placeholder: "DLT template ID" }] },
      { id: "textlocal", label: "Textlocal", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "sender", label: "Sender Name", placeholder: "e.g. ERIKSH" }] },
      { id: "fast2sms", label: "Fast2SMS", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "sender_id", label: "Sender ID", placeholder: "e.g. ERIKSH" }] },
    ],
    email: [
      { id: "gmail", label: "Gmail SMTP", fields: ["api_key", "api_secret"], labels: { api_key: "Gmail Address", api_secret: "App Password" }, extraFields: [] },
      { id: "sendgrid", label: "SendGrid", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "from_email", label: "From Email", placeholder: "e.g. info@yourdomain.com" }] },
      { id: "mailgun", label: "Mailgun", fields: ["api_key"], labels: { api_key: "API Key" }, extraFields: [{ key: "domain", label: "Domain", placeholder: "e.g. mg.yourdomain.com" }, { key: "from_email", label: "From Email", placeholder: "e.g. info@yourdomain.com" }] },
      { id: "ses", label: "Amazon SES", fields: ["api_key", "api_secret"], labels: { api_key: "Access Key ID", api_secret: "Secret Access Key" }, extraFields: [{ key: "region", label: "AWS Region", placeholder: "e.g. ap-south-1" }, { key: "from_email", label: "From Email", placeholder: "e.g. info@yourdomain.com" }] },
    ],
  };
  const [selectedProvider, setSelectedProvider] = useState({ whatsapp: "twilio", sms: "twilio", email: "gmail" });

  const SERVICES = [
    { id: "twilio", label: "SMS Service", desc: "SMS OTP + marketing — choose your provider", icon: "📱", hasProviderSelect: true, providerKey: "sms" },
    { id: "gmail_smtp", label: "Email Service", desc: "Email marketing & notifications — choose your provider", icon: "📧", hasProviderSelect: true, providerKey: "email" },
    { id: "whatsapp_business", label: "WhatsApp Business", desc: "Bulk WhatsApp messaging — choose your provider below", icon: "💬", hasProviderSelect: true },
    { id: "firebase", label: "Firebase", desc: "Push notifications (mobile/PWA)", icon: "🔔", fields: ["api_key"], labels: { api_key: "Server Key" } },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {SERVICES.map(svc => {
          const existing = keys.find(k => k.service === svc.id);
          return (
            <div key={svc.id} style={{ border: `1.5px solid ${existing ? C.success : C.border}`, borderRadius: 12, padding: 16, position: "relative" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{svc.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{svc.label}</div>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 12 }}>{svc.desc}</div>
              {existing ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>✓ {existing.extra_config?.provider ? `Connected (${existing.extra_config.provider})` : "Connected"}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setAdding(svc); if (svc.hasProviderSelect && existing?.extra_config?.provider) { const pKey = svc.providerKey || (svc.id === "whatsapp_business" ? "whatsapp" : svc.id === "twilio" ? "sms" : "email"); setSelectedProvider(p => ({ ...p, [pKey]: existing.extra_config.provider })); } setForm({ api_key: "", api_secret: "", display_name: existing.display_name, from_number: existing.extra_config?.from_number || "", source_number: existing.extra_config?.source_number || "", phone_number_id: existing.extra_config?.phone_number_id || "", api_url: existing.extra_config?.api_url || "", app_name: existing.extra_config?.app_name || "", campaign_name: existing.extra_config?.campaign_name || "" }); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: C.textMid }}>Edit</button>
                    <button onClick={async () => { if (confirm("Delete this API key?")) { try { await api.dealer.deleteApiKey(existing.id); setKeys(keys.filter(k => k.id !== existing.id)); toast(`${svc.label} deleted`, "success"); } catch { toast("Failed to delete", "error"); } }}} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.danger}44`, background: `${C.danger}10`, cursor: "pointer", fontFamily: "inherit", color: C.danger }}>Delete</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAdding(svc); setForm({ api_key: "", api_secret: "", display_name: "", from_number: "" }); }} style={{ width: "100%", padding: "7px", borderRadius: 8, border: `1px dashed ${C.primary}`, background: `${C.primary}08`, color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  + Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: C.textDim, background: `${C.warning}10`, border: `1px solid ${C.warning}33`, borderRadius: 8, padding: "10px 14px" }}>
        ⚠️ API keys are stored securely. Without connecting a service: SMS OTP login, WhatsApp alerts, push notifications, and email campaigns are disabled but shown in the UI.
      </div>

      {adding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{adding.icon} Connect {adding.label}</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>{adding.desc}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>Display Name (optional)</div>
              <input type="text" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                placeholder="e.g. Production Key, Staging Key"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
            </div>
            {adding.hasProviderSelect && (() => {
              const pKey = adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms");
              const provList = PROVIDER_OPTIONS[pKey] || [];
              const curProv = selectedProvider[pKey] || provList[0]?.id;
              return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>Choose Provider</div>
                <select value={curProv} onChange={e => setSelectedProvider(p => ({ ...p, [pKey]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }}>
                  {provList.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            );})()}
            {(() => {
              const pKey = adding.hasProviderSelect ? (adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms")) : null;
              const provList = pKey ? PROVIDER_OPTIONS[pKey] || [] : [];
              const curProv = pKey ? (selectedProvider[pKey] || provList[0]?.id) : null;
              const prov = pKey ? provList.find(p => p.id === curProv) : null;
              return (adding.hasProviderSelect ? prov?.fields || [] : adding.fields || []).map(f => {
              const labels = adding.hasProviderSelect ? prov?.labels || {} : adding.labels || {};
              return (
              <div key={f} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{labels[f] || f}</div>
                <input type={f === "api_secret" ? "password" : "text"} value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  placeholder={`Enter ${labels[f] || f}`}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
              </div>
            );});})()}
            {(() => {
              const pKey = adding.hasProviderSelect ? (adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms")) : null;
              const provList = pKey ? PROVIDER_OPTIONS[pKey] || [] : [];
              const curProv = pKey ? (selectedProvider[pKey] || provList[0]?.id) : null;
              const prov = pKey ? provList.find(p => p.id === curProv) : null;
              return (adding.hasProviderSelect ? prov?.extraFields || [] : adding.extraFields || []).map(ef => (
              <div key={ef.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{ef.label}</div>
                <input type="text" value={form[ef.key] || ""} onChange={e => setForm(p => ({ ...p, [ef.key]: e.target.value }))}
                  placeholder={ef.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
              </div>
            ));})()}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setAdding(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: C.textMid }}>Cancel</button>
              <button disabled={saving} onClick={async () => {
                setSaving(true);
                try {
                  const extraCfg = {};
                  if (adding.hasProviderSelect) {
                    const pKey = adding.providerKey || (adding.id === "whatsapp_business" ? "whatsapp" : "sms");
                    const provList = PROVIDER_OPTIONS[pKey] || [];
                    const curProv = selectedProvider[pKey] || provList[0]?.id;
                    extraCfg.provider = curProv;
                    const prov = provList.find(p => p.id === curProv);
                    (prov?.extraFields || []).forEach(ef => { if (form[ef.key]) extraCfg[ef.key] = form[ef.key]; });
                  } else {
                    if (form.from_number) extraCfg.from_number = form.from_number;
                    (adding.extraFields || []).forEach(ef => { if (form[ef.key]) extraCfg[ef.key] = form[ef.key]; });
                  }
                  await api.dealer.saveApiKey({ service: adding.id, api_key: form.api_key, api_secret: form.api_secret || "", display_name: form.display_name, extra_config: extraCfg });
                  const updated = await api.dealer.apiKeys();
                  setKeys(updated);
                  toast(`${adding.label} connected!`, "success");
                  setAdding(null);
                } catch { toast("Failed to save. Check your API key.", "error"); }
                finally { setSaving(false); }
              }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving..." : "Save & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPage({ dealer: dealerProp, onLogout }) {
  const C = useC();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ dealer_name: "", phone: "", city: "", email: "", address: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [brandingMode, setBrandingMode] = useState(false);
  const [brandingForm, setBrandingForm] = useState({ sales_manager_name: "", bank_name: "", bank_account_number: "", bank_ifsc: "", bank_upi: "", invoice_footer_note: "" });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [prefs, setPrefs] = useState({ notify_email: true, notify_whatsapp: true, notify_push: true });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const loadData = () => {
    Promise.all([api.me(), api.dashboard()]).then(([me, dash]) => {
      setData({ ...me, plan: dash.plan });
      setEditForm({
        dealer_name: me.dealer?.name || me.dealer?.dealer_name || "",
        phone: me.dealer?.phone || "",
        city: me.dealer?.city || "",
        email: me.user?.email || "",
        address: me.dealer?.address || "",
        description: me.dealer?.description || "",
      });
      setBrandingForm({
        sales_manager_name:  me.dealer?.sales_manager_name  || "",
        bank_name:           me.dealer?.bank_name           || "",
        bank_account_number: me.dealer?.bank_account_number || "",
        bank_ifsc:           me.dealer?.bank_ifsc           || "",
        bank_upi:            me.dealer?.bank_upi            || "",
        invoice_footer_note: me.dealer?.invoice_footer_note || "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    api.notifications.getPrefs()
      .then(d => setPrefs({ notify_email: d.notify_email, notify_whatsapp: d.notify_whatsapp, notify_push: d.notify_push }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!editForm.dealer_name.trim()) { toast("Dealership name cannot be empty.", "warning"); return; }
    if (!editForm.phone.trim()) { toast("Phone number is required.", "warning"); return; }
    setEditSaving(true);
    try {
      await api.profile.update(editForm);
      toast("Profile updated successfully!", "success");
      setEditMode(false);
      loadData();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to update profile.";
      toast(msg, "error");
    }
    setEditSaving(false);
  };

  const savePref = async (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    setPrefsSaving(true); setPrefsSaved(false);
    try {
      await api.notifications.updatePrefs(updated);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch (_) { toast("Failed to save preferences.", "error"); }
    setPrefsSaving(false);
  };

  const dealer = data?.dealer || dealerProp;
  const plan = data?.plan;

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      {/* Profile card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", flexShrink: 0, fontWeight: 700 }}>
              {((dealer?.name || dealer?.dealer_name || "D")[0]).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{dealer?.name || dealer?.dealer_name || "Dealer"}</div>
              <div style={{ fontSize: 12, color: C.textMid }}>📍 {dealer?.city || "—"}</div>
            </div>
          </div>
          <Btn label={editMode ? "Cancel" : "✏ Edit Profile"} color={C.primary} outline size="sm" onClick={() => setEditMode(e => !e)} />
        </div>

        {editMode ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Dealership Name"><Input value={editForm.dealer_name} onChange={v => setEditForm(p => ({ ...p, dealer_name: v }))} placeholder="Kumar Electric Vehicles" /></Field>
              <Field label="Phone"><Input value={editForm.phone} onChange={v => setEditForm(p => ({ ...p, phone: v }))} placeholder="9876543210" /></Field>
              <Field label="City"><Input value={editForm.city} onChange={v => setEditForm(p => ({ ...p, city: v }))} placeholder="Delhi" /></Field>
              <Field label="Email"><Input value={editForm.email} onChange={v => setEditForm(p => ({ ...p, email: v }))} type="email" placeholder="you@email.com" /></Field>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="Address"><Input value={editForm.address} onChange={v => setEditForm(p => ({ ...p, address: v }))} placeholder="Shop No. 12, Sector 5, Rohini, Delhi" /></Field>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="Showroom Description">
                  <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                    placeholder="Tell buyers about your showroom — specialties, brands, experience, service..." />
                </Field>
              </div>
            </div>
            <Btn label={editSaving ? "Saving..." : "Save Changes"} color={C.primary} onClick={saveProfile} disabled={editSaving} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Phone", dealer?.phone], ["Email", data?.user?.email || "—"], ["GSTIN", dealer?.gstin || "—"], ["Verification", dealer?.is_verified ? "✅ Verified" : "⏳ Pending"]].map(([label, val]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{val || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invoice Branding card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>🧾 Invoice Branding</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>Customise how your invoices appear — payment details, signatory, footer</div>
          </div>
          <Btn label={brandingMode ? "Cancel" : "✏ Edit"} color={C.primary} outline size="sm" onClick={() => setBrandingMode(m => !m)} />
        </div>
        {brandingMode ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Sales Manager / Signatory Name">
                <Input value={brandingForm.sales_manager_name} onChange={v => setBrandingForm(p => ({ ...p, sales_manager_name: v }))} placeholder="e.g. Rajesh Kumar" />
              </Field>
              <Field label="Bank Name">
                <Input value={brandingForm.bank_name} onChange={v => setBrandingForm(p => ({ ...p, bank_name: v }))} placeholder="e.g. HDFC Bank Ltd." />
              </Field>
              <Field label="Bank Account Number">
                <Input value={brandingForm.bank_account_number} onChange={v => setBrandingForm(p => ({ ...p, bank_account_number: v }))} placeholder="e.g. 50200012345678" />
              </Field>
              <Field label="Bank IFSC Code">
                <Input value={brandingForm.bank_ifsc} onChange={v => setBrandingForm(p => ({ ...p, bank_ifsc: v }))} placeholder="e.g. HDFC0001234" />
              </Field>
              <Field label="UPI ID">
                <Input value={brandingForm.bank_upi} onChange={v => setBrandingForm(p => ({ ...p, bank_upi: v }))} placeholder="e.g. yourname@hdfc" />
              </Field>
              <div style={{ gridColumn: "span 2" }}>
                <Field label="Invoice Footer Note (optional)">
                  <textarea value={brandingForm.invoice_footer_note} onChange={e => setBrandingForm(p => ({ ...p, invoice_footer_note: e.target.value }))} rows={2}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }}
                    placeholder="e.g. Subject to Delhi jurisdiction. All disputes to be settled amicably." />
                </Field>
              </div>
            </div>
            <Btn label={brandingSaving ? "Saving..." : "Save Branding"} color={C.primary} onClick={async () => {
              setBrandingSaving(true);
              try { await api.profile.update(brandingForm); toast("Invoice branding saved!", "success"); setBrandingMode(false); loadData(); }
              catch { toast("Failed to save branding.", "error"); }
              setBrandingSaving(false);
            }} disabled={brandingSaving} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Signatory", brandingForm.sales_manager_name || "Authorised Signatory"],
              ["Bank",      brandingForm.bank_name          || "—"],
              ["A/C No",    brandingForm.bank_account_number|| "—"],
              ["IFSC",      brandingForm.bank_ifsc          || "—"],
              ["UPI",       brandingForm.bank_upi           || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Plan card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Subscription Plan</div>
        {loading ? <Spinner /> : plan ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: C.primary, textTransform: "capitalize" }}>{plan.type} Plan</div>
                <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>
                  {plan.is_active ? `Expires: ${plan.expires_at ? new Date(plan.expires_at).toLocaleDateString("en-IN") : "—"}` : "Plan expired"}
                </div>
              </div>
              <Badge label={plan.is_active ? "Active" : "Expired"} color={plan.is_active ? C.success : C.danger} />
            </div>
            {plan.is_active && plan.days_remaining !== null && (
              <div style={{
                background: plan.days_remaining <= 7 ? `${C.danger}12` : `${C.success}12`,
                border: `1px solid ${plan.days_remaining <= 7 ? C.danger + "44" : C.success + "44"}`,
                borderRadius: 8, padding: "10px 14px", fontSize: 13,
                color: plan.days_remaining <= 7 ? C.danger : C.success,
              }}>
                {plan.days_remaining <= 7
                  ? `⚠️ Only ${plan.days_remaining} day${plan.days_remaining !== 1 ? "s" : ""} remaining! Contact support to upgrade.`
                  : `✅ ${plan.days_remaining} days remaining`}
              </div>
            )}
            {!plan.is_active && (
              <div style={{ background: `${C.danger}15`, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.danger }}>
                ⚠️ Your plan has expired. Please contact support to renew.
              </div>
            )}
          </>
        ) : (
          <div style={{ color: C.textDim, fontSize: 13 }}>No plan information available.</div>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Notification Preferences</div>
          {prefsSaving && <span style={{ fontSize: 11, color: C.textDim }}>Saving…</span>}
          {prefsSaved && <span style={{ fontSize: 11, color: C.success }}>✓ Saved</span>}
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Choose how you want to receive alerts and reminders.</div>
        {prefsLoading ? <Spinner /> : (
          <>
            <ToggleSwitch
              label="Email Notifications"
              sub="Plan expiry warnings, lead alerts, invoices"
              checked={prefs.notify_email}
              onChange={v => savePref("notify_email", v)}
            />
            <ToggleSwitch
              label="WhatsApp Notifications"
              sub="New leads, follow-up reminders, plan alerts (Pro plan)"
              checked={prefs.notify_whatsapp}
              onChange={v => savePref("notify_whatsapp", v)}
            />
            <ToggleSwitch
              label="Push Notifications"
              sub="Real-time browser / app alerts (Pro plan)"
              checked={prefs.notify_push}
              onChange={v => savePref("notify_push", v)}
            />
          </>
        )}
      </Card>

      {/* Actions */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Account Actions</div>
        <button onClick={onLogout} style={{
          width: "100%", padding: "12px", background: `${C.danger}12`, border: `1.5px solid ${C.danger}44`,
          borderRadius: 8, color: C.danger, fontWeight: 700, fontSize: 14, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}>
          🚪 Logout
        </button>
      </Card>

      {/* Integrations section */}
      <Card style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🔌 Integrations & API Keys</div>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>
          Connect third-party services to unlock SMS OTP, WhatsApp alerts, and email marketing.
        </div>
        <IntegrationsSection />
      </Card>
    </div>
  );
}


export default AccountPage;
