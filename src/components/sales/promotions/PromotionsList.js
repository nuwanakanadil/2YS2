"use client";

import React, { useEffect, useState } from "react";
import { EditIcon, TrashIcon, PauseIcon, PlayIcon, ChevronRightIcon, XIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";

const badge = (status) => {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "scheduled") return "bg-yellow-100 text-yellow-800";
  if (status === "paused") return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800"; // ended or other
};

function Modal({ open, onClose, title, children, widthClass = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${widthClass} mx-4 bg-white rounded-lg shadow-lg`}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function PromotionsList() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(""); // all
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modals
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    discountType: "percentage",
    discountValue: "",
    target: "all",
    minPurchase: "",
    maxRedemptions: "",
    termsConditions: "",
    status: "scheduled",
  });

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams({ page, limit, status });
      const res = await fetch(`${API_BASE}/api/promotions?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json.items || []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error("promotions list error:", e);
      setErr("Failed to load promotions");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

   const mutate = async (id, action) => {
      try {
        // primary attempt
        let res = await fetch(`${API_BASE}/api/promotions/${id}/${action}`, {
          method: "POST",
          credentials: "include",
        });

        // allow paused->resume to fallback to publish if your API uses /publish
        if (!res.ok && action === "resume") {
          res = await fetch(`${API_BASE}/api/promotions/${id}/publish`, {
            method: "POST",
            credentials: "include",
          });
        }

        if (!res.ok) throw new Error(await res.text());
        await load();
      } catch (e) {
        alert(`Failed to ${action}: ${e.message}`);
      }
    };

  const removeOne = async (id) => {
    if (!confirm("Delete this promotion?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  // ----- Details modal -----
  const openDetails = async (promo) => {
    try {
      // If you want fresh data:
      const res = await fetch(`${API_BASE}/api/promotions/${promo._id}`, { credentials: "include" });
      const json = res.ok ? await res.json() : promo;
      setDetails(json);
      setShowDetails(true);
    } catch {
      setDetails(promo);
      setShowDetails(true);
    }
  };

  // ----- Edit modal -----
  const openEdit = async (promo) => {
    let data = promo;
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${promo._id}`, { credentials: "include" });
      if (res.ok) data = await res.json();
    } catch {}
    setEditId(data._id);
    setEditForm({
      name: data.name || "",
      description: data.description || "",
      startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 10) : "",
      endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 10) : "",
      discountType: data.discountType || "percentage",
      discountValue: data.discountValue ?? "",
      target: data.target || "all",
      minPurchase: data.minPurchase ?? "",
      maxRedemptions: data.maxRedemptions ?? "",
      termsConditions: data.termsConditions || "",
      status: data.status || "scheduled",
    });
    setShowEdit(true);
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((s) => ({ ...s, [name]: value }));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    // basic validation
    if (!editForm.name?.trim()) return alert("Name is required");
    if (!editForm.startDate || !editForm.endDate) return alert("Start and End dates are required");

    const payload = {
      ...editForm,
      discountValue: editForm.discountValue === "" ? undefined : Number(editForm.discountValue),
      minPurchase: editForm.minPurchase === "" ? undefined : Number(editForm.minPurchase),
      maxRedemptions: editForm.maxRedemptions === "" ? undefined : Number(editForm.maxRedemptions),
    };

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${editId}`, {
        method: "PUT", // adjust to PATCH if your API expects it
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Update failed");
      }
      setShowEdit(false);
      await load();
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
        <span className="text-sm text-gray-600">Status filter:</span>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="paused">Paused</option>
          <option value="ended">Ended</option>
        </select>
        <div className="ml-auto text-sm text-gray-500">
          Page {page} • Total {total}
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : err ? (
          <div className="p-6 text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-gray-500">No promotions found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Status", "Date Range", "Target", "Performance", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      h === "Actions" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((promo) => (
                <tr key={promo._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{promo.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${badge(promo.status)}`}>
                      {promo.status?.[0]?.toUpperCase() + promo.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{promo.target || "All customers"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{promo.redemptions || 0} redemptions</div>
                    <div className="text-sm text-gray-500">{promo.views || 0} views</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {promo.status === "active" && (
                        <button className="p-1 text-yellow-600 hover:text-yellow-900" onClick={() => mutate(promo._id, "pause")}>
                          <PauseIcon size={18} />
                        </button>
                      )}
                      {promo.status === "scheduled" && (
                        <button className="p-1 text-green-600 hover:text-green-900" onClick={() => mutate(promo._id, "publish")}>
                          <PlayIcon size={18} />
                        </button>
                      )}
                      {promo.status === "paused" && (
                        <button
                          className="p-1 text-green-600 hover:text-green-900"
                          onClick={() => mutate(promo._id, "resume")}
                          title="Resume promotion">
                          <PlayIcon size={18} />
                        </button>
                    )}
                      <button className="p-1 text-blue-600 hover:text-blue-900" onClick={() => openEdit(promo)}>
                        <EditIcon size={18} />
                      </button>
                      <button className="p-1 text-red-600 hover:text-red-900" onClick={() => removeOne(promo._id)}>
                        <TrashIcon size={18} />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-gray-900" onClick={() => openDetails(promo)}>
                        <ChevronRightIcon size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* simple pager */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
        <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage((p) => p + 1)} disabled={rows.length < limit}>
          Next
        </button>
      </div>

      {/* DETAILS MODAL */}
      <Modal open={showDetails} onClose={() => setShowDetails(false)} title="Promotion Details" widthClass="max-w-3xl">
        {!details ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Name</div>
              <div className="font-medium text-gray-900">{details.name}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div className="font-medium">{details.status}</div>
            </div>
            <div>
              <div className="text-gray-500">Date Range</div>
              <div className="font-medium">
                {formatDate(details.startDate)} — {formatDate(details.endDate)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Target</div>
              <div className="font-medium">{details.target || "All customers"}</div>
            </div>
            <div>
              <div className="text-gray-500">Discount</div>
              <div className="font-medium">
                {details.discountType} {details.discountValue != null ? `• ${details.discountValue}` : ""}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Limits</div>
              <div className="font-medium">
                Min purchase: {details.minPurchase ?? "-"} | Max redemptions: {details.maxRedemptions ?? "-"}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-gray-500">Description</div>
              <div className="font-medium whitespace-pre-wrap">{details.description || "-"}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-gray-500">Terms & Conditions</div>
              <div className="font-medium whitespace-pre-wrap">{details.termsConditions || "-"}</div>
            </div>
            <div>
              <div className="text-gray-500">Engagement</div>
              <div className="font-medium">
                {details.redemptions || 0} redemptions • {details.views || 0} views
              </div>
            </div>
            <div>
              <div className="text-gray-500">Created / Updated</div>
              <div className="font-medium">
                {formatDate(details.createdAt)} • {formatDate(details.updatedAt)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Promotion">
        <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Name*</label>
            <input
              name="name"
              value={editForm.name}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={editForm.description}
              onChange={onEditChange}
              rows={3}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date*</label>
            <input
              type="date"
              name="startDate"
              value={editForm.startDate}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date*</label>
            <input
              type="date"
              name="endDate"
              value={editForm.endDate}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Discount Type*</label>
            <select
              name="discountType"
              value={editForm.discountType}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
              <option value="bogo">Buy One Get One</option>
              <option value="free">Free Item</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Discount Value</label>
            <input
              type="number"
              step="0.01"
              name="discountValue"
              value={editForm.discountValue}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target</label>
            <select name="target" value={editForm.target} onChange={onEditChange} className="w-full border rounded px-3 py-2">
              <option value="all">All customers</option>
              <option value="new">New customers</option>
              <option value="loyalty">Loyalty members</option>
              <option value="students">Students</option>
              <option value="seniors">Seniors</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Purchase</label>
            <input
              type="number"
              step="0.01"
              name="minPurchase"
              value={editForm.minPurchase}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Redemptions</label>
            <input
              type="number"
              name="maxRedemptions"
              value={editForm.maxRedemptions}
              onChange={onEditChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
            <textarea
              name="termsConditions"
              value={editForm.termsConditions}
              onChange={onEditChange}
              rows={3}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select name="status" value={editForm.status} onChange={onEditChange} className="w-full border rounded px-3 py-2">
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
