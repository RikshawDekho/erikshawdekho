/**
 * i18n — Lightweight translation system for ErikshawDekho
 * Supports: English (en), Hindi (hi)
 * Defaults: hi (Hindi). Toggle to en (English) anytime.
 */
import { createContext, useContext, useState, useCallback } from "react";

const translations = {
  // ─── Navbar & Common ───────────────────────────────────
  "nav.driver":        { en: "Driver",            hi: "ड्राइवर" },
  "nav.dealer":        { en: "Dealer",            hi: "डीलर" },
  "nav.financer":      { en: "Financer",          hi: "फाइनेंसर" },
  "nav.home":          { en: "Home",              hi: "होम" },
  "nav.marketplace":   { en: "Marketplace",       hi: "मार्केटप्लेस" },
  "nav.dealers":       { en: "Dealers",           hi: "डीलर्स" },
  "nav.login":         { en: "Login",             hi: "लॉगिन" },
  "nav.register":      { en: "Register",          hi: "रजिस्टर" },

  // ─── Landing Page ──────────────────────────────────────
  "landing.hero.title":     { en: "India's Most Trusted\nE-Rickshaw Platform",    hi: "भारत का सबसे भरोसेमंद\nई-रिक्शा प्लेटफॉर्म" },
  "landing.hero.subtitle":  { en: "Connecting Drivers, Dealers & Financers across India",  hi: "पूरे भारत में ड्राइवर, डीलर और फाइनेंसर को जोड़ रहे हैं" },
  "landing.hero.free":      { en: "₹0 Enquiry Fee",  hi: "₹0 एंक्वायरी शुल्क" },
  "landing.stats.dealers":  { en: "Verified Dealers", hi: "सत्यापित डीलर" },
  "landing.stats.vehicles": { en: "Vehicles Listed",  hi: "वाहन लिस्टेड" },
  "landing.stats.cities":   { en: "Cities",           hi: "शहर" },

  // ─── Driver Section ────────────────────────────────────
  "driver.title":          { en: "Driver / Buyer",             hi: "ड्राइवर / खरीदार" },
  "driver.subtitle":       { en: "No Login Required",          hi: "लॉगिन की जरूरत नहीं" },
  "driver.desc":           { en: "Browse E-Rickshaws, compare prices, get best deals from verified dealers.", hi: "ई-रिक्शा देखें, कीमत compare करें, verified dealers से best deal पाएँ।" },
  "driver.explore":        { en: "Explore Vehicles",           hi: "गाड़ी देखें" },
  "driver.find_dealer":    { en: "Find Dealers",               hi: "डीलर खोजें" },
  "driver.compare":        { en: "Compare Vehicles",           hi: "गाड़ी compare करें" },
  "driver.emi":            { en: "EMI Calculator",             hi: "EMI कैलकुलेटर" },
  "driver.free_enquiry":   { en: "Free Enquiry",               hi: "मुफ्त एंक्वायरी" },
  "driver.cta":            { en: "Explore Now →",              hi: "अभी देखें →" },

  // ─── Dealer Section ────────────────────────────────────
  "dealer.title":          { en: "Dealer / Showroom",          hi: "डीलर / शोरूम" },
  "dealer.subtitle":       { en: "Login Required",             hi: "लॉगिन आवश्यक" },
  "dealer.desc":           { en: "Manage your showroom CRM, track leads, generate invoices, grow your business.", hi: "अपनी showroom manage करें, leads track करें, invoices बनाएँ, business बढ़ाएँ।" },
  "dealer.portal":         { en: "Dealer Portal →",            hi: "डीलर पोर्टल →" },
  "dealer.leads":          { en: "Lead Management",            hi: "लीड मैनेजमेंट" },
  "dealer.invoice":        { en: "Invoice Generator",          hi: "इन्वॉइस जेनरेटर" },
  "dealer.analytics":      { en: "Analytics",                  hi: "एनालिटिक्स" },
  "dealer.marketing":      { en: "Marketing Tools",            hi: "मार्केटिंग टूल्स" },

  // ─── Financer Section ──────────────────────────────────
  "financer.title":        { en: "Financer / NBFC",            hi: "फाइनेंसर / NBFC" },
  "financer.subtitle":     { en: "Approval Required",          hi: "अनुमोदन आवश्यक" },
  "financer.desc":         { en: "Offer E-Rickshaw loans, onboard dealers, manage finance applications.", hi: "ई-रिक्शा लोन offer करें, dealers onboard करें, finance applications manage करें।" },
  "financer.portal":       { en: "Financer Portal →",          hi: "फाइनेंसर पोर्टल →" },

  // ─── Forms & Enquiry ───────────────────────────────────
  "form.name":             { en: "Your Name",                  hi: "आपका नाम" },
  "form.phone":            { en: "Mobile Number (10 digits)",  hi: "मोबाइल नंबर (10 अंक)" },
  "form.brand":            { en: "Select Brand",               hi: "ब्रांड चुनें" },
  "form.dealer":           { en: "Select Dealer",              hi: "डीलर चुनें" },
  "form.pincode":          { en: "Pincode (6 digits)",         hi: "पिनकोड (6 अंक)" },
  "form.city":             { en: "City / District",            hi: "शहर / जिला" },
  "form.notes":            { en: "Notes (editable)",           hi: "नोट्स (संशोधन कर सकते हैं)" },
  "form.submit":           { en: "Get Best Price →",           hi: "🛺 Best Price जानें →" },
  "form.get_quote":        { en: "Get Free Quote — 2 minutes", hi: "Free Quote पाएँ — 2 मिनट में" },
  "form.select_brand_first":{ en: "Select brand first",        hi: "पहले ब्रांड चुनें" },
  "form.loading_dealers":  { en: "Loading dealers...",          hi: "डीलर लोड हो रहे हैं..." },
  "form.no_dealers":       { en: "No dealers found",           hi: "कोई डीलर नहीं मिला" },

  // ─── Validation ────────────────────────────────────────
  "err.brand_required":    { en: "Please select a brand.",     hi: "ब्रांड select करें।" },
  "err.dealer_required":   { en: "Please select a dealer.",    hi: "डीलर select करें।" },
  "err.phone_invalid":     { en: "Enter valid 10-digit Indian mobile (starts 6-9).", hi: "Valid 10-digit Indian mobile number डालें (6-9 से शुरू)।" },
  "err.pincode_invalid":   { en: "Enter valid 6-digit pincode.",  hi: "Valid 6-digit pincode डालें।" },
  "err.generic":           { en: "Something went wrong. Try again.",  hi: "कुछ गलत हुआ। फिर कोशिश करें।" },
  "err.network":           { en: "Network error. Please try again.",  hi: "नेटवर्क एरर। फिर कोशिश करें।" },

  // ─── Success ───────────────────────────────────────────
  "success.enquiry":       { en: "Thank you! Your enquiry has been sent.",  hi: "धन्यवाद! आपकी enquiry भेजी गई।" },
  "success.dealer_contact":{ en: "Dealer will contact you within 24 hours.", hi: "Dealer 24 घंटों में contact करेंगे।" },

  // ─── Marketplace ───────────────────────────────────────
  "market.title":          { en: "E-Rickshaw Marketplace",     hi: "ई-रिक्शा मार्केटप्लेस" },
  "market.subtitle":       { en: "Compare directly from top dealers across India",  hi: "भारत के top dealers से सीधे compare करें" },
  "market.search":         { en: "Search by brand or model...",  hi: "ब्रांड या मॉडल से खोजें..." },
  "market.all_fuel":       { en: "All Fuel Types",             hi: "सभी ईंधन प्रकार" },
  "market.clear":          { en: "Clear Filters",              hi: "फिल्टर हटाएँ" },
  "market.vehicles_found": { en: "vehicles found",             hi: "गाड़ी मिली" },
  "market.loading":        { en: "Loading vehicles...",         hi: "गाड़ी लोड हो रही हैं..." },
  "market.none":           { en: "No vehicles found",          hi: "कोई गाड़ी नहीं मिली" },
  "market.try_filter":     { en: "Try changing your filters",  hi: "अलग filter आज़माएँ" },
  "market.enquiry":        { en: "Send Enquiry",               hi: "Enquiry भेजें" },
  "market.starting_at":    { en: "Starting at",                hi: "शुरू" },
  "market.compare":        { en: "Compare",                    hi: "Compare" },
  "market.featured":       { en: "Featured",                   hi: "फीचर्ड" },
  "market.in_stock":       { en: "In Stock",                   hi: "स्टॉक में" },
  "market.low_stock":      { en: "Limited Stock",              hi: "सीमित स्टॉक" },
  "market.out_stock":      { en: "Out of Stock",               hi: "स्टॉक खत्म" },

  // ─── Dealer Directory ──────────────────────────────────
  "dir.title":             { en: "Dealer Directory",           hi: "डीलर डायरेक्ट्री" },
  "dir.subtitle":          { en: "Find verified E-Rickshaw dealers in your city", hi: "अपने शहर के verified E-Rickshaw dealers खोजें" },
  "dir.search":            { en: "Search dealer name or city...", hi: "डीलर या शहर खोजें..." },
  "dir.dealers_found":     { en: "dealers found",              hi: "डीलर मिले" },
  "dir.call":              { en: "Call Now",                    hi: "अभी कॉल करें" },
  "dir.are_you_dealer":    { en: "Are you a dealer?",          hi: "क्या आप dealer हैं?" },
  "dir.list_free":         { en: "List your showroom for free and connect with thousands of buyers", hi: "अपनी showroom free में list करें और हजारों buyers से connect करें" },
  "dir.register":          { en: "Register Your Showroom →",   hi: "शोरूम रजिस्टर करें →" },

  // ─── How it works ──────────────────────────────────────
  "how.title":             { en: "How It Works",               hi: "यह कैसे काम करता है?" },
  "how.subtitle":          { en: "Get your best E-Rickshaw in 3 simple steps", hi: "3 simple steps में best E-Rickshaw पाएँ" },
  "how.step1.title":       { en: "Search & Compare",           hi: "खोजें और Compare करें" },
  "how.step1.desc":        { en: "Find E-Rickshaws by budget, brand, fuel type — filter everything.", hi: "अपने budget और जरूरत के हिसाब से E-Rickshaw खोजें। Brand, fuel type, price — सब filter करें।" },
  "how.step2.title":       { en: "Contact Dealer",             hi: "Dealer से मिलें" },
  "how.step2.desc":        { en: "Contact verified dealer in your city directly. Book a free test drive.", hi: "अपने शहर के verified dealer से directly contact करें। Free test drive book करें।" },
  "how.step3.title":       { en: "Get Best Price",             hi: "Best Price पाएँ" },
  "how.step3.desc":        { en: "Compare multiple quotes. Use EMI calculator. Lock the best deal.", hi: "Multiple quotes compare करें। EMI calculator use करें। सबसे अच्छा deal पक्का करें।" },

  // ─── Footer ────────────────────────────────────────────
  "footer.brand_desc":     { en: "India's most trusted E-Rickshaw platform. Compare and get best prices.", hi: "भारत का सबसे भरोसेमंद ई-रिक्शा प्लेटफॉर्म। Compare करें और best price पाएँ।" },
  "footer.buyers":         { en: "Buyers / Drivers",           hi: "खरीदार / ड्राइवर" },
  "footer.browse":         { en: "Browse Rickshaws",           hi: "रिक्शा देखें" },
  "footer.find_dealers":   { en: "Find Dealers",               hi: "डीलर खोजें" },
  "footer.for_dealers":    { en: "For Dealers",                hi: "डीलर्स के लिए" },
  "footer.dealer_login":   { en: "Dealer Login",               hi: "डीलर लॉगिन" },
  "footer.register_showroom":{ en: "Register Showroom",        hi: "शोरूम रजिस्टर करें" },
  "footer.manage_inventory":{ en: "Manage Inventory",          hi: "इन्वेंटरी मैनेज करें" },
  "footer.contact":        { en: "Contact Us",                 hi: "संपर्क करें" },
  "footer.copyright":      { en: "All rights reserved.",       hi: "सर्वाधिकार सुरक्षित।" },
  "footer.made_in_india":  { en: "Made with ❤️ in India 🇮🇳",   hi: "भारत में ❤️ से बनाया 🇮🇳" },
  "footer.designed":       { en: "Designed for Bharat 🇮🇳",     hi: "भारत के लिए बनाया 🇮🇳" },

  // ─── Common Actions ────────────────────────────────────
  "action.close":          { en: "Close",                      hi: "बंद करें" },
  "action.back":           { en: "Back",                       hi: "वापस" },
  "action.continue":       { en: "Continue Browsing →",        hi: "ब्राउज़ जारी रखें →" },
  "action.welcome_back":   { en: "Welcome back!",              hi: "फिर आपका स्वागत है!" },
  "action.session_saved":  { en: "Your browsing session is saved.", hi: "आपका ब्राउज़िंग सेशन सेव है।" },
  "action.hard_refresh":   { en: "Refresh",                    hi: "रिफ्रेश" },
  "action.prev":           { en: "Prev",                       hi: "पिछला" },
  "action.next":           { en: "Next",                       hi: "अगला" },
  "action.page":           { en: "Page",                       hi: "पेज" },
  "action.clear":          { en: "Clear",                      hi: "हटाएँ" },
  "action.view_all":       { en: "View All →",                 hi: "सभी देखें →" },

  // ─── Fuel Types ────────────────────────────────────────
  "fuel.electric":         { en: "Electric",                   hi: "इलेक्ट्रिक" },
  "fuel.cng":              { en: "CNG",                        hi: "CNG" },
  "fuel.petrol":           { en: "Petrol",                     hi: "पेट्रोल" },
  "fuel.lpg":              { en: "LPG",                        hi: "LPG" },
  "fuel.diesel":           { en: "Diesel",                     hi: "डीज़ल" },

  // ─── Brand based ───────────────────────────────────────
  "brand.find_by":         { en: "Find Dealer by Brand",       hi: "Brand से Dealer खोजें" },
  "brand.select_see":      { en: "Select brand → see verified dealers → send enquiry", hi: "Brand select करें → verified dealers देखें → enquiry भेजें" },
  "brand.select_dealer":   { en: "Select a Dealer",            hi: "डीलर चुनें" },
  "brand.sorted_rating":   { en: "Sorted by rating & reviews", hi: "रेटिंग और रिव्यू के अनुसार" },
  "brand.send_query":      { en: "Send Query →",               hi: "Query भेजें →" },

  // ─── CTA Section ───────────────────────────────────────
  "cta.are_you_dealer":    { en: "Are you an E-Rickshaw dealer?", hi: "क्या आप E-Rickshaw dealer हैं?" },
  "cta.list_showroom":     { en: "List your showroom on ErikshawDekho. Reach thousands of buyers for free. Join today!", hi: "अपनी showroom ErikshawDekho पर list करें। हजारों buyers तक free में पहुँचें। आज ही join करें!" },
  "cta.register_showroom": { en: "Register Showroom",          hi: "शोरूम रजिस्टर करें" },

  // ─── Choose fuel ───────────────────────────────────────
  "fuel.choose":           { en: "Choose Your Fuel Type",      hi: "अपना Fuel Type चुनें" },

  // ─── Who are you ───────────────────────────────────────
  "who.title":             { en: "Who are you?",               hi: "आप कौन हैं?" },
  "who.subtitle":          { en: "Choose your role and access dedicated ecosystem", hi: "अपना role चुनें और dedicated ecosystem access करें" },

  // ─── Specifications ────────────────────────────────────
  "spec.fuel_type":        { en: "Fuel Type",                  hi: "ईंधन प्रकार" },
  "spec.range":            { en: "Range",                      hi: "रेंज" },
  "spec.battery":          { en: "Battery",                    hi: "बैटरी" },
  "spec.max_speed":        { en: "Max Speed",                  hi: "अधिकतम गति" },
  "spec.payload":          { en: "Payload",                    hi: "पेलोड" },
  "spec.seating":          { en: "Seating",                    hi: "सीटिंग" },
  "spec.warranty":         { en: "Warranty",                   hi: "वारंटी" },
  "spec.year":             { en: "Year",                       hi: "साल" },
  "spec.type":             { en: "Type",                       hi: "प्रकार" },
  "spec.specifications":   { en: "Specifications",             hi: "विवरण" },
  "spec.dealer_contact":   { en: "Direct Dealer Contact",      hi: "डीलर से सीधे संपर्क" },
  "spec.verified":         { en: "Verified Dealer",            hi: "सत्यापित डीलर" },
  "spec.vehicles":         { en: "Vehicles",                   hi: "गाड़ियाँ" },
  "spec.reviews":          { en: "Reviews",                    hi: "रिव्यू" },
  "spec.no_reviews":       { en: "No reviews yet",             hi: "अभी कोई रिव्यू नहीं" },

  // ─── Compare ───────────────────────────────────────────
  "compare.title":         { en: "Compare Vehicles",           hi: "गाड़ी Compare करें" },
  "compare.selected":      { en: "vehicles selected",          hi: "गाड़ी चुनी गई" },
  "compare.feature":       { en: "Feature",                    hi: "विशेषता" },
  "compare.remove":        { en: "Remove",                     hi: "हटाएँ" },
  "compare.loading":       { en: "Loading comparison...",       hi: "Compare लोड हो रहा है..." },
  "compare.none":          { en: "No vehicles to compare.",     hi: "Compare के लिए कोई गाड़ी नहीं।" },

  // ─── EMI Calculator ──────────────────────────────────
  "emi.title":             { en: "EMI Calculator",              hi: "EMI कैलकुलेटर" },
  "emi.principal":         { en: "Vehicle Price (₹)",           hi: "गाड़ी की कीमत (₹)" },
  "emi.rate":              { en: "Interest Rate (% p.a.)",      hi: "ब्याज दर (% प्रति वर्ष)" },
  "emi.tenure":            { en: "Tenure (months)",             hi: "अवधि (महीने)" },
  "emi.calculate":         { en: "Calculate EMI",               hi: "EMI निकालें" },
  "emi.monthly":           { en: "Monthly EMI",                 hi: "मासिक EMI" },
  "emi.total_payment":     { en: "Total Payment",               hi: "कुल भुगतान" },
  "emi.total_interest":    { en: "Total Interest",              hi: "कुल ब्याज" },
};

// ─── Language Context ────────────────────────────────────
const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("erd_lang") || "hi";
    }
    return "hi";
  });

  const changeLang = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem("erd_lang", newLang);
  }, []);

  const t = useCallback((key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// ─── Language Switcher Component ─────────────────────────
const LANGUAGES = [
  { code: "hi", label: "हिं", flag: "🇮🇳", full: "हिंदी" },
  { code: "en", label: "EN", flag: "🇬🇧", full: "English" },
];

export function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useI18n();

  // Simple toggle between hi/en
  const toggle = () => setLang(lang === "hi" ? "en" : "hi");

  if (compact) {
    return (
      <button onClick={toggle}
        title={lang === "hi" ? "Switch to English" : "हिंदी में बदलें"}
        style={{
          background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8,
          padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", color: "#374151", display: "flex", alignItems: "center", gap: 4,
        }}
      >
        {lang === "hi" ? "🇮🇳 हिं" : "🇬🇧 EN"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, gap: 2 }}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.full}
          style={{
            padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            background: lang === l.code ? "#16a34a" : "transparent",
            color: lang === l.code ? "#fff" : "#6b7280",
            transition: "all 0.15s",
          }}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
