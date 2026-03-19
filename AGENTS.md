# ErickshawDekho — Agent Design & Development Standards

Before acting on any UI/UX or frontend query, load this file and follow every rule.
These rules are derived from benchmarks set by **App Store (Apple HIG), Google Material Design 3, Zomato, Ola, Uber**.

---

## 1. Carousel / Horizontal Scroll Rows

| Rule | Rationale |
|------|-----------|
| Use **CSS scroll-snap** (`scroll-snap-type: x mandatory`) — never auto-scroll for product cards | Auto-scroll forces users to chase content. Apple HIG and Material 3 carousels are user-controlled. |
| Cards must be **~74–80% of viewport width** for featured items (`min(74vw, 260px)`) | Shows 1.2–1.3 cards at a time. The right peek is the scroll affordance signal. |
| For smaller item rows (dealers, categories) use **~40–44% width** (`min(42vw, 168px)`) | 2.3 items visible = clear browsability without truncation. |
| Left edge always starts **clean at 16px padding** — never clip the first card | App Store, Google Play, Zomato all start flush. Clipped left cards look broken. |
| The partial right card is the **only** scroll affordance needed — no arrows, no dots for rows | Arrows/dots are for hero/banner carousels only (paginated, full-width). |
| **Never use `mask-image` gradient fades** for edge effects on light backgrounds | `transparent` in gradient shows white/bright background through — creates a glow artifact. Hard clip is clean. |
| Hide scrollbar on all browsers: `scrollbarWidth: none` + `.class::-webkit-scrollbar{display:none}` | Scrollbars on mobile carousels break the visual. |
| `WebkitOverflowScrolling: touch` on scroll container | Required for momentum scrolling on iOS Safari. |

---

## 2. Landing Page Structure

Follow the **Zomato / App Store / Uber Eats** pattern:

```
Hero Section         ← Bold headline, single primary CTA
Category Chips       ← Horizontal scroll (fuel type / location filter)
Featured Carousel    ← scroll-snap row, 1.3 cards visible
Verified Dealers     ← scroll-snap row, 2.3 cards visible
Marketplace CTA      ← Full-width dark card with count + "Browse All →" link
How It Works         ← 3-step explainer
Trust Badges         ← Social proof (verified count, free, etc.)
Footer CTA           ← App install / contact
```

**Never** show the same items twice (e.g. featured in carousel AND in a grid below).
Use a **CTA card** linking to the full catalogue instead of a partial grid preview.

---

## 3. Auth Pages (Login / Register)

Benchmark: **Google Sign-In page, Apple ID sign-in**.

| Rule | Rationale |
|------|-----------|
| Single error location: one banner at the top of the form | Google never shows errors in two places simultaneously. |
| No inline field errors on keystroke — only on submit | Validating while typing is hostile UX (Google's own research). |
| **Shake animation** (`@keyframes shake`) on every failed submission | Visual feedback without a page jump. Used by Apple and Google. |
| Contextual action buttons in error banner (pill-style) | e.g. "Create account →" if email not found, "Forgot password?" if wrong password. |
| Hide "Forgot password?" link when banner already shows a relevant action | Avoid duplicate affordances. |
| Password show/hide toggle (eye icon overlay on input) | Apple HIG and Google Material both require this on password fields. |
| Labels **above** inputs (not placeholder-only) | Material Design 3 standard. Placeholders disappear on focus — inaccessible. |
| `Field` component auto-adds `*` via `required` prop — never put `*` in the label string | Prevents double asterisk (`Email *  *`). |
| Rate-limit (429) must show a distinct message: "Too many attempts, try after some time" | Different from auth failure — user needs to know to wait, not retry. |

---

## 4. Cards

| Rule | Rationale |
|------|-----------|
| Vehicle cards: image height **148px minimum** | Below 120px the image is too small to evaluate the product. |
| Rounded corners: `border-radius: 16px` (RADIUS.xl in this codebase) | Apple HIG standard card radius. |
| Subtle shadow: `0 2px 12px rgba(0,0,0,0.08)` at rest, `0 8px 24px` on hover/press | Indicates elevation, same as Material Design elevation system. |
| Price in **bold, larger font** (17–18px, brand green) | Primary purchase decision factor — must be visually dominant. |
| CTA button spans **full card width** | Maximises tap target on mobile. Apple HIG minimum tap target: 44×44pt. |

---

## 5. Typography

| Context | Rule |
|---------|------|
| Hindi / mixed-script text | Use `TYPO.hindi` font stack (defined in the file) |
| Heading sizes | H1: 28–32px, H2: 22–24px, H3: 18–20px |
| Body / labels | 13–14px |
| Captions / metadata | 11–12px |
| Never use font-size below **11px** | Below 11px is inaccessible (Apple HIG minimum: 11pt) |

---

## 6. Colour & Contrast

- Primary green: `#16a34a` — use for CTAs, active states, prices
- Dark green: `#14532d` / `#15803d` — gradients, headers
- Never put green text on a green background
- Minimum contrast ratio: **4.5:1** for body text (WCAG AA)
- Error states: red `#dc2626`, Warning: amber `#d97706`, Success: green `#16a34a`

---

## 7. PWA Standards

| Rule | Rationale |
|------|-----------|
| `sw.js` and `manifest.json` must be served with `Cache-Control: no-store, no-cache` | Ensures new deploys are always detected. Vercel must have explicit headers. |
| `install.html` must register the SW (`navigator.serviceWorker.register('/sw.js')`) | Without this, first-time visitors from WhatsApp links never receive `beforeinstallprompt`. |
| No `skipWaiting()` on SW install — only on explicit user approval via `SKIP_WAITING` message | Prevents half-loaded pages when user has multiple tabs open. |
| Static assets (`/assets/*`): `Cache-Control: public, max-age=31536000, immutable` | Vite content-hashes assets — safe to cache forever. |

---

## 8. General Principles

1. **Don't duplicate content** — if an item appears in a featured carousel, don't repeat it in a grid section below.
2. **Don't over-engineer** — build the minimum needed. No feature flags, no backwards-compat shims.
3. **One CTA per section** — each section has one primary action. Don't present 3 equal-weight buttons.
4. **Mobile-first** — all layout decisions must work on 360px viewport first. Desktop is an enhancement.
5. **No horizontal overflow** — `body { overflow-x: hidden }` is already set. Don't introduce elements wider than 100vw.
6. **Accessible tap targets** — minimum 44×44px for any interactive element (Apple HIG rule).
