import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const G = "#16a34a";  // brand green
const D = "#1e3a8a";  // brand dark blue

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const active = (path) => loc.pathname === path;

  return (
    <>
      <style>{`
        .nav-link { color: #374151; font-weight: 500; font-size: 14px; padding: 6px 12px; border-radius: 6px; transition: all 0.15s; text-decoration: none; }
        .nav-link:hover, .nav-link.active { color: ${G}; background: ${G}12; }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .mobile-menu { animation: slideDown 0.2s ease; }
      `}</style>

      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/rickshaw.svg" alt="ErikshawDekho" style={{ width: 36, height: 36 }} />
            <div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 17, color: G, lineHeight: 1 }}>ErikshawDekho</div>
              <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1, marginTop: 1 }}>भारत का ई-रिक्शा प्लेटफॉर्म</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
            <Link to="/marketplace" className={`nav-link${active("/marketplace") ? " active" : ""}`}>Marketplace</Link>
            <Link to="/dealers"     className={`nav-link${active("/dealers")     ? " active" : ""}`}>Dealers</Link>
            <a href="https://erikshawdekho.com/dealers/apply" className="nav-link" style={{ color: "#6b7280" }}>List Your Showroom</a>
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/dashboard" style={{
              background: G, color: "#fff", padding: "8px 18px", borderRadius: 8,
              fontWeight: 600, fontSize: 13, textDecoration: "none",
              border: `2px solid ${G}`, transition: "all 0.15s",
            }}>Dealer Login</Link>

            {/* Hamburger (mobile) */}
            <button onClick={() => setOpen(o => !o)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 6 }} className="hamburger">
              <div style={{ width: 22, height: 2, background: "#374151", margin: "4px 0", transition: "all 0.2s", transform: open ? "rotate(45deg) translate(4px,4px)" : "" }} />
              <div style={{ width: 22, height: 2, background: "#374151", margin: "4px 0", opacity: open ? 0 : 1 }} />
              <div style={{ width: 22, height: 2, background: "#374151", margin: "4px 0", transform: open ? "rotate(-45deg) translate(4px,-4px)" : "" }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="mobile-menu" style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 20px 16px" }}>
            <Link to="/marketplace" className="nav-link" style={{ display: "block", padding: "10px 0" }} onClick={() => setOpen(false)}>Marketplace</Link>
            <Link to="/dealers"     className="nav-link" style={{ display: "block", padding: "10px 0" }} onClick={() => setOpen(false)}>Find Dealers</Link>
            <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
            <Link to="/dashboard" style={{ display: "block", background: G, color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 600, textAlign: "center", textDecoration: "none", marginTop: 8 }} onClick={() => setOpen(false)}>Dealer Login</Link>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </>
  );
}
