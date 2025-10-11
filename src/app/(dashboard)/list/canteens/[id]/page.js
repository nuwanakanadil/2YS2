"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useCanteenStore } from "@/lib/canteenStore";
import Announcements from "@/components/admin/Announcements";
import BigCalendar from "@/components/admin/BigCalender";
import FormModal from "@/components/admin/FormModal";
import Performance from "@/components/admin/Performance";
import Image from "next/image";
import Link from "next/link";
import { role } from "@/lib/data";

/* ===========================
   Reusable Modal shell
=========================== */
function Modal({ title, open, onClose, children, widthClass = "max-w-3xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${widthClass} bg-white rounded-md shadow-xl`}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Menu Modal (fetches items)
=========================== */
function MenuModal({ canteenId, open, onClose }) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // TODO: change to your real endpoint if different
        // e.g. /api/canteen/:id/menu
        const res = await fetch(
          `http://localhost:5000/api/product?canteen=${canteenId}`,
          { credentials: "include" }
        );
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch { json = {}; }
        if (!res.ok) throw new Error(json.message || `Failed (${res.status})`);
        if (!alive) return;
        setItems(Array.isArray(json) ? json : (json.items || []));
        setErr("");
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load menu");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, canteenId]);

  return (
    <Modal title="Canteen Menu" open={open} onClose={onClose} widthClass="max-w-4xl">
      {loading && <div className="text-gray-500">Loading menu…</div>}
      {err && <div className="text-red-600">{err}</div>}
      {!loading && !err && items.length === 0 && <div>No menu items found.</div>}

      {!loading && !err && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((p) => (
            <div key={p._id || p.id} className="border rounded-md p-3 flex gap-3">
              <img
                src={p.photo || "/dish.png"}
                alt={p.name || "Item"}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <div className="font-medium">{p.name || "Unnamed Item"}</div>
                <div className="text-sm text-gray-500">
                  {p.category || p.type || "—"}
                </div>
                <div className="mt-1 font-semibold">
                  {p.price != null ? `Rs. ${Number(p.price).toFixed(2)}` : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ===========================
   Staff Modal (fetches staff)
=========================== */
function StaffModal({ canteenId, open, onClose }) {
  const [staff, setStaff] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // TODO: change to your real endpoint if different
        // e.g. /api/canteen/:id/staff
        const res = await fetch(
          `http://localhost:5000/api/staff?canteen=${canteenId}`,
          { credentials: "include" }
        );
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch { json = {}; }
        if (!res.ok) throw new Error(json.message || `Failed (${res.status})`);
        if (!alive) return;
        setStaff(Array.isArray(json) ? json : (json.items || []));
        setErr("");
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load staff");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, canteenId]);

  return (
    <Modal title="Staff Members" open={open} onClose={onClose} widthClass="max-w-2xl">
      {loading && <div className="text-gray-500">Loading staff…</div>}
      {err && <div className="text-red-600">{err}</div>}
      {!loading && !err && staff.length === 0 && <div>No staff found.</div>}

      {!loading && !err && staff.length > 0 && (
        <ul className="divide-y">
          {staff.map((u) => (
            <li key={u._id || u.id} className="py-3 flex items-center gap-3">
              <img
                src={u.profilePic || "/user.png"}
                alt="staff"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}
                </div>
                <div className="text-sm text-gray-500">{u.email || "—"}</div>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                {u.role || "STAFF"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ===========================
   Simple stubs (fill later)
=========================== */
function SimpleStubModal({ title, open, onClose, note }) {
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <div className="text-gray-600">{note}</div>
    </Modal>
  );
}

/* ===========================
   Main page
=========================== */
export default function SingleCanteenPage() {
  const { id } = useParams();

  // cached row from list page (Zustand)
  const getCanteen = useCanteenStore((s) => s.getCanteen);
  const setCanteen = useCanteenStore((s) => s.setCanteen);
  const cached = getCanteen(id);

  const [data, setData] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [err, setErr] = useState("");

  // modal states
  const [openMenu, setOpenMenu] = useState(false);
  const [openStaff, setOpenStaff] = useState(false);
  const [openOrders, setOpenOrders] = useState(false);
  const [openReports, setOpenReports] = useState(false);
  const [openMaintenance, setOpenMaintenance] = useState(false);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/canteen/${id}`, {
          credentials: "include",
        });
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch { json = {}; }
        if (!res.ok) throw new Error(json.message || `Failed (${res.status})`);
        if (!alive) return;
        setData(json);
        setCanteen(id, json);
        setErr("");
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, cached, setCanteen]);

  if (loading) return <div className="p-4">Loading canteen…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!data) return <div className="p-4">No data</div>;

  const mRaw = data?.managerId;
  const mgr =
    mRaw && typeof mRaw === "object"
      ? mRaw
      : {};

  const c = data?.location?.coordinates;
  const coords =
    Array.isArray(c) && c.length === 2
      ? `${Number(c[0]).toFixed(5)}, ${Number(c[1]).toFixed(5)}`
      : "—";

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* CANTEEN INFO CARD */}
          <div className="bg-orange-200 py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={data.photo || "/canteen.png"}
                alt="Canteen"
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>

            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">{data.name}</h1>
                {role === "admin" && (
                  <FormModal
                    table="canteen"
                    type="update"
                    id={data._id}
                    initialData={data}
                  />
                )}
              </div>

              <p className="text-sm text-gray-600">Coordinates: {coords}</p>

              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Image src="/location.png" alt="Location" width={14} height={14} />
                  <span>{coords !== "—" ? coords : "Location not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/manager2.png" alt="Manager" width={14} height={14} />
                  <span>
                    Manager:&nbsp;
                    {mgr.firstName || mgr.lastName
                      ? `${mgr.firstName ?? ""} ${mgr.lastName ?? ""}`.trim()
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/email.png" alt="Email" width={14} height={14} />
                  <span>{mgr.email || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SMALL STAT CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            <div className="bg-white p-4 rounded-md flex items-center gap-4 w-full md:w-[48%]">
              <Image src="/menu.png" alt="Menu Items" width={32} height={32} />
              <div>
                <h1 className="text-xl font-semibold">{data.productCount ?? 0}</h1>
                <span className="text-sm text-gray-400">Menu Items</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md flex items-center gap-4 w-full md:w-[48%]">
              <Image src="/orders.png" alt="Ongoing Orders" width={32} height={32} />
              <div>
                <h1 className="text-xl font-semibold">{data.ongoingOrders ?? 0}</h1>
                <span className="text-sm text-gray-400">Ongoing Orders</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md flex items-center gap-4 w-full md:w-[48%]">
              <Image src="/sales.png" alt="Completed Orders" width={32} height={32} />
              <div>
                <h1 className="text-xl font-semibold">{data.completedOrders ?? 0}</h1>
                <span className="text-sm text-gray-400">Completed Orders</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>Canteen Schedule</h1>
          <BigCalendar />
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <button onClick={() => setOpenMenu(true)} className="p-3 rounded-md bg-lamaSkyLight">
              View Menu
            </button>
            <button onClick={() => setOpenOrders(true)} className="p-3 rounded-md bg-lamaPurpleLight">
              View Orders
            </button>
            <button onClick={() => setOpenReports(true)} className="p-3 rounded-md bg-lamaYellowLight">
              Sales Reports
            </button>
            <button onClick={() => setOpenStaff(true)} className="p-3 rounded-md bg-pink-50">
              View Staff Members
            </button>
            <button onClick={() => setOpenMaintenance(true)} className="p-3 rounded-md bg-lamaSkyLight">
              Maintenance Requests
            </button>
          </div>
        </div>

        <Performance />
        <Announcements />
      </div>

      {/* ===== Modals ===== */}
      <MenuModal canteenId={data._id} open={openMenu} onClose={() => setOpenMenu(false)} />
      <StaffModal canteenId={data._id} open={openStaff} onClose={() => setOpenStaff(false)} />
      <SimpleStubModal
        title="Orders"
        open={openOrders}
        onClose={() => setOpenOrders(false)}
        note="TODO: Fetch /api/orders?canteen=<id> and list ongoing/completed orders here."
      />
      <SimpleStubModal
        title="Sales Reports"
        open={openReports}
        onClose={() => setOpenReports(false)}
        note="TODO: Build daily/weekly/monthly sales summary endpoint and charts."
      />
      <SimpleStubModal
        title="Maintenance Requests"
        open={openMaintenance}
        onClose={() => setOpenMaintenance(false)}
        note="TODO: Fetch /api/maintenance?canteen=<id> and show request statuses."
      />
    </div>
  );
}
