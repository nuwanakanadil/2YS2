"use client";

import { useEffect, useState } from "react";
import FormModal from "@/components/admin/FormModal";
import Pagination from "@/components/admin/Pagination";
import Table from "@/components/admin/Table";
import TableSearch from "@/components/admin/TableSearch";
import Image from "next/image";
import Link from "next/link";
import { role } from "@/lib/data";

const columns = [
  { header: "Info", accessor: "info" },
  { header: "University ID", accessor: "universityId", className: "hidden md:table-cell" },
  { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
  { header: "Email", accessor: "email", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

// inline normalizer so URLs are always valid for <Image/>
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";
const normalizePic = (src) => {
  if (!src || typeof src !== "string") return "/avatar.png"; // fallback from /public
  const clean = src.replace(/\\/g, "/").trim();                 // fix any backslashes
  if (clean.startsWith("/")) return clean;                      // already absolute public path
  if (/^https?:\/\//i.test(clean)) return clean;                // already full URL
  // relative (e.g. "profile-images/abc.png") -> prefix API origin
  return `${apiOrigin.replace(/\/+$/, "")}/${clean.replace(/^\/+/, "")}`;
};

const CustomerListPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ search, page, limit });
        const res = await fetch(`http://localhost:5000/api/auth/customers?${params}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!alive) return;
        setRows(json.items || []);
        setTotal(json.total || 0);
      } catch (e) {
        console.error("fetch customers failed:", e);
        if (alive) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [search, page, limit]);

  const renderRow = (item) => {
    const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "—";
    const pic = normalizePic(item.profilePic);

  const refetch = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({ search, page, limit });
    const res = await fetch(`http://localhost:5000/api/auth/customers?${params}`, {
      credentials: "include",
    });
    const json = await res.json();
    setRows(json.items || []);
    setTotal(json.total || 0);
  } catch (e) {
    console.error("fetch customers failed:", e);
  } finally {
    setLoading(false);
  }
};

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
        <td className="hidden md:table-cell">{item.universityId || "—"}</td>
        <td className="hidden md:table-cell">{item.phone || "—"}</td>
        <td className="hidden lg:table-cell">{item.email || "—"}</td>
        <td>
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <FormModal table="user" type="view"   id={item._id} data={item} onDone={() => refetch()} />
                <FormModal table="user" type="update" id={item._id} data={item} onDone={() => refetch()} />
                <FormModal table="user" type="delete" id={item._id}            onDone={() => refetch()} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Customers</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onChange={(v) => { setPage(1); setSearch(v); }} />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="user" type="create" onDone={() => refetch()} />}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table
        columns={columns}
        renderRow={renderRow}
        data={rows}
        loading={loading}
        emptyText="No customers found"
      />

      {/* PAGINATION */}
      <Pagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
};

export default CustomerListPage;
