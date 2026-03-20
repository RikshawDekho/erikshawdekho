import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: "'Nunito','Segoe UI',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', textAlign: 'center',
    }}>

      {/* Illustration */}
      <div style={{ fontSize: 80, marginBottom: 16, lineHeight: 1 }}>🛺</div>

      {/* 404 badge */}
      <div style={{
        background: '#fef2f2', color: '#dc2626', fontWeight: 800,
        fontSize: 72, letterSpacing: '-3px', lineHeight: 1,
        marginBottom: 16,
      }}>
        404
      </div>

      <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#1e293b', margin: '0 0 10px' }}>
        पेज नहीं मिला
      </h1>
      <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 32px', maxWidth: 380, lineHeight: 1.6 }}>
        यह पेज exist नहीं करता या हटा दिया गया है।<br />
        <span style={{ fontSize: 13 }}>The page you're looking for doesn't exist or has been moved.</span>
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '12px 24px', borderRadius: 10, border: '2px solid #e2e8f0',
            background: '#fff', color: '#1e293b', fontWeight: 700, fontSize: 15,
            cursor: 'pointer',
          }}
        >
          ← वापस जाएँ
        </button>
        <Link to="/" style={{
          padding: '12px 24px', borderRadius: 10, background: '#16a34a',
          color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none',
        }}>
          होमपेज पर जाएँ
        </Link>
      </div>

      {/* Quick links */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Popular Pages
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { to: '/driver/marketplace', label: '🛺 Marketplace' },
            { to: '/driver/dealers',     label: '🏪 Dealers' },
            { to: '/driver/learn',       label: '📚 Buying Guide' },
            { to: '/sitemap',            label: '🗺️ Sitemap' },
          ].map(l => (
            <Link key={l.to} to={l.to} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#374151',
              textDecoration: 'none', textAlign: 'left',
            }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
