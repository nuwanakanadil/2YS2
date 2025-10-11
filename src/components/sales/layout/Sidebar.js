"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  TrendingUpIcon,
  TagIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000").replace(/\/$/, "");

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState("/avatar.png");

  useEffect(() => {
    let aborted = false;

    async function fetchUser() {
      // Try /api/auth/me first, then /api/auth/profile
      const endpoints = [`${API_BASE}/api/auth/me`, `${API_BASE}/api/auth/profile`];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { credentials: "include" });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data) {
            if (aborted) return;
            // Normalize a few common field names
            const normalized = {
              firstName: data.firstName || data.user?.firstName || "",
              lastName: data.lastName || data.user?.lastName || "",
              role: (data.role || data.user?.role || "").toString(),
              email: data.email || data.user?.email || "",
              photo:
                data.photo ||
                data.avatar ||
                data.profileImage ||
                data.user?.photo ||
                data.user?.avatar ||
                data.user?.profileImage ||
                "",
            };
            setUser(normalized);
            if (normalized.photo) {
              // If backend serves from /profile-images, keep it; otherwise assume absolute URL
              const img =
                normalized.photo.startsWith("http")
                  ? normalized.photo
                  : `${API_BASE}/${normalized.photo.replace(/^\/+/, "")}`;
              setAvatar(img);
            }
            return;
          }
        } catch (_) {
          // next endpoint
        }
      }
      // If everything fails, keep defaults
      setUser(null);
      setAvatar("/avatar.png");
    }

    fetchUser();
    return () => { aborted = true; };
  }, []);

  const fullName =
    user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "Signed user";
  const roleLabel = user?.role ? user.role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "User";

  const navItems = [
    { name: "Dashboard", path: "/sales", icon: <HomeIcon size={20} /> },
    { name: "Promotions", path: "/sales/promotions", icon: <TagIcon size={20} /> },
    { name: "Sales", path: "/sales/sales", icon: <TrendingUpIcon size={20} /> },
    { name: "Customers", path: "/sales/customers", icon: <UsersIcon size={20} /> },
    { name: "Settings", path: "/sales/settings", icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div
      className={`${isOpen ? "w-64" : "w-20"} bg-white text-gray-500 transition-all duration-300 ease-in-out flex flex-col h-full`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-transparent">
        <div className={`flex items-center ${isOpen ? "justify-start pl-4" : "justify-center"}`}>
          <Image src="/logo.png" alt="Meal Matrix Logo" width={60} height={60} />
          {isOpen && (
            <span className="ml-2 text-xl font-semibold">
              <span className="text-green-500">Meal</span>{" "}
              <span className="text-orange-500">Matrix</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                  isActive ? "bg-orange-100 text-gray" : "text-gray hover:bg-orange-100"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info (from session) */}
      <div className="p-4 bg-green-50 border border-transparent">
        {isOpen ? (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
              <Image src={avatar} alt="User avatar" width={32} height={32} className="rounded-full object-cover" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{fullName || "User"}</p>
              <p className="text-xs text-orange-300">{roleLabel}</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-full overflow-hidden bg-transparent flex items-center justify-center">
            <Image src={avatar} alt="User avatar" width={32} height={32} className="rounded-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
