/**
 * AdminPortal.jsx — Platform admin dashboard
 */
import { useState, useEffect, useCallback, useContext } from "react";
import { LIGHT_C, DARK_C, ThemeCtx, useC } from "../theme";
import { api, apiFetch } from "./api";
import { fmtINR, fmtDate, Card, Badge, Btn, Modal, Field, Input, Select, Spinner, Table, Pagination, StatCard } from "./ui";
import { useToast, ToastProvider } from "./contexts";

const ADMIN_NAV = [
  { id: "overview",      label: "Overview",     icon: "📊" },
  { id: "dealers",       label: "Dealers",      icon: "🏪" },
  { id: "users",         label: "Users",        icon: "👥" },
  { id: "applications",  label: "Applications", icon: "📋" },
  { id: "enquiries",     label: "Enquiries",    icon: "💬" },
  { id: "settings",      label: "Settings",     icon: "⚙️" },
];

function AdminSettingsPanel({ toast }) {
  const C = useC();
  const [form, setForm] = useState({ support_name: "", support_phone: "", support_whatsapp: "", support_email: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/platform/settings/`).then(r => r.json()).then(d => { setForm(d); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings(form);
      toast("Settings saved!", "success");
    } catch { toast("Failed to save settings.", "error"); }
    setSaving(false);
  };

  if (!loaded) return <Spinner />;
  return (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: C.text }}>⚙️ Platform Settings</div>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 20 }}>These contact details appear in dealer verification banners and support pages.</div>
        {[
          { key: "support_name",      label: "Support Team Name",    placeholder: "eRickshawDekho Support" },
          { key: "support_email",     label: "Support Email",        placeholder: "support@erikshawdekho.com" },
          { key: "support_phone",     label: "Support Phone",        placeholder: "+91 99999 99999" },
          { key: "support_whatsapp",  label: "WhatsApp Number (with country code, no +)", placeholder: "919999999999" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{f.label}</div>
            <input value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, boxSizing: "border-box" }} />
          </div>
        ))}
        <Btn label={saving ? "Saving..." : "💾 Save Settings"} color={C.primary} disabled={saving} onClick={save} />
      </Card>
    </div>
  );
}

function AdminPortal({ user, onLogout }) {
  const C = useC();
  const { isDark, toggle } = useContext(ThemeCtx);
  const toast = useToast();
  const [page, setPage] = useState("overview");
  const [stats, setStats] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [pg, setPg] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appFilter, setAppFilter] = useState("pending");
  const [resetPwdDealer, setResetPwdDealer] = useState(null);
  const [resetPwdInput, setResetPwdInput] = useState("");
  const [resetPwdResult, setResetPwdResult] = useState(null);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", phone: "", password: "", user_type: "dealer", city: "", state: "" });
  const [createUserLoading, setCreateUserLoading] = useState(false);

  useEffect(() => { api.admin.stats().then(setStats).catch(() => {}); }, []);

  const loadPage = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: pg });
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to", dateTo);
    if (appFilter && page === "applications") p.set("status", appFilter);
    const qs = `?${p}`;
    const calls = {
      dealers:      () => api.admin.dealers(qs).then(d => { setDealers(d.results || []); setTotalPages(d.total_pages || 1); }),
      users:        () => api.admin.users(qs).then(d => { setUsers(d.results || []); setTotalPages(d.total_pages || 1); }),
      applications: () => api.admin.applications(qs).then(d => { setApplications(d.results || []); setTotalPages(d.total_pages || 1); }),
      enquiries:    () => api.admin.enquiries(qs).then(d => { setEnquiries(d.results || []); setTotalPages(d.total_pages || 1); }),
    };
    (calls[page] || (() => Promise.resolve()))().finally(() => setLoading(false));
  }, [page, pg, debouncedSearch, dateFrom, dateTo, appFilter]);

  useEffect(() => { if (page !== "overview") loadPage(); }, [loadPage, page]);

  const verifyDealer = async (id, verified) => {
    await api.admin.verifyDealer(id, { is_verified: verified });
    setDealers(p => p.map(d => d.id === id ? { ...d, is_verified: verified } : d));
    toast(verified ? "Dealer verified!" : "Verification removed.", "success");
  };

  const handleApp = async (id, status) => {
    await api.admin.updateApp(id, { status });
    setApplications(p => p.map(a => a.id === id ? { ...a, status } : a));
    toast(`Application ${status}.`, "success");
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    await api.admin.deleteUser(id);
    setUsers(p => p.filter(u => u.id !== id));
    toast("User deleted.", "success");
  };

  const sidebarStyle = { width: 200, minWidth: 200, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 };

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", color: C.text }}>
      {/* Admin Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${C.danger},#b91c1c)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚙️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Admin Portal</div>
              <div style={{ fontSize: 10, color: C.textDim }}>Super Admin</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {ADMIN_NAV.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setPg(1); setSearch(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: page === n.id ? `${C.danger}15` : "transparent", border: "none", borderRadius: 8, color: page === n.id ? C.danger : C.textMid, fontWeight: page === n.id ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 2, borderLeft: page === n.id ? `3px solid ${C.danger}` : "3px solid transparent" }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={toggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {isDark ? "☀️" : "🌙"} {isDark ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 8, color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
              {ADMIN_NAV.find(n => n.id === page)?.icon} {ADMIN_NAV.find(n => n.id === page)?.label || "Overview"}
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>Logged in as: <b>{user?.username}</b></div>
          </div>
        </div>

        {/* Overview stats */}
        {page === "overview" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
              {[
                ["🏪","Total Dealers",        stats.total_dealers,       C.primary],
                ["✅","Verified Dealers",      stats.verified_dealers,    C.success],
                ["🚗","Active Vehicles",       stats.total_vehicles,      C.info],
                ["👥","Pipeline Leads",        stats.total_leads,         C.warning],
                ["💰","Total Sales",           stats.total_sales,         C.success],
                ["💬","Total Enquiries",       stats.total_enquiries,     C.info],
                ["📋","Pending Applications",  stats.pending_applications,C.danger],
                ["👤","Total Users",           stats.total_users,         C.primary],
              ].map(([icon,label,value,color]) => (
                <StatCard key={label} icon={icon} label={label} value={value ?? "—"} color={color} />
              ))}
            </div>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Platform Revenue</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.success }}>₹{Number(stats.total_revenue || 0).toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Total recorded sales across all dealers</div>
            </Card>
          </div>
        )}

        {/* Dealers */}
        {page === "dealers" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search dealer / phone..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Dealer","City","Plan","Vehicles","Verified","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dealers.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{d.dealer_name}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{d.username} · {d.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>
                          <div>{d.city}</div>
                          {d.state && d.state !== d.city && <div style={{ fontSize: 11, color: C.textDim }}>{d.state}</div>}
                        </td>
                        <td style={{ padding: "12px 14px" }}><Badge label={d.plan_type} color={d.plan_type === "pro" ? C.success : C.warning} /></td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{d.vehicle_count}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {d.is_verified ? <span style={{ color: C.success, fontWeight: 700 }}>✓ Verified</span> : <span style={{ color: C.textDim }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn label={d.is_verified ? "Revoke" : "Verify"} size="sm" color={d.is_verified ? C.danger : C.success} onClick={() => verifyDealer(d.id, !d.is_verified)} />
                            <Btn label="🔑 Reset Pwd" size="sm" outline color={C.warning} onClick={() => setResetPwdDealer(d)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dealers.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No dealers found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Users */}
        {page === "users" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search username / email..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
                <Btn label="+ Create User" size="sm" color={C.primary} onClick={() => setShowCreateUser(true)} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["User","Type","Dealer / Showroom","Joined","Status","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{u.username}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}><Badge label={u.user_type} color={u.user_type === "admin" ? C.danger : u.user_type === "dealer" ? C.primary : C.info} /></td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{u.dealer_name || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{new Date(u.date_joined).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <Badge label={u.is_active ? "Active" : "Inactive"} color={u.is_active ? C.success : C.textDim} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {!u.is_superuser && (
                              <>
                                <button onClick={async () => {
                                  try {
                                    const r = await api.admin.toggleUserActive(u.id);
                                    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: r.is_active } : x));
                                    toast(r.is_active ? "User activated" : "User deactivated", r.is_active ? "success" : "warning");
                                  } catch { toast("Failed to update user", "error"); }
                                }} style={{
                                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                                  background: u.is_active ? `${C.danger}15` : `${C.success}15`,
                                  color: u.is_active ? C.danger : C.success, fontSize: 12, fontWeight: 700, fontFamily: "inherit"
                                }}>
                                  {u.is_active ? "Deactivate" : "Activate"}
                                </button>
                                <Btn label="Delete" size="sm" color={C.danger} onClick={() => deleteUser(u.id)} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No users found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />

            {/* Create User Modal */}
            {showCreateUser && (
              <Modal title="Create New User" onClose={() => setShowCreateUser(false)} width={480}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Full Name"><Input value={createUserForm.name} onChange={v => setCreateUserForm(p => ({ ...p, name: v }))} placeholder="Dealer name" /></Field>
                  <Field label="Email *"><Input value={createUserForm.email} onChange={v => setCreateUserForm(p => ({ ...p, email: v }))} type="email" placeholder="user@email.com" /></Field>
                  <Field label="Phone"><Input value={createUserForm.phone} onChange={v => setCreateUserForm(p => ({ ...p, phone: v }))} placeholder="9876543210" /></Field>
                  <Field label="Password *"><Input value={createUserForm.password} onChange={v => setCreateUserForm(p => ({ ...p, password: v }))} type="password" placeholder="Min 8 chars" /></Field>
                  <Field label="User Type">
                    <Select value={createUserForm.user_type} onChange={v => setCreateUserForm(p => ({ ...p, user_type: v }))}
                      options={[{value:"dealer",label:"Dealer"},{value:"driver",label:"Driver"},{value:"admin",label:"Admin"}]} />
                  </Field>
                  <Field label="City"><Input value={createUserForm.city} onChange={v => setCreateUserForm(p => ({ ...p, city: v }))} placeholder="Delhi" /></Field>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <Btn label="Cancel" outline color={C.textMid} onClick={() => setShowCreateUser(false)} />
                  <Btn label={createUserLoading ? "Creating..." : "Create User"} color={C.primary} disabled={createUserLoading} onClick={async () => {
                    if (!createUserForm.email || !createUserForm.password) { toast("Email and password are required.", "warning"); return; }
                    setCreateUserLoading(true);
                    try {
                      await api.admin.createUser(createUserForm);
                      toast("User created successfully!", "success");
                      setShowCreateUser(false);
                      setCreateUserForm({ name: "", email: "", phone: "", password: "", user_type: "dealer", city: "", state: "" });
                      loadPage();
                    } catch (err) {
                      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to create user.";
                      toast(msg, "error");
                    }
                    setCreateUserLoading(false);
                  }} />
                </div>
              </Modal>
            )}
          </div>
        )}

        {/* Applications */}
        {page === "applications" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search dealer name / email..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                {["","pending","approved","rejected"].map(s => (
                  <button key={s} onClick={() => { setAppFilter(s); setPg(1); }} style={{ padding: "5px 12px", borderRadius: 14, border: `1.5px solid ${appFilter === s ? C.primary : C.border}`, background: appFilter === s ? C.primary : "transparent", color: appFilter === s ? "#fff" : C.textMid, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    {s || "All"}
                  </button>
                ))}
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Dealer","Contact","City","Status","Applied","Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{a.dealer_name}</div>
                          <div style={{ fontSize: 11, color: C.textDim }}>{a.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.contact_name}<br/><span style={{ fontSize: 11 }}>{a.phone}</span></td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{a.city}, {a.state}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={a.status} color={a.status === "approved" ? C.success : a.status === "rejected" ? C.danger : C.warning} /></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{new Date(a.applied_at).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {a.status !== "approved"  && <Btn label="Approve" size="sm" color={C.success} onClick={() => handleApp(a.id, "approved")} />}
                            {a.status !== "rejected"  && <Btn label="Reject"  size="sm" color={C.danger}  onClick={() => handleApp(a.id, "rejected")} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No applications found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Enquiries */}
        {page === "enquiries" && (
          <div>
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} placeholder="Search buyer / phone..."
                  style={{ flex: 1, minWidth: 180, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none" }} />
                <DateFilter from={dateFrom} to={dateTo} onChange={(f,t) => { setDateFrom(f); setDateTo(t); setPg(1); }} />
                <Btn label="↺ Refresh" size="sm" outline onClick={loadPage} />
              </div>
            </Card>
            <Card padding={0}>
              {loading ? <Spinner /> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Buyer","Phone","City","Vehicle","Dealer","Status","Date"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMid, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(e => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{e.customer_name}</td>
                        <td style={{ padding: "12px 14px", color: C.primary }}>{e.phone}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{e.city || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12 }}>{e.vehicle || "General"}</td>
                        <td style={{ padding: "12px 14px", color: C.textMid }}>{e.dealer_name || "—"}</td>
                        <td style={{ padding: "12px 14px" }}><Badge label={e.is_processed ? "Done" : "New"} color={e.is_processed ? C.success : C.warning} /></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: C.textDim }}>{new Date(e.created_at).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                    {enquiries.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.textDim }}>No enquiries found</td></tr>}
                  </tbody>
                </table>
              )}
            </Card>
            <Pagination page={pg} totalPages={totalPages} onPage={setPg} />
          </div>
        )}

        {/* Settings */}
        {page === "settings" && <AdminSettingsPanel toast={toast} />}
      </div>

      {/* ── Admin: Reset Dealer Password Modal ── */}
      {resetPwdDealer && (
        <Modal title={`🔑 Reset Password — ${resetPwdDealer.dealer_name}`} onClose={() => { setResetPwdDealer(null); setResetPwdInput(""); setResetPwdResult(null); }}>
          <div style={{ marginBottom: 14, fontSize: 13, color: C.textMid }}>
            Dealer: <strong>{resetPwdDealer.dealer_name}</strong> &nbsp;|&nbsp; Username: <strong>{resetPwdDealer.username}</strong>
          </div>
          {resetPwdResult ? (
            <div style={{ background: `${C.success}12`, border: `1.5px solid ${C.success}44`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: C.success, marginBottom: 8 }}>✓ Password reset successfully</div>
              <div style={{ fontSize: 13, color: C.textMid, marginBottom: 6 }}>New temporary password:</div>
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 14px", letterSpacing: 2 }}>{resetPwdResult}</div><div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>Share the full password securely with the dealer (not shown here for security).</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>Please share this securely with the dealer. They should change it after logging in.</div>
            </div>
          ) : (
            <>
              <Field label="New Password (leave blank to auto-generate)">
                <Input value={resetPwdInput} onChange={setResetPwdInput} type="password" placeholder="Min 6 characters, or leave blank" />
              </Field>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <Btn label="Cancel" outline color={C.textMid} onClick={() => { setResetPwdDealer(null); setResetPwdInput(""); }} />
                <Btn label={resetPwdLoading ? "Resetting..." : "🔑 Reset Password"} color={C.warning} disabled={resetPwdLoading} onClick={async () => {
                  setResetPwdLoading(true);
                  try {
                    const r = await api.admin.resetDealerPassword(resetPwdDealer.id, { new_password: resetPwdInput });
                    setResetPwdResult(r.temp_password_hint || 'Password reset successfully');
                    toast(`Password reset for ${r.dealer_name}`, "success");
                  } catch { toast("Failed to reset password", "error"); }
                  setResetPwdLoading(false);
                }} />
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}


export default AdminPortal;
