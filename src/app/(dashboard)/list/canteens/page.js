"use client";

import { useEffect, useState } from "react";
import FormModal from "@/components/admin/FormModal";
import Pagination from "@/components/admin/Pagination";
import Table from "@/components/admin/Table";
import TableSearch from "@/components/admin/TableSearch";
import Image from "next/image";
import Link from "next/link";
import { role } from "@/lib/data";
import { useCanteenStore } from "@/lib/canteenStore";

const columns = [
  { header: "Info", accessor: "info" },
  { header: "Manager", accessor: "manager", className: "hidden md:table-cell" },
  { header: "Email", accessor: "email", className: "hidden lg:table-cell" },
  { header: "Location (lng,lat)", accessor: "coords", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

const CanteenListPage = () => {
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
        const res = await fetch(`http://localhost:5000/api/canteen?${params}`, {
          credentials: "include", // send cookie JWT
        });
        const json = await res.json();
        if (!alive) return;
        setRows(json.items || []);
        setTotal(json.total || 0);
      } catch (e) {
        console.error("fetch canteens failed:", e);
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
    const mgr = item.managerId || {}; // populated manager
    const coords =
      item?.location?.coordinates && item.location.coordinates.length === 2
        ? `${item.location.coordinates[0].toFixed(5)}, ${item.location.coordinates[1].toFixed(5)}`
        : "—";
    const setCanteen = useCanteenStore((s) => s.setCanteen);

    return (
      <tr key={item._id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-green-50">
        <td className="flex items-center gap-4 p-4">
          <Image
            src={"/canteen.png"} // put a placeholder in /public
            alt=""
            width={40}
            height={40}
            className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-xs text-gray-500">{mgr.email || "—"}</p>
          </div>
        </td>

        <td className="hidden md:table-cell">
          {mgr.firstName || mgr.lastName ? `${mgr.firstName ?? ""} ${mgr.lastName ?? ""}`.trim() : "—"}
        </td>

        <td className="hidden lg:table-cell">{mgr.email || "—"}</td>
        <td className="hidden lg:table-cell">{coords}</td>

        <td>
          <div className="flex items-center gap-2">
            <Link href={`/list/canteens/${item._id}`}
              onClick={() => setCanteen(item._id, item)}>
              <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
                <Image src="/view.png" alt="" width={16} height={16} />
              </button>
            </Link>

            {role === "admin" && (
              <>
                <FormModal table="canteen" type="update" id={item._id} initialData={item} />
                <FormModal table="canteen" type="delete" id={item._id} />
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
        <h1 className="hidden md:block text-lg font-semibold">All Canteens</h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onChange={(v) => { setPage(1); setSearch(v); }} />
          <div className="flex items-center gap-4 self-end">
            {/* Optional quick actions */}
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaOrange">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaOrange">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="canteen" type="create" />}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table
        columns={columns}
        renderRow={renderRow}
        data={rows}
        loading={loading}
        emptyText="No canteens found"
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

export default CanteenListPage;
