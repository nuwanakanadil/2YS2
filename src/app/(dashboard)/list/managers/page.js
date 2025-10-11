"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/admin/FormModal";
import Pagination from "@/components/admin/Pagination";
import Table from "@/components/admin/Table";
import TableSearch from "@/components/admin/TableSearch";
import Image from "next/image";
import { role } from "@/lib/data";

/* ----------------------------- shared columns ----------------------------- */
const PENDING_COLUMNS = [
  { header: "Info", accessor: "info" },
  { header: "Canteen", accessor: "canteen", className: "hidden md:table-cell" },
  { header: "Submitted", accessor: "submitted", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

const MANAGER_COLUMNS = [
  { header: "Info", accessor: "info" },
  { header: "Canteen", accessor: "canteen", className: "hidden md:table-cell" },
  { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
  { header: "Email", accessor: "email", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

/* --------------------------- image src normalizer -------------------------- */
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";
const normalizePic = (src) => {
  if (!src || typeof src !== "string") return "/profile2.png";
  const clean = src.replace(/\\/g, "/").trim();
  if (clean.startsWith("/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${apiOrigin.replace(/\/+$/, "")}/${clean.replace(/^\/+/, "")}`;
};

export default function AdminManagersPage() {
  /* ============================ pending approvals ============================ */
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLimit] = useState(10);
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(true);

  /* ============================== existing list ============================== */
  const [mgrSearch, setMgrSearch] = useState("");
  const [mgrPage, setMgrPage] = useState(1);
  const [mgrLimit] = useState(10);
  const [mgrRows, setMgrRows] = useState([]);
  const [mgrTotal, setMgrTotal] = useState(0);
  const [mgrLoading, setMgrLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  /* --------------------------- load pending items --------------------------- */
  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const params = new URLSearchParams({
        search: pendingSearch,
        page: pendingPage,
        limit: pendingLimit,
        status: "PENDING",
      });
      // Endpoint you’ll expose from backend for approvals inbox
      const r = await fetch(`${API}/api/admin/manager-registrations?${params}`, {
        credentials: "include",
      });
      const j = await r.json();
      setPendingRows(j.items || []);
      setPendingTotal(j.total || 0);
    } catch (e) {
      console.error("fetch pending managers failed:", e);
      setPendingRows([]);
      setPendingTotal(0);
    } finally {
      setPendingLoading(false);
    }
  };

  /* ---------------------------- load existing mgrs --------------------------- */
  const loadManagers = async () => {
    setMgrLoading(true);
    try {
      const params = new URLSearchParams({
        search: mgrSearch,
        page: mgrPage,
        limit: mgrLimit,
      });
      // Endpoint you’ll expose from backend for approved managers
      const r = await fetch(`${API}/api/admin/managers?${params}`, {
        credentials: "include",
      });
      const j = await r.json();
      setMgrRows(j.items || []);
      setMgrTotal(j.total || 0);
    } catch (e) {
      console.error("fetch managers failed:", e);
      setMgrRows([]);
      setMgrTotal(0);
    } finally {
      setMgrLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadPending();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch, pendingPage, pendingLimit]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadManagers();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgrSearch, mgrPage, mgrLimit]);

  /* ----------------------------- approve/reject ----------------------------- */
  const approve = async (id) => {
    try {
      await fetch(`${API}/api/admin/manager-registrations/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      await Promise.all([loadPending(), loadManagers()]); // move item to approved table
    } catch (e) {
      console.error("approve failed:", e);
    }
  };

  const reject = async (id) => {
    try {
      const reason = window.prompt("Reason (optional):") || "";
      await fetch(`${API}/api/admin/manager-registrations/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await loadPending();
    } catch (e) {
      console.error("reject failed:", e);
    }
  };

  /* ----------------------------- pending row UI ----------------------------- */
  const renderPendingRow = (item) => {
    const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "—";
    const email = item.email || "—";
    const pic = normalizePic(item.profilePic);
    const canteenName = item?.canteen?.name || "—";
    const canteenLoc =
      (item?.canteen?.address?.city || "") +
      ((item?.canteen?.address?.city && item?.canteen?.address?.country) ? ", " : "") +
      (item?.canteen?.address?.country || "");
    const submitted = item.createdAt ? new Date(item.createdAt).toLocaleString() : "—";

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
            <p className="text-xs text-gray-500">{email}</p>
          </div>
        </td>
        <td className="hidden md:table-cell">
          <div className="flex flex-col">
            <span className="font-semibold">{canteenName}</span>
            <span className="text-xs text-gray-500">{canteenLoc || "—"}</span>
          </div>
        </td>
        <td className="hidden lg:table-cell">{submitted}</td>
        <td className="p-2">
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <button
                  onClick={() => approve(item._id)}
                  className="px-3 py-1 rounded bg-green-600 text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(item._id)}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Reject
                </button>
                {/* Optional view modal if you already have a FormModal for this */}
                <FormModal table="managerRegistration" type="view" id={item._id} data={item} onDone={() => loadPending()} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  /* ---------------------------- manager list row UI ---------------------------- */
  const renderManagerRow = (item) => {
    const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "—";
    const email = item.email || "—";
    const pic = normalizePic(item.profilePic);
    const canteenName = item?.canteen?.name || "—";
    const phone = item.phone || "—";

    const refetch = async () => {
      await loadManagers();
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
            <p className="text-xs text-green-500">{item.status || "ACTIVE"}</p>
          </div>
        </td>
        <td className="hidden md:table-cell">{canteenName}</td>
        <td className="hidden md:table-cell">{phone}</td>
        <td className="hidden lg:table-cell">{email}</td>
        <td className="p-2">
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <FormModal table="manager" type="view"   id={item._id} data={item} onDone={refetch} />
                <FormModal table="manager" type="update" id={item._id} data={item} onDone={refetch} />
                <FormModal table="manager" type="delete" id={item._id}          onDone={refetch} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 space-y-8">
      {/* ============== PENDING APPROVALS ============== */}
      <section>
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">Pending Managers</h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <TableSearch onChange={(v) => { setPendingPage(1); setPendingSearch(v); }} />
            <div className="flex items-center gap-4 self-end">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/filter.png" alt="" width={14} height={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/sort.png" alt="" width={14} height={14} />
              </button>
              {/* Typically no create for pending */}
            </div>
          </div>
        </div>

        <Table
          columns={PENDING_COLUMNS}
          renderRow={renderPendingRow}
          data={pendingRows}
          loading={pendingLoading}
          emptyText="No pending manager registrations"
        />

        <Pagination
          page={pendingPage}
          total={pendingTotal}
          limit={pendingLimit}
          onPageChange={(p) => setPendingPage(p)}
        />
      </section>

      {/* ============== EXISTING MANAGERS ============== */}
      <section>
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">All Managers</h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <TableSearch onChange={(v) => { setMgrPage(1); setMgrSearch(v); }} />
            <div className="flex items-center gap-4 self-end">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/filter.png" alt="" width={14} height={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                <Image src="/sort.png" alt="" width={14} height={14} />
              </button>
              {/* Creation of managers typically happens via approval, but if you support manual add: */}
              {/* {role === "admin" && <FormModal table="manager" type="create" onDone={() => loadManagers()} />} */}
            </div>
          </div>
        </div>

        <Table
          columns={MANAGER_COLUMNS}
          renderRow={renderManagerRow}
          data={mgrRows}
          loading={mgrLoading}
          emptyText="No managers found"
        />

        <Pagination
          page={mgrPage}
          total={mgrTotal}
          limit={mgrLimit}
          onPageChange={(p) => setMgrPage(p)}
        />
      </section>
    </div>
  );
}
