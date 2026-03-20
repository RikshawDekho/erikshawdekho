/**
 * AuthPage.jsx — Dealer login, register, forgot password
 */
import { useState, useEffect } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { Btn, Input, Field, Spinner } from "./ui";
import { useToast } from "./contexts";

function AuthPage({ onAuth }) {
  const C = useC();
  const toast = useToast();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot" | "otp"
  const [form, setForm] = useState({ username: "", password: "", confirm_password: "", email: "", dealer_name: "", phone: "", city: "", state: "", pincode: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [pincodeData, setPincodeData] = useState(null); // { city, state, suggestions: [] }
  const [pincodeLoading, setPincodeLoading] = useState(false);
  // Forgot password state
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpConfirmPass, setFpConfirmPass] = useState("");
  const [fpStatus, setFpStatus] = useState(null); // null | "sent" | "done"
  const [fpError, setFpError] = useState("");

  const MAJOR_CITIES = [
    "Agra","Ahmedabad","Allahabad","Amritsar","Bengaluru","Bhopal","Chandigarh",
    "Chennai","Delhi","Faridabad","Ghaziabad","Guwahati","Hyderabad","Indore",
    "Jaipur","Jodhpur","Kanpur","Kochi","Kolkata","Lucknow","Ludhiana",
    "Meerut","Mumbai","Nagpur","Noida","Patna","Pune","Raipur","Ranchi",
    "Surat","Varanasi","Visakhapatnam","Others",
  ];

  const set = (k) => (v) => {
    setForm(p => ({ ...p, [k]: v }));
    setFieldErrors(p => ({ ...p, [k]: "" }));
    setAuthStatus(null);
  };

  const lookupPincode = async (pin) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    setPincodeLoading(true);
    setPincodeData(null);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
        const offices = data[0].PostOffice;
        const city  = offices[0].District;
        const state = offices[0].State;
        const suggestions = [...new Set(offices.map(o => o.District))].slice(0, 5);
        setPincodeData({ city, state, suggestions });
        // Auto-fill city if it matches a known major city or just use the district
        const matched = MAJOR_CITIES.find(c => c.toLowerCase() === city.toLowerCase()) || city;
        setForm(p => ({ ...p, city: matched }));
        setFieldErrors(p => ({ ...p, city: "", pincode: "" }));
      } else {
        setPincodeData(null);
        setFieldErrors(p => ({ ...p, pincode: "Pincode not found. Please enter city manually." }));
      }
    } catch {
      setFieldErrors(p => ({ ...p, pincode: "Could not verify pincode. Please enter city manually." }));
    }
    setPincodeLoading(false);
  };

  const validate = () => {
    const errs = {};
    // For login: username is required. For register: email is the identifier.
    if (mode === "login" && !form.username.trim()) errs.username = "Email or username is required";
    // Password
    if (!form.password) errs.password = "Password is required";
    else if (mode === "register" && form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    else if (mode === "register" && !/\d/.test(form.password))
      errs.password = "Password must contain at least one number";
    // Register-only fields
    if (mode === "register") {
      if (!form.dealer_name.trim()) errs.dealer_name = "Dealership name is required";
      else if (form.dealer_name.trim().length < 3) errs.dealer_name = "Dealership name is too short";
      if (!form.phone.trim()) errs.phone = "Mobile number is required";
      else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10)))
        errs.phone = "Enter a valid 10-digit Indian mobile number (starts with 6–9)";
      if (!form.email.trim()) errs.email = "Email address is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";
      if (form.confirm_password && form.password !== form.confirm_password)
        errs.confirm_password = "Passwords do not match";
      if (!form.city.trim()) errs.city = "City is required";
      if (form.pincode && !/^\d{6}$/.test(form.pincode)) errs.pincode = "Enter a valid 6-digit pincode";
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setAuthStatus(null);
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      toast("Please fix the errors below before continuing.", "warning");
      return;
    }
    setLoading(true);
    try {
      const data = mode === "login"
        ? await api.login({ username: form.username, password: form.password })
        : await api.register({ email: form.email, password: form.password, dealer_name: form.dealer_name, phone: form.phone, city: form.city, state: form.state || pincodeData?.state || "", pincode: form.pincode });
      localStorage.setItem("erd_access", data.access);
      if (data.refresh) localStorage.setItem("erd_refresh", data.refresh);
      setAuthStatus("success");
      const name = data.user?.dealer_name || data.user?.username || form.username;
      toast(mode === "login" ? `Welcome back, ${name}! Signing you in...` : `Account created! Welcome to eRickshawDekho, ${name}!`, "success");
      setTimeout(() => onAuth(data), 800);
    } catch (err) {
      setAuthStatus("error");
      const errObj = typeof err === "object" ? err : {};
      const serverMsg = errObj.detail || errObj.non_field_errors?.[0] || errObj.non_field_errors
        || Object.values(errObj).flat().join(" ")
        || "Something went wrong. Please try again.";
      // Show toast for auth failures
      if (mode === "login") {
        toast("Login failed. Check your username and password.", "error");
      } else {
        toast("Registration failed. " + serverMsg, "error");
      }
      // Also set inline errors for field-level server errors
      const inlineErrs = {};
      if (errObj.detail || errObj.non_field_errors) {
        inlineErrs._banner = typeof (errObj.detail || errObj.non_field_errors) === "string"
          ? (errObj.detail || errObj.non_field_errors)
          : (errObj.non_field_errors?.[0] || errObj.detail);
      }
      Object.keys(errObj).filter(k => !["detail","non_field_errors"].includes(k)).forEach(k => {
        inlineErrs[k] = Array.isArray(errObj[k]) ? errObj[k][0] : errObj[k];
      });
      setFieldErrors(inlineErrs);
    }
    setLoading(false);
  };

  const FieldErr = ({ k }) => fieldErrors[k]
    ? <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {fieldErrors[k]}</div>
    : null;

  const submitForgotRequest = async (e) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setFpError("Email address is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) { setFpError("Enter a valid email address."); return; }
    setFpError(""); setLoading(true);
    try {
      await api.auth.forgotPassword({ email: fpEmail });
      setFpStatus("sent");
      toast("OTP sent! Check your email.", "success");
    } catch { setFpError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const submitForgotConfirm = async (e) => {
    e.preventDefault();
    if (!fpOtp.trim() || fpOtp.length !== 6) { setFpError("Enter the 6-digit OTP from your email."); return; }
    if (!fpNewPass.trim() || fpNewPass.length < 8) { setFpError("Password must be at least 8 characters."); return; }
    if (!/\d/.test(fpNewPass)) { setFpError("Password must contain at least one number."); return; }
    if (fpNewPass !== fpConfirmPass) { setFpError("Passwords do not match."); return; }
    setFpError(""); setLoading(true);
    try {
      await api.auth.resetPassword({ email: fpEmail, otp: fpOtp, new_password: fpNewPass });
      setFpStatus("done");
      toast("Password reset! Please sign in.", "success");
      setTimeout(() => { setMode("login"); setFpStatus(null); setFpEmail(""); setFpOtp(""); setFpNewPass(""); setFpConfirmPass(""); }, 2000);
    } catch (err) {
      const msg = typeof err === "object" ? (err.error || Object.values(err).flat().join(" ")) : "Failed to reset password.";
      setFpError(msg);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.primaryD} 0%, ${C.primary} 50%, #1a6b44 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative" }}>
      {/* Language Toggle - Top Right */}
      <button onClick={() => {
        const next = localStorage.getItem("erd_lang") === "en" ? "hi" : "en";
        i18n.changeLanguage(next);
        localStorage.setItem("erd_lang", next);
      }} title={localStorage.getItem("erd_lang") === "en" ? "भाषा बदलें हिंदी के लिए" : "Change language to English"}
        style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(5px)", transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>
        {localStorage.getItem("erd_lang") === "en" ? "हि" : "EN"}
      </button>

      <div style={{ width: 440, maxWidth: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛺</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif" }}>
            eRickshaw<span style={{ color: C.accent }}>Dekho</span>.com
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>SaaS & Marketplace Platform for eRickshaws</div>
        </div>

        {/* ── Forgot Password flow ── */}
        {(mode === "forgot" || mode === "otp") && (
          <Card padding={32}>
            <button onClick={() => { setMode("login"); setFpStatus(null); setFpError(""); }} style={{ background: "none", border: "none", color: C.primary, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 18, display: "flex", alignItems: "center", gap: 5 }}>
              ← Back to Sign In
            </button>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 4 }}>
              {fpStatus === "done" ? "✓ Password Reset!" : fpStatus === "sent" ? "Enter OTP" : "Forgot Password"}
            </div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>
              {fpStatus === "done" ? "Your password has been reset. Redirecting to sign in..." :
               fpStatus === "sent" ? `We sent a 6-digit OTP to ${fpEmail}. Enter it below along with your new password.` :
               "Enter your registered email address to receive a password reset OTP."}
            </div>
            {fpError && <div style={{ background: `${C.danger}12`, border: `1.5px solid ${C.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14 }}>⚠ {fpError}</div>}
            {fpStatus === "done" && <div style={{ background: `${C.success}12`, border: `1.5px solid ${C.success}44`, borderRadius: 10, padding: 16, textAlign: "center", color: C.success, fontWeight: 700 }}>✓ Password changed successfully!</div>}
            {!fpStatus && (
              <form onSubmit={submitForgotRequest}>
                <Field label="Registered Email Address" required>
                  <Input value={fpEmail} onChange={v => { setFpEmail(v); setFpError(""); }} type="email" placeholder="your@email.com" />
                </Field>
                <Btn label={loading ? "Sending OTP..." : "Send OTP"} type="submit" color={C.primary} fullWidth size="lg" disabled={loading} />
              </form>
            )}
            {fpStatus === "sent" && (
              <form onSubmit={submitForgotConfirm}>
                <Field label="6-digit OTP" required>
                  <Input value={fpOtp} onChange={v => { setFpOtp(v.replace(/\D/g, "").slice(0, 6)); setFpError(""); }} placeholder="e.g. 123456" style={{ letterSpacing: 4, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
                </Field>
                <Field label="New Password" required>
                  <Input value={fpNewPass} onChange={v => { setFpNewPass(v); setFpError(""); }} type="password" placeholder="Min 8 chars, include a number" />
                </Field>
                <Field label="Confirm New Password" required>
                  <Input value={fpConfirmPass} onChange={v => { setFpConfirmPass(v); setFpError(""); }} type="password" placeholder="Repeat your new password" />
                </Field>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <Btn label="Resend OTP" outline color={C.textMid} onClick={async (e) => { e.preventDefault(); await submitForgotRequest({ preventDefault: () => {} }); }} />
                  <Btn label={loading ? "Resetting..." : "Reset Password"} type="submit" color={C.primary} disabled={loading} style={{ flex: 1 }} />
                </div>
              </form>
            )}
          </Card>
        )}

        {(mode === "login" || mode === "register") && (
        <Card padding={32}>
          <div style={{ display: "flex", marginBottom: 24, background: C.bg, borderRadius: 8, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setFieldErrors({}); setAuthStatus(null); }} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: mode === m ? C.primary : "transparent", color: mode === m ? "#fff" : C.textMid, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Status banner */}
          {authStatus === "error" && fieldErrors._banner && (
            <div style={{ background: `${C.danger}15`, border: `1.5px solid ${C.danger}55`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.danger, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <span style={{ fontSize: 18 }}>✕</span>
              <span>{fieldErrors._banner}</span>
            </div>
          )}
          {authStatus === "success" && (
            <div style={{ background: `${C.success}15`, border: `1.5px solid ${C.success}55`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.success, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <span>{mode === "login" ? "Login successful! Redirecting..." : "Account created! Redirecting..."}</span>
            </div>
          )}

          <form onSubmit={submit}>
            {mode === "login" && (
              <Field label="Email or Username" required>
                <Input value={form.username} onChange={set("username")} placeholder="Email or username" autoComplete="username" />
                <FieldErr k="username" />
              </Field>
            )}
            {mode === "register" && (
              <>
                <Field label="Dealership / Showroom Name *" required>
                  <Input value={form.dealer_name} onChange={set("dealer_name")} placeholder="e.g. Sharma eRickshaw Centre" />
                  <FieldErr k="dealer_name" />
                </Field>
                <Field label="Email Address *" required>
                  <Input value={form.email} onChange={set("email")} type="email" placeholder="dealer@example.com" />
                  <FieldErr k="email" />
                </Field>
                <Field label="Mobile Number *" required>
                  <Input value={form.phone} onChange={v => { set("phone")(v.replace(/\D/g, "").slice(0, 10)); }} placeholder="10-digit Indian number (starts with 6-9)" />
                  <FieldErr k="phone" />
                </Field>
              </>
            )}
            <Field label="Password" required>
              <Input value={form.password} onChange={set("password")} type="password" placeholder={mode === "register" ? "Min 8 chars, include a number" : "Your password"} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <FieldErr k="password" />
            </Field>
            {mode === "register" && (
              <Field label="Confirm Password *" required>
                <Input value={form.confirm_password} onChange={set("confirm_password")} type="password" placeholder="Repeat your password" />
                <FieldErr k="confirm_password" />
              </Field>
            )}
            {mode === "register" && (
              <>
                <Field label="Pincode / ZIP Code">
                  <div style={{ position: "relative" }}>
                    <Input value={form.pincode} onChange={v => { set("pincode")(v); if (v.length === 6) lookupPincode(v); }} placeholder="e.g. 110085" />
                    {pincodeLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textMid }}>🔍 Looking up...</span>}
                  </div>
                  <FieldErr k="pincode" />
                  {pincodeData && <div style={{ fontSize: 11, color: C.success, marginTop: 3 }}>✓ {pincodeData.city}, {pincodeData.state}</div>}
                </Field>
                <Field label="City / District" required>
                  <select value={form.city} onChange={e => set("city")(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${fieldErrors.city ? C.danger : C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                    <option value="">— Select your city —</option>
                    {pincodeData?.suggestions?.filter(s => s !== form.city).map(s => (
                      <option key={s} value={s} style={{ fontWeight: 600, color: C.primary }}>✓ {s} (from pincode)</option>
                    ))}
                    {MAJOR_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FieldErr k="city" />
                </Field>
              </>
            )}
            <Btn
              label={loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}
              type="submit"
              color={authStatus === "success" ? C.success : C.primary}
              fullWidth
              disabled={loading || authStatus === "success"}
              size="lg"
            />
          </form>
          {mode === "login" && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={() => { setMode("forgot"); setFpStatus(null); setFpError(""); }} style={{ background: "none", border: "none", color: C.primary, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                Forgot password?
              </button>
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: C.textDim }}>Demo: username=<b>demo</b> &nbsp;password=<b>demo1234</b></div>
        </Card>
        )}
      </div>
    </div>
  );
}


export default AuthPage;
