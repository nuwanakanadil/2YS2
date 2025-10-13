"use client";
import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";

const API_URL = "http://localhost:5000/api/inventory";

export default function InventoryManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    quantity: "",
    price: "",
    image: null,
    category: "",
    lowStockThreshold: "10",
    expirationDate: "",
    unit: "pieces",
    supplier: "",
    batchNumber: "",
  });
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // Fetch inventory items + lists
  useEffect(() => {
    fetchItems();

    // fetch inventory categories list
    fetch(`${API_URL}/categories/list`)
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d?.categories) ? d.categories : []))
      .catch(() => {});

    // fetch units list
    fetch(`${API_URL}/units/list`)
      .then((r) => r.json())
      .then((d) => setUnits(Array.isArray(d?.units) ? d.units : []))
      .catch(() => {});
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      // Coerce to array whether API returns an array or { items: [...] }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setItems(list);
      setError(list.length ? "" : data?.message || "");
    } catch (err) {
      console.error("Fetch items error:", err);
      setError("Failed to fetch items");
      setItems([]); // keep UI stable
    }
    setLoading(false);
  };

  // Handle form input
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setForm({ ...form, image: files?.[0] || null });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Add or update item
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API_URL}/${editId}` : API_URL;
      let res;

      if (method === "POST") {
        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("description", form.description);
        formData.append("quantity", form.quantity);
        formData.append("price", form.price);
        if (form.category) formData.append("category", form.category);
        if (form.lowStockThreshold) formData.append("lowStockThreshold", form.lowStockThreshold);
        if (form.expirationDate) formData.append("expirationDate", form.expirationDate);
        if (form.unit) formData.append("unit", form.unit);
        if (form.supplier) formData.append("supplier", form.supplier);
        if (form.batchNumber) formData.append("batchNumber", form.batchNumber);
        if (form.image) formData.append("image", form.image);
        res = await fetch(url, {
          method,
          body: formData,
        });
      } else {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      if (!res.ok) {
        let serverMsg = `HTTP ${res.status}`;
        try {
          const json = await res.json();
          serverMsg = json?.error || json?.message || JSON.stringify(json);
        } catch {
          try {
            serverMsg = await res.text();
          } catch {
            /* ignore */
          }
        }
        console.error("Save failed", res.status, serverMsg);
        setError(serverMsg || "Failed to save item");
        return false;
      }

      // reset form
      setForm({
        name: "",
        description: "",
        quantity: "",
        price: "",
        image: null,
        category: "",
        lowStockThreshold: "10",
        expirationDate: "",
        unit: "pieces",
        supplier: "",
        batchNumber: "",
      });
      setEditId(null);
      await fetchItems();
      return true;
    } catch (err) {
      console.error("Save exception", err);
      setError(err?.message || "Failed to save item");
      return false;
    }
  };

  // Edit item
  const handleEdit = (item) => {
    setForm({
      name: item?.name || "",
      description: item?.description || "",
      quantity: item?.quantity ?? "",
      price: item?.price ?? "",
      category: item?.category || "",
      lowStockThreshold: item?.lowStockThreshold?.toString?.() || "10",
      expirationDate: item?.expirationDate ? item.expirationDate.split("T")[0] : "",
      unit: item?.unit || "pieces",
      supplier: item?.supplier || "",
      batchNumber: item?.batchNumber || "",
      image: null, // don't pre-fill file inputs
    });
    setEditId(item?._id || null);
    setShowModal(true);
  };

  // Delete item
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          msg = j?.error || j?.message || msg;
        } catch {
          /* noop */
        }
        throw new Error(msg);
      }
      fetchItems();
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err?.message || "Failed to delete item");
    }
  };

  // Helper: safe list (prevents reduce crash)
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-bold text-amber-900 mb-2">Inventory Management</h2>
            <p className="text-amber-700">Manage your inventory items and stock levels</p>
          </div>
          <a
            href="/list/inventory-monitoring"
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Stock Monitoring
          </a>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg">
            {error}
          </div>
        )}

        {/* Only show the Add Item button initially. Clicking opens a modal with the full form. */}
        <div className="mb-8">
          <button
            onClick={() => {
              setEditId(null);
              setForm({
                name: "",
                description: "",
                quantity: "",
                price: "",
                image: null,
                category: "",
                lowStockThreshold: "10",
                expirationDate: "",
                unit: "pieces",
                supplier: "",
                batchNumber: "",
              });
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg font-semibold w-full max-w-md"
          >
            <svg className="w-6 h-6 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              ></path>
            </svg>
            Add New Item
          </button>
        </div>

        {/* Modal dialog for add / edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-amber-900">
                  {editId ? "Edit Item" : "Add New Item"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-amber-600 hover:text-amber-800 p-2 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  const ok = await handleSubmit(e);
                  if (ok) setShowModal(false);
                }}
                className="space-y-6"
              >
                {/* Basic Information */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-amber-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Item Name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter item name"
                        required
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all text-black-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Category</label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-amber-800 mb-2">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Enter item description"
                      rows="3"
                      className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                    />
                  </div>
                </div>

                {/* Stock Information */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-amber-900 mb-4">Stock Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Current Stock *</label>
                      <input
                        name="quantity"
                        type="number"
                        value={form.quantity}
                        onChange={handleChange}
                        placeholder="0"
                        required
                        min="0"
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Low Stock Alert</label>
                      <input
                        name="lowStockThreshold"
                        type="number"
                        value={form.lowStockThreshold}
                        onChange={handleChange}
                        placeholder="10"
                        min="0"
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Unit</label>
                      <select
                        name="unit"
                        value={form.unit}
                        onChange={handleChange}
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      >
                        {(units.length ? units : ["pieces"]).map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Price and Expiration */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-amber-900 mb-4">Pricing & Expiration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Price (LKR) *</label>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        placeholder="0.00"
                        required
                        min="0"
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Expiration Date</label>
                      <input
                        name="expirationDate"
                        type="date"
                        value={form.expirationDate}
                        onChange={handleChange}
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-amber-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Supplier</label>
                      <input
                        name="supplier"
                        value={form.supplier}
                        onChange={handleChange}
                        placeholder="Enter supplier name"
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">Batch Number</label>
                      <input
                        name="batchNumber"
                        value={form.batchNumber}
                        onChange={handleChange}
                        placeholder="Enter batch number"
                        className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-amber-800 mb-2">Item Image</label>
                    <input
                      name="image"
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                      className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-lg p-3 focus:ring-2 focus:ring-amber-200 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-amber-200">
                  <button
                    type="button"
                    className="px-6 py-3 border-2 border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-medium"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    {editId ? "Update Item" : "Add Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto"></div>
              <p className="mt-4 text-amber-700 text-lg">Loading inventory...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* group items by category */}
            {Object.entries(
              safeItems.reduce((acc, it) => {
                const k = it?.category || "Uncategorized";
                (acc[k] ||= []).push(it);
                return acc;
              }, {})
            ).map(([cat, list]) => (
              <div key={cat} className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
                  <h3 className="text-2xl font-bold text-white">{cat}</h3>
                  <p className="text-amber-100 text-sm">{list.length} items in this category</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Image</th>
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Item Details</th>
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Stock Info</th>
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Price</th>
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Status</th>
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Expiry</th>
                        <th className="text-left py-4 px-6 font-semibold text-amber-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((item) => {
                        // Determine status badge
                        let statusBadge = "";
                        let statusClass = "";

                        if (item?.isExpired) {
                          statusBadge = "Expired";
                          statusClass = "bg-red-100 text-red-700 border border-red-200";
                        } else if (item?.isExpiringSoon) {
                          statusBadge = "Expiring Soon";
                          statusClass = "bg-orange-100 text-orange-700 border border-orange-200";
                        } else if ((item?.quantity ?? 0) === 0) {
                          statusBadge = "Out of Stock";
                          statusClass = "bg-red-100 text-red-700 border border-red-200";
                        } else if (item?.isLowStock) {
                          statusBadge = "Low Stock";
                          statusClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";
                        } else {
                          statusBadge = "In Stock";
                          statusClass = "bg-green-100 text-green-700 border border-green-200";
                        }

                        return (
                          <tr
                            key={item?._id}
                            className={`hover:bg-amber-50 transition-colors border-b border-amber-100 ${
                              item?.isExpired ? "bg-red-50" : item?.isLowStock ? "bg-yellow-50" : ""
                            }`}
                          >
                            <td className="py-6 px-6">
                              {item?.image ? (
                                <img
                                  src={
                                    item.image.startsWith("http")
                                      ? item.image
                                      : `http://localhost:5000${item.image}`
                                  }
                                  alt={item?.name || "item"}
                                  className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-white"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center border-2 border-amber-200">
                                  <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              )}
                            </td>
                            <td className="py-6 px-6">
                              <div>
                                <h4 className="font-bold text-amber-900 text-lg">{item?.name}</h4>
                                <p className="text-amber-600 text-sm mt-1">{item?.description}</p>
                                {item?.supplier && (
                                  <p className="text-amber-500 text-xs mt-1">Supplier: {item.supplier}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-6">
                              <div className="text-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-bold text-2xl text-amber-900">{item?.quantity}</span>
                                  <span className="text-amber-600">{item?.unit || "pcs"}</span>
                                </div>
                                {item?.lowStockThreshold && (
                                  <div className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded">
                                    Alert at: {item.lowStockThreshold}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-6">
                              <div className="text-lg font-bold text-green-700">
                                {formatCurrency(item?.price)}
                              </div>
                              {item?.batchNumber && (
                                <div className="text-xs text-amber-500">Batch: {item.batchNumber}</div>
                              )}
                            </td>
                            <td className="py-6 px-6">
                              <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${statusClass}`}>
                                {statusBadge}
                              </span>
                            </td>
                            <td className="py-6 px-6 text-sm">
                              {item?.expirationDate ? (
                                <div>
                                  <div className="font-medium text-amber-900">
                                    {new Date(item.expirationDate).toLocaleDateString()}
                                  </div>
                                  {item?.daysUntilExpiry !== null && item?.daysUntilExpiry !== undefined && (
                                    <div
                                      className={`text-xs mt-1 px-2 py-1 rounded ${
                                        item.daysUntilExpiry < 0
                                          ? "text-red-600 bg-red-50"
                                          : item.daysUntilExpiry <= 3
                                          ? "text-orange-600 bg-orange-50"
                                          : "text-amber-500 bg-amber-50"
                                      }`}
                                    >
                                      {item.daysUntilExpiry < 0
                                        ? `${Math.abs(item.daysUntilExpiry)} days overdue`
                                        : `${item.daysUntilExpiry} days left`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-amber-400">No expiry date</span>
                              )}
                            </td>
                            <td className="py-6 px-6">
                              <div className="flex gap-2">
                                <button
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all text-sm font-medium"
                                  onClick={() => handleEdit(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all text-sm font-medium"
                                  onClick={() => handleDelete(item?._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
