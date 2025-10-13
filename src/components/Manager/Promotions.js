"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Stack,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";

// ---- config ----
const API_BASE = (process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000").replace(/\/$/, "");
const PROMO_ENDPOINT = `${API_BASE}/api/manager/promotions`;
const PINK = "#FF4081";

// small helpers
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function Badge({ children, tone = "default" }) {
  const styles = {
    default: "bg-gray-100 text-gray-800",
    pink: "bg-[#FFE1EC] text-[#FF4081]",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  }[tone];
  return <span className={`inline-block px-2 py-0.5 text-xs rounded ${styles}`}>{children}</span>;
}

export default function ManagerPromotionsPage() {
  const router = useRouter();

  // ⬇️ NEW: top bar state (only navbar change)
  const [anchorElTop, setAnchorElTop] = useState(null);
  const [displayName, setDisplayName] = useState("Manager");
  const topMenuOpen = Boolean(anchorElTop);
  const handleOpenTopMenu = (e) => setAnchorElTop(e.currentTarget);
  const handleCloseTopMenu = () => setAnchorElTop(null);
  const handleGoProfile = () => {
    handleCloseTopMenu();
    router.push("/manager/ManagerProfile");
  };
  const handleLogout = async () => {
    handleCloseTopMenu();
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    try {
      localStorage.removeItem("email");
      localStorage.removeItem("managerId");
      localStorage.removeItem("canteenId");
    } catch {}
    router.push("/manager/ManagerLogin");
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem("email");
      const email = raw ? JSON.parse(raw) : "";
      if (email) setDisplayName(email);
    } catch {}
  }, []);
  // ⬆️ END top bar additions

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [canteen, setCanteen] = useState(null);
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState(""); // 'approve' | 'reject'
  const [activePromo, setActivePromo] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadPending() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${PROMO_ENDPOINT}/pending`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setPending(data.items || []);
      setCanteen(data.canteen || null);
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  function openConfirm(promo, type) {
    setActivePromo(promo);
    setActionType(type);
    setNote("");
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (!submitting) {
      setConfirmOpen(false);
      setActivePromo(null);
      setActionType("");
      setNote("");
    }
  }

  async function doAction() {
    if (!activePromo || !actionType) return;
    try {
      setSubmitting(true);
      const url =
        actionType === "approve"
          ? `${PROMO_ENDPOINT}/${activePromo._id}/approve`
          : `${PROMO_ENDPOINT}/${activePromo._id}/reject`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Operation failed");

      // remove from list after success
      setPending((arr) => arr.filter((x) => x._id !== activePromo._id));
      closeConfirm();
    } catch (e) {
      alert(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const headerTitle = useMemo(() => {
    const name = canteen?.name ? ` — ${canteen.name}` : "";
    return `Promotions Pending Approval${name}`;
  }, [canteen]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ⬇️ Hide global nav on this page */}
      <style jsx global>{` nav { display: none !important; } `}</style>

      {/* ⬇️ Page-local top bar (profile icon + name + menu) */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#6F4E37", color: "white", mb: 2 }}>
        <Toolbar sx={{ minHeight: 64, display: "flex", justifyContent: "flex-end" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={handleOpenTopMenu} size="small" sx={{ p: 0.5, color: "inherit" }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.2)" }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, cursor: "pointer" }}
              onClick={handleOpenTopMenu}
              title={displayName}
            >
              {displayName}
            </Typography>
          </Stack>

          <Menu
            anchorEl={anchorElTop}
            open={topMenuOpen}
            onClose={handleCloseTopMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleGoProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* top header card (unchanged) */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">{headerTitle}</h1>
            <p className="text-sm text-gray-500">
              Review promotions submitted by the promotions team. Approve to activate (or schedule), or reject with a note.
            </p>
          </div>
          <button
            onClick={loadPending}
            className="px-3 py-2 rounded-md border text-sm"
            style={{ borderColor: PINK, color: PINK }}
          >
            Refresh
          </button>
        </div>

        <div className="p-6">
          {/* status / error */}
          {loading ? (
            <div className="text-gray-600">Loading…</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : pending.length === 0 ? (
            <div className="text-gray-500">No pending promotions 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-3">Promotion</th>
                    <th className="py-2 px-3">Date Range</th>
                    <th className="py-2 px-3">Scope</th>
                    <th className="py-2 px-3">Discount</th>
                    <th className="py-2 px-3">Target</th>
                    <th className="py-2 px-3">Created</th>
                    <th className="py-2 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {pending.map((p) => (
                    <tr key={p._id} className="border-t">
                      {/* name + status */}
                      <td className="py-3 pr-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">Code: <b>{(p.promo_code || "").toUpperCase()}</b></div>
                        <div className="mt-1">
                          <Badge tone="pink">Pending Approval</Badge>
                        </div>
                      </td>

                      {/* range */}
                      <td className="py-3 px-3 text-gray-800">
                        <div className="whitespace-nowrap">{fmtDate(p.startDate)} →</div>
                        <div className="whitespace-nowrap">{fmtDate(p.endDate)}</div>
                      </td>

                      {/* scope: canteen + products */}
                      <td className="py-3 px-3">
                        <div className="text-gray-800">
                          <span className="text-gray-500">Canteen:</span>{" "}
                          <span className="font-medium">{canteen?.name || "This canteen"}</span>
                        </div>
                        <div className="text-gray-800">
                          <span className="text-gray-500">Products:</span>{" "}
                          {Array.isArray(p.productIds) && p.productIds.length > 0 ? (
                            <Badge tone="blue">{p.productIds.length} selected</Badge>
                          ) : (
                            <Badge>All items</Badge>
                          )}
                        </div>
                        {!!p.minPurchase && (
                          <div className="text-gray-800">
                            <span className="text-gray-500">Min purchase:</span>{" "}
                            Rs. {Number(p.minPurchase).toLocaleString("en-LK")}
                          </div>
                        )}
                      </td>

                      {/* discount */}
                      <td className="py-3 px-3 text-gray-800">
                        <div className="capitalize">
                          Type: <b>{p.discountType}</b>
                        </div>
                        {["percentage", "fixed"].includes(p.discountType) && (
                          <div>
                            Value:{" "}
                            <b>
                              {p.discountType === "percentage"
                                ? `${Number(p.discountValue || 0)}%`
                                : `Rs. ${Number(p.discountValue || 0).toLocaleString("en-LK")}`}
                            </b>
                          </div>
                        )}
                      </td>

                      {/* target */}
                      <td className="py-3 px-3">
                        <div className="capitalize">
                          <Badge tone="yellow">{p.target || "all"}</Badge>
                        </div>
                        {!!p.maxRedemptions && (
                          <div className="text-xs text-gray-600 mt-1">
                            Max redemptions: {p.maxRedemptions}
                          </div>
                        )}
                      </td>

                      {/* created */}
                      <td className="py-3 px-3 text-gray-800">
                        <div>{fmtDate(p.createdAt)}</div>
                        {p.description && (
                          <div className="text-xs text-gray-500 max-w-xs truncate" title={p.description}>
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* actions */}
                      <td className="py-3 pl-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openConfirm(p, "reject")}
                            className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            type="button"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => openConfirm(p, "approve")}
                            className="px-3 py-2 text-sm rounded-md text-white hover:opacity-90"
                            type="button"
                            style={{ backgroundColor: PINK }}
                          >
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* count */}
              <div className="text-xs text-gray-500 mt-3">
                Showing {pending.length} promotion{pending.length === 1 ? "" : "s"} awaiting approval.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* confirm dialog (unchanged) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
          {/* dialog */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {actionType === "approve" ? "Approve Promotion" : "Reject Promotion"}
              </h2>
              {activePromo && (
                <p className="text-sm text-gray-500 mt-1">
                  {activePromo.name} · Code: <b>{(activePromo.promo_code || "").toUpperCase()}</b>
                </p>
              )}
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700">
                {actionType === "approve"
                  ? "Optionally add a note for the promotions team. Approving will move the promotion to its live state (scheduled/active based on dates)."
                  : "Optionally add a note explaining the reason for rejection."}
              </p>
              <textarea
                rows={4}
                className="w-full border rounded-md px-3 py-2 text-black"
                placeholder={actionType === "approve" ? "Approval note (optional)" : "Reason (optional)"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={closeConfirm}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={doAction}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-white"
                type="button"
                style={{ backgroundColor: actionType === "approve" ? PINK : "#DC2626" }}
              >
                {submitting ? "Saving…" : actionType === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
