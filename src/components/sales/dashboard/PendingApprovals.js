"use client";
import React, { useEffect, useState } from "react";
import { ClockIcon, EditIcon, XIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function PendingApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/sales/dashboard/pending-approvals`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (alive) setRows(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("pending approvals fetch failed:", e);
        if (alive) setErr("Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
      </div>
      <div className="overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-gray-500">Loading…</div>
        ) : err ? (
          <div className="px-5 py-8 text-center text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">No pending approvals at this time.</div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{item.title}</h3>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <span>By {item.requester}</span>
                    <span className="mx-2">•</span>
                    <span>{item.type}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon size={14} className="mr-1" />
                    <span>{item.date}</span>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <button className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600" title="Review">
                      <EditIcon size={14} />
                    </button>
                    <button className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600" title="Reject">
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
