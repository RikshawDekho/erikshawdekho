/**
 * PageSkeleton — Skeleton loading + deployment-aware error boundary
 * Shows shimmer skeleton during slow loads, graceful message during deployments
 */
import { useState, useEffect } from "react";

const G = "#16a34a";

/* ── Shimmer animation keyframes (injected once) ── */
const SHIMMER_CSS = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton-pulse {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 800px 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}
`;

/* ── Skeleton block (rectangle placeholder) ── */
function SkelBlock({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div
      className="skeleton-pulse"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/* ── Full Page Skeleton (shown while page loads) ── */
export function PageSkeleton({ type = "default" }) {
  return (
    <div style={{ fontFamily: "'Inter','Nunito',sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      <style>{SHIMMER_CSS}</style>

      {/* Navbar skeleton */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SkelBlock width={36} height={36} radius={10} />
          <div>
            <SkelBlock width={120} height={14} style={{ marginBottom: 4 }} />
            <SkelBlock width={80} height={10} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SkelBlock width={70} height={32} radius={10} />
          <SkelBlock width={36} height={32} radius={8} />
        </div>
      </div>

      {/* Hero skeleton */}
      {type === "landing" && (
        <div style={{ background: "linear-gradient(135deg,#1e3a8a,#16a34a)", padding: "60px 24px", textAlign: "center" }}>
          <SkelBlock width={80} height={80} radius={20} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <SkelBlock width={280} height={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <SkelBlock width={220} height={16} style={{ margin: "0 auto", opacity: 0.3 }} />
        </div>
      )}

      {/* Content skeleton */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        {/* Card grid skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e5e7eb" }}>
              <SkelBlock width="100%" height={140} radius={10} style={{ marginBottom: 14 }} />
              <SkelBlock width="70%" height={18} style={{ marginBottom: 8 }} />
              <SkelBlock width="50%" height={14} style={{ marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <SkelBlock width="40%" height={32} radius={8} />
                <SkelBlock width="40%" height={32} radius={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Deployment / Network Error Screen ── */
export function DeploymentScreen({ onRetry }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      fontFamily: "'Inter','Nunito',sans-serif", minHeight: "100vh", background: "#f8fafc",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 64, marginBottom: 20, animation: "spin 2s linear infinite" }}>🛺</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", marginBottom: 8 }}>
        Updating ErikshawDekho{dots}
      </h2>
      <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
        We're deploying a new version. This usually takes a few seconds.
        The page will reload automatically.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onRetry || (() => window.location.reload())}
          style={{
            background: G, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>
          🔄 Retry Now
        </button>
        <button onClick={() => {
          if ("caches" in window) caches.keys().then(names => names.forEach(n => caches.delete(n)));
          window.location.reload();
        }}
          style={{
            background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 10,
            padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit",
          }}>
          Hard Refresh
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
        If this persists, try clearing browser cache or open in incognito mode.
      </p>
    </div>
  );
}

/* ── Inline skeleton for sections within a page ── */
export function SectionSkeleton({ rows = 3, style = {} }) {
  return (
    <div style={{ padding: "16px 0", ...style }}>
      <style>{SHIMMER_CSS}</style>
      {Array.from({ length: rows }, (_, i) => (
        <SkelBlock
          key={i}
          width={`${85 - i * 10}%`}
          height={14}
          style={{ marginBottom: 10 }}
        />
      ))}
    </div>
  );
}

/* ── Card skeleton for grid layouts ── */
export function CardSkeleton({ count = 4 }) {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <SkelBlock width="100%" height={120} radius={10} style={{ marginBottom: 12 }} />
          <SkelBlock width="65%" height={16} style={{ marginBottom: 6 }} />
          <SkelBlock width="45%" height={12} style={{ marginBottom: 10 }} />
          <SkelBlock width="100%" height={36} radius={8} />
        </div>
      ))}
    </>
  );
}

export default PageSkeleton;
