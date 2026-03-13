import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import RoleLandingPage from './pages/RoleLandingPage.jsx'
import HomePage from './pages/HomePage.jsx'
import MarketplacePage from './pages/MarketplacePage.jsx'
import DealerDirectoryPage from './pages/DealerDirectoryPage.jsx'
import FinancerPage from './pages/FinancerPage.jsx'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Entry: Role selection page — first screen at erikshawdekho.com */}
        <Route path="/"            element={<RoleLandingPage />} />

        {/* Public: driver/buyer journey */}
        <Route path="/home"        element={<HomePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/dealers"     element={<DealerDirectoryPage />} />
        <Route path="/financer"    element={<FinancerPage />} />

        {/* Dealer SaaS dashboard – handles its own auth internally */}
        <Route path="/dashboard"   element={<App />} />
        <Route path="/login"       element={<App />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
