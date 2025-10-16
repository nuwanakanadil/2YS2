"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/userAuth";
import { getDraftItems, saveDraftItems, removeFromDraft, clearDraft } from "@/utils/orderDraft";

const API_BASE = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";

export default function OrderPage() {
  useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [method, setMethod] = useState("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // ---- promo state ----
  const [recsOpen, setRecsOpen] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recs, setRecs] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discount, newTotal }
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const draft = getDraftItems(uid);
    setItems(draft || []);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * (it.quantity || 1), 0),
    [items]
  );

  const updateQty = (id, delta) => {
    const next = items.map((it) =>
      it._id === id ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it
    );
    setItems(next);
    const uid = localStorage.getItem("userId");
    saveDraftItems(next, uid);
  };

  const handleRemove = (id) => {
    const uid = localStorage.getItem("userId");
    const next = items.filter((it) => it._id !== id);
    setItems(next);
    removeFromDraft(id, uid);
  };

  const handleOrderMore = () => router.push("/user");

  // ---- helpers for promos ----
  function toCartPayload() {
    return items.map(it => ({
      productId: it._id,
      qty: Number(it.quantity || 1),
      price: Number(it.price || 0),
    }));
  }

  function customerFlags() {
    // TODO: swap with real flags from profile if you have them
    return { isNew: false, orderCount: 5, isLoyalty: true, isStudent: false, age: 22 };
  }

  async function getCartCanteenId() {
    const first = items[0];
    if (!first) return null;
    if (first.canteenId) return first.canteenId;
    if (first.canteen_id) return first.canteen_id;
    if (first.canteen) return first.canteen;
    if (first.product && (first.product.canteenId || first.product.canteen_id)) {
      return first.product.canteenId || first.product.canteen_id;
    }

    const tryEndpoints = [
      `${API_BASE}/api/products/${first._id}`,
      `${API_BASE}/api/loadproducts/${first._id}`
    ];
    for (const url of tryEndpoints) {
      try {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) continue;
        const d = await r.json().catch(() => ({}));
        const prod = d.product || d;
        const cid = prod?.canteenId || prod?.canteen_id || prod?.canteen?.id || prod?.canteen?._id;
        if (cid) return cid;
      } catch (_) {}
    }
    return null;
  }

  async function findDiscounts() {
    try {
      setPromoError('');
      setRecsOpen(true);
      setRecsLoading(true);

      const canteenId = await getCartCanteenId();
      if (!canteenId) {
        setPromoError('Missing canteen on items');
        setRecsLoading(false);
        return;
      }

      const r = await fetch(`${API_BASE}/api/promocode/recommend`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canteenId,
          items: toCartPayload(),
          customer: customerFlags(),
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to load recommendations');
      setRecs(d.recommendations || []);
    } catch (e) {
      setPromoError(e.message || 'Could not load discounts');
    } finally {
      setRecsLoading(false);
    }
  }

  async function applyRecommendation(code) {
    try {
      setPromoError('');
      const canteenId = await getCartCanteenId();
      if (!canteenId) throw new Error('Missing canteen on items');

      const r = await fetch(`${API_BASE}/api/promocode/validate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code,
          canteenId,
          items: toCartPayload(),
          customer: customerFlags(),
        })
      });
      const d = await r.json();
      if (!d.valid) throw new Error(d.reason || 'Promo not valid for this cart');
      setAppliedPromo({ code, discount: d.discount, newTotal: d.newTotal });
      setRecsOpen(false);
    } catch (e) {
      setPromoError(e.message || 'Could not apply promo');
    }
  }

  const handlePlaceOrder = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) { alert("Please sign in."); router.push("/user/signin"); return; }
    if (!items.length) { alert("Add at least one item."); return; }
    if (method === "delivery" && !deliveryAddress.trim()) { alert("Enter a delivery address."); return; }
    if (!["Cash", "Card"].includes(paymentMethod)) { alert("Choose a payment method."); return; }

    try {
      const sessionTs = Date.now(); // shared 5-min batch
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

      // 1) place each item as an order row
      for (const it of items) {
        const payload = {
          userId,
          itemId: it._id,
          itemName: it.name,
          quantity: Number(it.quantity ?? 1),
          method, // "delivery" | "pickup"
          address: method === "delivery" ? deliveryAddress.trim() : "",
          price: Number(it.price),       // unit price
          img: it.image,
          sessionTs,
          paymentMethod,
          promoCode: appliedPromo?.code || undefined,
        };

        const res = await fetch(`${API_BASE}/api/orders/place`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        let bodyText = await res.text();
        let json;
        try { json = bodyText ? JSON.parse(bodyText) : {}; } catch { json = {}; }
        if (!res.ok) {
          const msg = json.message || bodyText || `Failed to place ${it.name}`;
          throw new Error(msg);
        }
      }

      // 2) finalize session totals (+discount) and persist new per-line totals
      try {
        const canteenId = await getCartCanteenId();
        if (canteenId) {
          const fr = await fetch(`${API_BASE}/api/orders/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              sessionTs: Number(sessionTs),     // IMPORTANT: number, not string
              canteenId,
              code: appliedPromo?.code || '',
              customer: customerFlags(),
            }),
          });
          const fdata = await fr.json().catch(() => ({}));
          if (!fr.ok) console.warn('Finalize failed:', fdata);
        } else {
          console.warn('Cannot finalize: missing canteenId');
        }
      } catch (e) {
        console.warn('Finalize error:', e);
      }

      clearDraft(userId);
      localStorage.setItem("lastSessionTs", String(sessionTs));
      alert("Order placed! Your final bill will be ready after the 5-minute window.");
      router.push("/user/Orders");
    } catch (e) {
      console.error("Place order failed:", e);
      alert(e.message || "Something went wrong");
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#ededed] p-6 text-black text-center">
        <p className="mb-4">No items in your order yet.</p>
        <Button
          variant="contained"
          sx={{ backgroundColor: "#FF4081" }}
          onClick={() => router.push("/user")}
        >
          Add Foods
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ededed] p-6 text-black">
      <div className="max-w-3xl mx-auto bg-[#6F4E37] text-white rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-4">Your Order</h2>

        <div className="space-y-4 mb-6">
          {items.map((it) => (
            <div key={it._id} className="flex items-center gap-4 bg-white text-black rounded p-3">
              <img
                src={`http://localhost:5000/${it.image}`}
                onError={(e) => (e.currentTarget.src = it.image)}
                alt={it.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <div className="font-bold">{it.name}</div>
                <div className="text-sm text-gray-600">${it.price}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="contained"
                  disabled={(it.quantity || 1) <= 1}
                  onClick={() => updateQty(it._id, -1)}
                  sx={{ backgroundColor: "#FF4081" }}
                >
                  -
                </Button>
                <span className="text-lg">{it.quantity || 1}</span>
                <Button
                  variant="contained"
                  onClick={() => updateQty(it._id, +1)}
                  sx={{ backgroundColor: "#FF4081" }}
                >
                  +
                </Button>
              </div>
              <div className="w-24 text-right font-semibold">
                ${(it.price * (it.quantity || 1)).toFixed(2)}
              </div>
              <Button variant="text" color="error" onClick={() => handleRemove(it._id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outlined" sx={{ color: "white", borderColor: "white" }} onClick={handleOrderMore}>
              Order more foods
            </Button>
            <Button variant="contained" sx={{ backgroundColor: "#FF4081" }} onClick={findDiscounts}>
              Find discounts
            </Button>
          </div>

        {appliedPromo ? (
          <div className="text-right">
            <Typography className="font-bold text-lg">Total: ${Number(appliedPromo.newTotal).toFixed(2)}</Typography>
            <Typography className="text-sm text-green-200">
              Saved ${Number(appliedPromo.discount).toFixed(2)} with <b>{appliedPromo.code}</b>
            </Typography>
          </div>
        ) : (
          <Typography className="font-bold text-lg">Total: ${total.toFixed(2)}</Typography>
        )}
        </div>

        {recsOpen && (
          <div className="bg-white text-black rounded p-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Available discounts</h3>
              <button className="text-sm text-gray-500" onClick={()=>setRecsOpen(false)}>Close</button>
            </div>

            {recsLoading ? (
              <div className="py-6">Searching best promos…</div>
            ) : promoError ? (
              <div className="py-3 text-red-600">{promoError}</div>
            ) : recs.length === 0 ? (
              <div className="py-3 text-gray-600">No discounts available for this cart.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {recs.map(r => (
                  <div key={r.code} className="border rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.name} <span className="text-xs text-gray-500">({r.code})</span></div>
                      <div className="text-sm text-gray-600">
                        {Number(r.estDiscount) > 0
                          ? <>Save ~ ${Number(r.estDiscount).toFixed(2)} · New total ~ ${Number(r.newTotal).toFixed(2)}</>
                          : r.reason}
                      </div>
                      <div className="text-xs text-gray-500">
                        Applies to: {r.appliesTo} · Min spend: ${Number(r.minPurchase||0).toFixed(2)}
                      </div>
                    </div>
                    <Button
                      variant="contained"
                      sx={{ backgroundColor: "#FF4081" }}
                      disabled={Number(r.estDiscount) <= 0}
                      onClick={() => applyRecommendation(r.code)}
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delivery Method */}
        <div className="mb-4">
          <Typography variant="body1" className="mb-2">Delivery Method:</Typography>
          <div className="flex gap-4">
            <Button
              variant={method === "delivery" ? "contained" : "outlined"}
              sx={{ backgroundColor: method === "delivery" ? "#FF4081" : "transparent", color: "white", borderColor: "white" }}
              onClick={() => setMethod("delivery")}
            >
              Delivery
            </Button>
            <Button
              variant={method === "pickup" ? "contained" : "outlined"}
              sx={{ backgroundColor: method === "pickup" ? "#FF4081" : "transparent", color: "white", borderColor: "white" }}
              onClick={() => setMethod("pickup")}
            >
              Pickup
            </Button>
          </div>
        </div>

        {method === "delivery" && (
          <TextField
            multiline
            rows={3}
            label="Delivery Address"
            fullWidth
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="bg-white rounded mb-4"
            InputProps={{ style: { color: "black" } }}
          />
        )}

        {/* Payment Method */}
        <div className="mb-6">
          <Typography variant="body1" className="mb-2">Payment Method:</Typography>
          <div className="flex gap-4">
            <Button
              variant={paymentMethod === "Cash" ? "contained" : "outlined"}
              sx={{ backgroundColor: paymentMethod === "Cash" ? "#FF4081" : "transparent", color: "white", borderColor: "white" }}
              onClick={() => setPaymentMethod("Cash")}
            >
              Cash
            </Button>
            <Button
              variant={paymentMethod === "Card" ? "contained" : "outlined"}
              sx={{ backgroundColor: paymentMethod === "Card" ? "#FF4081" : "transparent", color: "white", borderColor: "white" }}
              onClick={() => setPaymentMethod("Card")}
            >
              Card
            </Button>
          </div>
        </div>

        <Button fullWidth variant="contained" sx={{ backgroundColor: "#FF4081" }} onClick={handlePlaceOrder}>
          Place Order
        </Button>
      </div>
    </div>
  );
}
