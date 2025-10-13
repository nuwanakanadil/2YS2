"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000").replace(/\/+$/, "");
const ANN_ENDPOINT = `${API_BASE}/api/announcements`;
const CANTEENS_ENDPOINT = `${API_BASE}/api/announcements/canteens`;

export default function AnnouncementForm({ type = "create", data, id, onDone }) {
  const mode = useMemo(() => (type === "update" ? "update" : "create"), [type]);

  const [title, setTitle] = useState(data?.title || "");
  const [message, setMessage] = useState(data?.message || "");
  const [canteen, setCanteen] = useState(data?.canteenId || "");
  const [audience, setAudience] = useState(data?.audience || "ALL");
  const [date, setDate] = useState(data?.date || "");
  const [isActive, setIsActive] = useState(data?.isActive ?? true);

  const [canteens, setCanteens] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(CANTEENS_ENDPOINT, { credentials: "include" });
        if (res.ok) setCanteens(await res.json());
      } catch (e) {
        console.error("Failed to load canteens", e);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required");
    if (!canteen) return alert("Please select a canteen");
    if (!date) return alert("Please set a date");

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        message,
        canteen,
        targetAudience: audience,
        date,
        isActive,
      };

      const url = mode === "create" ? ANN_ENDPOINT : `${ANN_ENDPOINT}/${id || data?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Save failed");

      onDone?.(json);
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {mode === "create" ? "Create Announcement" : "Update Announcement"}
      </h2>

      <div>
        <label className="block text-sm font-medium">Title *</label>
        <input
          className="w-full border rounded p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Eg. Lunch promo, Change of hours, Holiday notice…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea
          className="w-full border rounded p-2 h-28"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional details that appear under the title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Canteen *</label>
        <select
          className="w-full border rounded p-2"
          value={canteen}
          onChange={(e) => setCanteen(e.target.value)}
        >
          <option value="">Select canteen</option>
          {canteens.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">Audience</label>
          <select
            className="w-full border rounded p-2"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="CUSTOMERS">Customers</option>
            <option value="DELIVERIES">Deliveries</option>
            <option value="MANAGERS">Managers</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Date *</label>
          <input
            type="date"
            className="w-full border rounded p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-2">
          <input
            id="isActive"
            type="checkbox"
            className="h-5 w-5"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="isActive" className="text-sm">Active</label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <button type="button" className="px-3 py-1 rounded border" onClick={() => onDone?.()}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-3 py-1 rounded bg-black text-white">
          {saving ? "Saving..." : mode === "create" ? "Create" : "Update"}
        </button>
      </div>
    </form>
  );
}
