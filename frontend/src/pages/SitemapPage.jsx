import React from 'react'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    heading: 'ड्राइवर / खरीदार',
    headingEn: 'Driver / Buyer',
    links: [
      { to: '/',                    label: 'होमपेज',             labelEn: 'Homepage',                  desc: 'भारत का सबसे भरोसेमंद ई-रिक्शा प्लेटफॉर्म' },
      { to: '/driver',              label: 'ड्राइवर होम',         labelEn: 'Driver Home',               desc: 'ई-रिक्शा खरीदने का शुरुआती बिंदु' },
      { to: '/driver/marketplace',  label: 'Marketplace',        labelEn: 'E-Rickshaw Marketplace',    desc: 'New & used e-rickshaws from verified dealers across India' },
      { to: '/driver/dealers',      label: 'Dealers',            labelEn: 'Verified Dealer Directory', desc: 'Find trusted dealers near you by city' },
      { to: '/driver/learn',        label: 'सीखें / Learn',      labelEn: 'Buying Guide & Learn Hub',  desc: 'Battery, EMI, subsidy, maintenance tips' },
    ],
  },
  {
    heading: 'पोर्टल',
    headingEn: 'Portals',
    links: [
      { to: '/dealer',   label: 'Dealer Portal',   labelEn: 'Dealer Portal',   desc: 'Manage inventory, leads & invoices — login required' },
      { to: '/financer', label: 'Financer Portal',  labelEn: 'Financer Portal', desc: 'Finance applications & NBFC management — login required' },
    ],
  },
  {
    heading: 'अन्य',
    headingEn: 'Other',
    links: [
      { to: '/welcome',      label: 'Welcome',         labelEn: 'Role Selector',   desc: 'Choose your role: Driver, Dealer, or Financer' },
      { to: '/install.html', label: 'App Install',     labelEn: 'Install PWA App', desc: 'Install ErikshawDekho on your phone — no app store needed', external: true },
    ],
  },
]

export default function SitemapPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Nunito','Segoe UI',sans-serif" }}>

      {/* Header */}
      <header style={{ background: '#16a34a', color: '#fff', padding: '32px 24px 28px', textAlign: 'center' }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}>
          ← ErikshawDekho
        </Link>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, margin: '0 0 8px' }}>
          Site Map — सभी पेज
        </h1>
        <p style={{ fontSize: 15, opacity: 0.85, margin: 0 }}>
          ErikshawDekho के सभी public pages की सूची
        </p>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px 64px' }}>

        {SECTIONS.map(sec => (
          <section key={sec.headingEn} style={{ marginBottom: 40 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: '#1e293b',
              borderBottom: '2px solid #16a34a', paddingBottom: 8, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {sec.heading}
              <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/ {sec.headingEn}</span>
            </h2>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sec.links.map(link => (
                <li key={link.to} style={{
                  background: '#fff', borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '14px 20px',
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  transition: 'box-shadow 0.15s',
                }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, background: '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0, marginTop: 2,
                  }}>
                    🔗
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      {link.external ? (
                        <a href={link.to} style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', textDecoration: 'none' }}>
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.to} style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', textDecoration: 'none' }}>
                          {link.label}
                        </Link>
                      )}
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{link.labelEn}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
                      {link.desc}
                    </p>
                    <code style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                      erikshawdekho.com{link.to}
                    </code>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* XML Sitemap link */}
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
          marginTop: 8,
        }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#166534', margin: '0 0 2px' }}>
              XML Sitemap (Search Engines)
            </p>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#16a34a', textDecoration: 'underline' }}
            >
              /sitemap.xml
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 20px', borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#94a3b8' }}>
        © {new Date().getFullYear()} ErikshawDekho · सभी अधिकार सुरक्षित
      </footer>
    </div>
  )
}
