"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000").replace(/\/$/, "");
const PROMO_ENDPOINT = `${API_BASE}/api/promotions`;

export default function CreatePromotion() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    discountType: "percentage",
    discountValue: "",
    target: "all",
    minPurchase: "",
    maxRedemptions: "100",
    termsConditions: "",
    promo_code: "",
    canteenId: "",
    productIds: [],  // multi-select
  });

  const [canteens, setCanteens] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCanteens, setLoadingCanteens] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function loadCanteens() {
    try {
      setLoadingCanteens(true);
      const res = await fetch(`${PROMO_ENDPOINT}/canteens`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load canteens");
      setCanteens(data.canteens || []);
    } catch (e) {
      alert(e.message || "Error loading canteens");
    } finally {
      setLoadingCanteens(false);
    }
  }

  async function loadProducts(canteenId) {
    if (!canteenId) { setProducts([]); return; }
    try {
      setLoadingProducts(true);
      const res = await fetch(`${PROMO_ENDPOINT}/products?canteenId=${canteenId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load products");
      setProducts(data.products || []);
    } catch (e) {
      alert(e.message || "Error loading products");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadCanteens();
  }, []);

  useEffect(() => {
    setForm(s => ({ ...s, productIds: [] })); // reset selected products when canteen changes
    loadProducts(form.canteenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.canteenId]);

  function toggleProductSelection(productId) {
    setForm(s => {
      const set = new Set(s.productIds);
      if (set.has(productId)) set.delete(productId);
      else set.add(productId);
      return { ...s, productIds: Array.from(set) };
    });
  }

  const codePreview = useMemo(() => (form.promo_code || '').trim().toUpperCase(), [form.promo_code]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      if (!form.canteenId) return alert("Please select a canteen");
      if (!form.promo_code) return alert("Promo code is required");
      if (!form.startDate || !form.endDate) return alert("Start and End dates are required");

      const payload = {
        ...form,
        promo_code: codePreview,
        discountValue: form.discountValue ? Number(form.discountValue) : undefined,
        minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      };

      const res = await fetch(PROMO_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.message || `HTTP ${res.status}`);

      alert("Promotion created successfully!");
      router.push("/sales/promotions");
    } catch (err) {
      console.error("Create promo failed:", err);
      alert(err.message);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center">
        <button onClick={() => router.back()} className="p-2 mr-2 rounded-full hover:bg-gray-100" type="button">←</button>
        <h1 className="text-xl font-bold text-gray-800">Create New Promotion</h1>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        {/* Canteen + Promo code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canteen*</label>
            <select
              name="canteenId"
              value={form.canteenId}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">{loadingCanteens ? 'Loading…' : 'Select a canteen'}</option>
              {canteens.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code* (shown to customers)</label>
            <input
              name="promo_code"
              value={form.promo_code}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="eg: SAVE20"
              required
            />
            {codePreview && (
              <p className="text-xs text-gray-500 mt-1">Will be saved as: <b>{codePreview}</b></p>
            )}
          </div>
        </div>

        {/* Name + Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Name*</label>
            <input name="name" value={form.name} onChange={onChange}
                   className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <select name="target" value={form.target} onChange={onChange}
                    className="w-full px-3 py-2 border rounded-md">
              <option value="all">All Customers</option>
              <option value="new">New Customers</option>
              <option value="loyalty">Loyalty Members</option>
              <option value="students">Students</option>
              <option value="seniors">Seniors</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={onChange}
                      rows={3} className="w-full px-3 py-2 border rounded-md" />
          </div>
        </div>

        {/* Dates + discount */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date*</label>
            <input type="date" name="startDate" value={form.startDate} onChange={onChange}
                   className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date*</label>
            <input type="date" name="endDate" value={form.endDate} onChange={onChange}
                   className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type*</label>
            <select name="discountType" value={form.discountType} onChange={onChange}
                    className="w-full px-3 py-2 border rounded-md" required>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="bogo">Buy One Get One</option>
              <option value="free">Free Item</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value*</label>
            <input type="number" step="0.01" name="discountValue" value={form.discountValue} onChange={onChange}
                   className="w-full px-3 py-2 border rounded-md" required={form.discountType !== 'bogo' && form.discountType !== 'free'} disabled={form.discountType === 'bogo' || form.discountType === 'free'} />
          </div>
        </div>

        {/* Min purchase / Max redemptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Purchase (optional)</label>
            <input type="number" step="0.01" name="minPurchase" value={form.minPurchase} onChange={onChange}
                   className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Redemptions (0 = unlimited)</label>
            <input type="number" name="maxRedemptions" value={form.maxRedemptions} onChange={onChange}
                   className="w-full px-3 py-2 border rounded-md" />
          </div>
        </div>

        {/* Products list (multi-select) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applies To Products {form.canteenId ? '' : '(select a canteen first)'}
          </label>
          {loadingProducts ? (
            <div className="text-gray-500">Loading products…</div>
          ) : !form.canteenId ? (
            <div className="text-gray-400">Choose a canteen to see its products.</div>
          ) : products.length === 0 ? (
            <div className="text-gray-500">No products found for this canteen.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map(p => {
                const selected = form.productIds.includes(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => toggleProductSelection(p._id)}
                    className={`text-left border rounded-md p-3 hover:bg-gray-50 ${selected ? 'border-[#FF4081] ring-1 ring-[#FCD299]' : 'border-gray-200'}`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">Rs. {Number(p.price || 0).toLocaleString('en-LK')}</div>
                    {selected && <div className="mt-1 inline-block text-xs text-white bg-orange-500 px-2 py-0.5 rounded">Selected</div>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Leave empty to apply to all items in this canteen.</p>
        </div>

        {/* Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
          <textarea name="termsConditions" value={form.termsConditions} onChange={onChange}
                    rows={3} className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div className="mt-2 text-xs text-gray-500">
          <b>Note:</b> Promo code is case-insensitive and saved uppercase.
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end space-x-3">
          <button type="button" onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Create Promotion
          </button>
        </div>
      </form>
    </div>
  );
}
