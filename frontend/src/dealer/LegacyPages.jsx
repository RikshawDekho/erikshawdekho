/**
 * LegacyPages.jsx — Old landing page, public learn section, public marketplace
 * Used within App.jsx internal routing (pre-ecosystem-redesign)
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api, API } from "./api";
import { fmtINR, Card, Btn, Spinner, FUEL_COLOR } from "./ui";
import VehicleDetailModal, { StarRating, AvgStars } from "./VehicleDetail";

function LandingPage({ onDealer, onMarketplace }) {
  const C = useC();
  const [lang, setLang] = useState(() => localStorage.getItem("erd_lang") || "en");

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${C.primaryD} 0%,${C.primary} 45%,#1a6b44 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito','Segoe UI',sans-serif", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Language Toggle - Top Right */}
      <button onClick={() => {
        const next = lang === "en" ? "hi" : "en";
        i18n.changeLanguage(next);
        localStorage.setItem("erd_lang", next);
        setLang(next);
      }} title={lang === "en" ? "भाषा बदलें हिंदी के लिए" : "Change language to English"}
        style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(5px)", transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>
        {lang === "en" ? "हि" : "EN"}
      </button>

      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 48, color: "#fff" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🛺</div>
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Georgia,serif", letterSpacing: -1 }}>
          eRickshaw<span style={{ color: C.accent }}>Dekho</span><span style={{ opacity: 0.7 }}>.com</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 15, opacity: 0.8, maxWidth: 380 }}>
          India's #1 Platform for eRickshaws & Auto-rickshaws
        </div>
      </div>

      {/* Two paths */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 640 }}>
        {/* Driver / Buyer */}
        <div onClick={onMarketplace} style={{
          flex: 1, minWidth: 260, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 18, padding: 32,
          color: "#fff", cursor: "pointer", transition: "all 0.2s", textAlign: "center",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Browse Marketplace</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7, marginBottom: 20 }}>
            Search & compare eRickshaws near you. View prices, specs, dealers and reviews. No sign-in needed.
          </div>
          <div style={{ background: C.accent, color: "#1a1a1a", borderRadius: 10, padding: "11px 20px", fontWeight: 700, fontSize: 14 }}>
            Browse eRickshaws →
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 10 }}>Driver • Buyer • Fleet Owner</div>
        </div>

        {/* Dealer */}
        <div onClick={onDealer} style={{
          flex: 1, minWidth: 260, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 18, padding: 32,
          color: "#fff", cursor: "pointer", transition: "all 0.2s", textAlign: "center",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = ""; }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏪</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Dealer Portal</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7, marginBottom: 20 }}>
            Manage inventory, leads, sales & invoices. Full GST billing, CRM and analytics for your showroom.
          </div>
          <div style={{ background: "#fff", color: C.primary, borderRadius: 10, padding: "11px 20px", fontWeight: 700, fontSize: 14 }}>
            Dealer Sign In →
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 10 }}>Showroom • Dealer • Distributor</div>
        </div>
      </div>

      <div style={{ marginTop: 36, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
        Trusted by 500+ dealers across India · Delhi · UP · Bihar · Rajasthan
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PUBLIC LEARN SECTION (for buyers on the marketplace)
// ═══════════════════════════════════════════════════════
function PublicLearnSection() {
  const C = useC();
  const [videos, setVideos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("videos");
  const [watchVideo, setWatchVideo] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", city: "", model: "" });
  const [leadSent, setLeadSent] = useState(false);

  useEffect(() => {
    Promise.all([
      api.videos.list("?category=&is_public=true").then(d => setVideos((d.results || d).slice(0, 6))),
      api.blogs.list("?is_published=true").then(d => setPosts((d.results || d).slice(0, 4))),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: C.bg, padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>🎓 eRickshaw Learning Hub</div>
        <div style={{ fontSize: 14, color: C.textMid }}>Tips, guides and videos to help you earn more and maintain your eRickshaw</div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 28, background: C.surface, padding: 4, borderRadius: 12, width: "fit-content", margin: "0 auto 28px" }}>
        {[{id:"videos",label:"🎬 Videos"},{id:"blogs",label:"📝 Articles"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
            background: tab === t.id ? C.primary : "transparent",
            color: tab === t.id ? "#fff" : C.textMid,
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : tab === "videos" ? (
        videos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>No videos available yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {videos.map(v => <VideoCard key={v.id} v={v} onWatch={(vid) => setWatchVideo(vid)} />)}
          </div>
        )
      ) : (
        posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>No articles available yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {posts.map(p => <BlogPostCard key={p.id} post={p} />)}
          </div>
        )
      )}
      {watchVideo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 800, width: "100%", position: "relative" }}>
            <button onClick={() => { setWatchVideo(null); setShowLeadForm(true); }} style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer" }}>×</button>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 12 }}>
              <iframe
                src={`https://www.youtube.com/embed/${extractVideoId(watchVideo.youtube_url)}?autoplay=1&rel=0`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="autoplay; encrypted-media" allowFullScreen title={watchVideo.title}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => { setWatchVideo(null); setShowLeadForm(true); }} style={{ padding: "10px 28px", borderRadius: 8, background: "#25D366", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                💬 Get Free Quote from Dealers
              </button>
            </div>
          </div>
        </div>
      )}
      {showLeadForm && !leadSent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: C.text }}>🛺 Get Free Quote</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>Our dealers will contact you within 2 hours</div>
            {[
              { key: "name", label: "Your Name *", placeholder: "Full name", type: "text" },
              { key: "phone", label: "Mobile Number *", placeholder: "10-digit number", type: "tel" },
              { key: "city", label: "Your City *", placeholder: "e.g. Delhi, Lucknow", type: "text" },
              { key: "model", label: "Model Interested In", placeholder: "e.g. Vikram 4G Plus (optional)", type: "text" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{f.label}</div>
                <input type={f.type} value={leadForm[f.key]} onChange={e => setLeadForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowLeadForm(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: C.textMid }}>Cancel</button>
              <button onClick={async () => {
                if (!leadForm.name || !leadForm.phone || !leadForm.city) return;
                try {
                  await apiFetch("/enquiries/", { method: "POST", body: JSON.stringify({
                    name: leadForm.name, phone: leadForm.phone, city: leadForm.city,
                    message: `Interested in: ${leadForm.model || "eRickshaw"}. Source: YouTube Video Lead.`,
                    source: "youtube_video"
                  }) });
                  setLeadSent(true);
                } catch { alert("Failed to submit. Please try again."); }
              }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Submit — Get Free Quote
              </button>
            </div>
          </div>
        </div>
      )}
      {leadSent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 32, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Quote Request Sent!</div>
            <div style={{ fontSize: 14, color: C.textMid, marginBottom: 24 }}>Dealers in your city will contact you within 2 hours.</div>
            <button onClick={() => { setLeadSent(false); setShowLeadForm(false); setLeadForm({ name: "", phone: "", city: "", model: "" }); }} style={{ padding: "10px 28px", borderRadius: 8, background: C.primary, border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PUBLIC MARKETPLACE PAGE (no dealer auth required)
// ═══════════════════════════════════════════════════════
function PublicMarketplacePage({ onDealerPortal, onBack }) {
  const C = useC();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Top nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${C.primary},${C.primaryL})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛺</div>
          <span style={{ fontWeight: 800, fontSize: 16, fontFamily: "Georgia,serif", color: C.text }}>eRickshaw<span style={{ color: C.accent }}>Dekho</span></span>
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onBack} style={{ padding: "7px 14px", borderRadius: 8, background: C.bg, border: `1.5px solid ${C.border}`, color: C.textMid, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            🏠 Home
          </button>
          <span style={{ fontSize: 12, color: C.textDim }}>Are you a dealer?</span>
          <button onClick={onDealerPortal} style={{ padding: "7px 16px", borderRadius: 8, background: C.primary, border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Dealer Portal →
          </button>
        </div>
      </div>
      {/* Mobile bottom nav for public */}
      <div className="erd-public-bottom-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, zIndex: 200, padding: "6px 0 8px" }}>
        {[
          { label: "Home", icon: "🏠", action: onBack },
          { label: "Browse", icon: "🛺", action: () => document.querySelector('.erd-marketplace-grid')?.scrollIntoView({ behavior: "smooth" }) },
          { label: "Learn", icon: "🎓", action: () => document.querySelector('.erd-learn-hub')?.scrollIntoView({ behavior: "smooth" }) },
          { label: "Dealer Portal", icon: "🏪", action: onDealerPortal },
        ].map((n, i) => (
          <button key={i} onClick={n.action} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "transparent", border: "none", cursor: "pointer", color: C.textDim, fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10 }}>{n.label}</span>
          </button>
        ))}
      </div>
      <style>{`.erd-public-bottom-nav { display: none; } @media (max-width: 768px) { .erd-public-bottom-nav { display: flex !important; } }`}</style>
      <div style={{ paddingBottom: 0 }}>
        <Marketplace />
        <PublicLearnSection />
      </div>
      <PWAInstallPrompt />
    </div>
  );
}


export { LandingPage, PublicLearnSection, PublicMarketplacePage };
