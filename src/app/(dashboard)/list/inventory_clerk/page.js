"use client";

import { useEffect, useState, useCallback } from "react";
import FormModal from "@/components/admin/FormModal";
import Pagination from "@/components/admin/Pagination";
import Table from "@/components/admin/Table";
import TableSearch from "@/components/admin/TableSearch";
import Image from "next/image";
import { role } from "@/lib/data";

const columns = [
  { header: "Info", accessor: "info" },
  { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
  { header: "Email", accessor: "email", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

const API = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";
const normalizePic = (src) => {
  if (!src || typeof src !== "string") return "/profile2.png";
  const clean = src.replace(/\\/g, "/").trim();
  if (clean.startsWith("/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${API.replace(/\/+$/,"")}/${clean.replace(/^\/+/, "")}`;
};

const InventoryClerksPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ search, page, limit, role: "INVENTORY_CLERK" });
      const r = await fetch(`${API.replace(/\/+$/,'')}/api/admin/users?${params}`, {
        credentials: "include",
      });
      const j = await r.json();
      setRows(j.items || []);
      setTotal(j.total || 0);
    } catch (e) {
      console.error("fetch clerks failed:", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const renderRow = (item) => {
    const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "—";
    const pic = normalizePic(item.profilePic);

    return (
      <tr key={item._id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-orange-100">
        <td className="flex items-center gap-4 p-4">
          <Image
            src={pic}
            alt={name || "profile"}
            width={40}
            height={40}
            className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <h3 className="font-semibold">{name}</h3>
            <p className="text-xs text-green-500">{item.status || "—"}</p>
          </div>
        </td>
        <td className="hidden md:table-cell">{item.phone || "—"}</td>
        <td className="hidden lg:table-cell">{item.email || "—"}</td>
        <td>
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <FormModal table="inventory-clerk" type="view"   id={item._id} data={item} onDone={load} />
                <FormModal table="inventory-clerk" type="update" id={item._id} data={item} onDone={load} />
                <FormModal table="inventory-clerk" type="delete" id={item._id}              onDone={load} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Inventory Clerks</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onChange={(v) => { setPage(1); setSearch(v); }} />
          <div className="flex items-center gap-4 self-end">
            {/* filter/sort buttons (optional) */}
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="inventory-clerk" type="create" onDone={load} />}
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        renderRow={renderRow}
        data={rows}
        loading={loading}
        emptyText="No inventory clerks found"
      />

      <Pagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
};

export default InventoryClerksPage;
