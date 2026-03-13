/**
 * Inventory.jsx — Vehicle inventory management + PlanListingBanner
 */
import { useState, useEffect, useCallback } from "react";
import { useC } from "../theme";
import { api } from "./api";
import { fmtINR, fmtDate, Card, Badge, Btn, Modal, Field, Input, Select, Spinner, Table, Pagination, STOCK_COLOR, FUEL_COLOR } from "./ui";
import { useToast, usePlan } from "./contexts";

function PlanListingBanner() {
  const C = useC();
  const [count, setCount] = useState(null);

  useEffect(() => {
    api.dashboard().then(d => {
      if (d.plan?.listing_limit !== undefined) {
        setCount({ limit: d.plan.listing_limit, current: d.plan.listing_count || 0 });
      }
    }).catch(() => {});
  }, []);

  if (!count || count.limit === 0) return null; // unlimited or no data

  const atLimit = count.current >= count.limit;
  const pct = Math.min(100, (count.current / count.limit) * 100);

  return (
    <div style={{
      margin: "0 24px 16px", padding: "12px 18px", borderRadius: 10,
      background: atLimit ? `${C.danger}10` : `${C.primary}08`,
      border: `1.5px solid ${atLimit ? C.danger : C.primary}33`,
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: atLimit ? C.danger : C.text, marginBottom: 6 }}>
          {atLimit ? "⚠️ Listing Limit Reached" : "📦 Vehicle Listings"}: {count.current} / {count.limit}
        </div>
        <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: atLimit ? C.danger : C.primary, borderRadius: 4, transition: "width 0.5s" }} />
        </div>
        {atLimit && (
          <div style={{ fontSize: 12, color: C.danger, marginTop: 6 }}>
            You have reached the Free Plan limit of {count.limit} listings. Upgrade for unlimited listings.
          </div>
        )}
      </div>
      {atLimit && (
        <Btn label="⭐ Upgrade Plan" color={C.primary} size="sm" onClick={() => {}} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INVENTORY PAGE
// ═══════════════════════════════════════════════════════
function Inventory({ showAdd, onAddClose, onNavigate }) {
  const C = useC();
  const toast = useToast();
  const plan = usePlan();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, inStock: 0, sold: 0, lowStock: 0 });
  const [filters, setFilters] = useState({ brand: "", fuel_type: "", stock_status: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState({ brand_id: "", model_name: "", fuel_type: "electric", vehicle_type: "passenger", price: "", stock_quantity: "", year: 2024, description: "", thumbnail: null });
  const [saving, setSaving] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const debouncedSearch = useDebounce(filters.search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const effectiveFilters = { ...filters, search: debouncedSearch };
    const params = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(effectiveFilters).filter(([, v]) => v)) });
    try {
      const data = await api.vehicles.list(`?${params}`);
      setVehicles(data.results || data);
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / 10));
    } catch (err) {
      console.error("Failed to load vehicles:", err);
      setError("Failed to load vehicles. Please try again.");
    } finally { setLoading(false); }
  }, [page, debouncedSearch, filters.brand, filters.fuel_type, filters.stock_status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([api.brands().catch(() => null), api.dashboard().catch(() => null)])
      .then(([brandsData, dashData]) => {
        if (brandsData) setBrands(brandsData.results || brandsData);
        if (dashData) setStats({ total: dashData.total_vehicles, inStock: dashData.in_stock, sold: 0, lowStock: 0 });
      });
  }, []);

  const setF = k => v => setFilters(p => ({ ...p, [k]: v }));
  const setForm_ = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.brand_id) { toast("Please select a brand.", "warning"); return; }
    if (!form.model_name.trim()) { toast("Model name is required.", "warning"); return; }
    if (!form.price) { toast("Price is required.", "warning"); return; }
    setSaving(true);
    try {
      let payload;
      if (form.thumbnail) {
        payload = new FormData();
        payload.append("brand", form.brand_id);
        payload.append("model_name", form.model_name);
        payload.append("fuel_type", form.fuel_type);
        payload.append("vehicle_type", form.vehicle_type);
        payload.append("price", form.price);
        // Default stock_quantity to 1 so vehicle appears in marketplace
        payload.append("stock_quantity", form.stock_quantity || 1);
        payload.append("year", form.year);
        if (form.description) payload.append("description", form.description);
        payload.append("thumbnail", form.thumbnail);
      } else {
        const { thumbnail, brand_id, ...rest } = form;
        payload = { ...rest, brand: brand_id, stock_quantity: form.stock_quantity || 1 };
      }
      await api.vehicles.create(payload);
      toast("Vehicle added successfully!", "success");
      onAddClose(); load();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to add vehicle.";
      toast(msg, "error");
    }
    setSaving(false);
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setEditForm({ model_name: v.model_name, fuel_type: v.fuel_type, vehicle_type: v.vehicle_type || "passenger", price: v.price, stock_quantity: v.stock_quantity, year: v.year, description: v.description || "", thumbnail: null });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.model_name.trim()) { toast("Model name is required.", "warning"); return; }
    if (!editForm.price) { toast("Price is required.", "warning"); return; }
    setEditSaving(true);
    try {
      let payload;
      if (editForm.thumbnail) {
        payload = new FormData();
        payload.append("model_name", editForm.model_name);
        payload.append("fuel_type", editForm.fuel_type);
        payload.append("vehicle_type", editForm.vehicle_type);
        payload.append("price", editForm.price);
        if (editForm.stock_quantity) payload.append("stock_quantity", editForm.stock_quantity);
        payload.append("year", editForm.year);
        if (editForm.description) payload.append("description", editForm.description);
        payload.append("thumbnail", editForm.thumbnail);
      } else {
        const { thumbnail, ...rest } = editForm;
        payload = rest;
      }
      await api.vehicles.update(editVehicle.id, payload);
      toast("Vehicle updated successfully!", "success");
      setEditVehicle(null); load();
    } catch (err) {
      const msg = typeof err === "object" ? Object.values(err).flat().join(" ") : "Failed to update vehicle.";
      toast(msg, "error");
    }
    setEditSaving(false);
  };

  const confirmDelete = async () => {
    try {
      await api.vehicles.delete(deleteId);
      toast("Vehicle removed from inventory.", "success");
      setDeleteId(null); load();
    } catch {
      toast("Failed to delete vehicle.", "error");
    }
  };

  const cols = [
    { label: "ID",       render: r => <span style={{ color: C.textDim, fontSize: 12 }}>{r.id}</span> },
    { label: "Thumbnail",render: r => (r.thumbnail || r.thumbnail_url)
        ? <img src={r.thumbnail || r.thumbnail_url} alt={r.model_name} style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
        : <div style={{ width: 56, height: 40, background: `${C.primary}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛺</div> },
    { label: "Model",    render: r => <div><div style={{ fontWeight: 600 }}>{r.model_name}</div><div style={{ fontSize: 11, color: C.textDim }}>{r.brand_name}</div></div> },
    { label: "Brand",    key:    "brand_name" },
    { label: "Fuel",     render: r => <Badge label={r.fuel_type} color={FUEL_COLOR[r.fuel_type]} /> },
    { label: "Price",    render: r => <span style={{ fontWeight: 600 }}>{fmtINR(r.price)}</span> },
    { label: "Stock",    render: r => <span style={{ fontWeight: 700, color: STOCK_COLOR[r.stock_status] }}>{r.stock_quantity}</span> },
    { label: "Status",   render: r => <Badge label={r.stock_status.replace("_", " ")} color={STOCK_COLOR[r.stock_status]} /> },
    { label: "Actions",  render: r => (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Btn label="View"   size="sm" outline color={C.info}    onClick={() => setViewVehicle(r)} />
        <Btn label="Edit"   size="sm" outline color={C.primary} onClick={() => openEdit(r)} />
        <Btn label="Delete" size="sm" outline color={C.danger}  onClick={() => setDeleteId(r.id)} />
      </div>
    )},
  ];

  return (
    <div style={{ padding: 24 }}>
      {loading && <Spinner />}
      {error && (
        <div style={{ padding: 24, textAlign: "center", color: C.error || "#ef4444", background: `${C.error || "#ef4444"}15`, borderRadius: 10, marginBottom: 20 }}>
          <p>{error}</p>
          <button onClick={load} style={{ marginTop: 16, padding: "8px 16px", background: C.primary, color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          <PlanListingBanner />
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Vehicles", value: stats.total, color: C.info    },
          { label: "In Stock",       value: stats.inStock,color: C.success },
          { label: "Sold",           value: 27,           color: C.accent  },
          { label: "Low Stock",      value: 5,            color: C.danger  },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 18px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Georgia, serif" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMid }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card padding={14} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={filters.brand} onChange={setF("brand")} placeholder="Filter by Brand"
            options={brands.map(b => ({ value: b.name, label: b.name }))} style={{ width: 160 }} />
          <Select value={filters.fuel_type} onChange={setF("fuel_type")} placeholder="Filter by Fuel"
            options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"}]} style={{ width: 160 }} />
          <Select value={filters.stock_status} onChange={setF("stock_status")} placeholder="Stock Status"
            options={[{value:"in_stock",label:"In Stock"},{value:"low_stock",label:"Low Stock"},{value:"out_of_stock",label:"Out of Stock"}]} style={{ width: 160 }} />
          <Input value={filters.search} onChange={setF("search")} placeholder="Search by Model or Brand..." style={{ width: 200 }} />
          <Btn label="Clear" size="sm" outline color={C.textMid} onClick={() => setFilters({ brand:"", fuel_type:"", stock_status:"", search:"" })} />
        </div>
      </Card>

      {/* Table */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15 }}>Inventory</div>
        {loading ? <Spinner /> : <Table cols={cols} rows={vehicles} />}
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </Card>

      {/* Add Vehicle Modal */}
      {showAdd && (
        <Modal title="Add New Vehicle" onClose={onAddClose} width={580}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Brand" required>
                <select value={form.brand_id} onChange={e => { if (e.target.value === "__new__") { setShowAddBrand(true); } else { setForm_("brand_id")(e.target.value); } }}
                  style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", color: C.text, background: C.surface, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="">Select brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value="__new__">+ Add New Brand...</option>
                </select>
              </Field>
              <Field label="Model Name" required><Input value={form.model_name} onChange={setForm_("model_name")} placeholder="e.g. YatriKing Pro" /></Field>
              <Field label="Vehicle Type" required>
                <Select value={form.vehicle_type} onChange={setForm_("vehicle_type")} options={[{value:"passenger",label:"Passenger Rickshaw"},{value:"cargo",label:"Cargo Loader"},{value:"auto",label:"Auto Rickshaw"}]} />
              </Field>
              <Field label="Fuel Type" required>
                <Select value={form.fuel_type} onChange={setForm_("fuel_type")} options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"},{value:"diesel",label:"Diesel"}]} />
              </Field>
              <Field label="Price (₹)" required><Input value={form.price} onChange={setForm_("price")} type="number" placeholder="150000" /></Field>
              <Field label="Stock Quantity"><Input value={form.stock_quantity} onChange={setForm_("stock_quantity")} type="number" placeholder="10" /></Field>
              <Field label="Year"><Input value={form.year} onChange={setForm_("year")} type="number" placeholder="2024" /></Field>
            </div>
            <Field label="Vehicle Photo (optional)" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="file" accept="image/*" onChange={e => setForm_("thumbnail")(e.target.files[0] || null)}
                  style={{ flex: 1, fontSize: 13, cursor: "pointer", padding: "8px 0" }} />
                {form.thumbnail && (
                  <img src={URL.createObjectURL(form.thumbnail)} alt="preview"
                    style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                )}
              </div>
            </Field>
            <Field label="Description"><textarea value={form.description} onChange={e => setForm_("description")(e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }} placeholder="Vehicle description, key specs..." /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={onAddClose} />
              <Btn label={saving ? "Saving..." : "Add Vehicle"} color={C.primary} type="submit" disabled={saving} />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Vehicle Modal */}
      {editVehicle && (
        <Modal title={`Edit — ${editVehicle.brand_name} ${editVehicle.model_name}`} onClose={() => setEditVehicle(null)} width={580}>
          <form onSubmit={saveEdit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Model Name" required>
                <Input value={editForm.model_name} onChange={v => setEditForm(p => ({ ...p, model_name: v }))} />
              </Field>
              <Field label="Vehicle Type">
                <Select value={editForm.vehicle_type} onChange={v => setEditForm(p => ({ ...p, vehicle_type: v }))}
                  options={[{value:"passenger",label:"Passenger Rickshaw"},{value:"cargo",label:"Cargo Loader"},{value:"auto",label:"Auto Rickshaw"}]} />
              </Field>
              <Field label="Fuel Type">
                <Select value={editForm.fuel_type} onChange={v => setEditForm(p => ({ ...p, fuel_type: v }))}
                  options={[{value:"electric",label:"Electric"},{value:"petrol",label:"Petrol"},{value:"cng",label:"CNG"},{value:"lpg",label:"LPG"},{value:"diesel",label:"Diesel"}]} />
              </Field>
              <Field label="Price (₹)" required>
                <Input value={editForm.price} onChange={v => setEditForm(p => ({ ...p, price: v }))} type="number" />
              </Field>
              <Field label="Stock Quantity">
                <Input value={editForm.stock_quantity} onChange={v => setEditForm(p => ({ ...p, stock_quantity: v }))} type="number" />
              </Field>
              <Field label="Year">
                <Input value={editForm.year} onChange={v => setEditForm(p => ({ ...p, year: v }))} type="number" />
              </Field>
            </div>
            <Field label="Update Photo (optional)" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {editVehicle.thumbnail && !editForm.thumbnail && (
                  <img src={editVehicle.thumbnail} alt="current"
                    style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                )}
                <input type="file" accept="image/*" onChange={e => setEditForm(p => ({ ...p, thumbnail: e.target.files[0] || null }))}
                  style={{ flex: 1, fontSize: 13, cursor: "pointer", padding: "8px 0" }} />
                {editForm.thumbnail && (
                  <img src={URL.createObjectURL(editForm.thumbnail)} alt="new preview"
                    style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: `2px solid ${C.primary}` }} />
                )}
              </div>
            </Field>
            <Field label="Description">
              <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3}
                style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: C.text, background: C.surface }} placeholder="Vehicle description..." />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn label="Cancel" outline color={C.textMid} onClick={() => setEditVehicle(null)} />
              <Btn label={editSaving ? "Saving..." : "Save Changes"} color={C.primary} type="submit" disabled={editSaving} />
            </div>
          </form>
        </Modal>
      )}

      {/* View Vehicle Modal */}
      {viewVehicle && (
        <Modal title={`${viewVehicle.brand_name} ${viewVehicle.model_name}`} onClose={() => setViewVehicle(null)} width={500}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Brand",       viewVehicle.brand_name],
              ["Model",       viewVehicle.model_name],
              ["Fuel Type",   viewVehicle.fuel_type],
              ["Price",       `₹${Number(viewVehicle.price).toLocaleString("en-IN")}`],
              ["Stock",       viewVehicle.stock_quantity],
              ["Status",      viewVehicle.stock_status?.replace("_"," ")],
              ["Year",        viewVehicle.year],
              ["Type",        viewVehicle.vehicle_type],
            ].map(([label, val]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label.toUpperCase()}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{val || "—"}</div>
              </div>
            ))}
          </div>
          {viewVehicle.description && (
            <div style={{ marginTop: 14, background: C.bg, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>DESCRIPTION</div>
              <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{viewVehicle.description}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn label="Edit Vehicle" color={C.primary} onClick={() => { setViewVehicle(null); openEdit(viewVehicle); }} />
            <Btn label="Close" outline color={C.textMid} onClick={() => setViewVehicle(null)} />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)} width={400}>
          <div style={{ fontSize: 14, color: C.text, marginBottom: 20 }}>
            Are you sure you want to remove this vehicle from inventory? This action marks it as inactive and cannot be undone easily.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn label="Cancel" outline color={C.textMid} onClick={() => setDeleteId(null)} />
            <Btn label="Yes, Delete" color={C.danger} onClick={confirmDelete} />
          </div>
        </Modal>
      )}

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.surface, borderRadius: 12, padding: 24, maxWidth: 320, width: "100%", margin: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Add New Brand</div>
            <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Brand name" autoFocus
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: C.bg, color: C.text, marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAddBrand(false); setNewBrandName(""); }} style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={async () => {
                if (!newBrandName.trim()) return;
                try {
                  const r = await apiFetch("/brands/", { method: "POST", body: JSON.stringify({ name: newBrandName.trim() }) });
                  setBrands(prev => [...prev, r]);
                  setForm(f => ({ ...f, brand_id: r.id }));
                  setShowAddBrand(false); setNewBrandName("");
                } catch { alert("Failed to create brand. Try again."); }
              }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create</button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}


export { PlanListingBanner };
export default Inventory;
