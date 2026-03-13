/**
 * DealerPortalPage — Thin wrapper that renders the existing dealer SaaS portal
 * Skips internal landing page, directs to auth/dashboard immediately.
 */
import App from "../App";

export default function DealerPortalPage() {
  return <App skipLanding />;
}
