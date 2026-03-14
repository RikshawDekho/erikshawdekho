/**
 * api.js — API layer for ErikshawDekho dealer portal
 * Centralized fetch with JWT auto-refresh
 */
const API = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "demo" ? "https://demo-api.erikshawdekho.com/api" : import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://api.erikshawdekho.com/api");

async function apiFetch(path, opts = {}, _retry = false) {
  const token = localStorage.getItem("erd_access");
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  if (res.status === 401 && !_retry) {
    const refresh = localStorage.getItem("erd_refresh");
    if (refresh) {
      try {
        const r = await fetch(`${API}/auth/token/refresh/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (r.ok) {
          const d = await r.json();
          localStorage.setItem("erd_access", d.access);
          return apiFetch(path, opts, true);
        }
      } catch (_) { /* fall through to logout */ }
    }
    localStorage.clear();
    window.location.reload();
  }
  if (!res.ok) throw await res.json();
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  login:    (d) => apiFetch("/auth/login/", { method: "POST", body: JSON.stringify(d) }),
  register: (d) => apiFetch("/auth/register/", { method: "POST", body: JSON.stringify(d) }),
  me:       ()  => apiFetch("/auth/me/"),
  dashboard:()  => apiFetch("/dashboard/"),
  marketplace:(p="") => apiFetch(`/marketplace/${p}`),

  vehicles: {
    list:   (p="") => apiFetch(`/vehicles/${p}`),
    get:    (id)   => apiFetch(`/vehicles/${id}/`),
    create: (d)    => apiFetch("/vehicles/", { method: "POST", body: d instanceof FormData ? d : JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/vehicles/${id}/`, { method: "PATCH", body: d instanceof FormData ? d : JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/vehicles/${id}/`, { method: "DELETE" }),
  },
  leads: {
    list:   (p="") => apiFetch(`/leads/${p}`),
    create: (d)    => apiFetch("/leads/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/leads/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/leads/${id}/`, { method: "DELETE" }),
  },
  sales: {
    list:    (p="") => apiFetch(`/sales/${p}`),
    create:  (d)    => apiFetch("/sales/", { method: "POST", body: JSON.stringify(d) }),
    invoice: (id)   => apiFetch(`/sales/${id}/invoice/`),
  },
  customers: {
    list:   (p="") => apiFetch(`/customers/${p}`),
    create: (d)    => apiFetch("/customers/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/customers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  },
  tasks: {
    list:   (p="") => apiFetch(`/tasks/${p}`),
    create: (d)    => apiFetch("/tasks/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/tasks/${id}/`, { method: "DELETE" }),
  },
  finance: {
    loans:      (p="") => apiFetch(`/finance/loans/${p}`),
    create:     (d)    => apiFetch("/finance/loans/", { method: "POST", body: JSON.stringify(d) }),
    emi:        (d)    => apiFetch("/finance/emi-calculator/", { method: "POST", body: JSON.stringify(d) }),
    updateLoan: (id,d) => apiFetch(`/finance/loans/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  },
  reports:  (p="") => apiFetch(`/reports/${p}`),
  brands:   ()     => apiFetch("/brands/"),
  videos: {
    list:   (p="") => apiFetch(`/videos/${p}`),
    create: (d)    => apiFetch("/videos/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/videos/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/videos/${id}/`, { method: "DELETE" }),
  },
  blogs: {
    list:   (p="") => apiFetch(`/blogs/${p}`),
    create: (d)    => apiFetch("/blogs/", { method: "POST", body: JSON.stringify(d) }),
    update: (id,d) => apiFetch(`/blogs/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/blogs/${id}/`, { method: "DELETE" }),
  },
  notifications: {
    getPrefs:    ()  => apiFetch("/notifications/preferences/"),
    updatePrefs: (d) => apiFetch("/notifications/preferences/", { method: "PATCH", body: JSON.stringify(d) }),
    updateFcm:   (d) => apiFetch("/notifications/fcm-token/", { method: "PATCH", body: JSON.stringify(d) }),
  },
  profile: {
    update: (d) => apiFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(d) }),
  },
  enquiry: (d) => apiFetch("/public/enquiry/", { method: "POST", body: JSON.stringify(d) }),
  enquiries: {
    list:          (p="") => apiFetch(`/dealer/enquiries/${p}`),
    markProcessed: (id)   => apiFetch("/dealer/enquiries/", { method: "PATCH", body: JSON.stringify({ id, is_processed: true }) }),
    unreadCount:   ()     => apiFetch("/dealer/enquiries/unread/"),
  },
  admin: {
    stats:              ()         => apiFetch("/admin-portal/stats/"),
    users:              (p="")     => apiFetch(`/admin-portal/users/${p}`),
    deleteUser:         (id)       => apiFetch(`/admin-portal/users/${id}/`, { method: "DELETE" }),
    dealers:            (p="")     => apiFetch(`/admin-portal/dealers/${p}`),
    verifyDealer:       (id,d)     => apiFetch(`/admin-portal/dealers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    resetDealerPassword:(id,d)     => apiFetch(`/admin-portal/dealers/${id}/reset-password/`, { method: "POST", body: JSON.stringify(d) }),
    applications:       (p="")     => apiFetch(`/admin-portal/applications/${p}`),
    updateApp:          (id,d)     => apiFetch(`/admin-portal/applications/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    enquiries:          (p="")     => apiFetch(`/admin-portal/enquiries/${p}`),
    toggleUserActive:   (id)       => apiFetch(`/admin-portal/users/${id}/toggle-active/`, { method: "PATCH" }),
    createUser:         (d)        => apiFetch("/admin-portal/create-user/", { method: "POST", body: JSON.stringify(d) }),
    updateSettings:     (d)        => apiFetch("/admin-portal/settings/", { method: "PATCH", body: JSON.stringify(d) }),
    financers:          (p="")     => apiFetch(`/admin-portal/financers/${p}`),
    verifyFinancer:     (id,d)     => apiFetch(`/admin-portal/financers/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
    financeApps:        (p="")     => apiFetch(`/admin-portal/finance-applications/${p}`),
  },
  auth: {
    forgotPassword:  (d) => apiFetch("/auth/forgot-password/",  { method: "POST", body: JSON.stringify(d) }),
    resetPassword:   (d) => apiFetch("/auth/reset-password/",   { method: "POST", body: JSON.stringify(d) }),
  },
  dealer: {
    plans:           ()       => apiFetch("/plans/"),
    upgradePlan:     (d)      => apiFetch("/dealer/upgrade-plan/", { method: "POST", body: JSON.stringify(d) }),
    apiKeys:         ()       => apiFetch("/dealer/api-keys/"),
    saveApiKey:      (d)      => apiFetch("/dealer/api-keys/", { method: "POST", body: JSON.stringify(d) }),
    deleteApiKey:    (id)     => apiFetch(`/dealer/api-keys/${id}/`, { method: "DELETE" }),
    financers:       ()       => apiFetch("/dealer/financers/"),
    applyFinancer:   (id)     => apiFetch(`/dealer/financers/${id}/apply/`, { method: "POST" }),
    financerReqs:    (id)     => apiFetch(`/dealer/financers/${id}/requirements/`),
    finApps:         ()       => apiFetch("/dealer/finance-applications/"),
    createFinApp:    (d)      => apiFetch("/dealer/finance-applications/", { method: "POST", body: JSON.stringify(d) }),
    finAppDocs:      (id)     => apiFetch(`/dealer/finance-applications/${id}/documents/`),
    uploadFinAppDoc: (id,d)   => apiFetch(`/dealer/finance-applications/${id}/documents/`, { method: "POST", body: d }),
  },
  dealers: {
    detail:  (id) => apiFetch(`/dealers/${id}/`),
    reviews: (id) => apiFetch(`/dealers/${id}/reviews/`),
    review:  (id, d) => apiFetch(`/dealers/${id}/reviews/`, { method: "POST", body: JSON.stringify(d) }),
  },
};


export { apiFetch, api, API };
export default api;
