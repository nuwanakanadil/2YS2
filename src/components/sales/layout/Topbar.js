"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Bell as BellIcon,
  MessageSquare as MessageSquareIcon,
  LogOut as LogOutIcon,
  Loader2 as LoaderIcon,
} from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000").replace(/\/$/, "");

export default function Topbar({ toggleSidebar }) {
  const router = useRouter();

  // UI state
  const [openNotif, setOpenNotif] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const notifRef = useRef(null);
  const chatRef   = useRef(null);

  // Data state
  const [q, setQ] = useState("");
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [notifications, setNotifications] = useState([]); // { _id, title, body, createdAt, read }
  const [threads, setThreads] = useState([]);             // { _id, title, lastMessage, unreadCount, updatedAt }

  // ----- Fetch helpers (use your existing routes) -----
  async function loadNotifications() {
    try {
      const res = await fetch(`${API_BASE}/api/notifications?limit=10`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.items || []);
        setUnreadNotif(Number(data.unread || 0));
      }
    } catch {}
  }

  async function loadChatBadges() {
    try {
      // unread count
      const r1 = await fetch(`${API_BASE}/api/messaging/unread-count`, { credentials: "include" });
      const d1 = await r1.json();
      if (r1.ok) setUnreadChat(Number(d1.count || 0));

      // preview threads
      const r2 = await fetch(`${API_BASE}/api/messaging/threads?limit=6`, { credentials: "include" });
      const d2 = await r2.json();
      if (r2.ok) setThreads(d2.threads || []);
    } catch {}
  }

  async function markNotificationsRead(ids) {
    if (!ids?.length) return;
    try {
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      // optimistic UI
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n._id) ? { ...n, read: true } : n))
      );
      setUnreadNotif((u) => Math.max(0, u - ids.length));
    } catch {}
  }

  async function logout() {
    try {
      setLoggingOut(true);
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      // Fallback: clear cookie on server; client just navigates away
      if (!res.ok) {
        // some backends use GET logout
        await fetch(`${API_BASE}/api/auth/logout`, { credentials: "include" }).catch(() => {});
      }
    } catch {} finally {
      setLoggingOut(false);
      // send user to login page
      router.push("/user/signin");
    }
  }

  // ----- Socket.IO live updates -----
  useEffect(() => {
    // initial loads
    loadNotifications();
    loadChatBadges();

    const socket = io(API_BASE, { withCredentials: true });

    // join a user-specific room if your backend emits one; otherwise listen globally
    // socket.emit('join', { conversationId: 'global-notifications' });

    socket.on("notification:new", (payload) => {
      // payload: { _id, title, body, createdAt }
      setNotifications((prev) => [payload, ...prev].slice(0, 10));
      setUnreadNotif((u) => u + 1);
    });

    socket.on("message:new", (msg) => {
      // msg: { threadId, text, updatedAt }
      setUnreadChat((u) => u + 1);
      // bubble thread to top
      setThreads((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((t) => t._id === msg.threadId);
        if (idx >= 0) {
          const updated = {
            ...copy[idx],
            lastMessage: msg.text,
            updatedAt: msg.updatedAt || new Date().toISOString(),
            unreadCount: (copy[idx].unreadCount || 0) + 1,
          };
          copy.splice(idx, 1);
          return [updated, ...copy].slice(0, 6);
        } else {
          return [
            {
              _id: msg.threadId,
              title: msg.title || "New conversation",
              lastMessage: msg.text,
              updatedAt: msg.updatedAt || new Date().toISOString(),
              unreadCount: 1,
            },
            ...copy,
          ].slice(0, 6);
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // close popovers on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (openNotif && notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
      if (openChat && chatRef.current && !chatRef.current.contains(e.target)) setOpenChat(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openNotif, openChat]);

  // when opening notifications, mark unread visible as read
  useEffect(() => {
    if (openNotif) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n._id);
      if (unreadIds.length) markNotificationsRead(unreadIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNotif]);

  const notifBadge = useMemo(() => (unreadNotif > 99 ? "99+" : unreadNotif || ""), [unreadNotif]);
  const chatBadge = useMemo(() => (unreadChat > 99 ? "99+" : unreadChat || ""), [unreadChat]);

  function onSearchSubmit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    // route to a global search page your app provides
    // e.g., /sales/search?q=...
    const searchUrl = `/sales/search?q=${encodeURIComponent(q.trim())}`;
    setQ("");
    router.push(searchUrl);
  }

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <MenuIcon size={20} />
          </button>
          <div className="ml-4 hidden md:block">
            <h1 className="text-lg font-semibold text-gray-800">Sales & Promotions Dashboard</h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <form onSubmit={onSearchSubmit} className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button type="submit" className="absolute left-3 top-2.5 text-gray-400">
              <SearchIcon size={18} />
            </button>
          </form>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setOpenNotif((v) => !v)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 relative"
              aria-label="Notifications"
            >
              <BellIcon size={20} />
              {unreadNotif > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-[18px] rounded-full text-center">
                  {notifBadge}
                </span>
              )}
            </button>
            {openNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">Notifications</p>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="text-sm font-medium text-gray-800">{n.title || "Notification"}</div>
                        {n.body && <div className="text-xs text-gray-600 mt-0.5">{n.body}</div>}
                        <div className="text-[11px] text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-3 py-2 border-t">
                  <button
                    onClick={() => router.push("/sales/notifications")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative" ref={chatRef}>
            <button
              onClick={() => setOpenChat((v) => !v)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 relative"
              aria-label="Messages"
            >
              <MessageSquareIcon size={20} />
              {unreadChat > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] leading-[18px] rounded-full text-center">
                  {chatBadge}
                </span>
              )}
            </button>
            {openChat && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">Recent Messages</p>
                </div>
                <div className="max-h-96 overflow-auto">
                  {threads.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No conversations</div>
                  ) : (
                    threads.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => {
                          setOpenChat(false);
                          router.push(`/sales/messages/${t._id}`);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-800 truncate">{t.title || "Conversation"}</div>
                          {t.unreadCount > 0 && (
                            <span className="ml-2 text-[10px] bg-blue-600 text-white rounded-full px-2 py-0.5">
                              {t.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">
                          {t.lastMessage || "—"}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          {new Date(t.updatedAt).toLocaleString()}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-3 py-2 border-t flex items-center justify-between">
                  <button
                    onClick={() => {
                      setOpenChat(false);
                      router.push("/sales/messages");
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open inbox
                  </button>
                  <button
                    onClick={() => router.push("/sales/messages/new")}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    New message
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100 flex items-center gap-2"
            aria-label="Logout"
          >
            {loggingOut ? <LoaderIcon size={16} className="animate-spin" /> : <LogOutIcon size={18} />}
            <span className="hidden md:inline text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
