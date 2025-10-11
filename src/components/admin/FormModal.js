"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000").replace(/\/+$/, "");

// Lazy-loaded forms (unchanged)
const CanteenForm = dynamic(() => import("../admin/forms/CanteenForm"), {
  loading: () => <h1>Loading...</h1>,
});
const UserForm = dynamic(() => import("../admin/forms/UserForm"), {
  loading: () => <h1>Loading...</h1>,
});
const DeliveryForm = dynamic(() => import("../admin/forms/DeliveryForm"), {
  loading: () => <h1>Loading...</h1>,
});
const InventoryClerkForm = dynamic(() => import("../admin/forms/InventoryClerkForm"), {
  loading: () => <h1>Loading...</h1>,
});


const TABLE_MAP = {
  user: { form: "user", kind: "user" },                // generic
  manager: { form: "user", kind: "user" },
  customer: { form: "user", kind: "user" },
  delivery: { form: "delivery", kind: "user" },
  "inventory-clerk": { form: "inventoryClerk", kind: "user" },
  canteen: { form: "canteen", kind: "canteen" },
};

const FORMS = {
  canteen: (type, data, id, onDone) => (
    <CanteenForm type={type} data={data} id={id} onDone={onDone} />
  ),
  user: (type, data, id, onDone) => (
    <UserForm type={type} data={data} id={id} onDone={onDone} />
  ),
  delivery: (type, data, id, onDone) => (
    <DeliveryForm type={type} data={data} id={id} onDone={onDone} />
  ),
  inventoryClerk: (type, data, id, onDone) => (
    <InventoryClerkForm type={type} data={data} id={id} onDone={onDone} />
  ),
};

export default function FormModal({ table = "user", type, data, id, onDone }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const cfg = useMemo(() => TABLE_MAP[table] || TABLE_MAP.user, [table]);

  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-green-500"
      : type === "update"
      ? "bg-orange-500"
      : "bg-lamaPurple";

  // Close + parent refresh fallback
  const finish = useCallback(
    (payload) => {
      setOpen(false);
      if (typeof onDone === "function") onDone(payload);
      else router.refresh?.();
    },
    [onDone, router]
  );

  // ---- DELETE dispatcher (works for user-like and canteen) ----
  const handleDelete = useCallback(
    async (e) => {
      e.preventDefault();
      if (!id) return alert("Missing id to delete");

      try {
        let url = null;

        if (cfg.kind === "user") {
          // Preferred generic route (add in backend)
          url = `${API_ORIGIN}/api/admin/users/${id}`;

          // If your backend has ONLY customers delete today,
          // fallback to that route when table === 'customer'
          if (table === "customer") {
            url = `${API_ORIGIN}/api/admin/customers/${id}`;
          }
        } else if (cfg.kind === "canteen") {
          // Only if you expose this in backend
          url = `${API_ORIGIN}/api/admin/canteen/${id}`;
        }

        if (!url) throw new Error("Unknown delete target");

        const res = await fetch(url, {
          method: "DELETE",
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Delete failed");

        alert(`${table} deleted successfully`);
        finish();
      } catch (err) {
        console.error("Delete error:", err);
        alert(err.message || "Something went wrong");
      }
    },
    [cfg.kind, id, table, finish]
  );

  // ---- Content selector ----
  const RenderForm = () => {
    if (type === "delete" && id) {
      return (
        <form onSubmit={handleDelete} className="p-4 flex flex-col gap-4">
          <span className="text-center font-medium">
            All data will be lost. Are you sure you want to delete this {table}?
          </span>
          <button
            type="submit"
            className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center"
          >
            Delete
          </button>
        </form>
      );
    }

    // view/create/update go through mapped form
    const formKey = cfg.form;
    const render = FORMS[formKey];
    if (typeof render === "function") return render(type, data, id, finish);

    return <p>Form not found!</p>;
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
        aria-label={`${type} ${table}`}
        type="button"
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>

      {open && (
        <div
          className="w-screen h-screen fixed left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <RenderForm />
            <button
              type="button"
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
              aria-label="Close modal"
            >
              <Image src="/close.png" alt="Close" width={14} height={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
