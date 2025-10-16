"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

function normalizeRole(raw) {
  const r = String(raw || "").trim().toUpperCase();
  const map = {
    ADMIN: "admin",
    INVENTORY_CLERK: "inventory_clerk",
    MANAGER: "manager",
    PROMO_OFFICER: "promo_officer",
    CUSTOMER: "customer",
    DELIVERY: "delivery",
  };
  return map[r] || "";
}

export default function Menu() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch whoami to know which menu to render
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/whoami`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          if (alive) setRole("");
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (alive) setRole(normalizeRole(json.role));
      } catch {
        if (alive) setRole("");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      // Try the specific user logout first
      const endpoints = [
        `${API_BASE}/api/auth/user/logout`,
        `${API_BASE}/api/auth/logout`,
      ];
      let ok = false;
      for (const url of endpoints) {
        try {
          const r = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (r.ok) { ok = true; break; }
        } catch { /* try next */ }
      }
      // best-effort redirect even if server didn’t respond OK
      router.replace("/user/signin"); // change to your sign-in route if you have one
    } catch {
      router.replace("/user");
    }
  };

  const menu = useMemo(
    () => [
      {
        title: "MENU",
        items: [
          // Admin-only
          { icon: "/home.png", label: "Home", href: "/admin", visible: ["admin"] },
          { icon: "/shop.png", label: "Canteens", href: "/list/canteens", visible: ["admin"] },
          { icon: "/customer.png", label: "Customers", href: "/list/customers", visible: ["admin"] },
          { icon: "/manager.png", label: "Managers", href: "/list/managers", visible: ["admin"] },
          { icon: "/delivery.png", label: "Delivery Service", href: "/list/delivery", visible: ["admin"] },
          { icon: "/inventory_clerk.png", label: "Inventory Clerk", href: "/list/inventory_clerk", visible: ["admin"] },
          { icon: "/payment.png", label: "Payments", href: "/list/payment", visible: ["admin"] },
          { icon: "/reviews.png", label: "Reviews", href: "/list/reviews", visible: ["admin"] },
          { icon: "/announcement.png", label: "Announcements", href: "/list/announcements", visible: ["admin"] },

          // Inventory Clerk-only
          { icon: "/menu.png", label: "Inventory", href: "/list/inventory", visible: ["inventory_clerk"] },
          { icon: "/capacity.png", label: "Stock Monitoring", href: "/list/inventory-monitoring", visible: ["inventory_clerk"] },
          { icon: "/finance.png", label: "Analytics", href: "/list/analytics", visible: ["inventory_clerk"] },
        ],
      },
      {
        title: "OTHER",
        items: [
          { icon: "/profile.png", label: "Profile", href: "/profile", visible: ["admin", "inventory_clerk"] },
          // Logout becomes a button (not a link) to run the POST request
          { icon: "/logout.png", label: "Logout", action: handleLogout, visible: ["admin", "inventory_clerk"] },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleLogout]
  );

  const visibleFor = (item, r) => (item.visible || []).includes(r);

  if (loading) return <div className="mt-4 text-sm animate-pulse text-gray-400">Loading menu…</div>;
  if (!role) return null;

  return (
    <div className="mt-4 text-sm">
      {menu.map((section) => {
        const items = section.items.filter((it) => visibleFor(it, role));
        if (!items.length) return null;

        return (
          <div className="flex flex-col gap-2" key={section.title}>
            <span className="hidden lg:block text-gray-400 font-light my-4">
              {section.title}
            </span>

            {items.map((item) =>
              item.action ? (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-green-50 text-left"
                >
                  <Image src={item.icon} alt={`${item.label} icon`} width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-green-50"
                >
                  <Image src={item.icon} alt={`${item.label} icon`} width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
