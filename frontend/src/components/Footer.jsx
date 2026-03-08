import { Link } from "react-router-dom";

const G = "#16a34a";

export default function Footer() {
  return (
    <footer style={{ background: "#111827", color: "#d1d5db", marginTop: "auto" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>

        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <img src="/rickshaw.svg" alt="ErikshawDekho" style={{ width: 32, height: 32 }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: G }}>ErikshawDekho</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#9ca3af" }}>
            भारत का सबसे भरोसेमंद ई-रिक्शा प्लेटफॉर्म। Compare करें और best price पाएँ।
          </p>
          <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>Made with ❤️ in India 🇮🇳</div>
        </div>

        {/* Buyers */}
        <div>
          <div style={{ fontWeight: 700, color: "#f9fafb", marginBottom: 14, fontSize: 14 }}>Buyers / Drivers</div>
          {[["Browse Rickshaws", "/marketplace"], ["Find Dealers", "/dealers"], ["EMI Calculator", "/marketplace"]].map(([label, href]) => (
            <Link key={label} to={href} style={{ display: "block", color: "#9ca3af", fontSize: 13, marginBottom: 8, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = G}
              onMouseLeave={e => e.target.style.color = "#9ca3af"}>
              {label}
            </Link>
          ))}
        </div>

        {/* Dealers */}
        <div>
          <div style={{ fontWeight: 700, color: "#f9fafb", marginBottom: 14, fontSize: 14 }}>For Dealers</div>
          {[["Dealer Login", "/dashboard"], ["Register Showroom", "/dealers"], ["Manage Inventory", "/dashboard"]].map(([label, href]) => (
            <Link key={label} to={href} style={{ display: "block", color: "#9ca3af", fontSize: 13, marginBottom: 8, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = G}
              onMouseLeave={e => e.target.style.color = "#9ca3af"}>
              {label}
            </Link>
          ))}
        </div>

        {/* Contact */}
        <div>
          <div style={{ fontWeight: 700, color: "#f9fafb", marginBottom: 14, fontSize: 14 }}>Contact Us</div>
          <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 2 }}>
            <div>📧 support@erikshawdekho.com</div>
            <div>📱 WhatsApp: +91-XXXXXXXXXX</div>
            <div>🕐 Mon–Sat, 9 AM – 7 PM IST</div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1f2937", padding: "16px 24px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>
        © {new Date().getFullYear()} ErikshawDekho. All rights reserved. | Designed for Bharat 🇮🇳
      </div>
    </footer>
  );
}
