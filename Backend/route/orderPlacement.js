// routes/orders.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Promotion = require("../models/Promotion"); 
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const auth = require("../middleware/authMiddleware");
const requireRole = require('../middleware/requireRole');

router.post("/place", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const {
      itemId, quantity, method, address, img, sessionTs,
      Paymentmethod, paymentMethod,
    } = req.body;

    const payMethod = Paymentmethod || paymentMethod;

    if (!itemId || !quantity || !method || !payMethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!["Cash", "Card"].includes(payMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }
    const qty = Math.max(1, Number(quantity) || 1);
    if (method === "delivery" && !String(address || "").trim()) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const product = await Product.findById(itemId).select("_id name price image canteenId").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.canteenId) return res.status(400).json({ message: "Invalid product: missing canteen" });

    const unitPrice = Number(product.price) || 0;
    const totalAmount = unitPrice * qty;   // store per-line total

    const base = sessionTs ? new Date(Number(sessionTs)) : new Date();
    const expiresAt = new Date(base.getTime() + 5 * 60 * 1000);

    const order = await Order.create({
      userId,
      canteenId: product.canteenId,
      itemId: product._id,
      itemName: product.name,
      quantity: qty,
      method,
      address: method === "delivery" ? String(address || "").trim() : "",
      price: unitPrice,
      img: img || product.image || "",
      status: "pending",
      expiresAt,
      totalAmount,                         // *** important ***
      sessionTs: sessionTs ? Number(sessionTs) : undefined,
      Paymentmethod: payMethod,
    });

    setTimeout(async () => {
      try {
        await Order.findOneAndUpdate(
          { _id: order._id, status: "pending" },
          { status: "placed" }
        );
      } catch (e) { console.error("Auto-place error:", e); }
    }, 5 * 60 * 1000);

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (String(order.userId) !== String(req.user.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ error: "Only pending orders can be cancelled" });
    }
    if (new Date(order.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: "Order can no longer be cancelled" });
    }
    await order.deleteOne();
    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/session/:sessionTs", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const sessionTs = Number(req.params.sessionTs);
    const userId = req.query.userId || req.user?.userId;

    if (!userId || Number.isNaN(sessionTs)) {
      return res.status(400).json({ message: "Bad request" });
    }

    const items = await Order.find({ userId, sessionTs }).sort({ createdAt: 1 }).lean();

    const total = items.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const windowEndsAt = items.reduce(
      (max, o) => (o.expiresAt > max ? o.expiresAt : max),
      new Date(0)
    );

    const Paymentmethod = items[0]?.Paymentmethod || null;
    const method = items[0]?.method || null;
    const address = items[0]?.address || null;

    res.json({
      sessionTs,
      userId,
      items,
      total,
      windowEndsAt,
      canDownload: new Date() >= new Date(windowEndsAt),
      Paymentmethod,
      method,
      address,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/session/:sessionTs/bill", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const sessionTs = Number(req.params.sessionTs);
    const userId = req.query.userId || req.user?.userId;

    if (!userId || Number.isNaN(sessionTs)) {
      return res.status(400).json({ message: "Bad request" });
    }

    const user = await User.findById(userId).select("firstName lastName").lean();
    if (!user) return res.status(400).json({ message: "User not found" });

    const orders = await Order.find({ userId, sessionTs }).sort({ createdAt: 1 }).lean();
    if (!orders.length) return res.status(404).json({ message: "No orders for this session" });

    const windowEndsAt = orders.reduce(
      (max, o) => (o.expiresAt > max ? o.expiresAt : max),
      new Date(0)
    );
    if (new Date() < new Date(windowEndsAt)) {
      return res.status(400).json({ message: "Billing window not finished yet" });
    }

    const sessionPayment = orders[0]?.Paymentmethod || "-";
    const sessionMethod = orders[0]?.method || "-";
    const sessionAddress = orders[0]?.address || "";

    const subtotal = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    let finalTotal = subtotal;
    let discount = 0;
    let promoLabel = null;

    const withSession = orders.find(o =>
      o.sessionTotal != null || o.sessionDiscount != null || o.promoCodeApplied
    );

    if (withSession && (withSession.sessionTotal != null || withSession.sessionDiscount != null)) {
      finalTotal = Number(withSession.sessionTotal ?? subtotal);
      discount = Number(withSession.sessionDiscount ?? Math.max(0, subtotal - finalTotal));
      promoLabel = withSession.promoCodeApplied || withSession.promoCode || null;
    } else {
      const foundCode =
        orders.find(o => o.promoCodeApplied)?.promoCodeApplied ||
        orders.find(o => o.promoCode)?.promoCode ||
        null;

      if (foundCode) {
        promoLabel = foundCode;
        const canteenId = orders[0].canteenId;
        const itemsForPromo = orders.map(o => ({ productId: o.itemId, qty: Number(o.quantity || 0), price: Number(o.price || 0) }));

        const promo = await Promotion.findOne({ promo_code: String(foundCode).trim().toUpperCase(), canteenId }).lean();
        if (promo) {
          const now = new Date();
          const inWindow = now >= new Date(promo.startDate) && now <= new Date(promo.endDate);
          const notPaused = promo.status !== 'paused';
          const appSubtotal = itemsForPromo.reduce((s, it) => s + it.price * it.qty, 0);

          if (inWindow && notPaused && appSubtotal >= Number(promo.minPurchase || 0)) {
            const applicable = (promo.productIds && promo.productIds.length)
              ? itemsForPromo.filter(it => promo.productIds.some(id => String(id) === String(it.productId)))
              : itemsForPromo.slice();

            if (applicable.length) {
              discount = 0;
              const round2 = n => Math.round(Number(n || 0) * 100) / 100;
              if (promo.discountType === 'percentage') {
                applicable.forEach(it => { discount += (it.price * it.qty) * (Number(promo.discountValue || 0) / 100); });
              } else if (promo.discountType === 'fixed') {
                const appSub = applicable.reduce((s, it) => s + it.price * it.qty, 0);
                discount = Math.min(Number(promo.discountValue || 0), appSub);
              } else if (promo.discountType === 'bogo') {
                applicable.forEach(it => { const freeUnits = Math.floor(Number(it.qty) / 2); discount += freeUnits * Number(it.price); });
              } else if (promo.discountType === 'free') {
                const cheapest = applicable.reduce((m, it) => (it.price < m.price ? it : m), applicable[0]);
                discount += Number(cheapest?.price || 0);
              }
              discount = round2(discount);
            }
          }
        }
        finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      }
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="order-batch-${sessionTs}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text("MEALMATRIX", { align: "center" });
    doc.fontSize(12).text("Smart Canteen Solution", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Date: ${new Date().toLocaleString()}`);
    doc.text(`Customer: ${[user.firstName, user.lastName].filter(Boolean).join(" ")}`);
    doc.text(`Session: ${sessionTs}`);
    doc.text(`Delivery Method: ${sessionMethod}`);
    if (sessionMethod === "delivery") doc.text(`Address: ${sessionAddress}`);
    doc.text(`Payment Method: ${sessionPayment}`);

    doc.moveDown().fontSize(12).text("Items");
    doc.moveDown(0.25).fontSize(10);
    orders.forEach((o, i) => {
      doc.text(`${i + 1}. ${o.itemName} x${o.quantity} @ $${(o.price ?? 0).toFixed(2)} = $${(o.totalAmount || 0).toFixed(2)}`);
    });

    doc.moveDown();
    doc.fontSize(11).text(`Subtotal: $${subtotal.toFixed(2)}`);
    if (discount > 0) {
      const label = promoLabel ? ` (${promoLabel})` : "";
      doc.text(`Discount${label}: -$${discount.toFixed(2)}`);
    }
    doc.fontSize(13).text(`Final Total: $${finalTotal.toFixed(2)}`, { underline: true });

    const payload = {
      type: "BATCH",
      userId,
      sessionTs,
      orderIds: orders.map((o) => o._id),
      subtotal,
      discount,
      total: finalTotal,
      promo: promoLabel || null,
    };
    const qrPng = await QRCode.toDataURL(JSON.stringify(payload));
    doc.moveDown().image(qrPng, { fit: [120, 120], align: "center" });

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

router.post("/finalize", auth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const { sessionTs, canteenId, code = "", customer = {} } = req.body || {};
    if (!sessionTs || !canteenId) {
      return res.status(400).json({ message: "sessionTs and canteenId are required" });
    }

    const orders = await Order.find({ userId: req.user.userId, sessionTs: Number(sessionTs) }).lean();
    if (!orders.length) {
      return res.status(404).json({ message: "No orders found for this session" });
    }

    const sessionSubtotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    let discount = 0;
    let finalTotal = sessionSubtotal;
    let appliedCode = "";
    let promoDoc = null;

    if (code) {
      promoDoc = await Promotion.findOne({
        promo_code: String(code).trim().toUpperCase(),
        canteenId,
      }).lean();

      if (promoDoc) {
        const now = new Date();
        const activeWindow =
          promoDoc.status !== "paused" &&
          now >= new Date(promoDoc.startDate) &&
          now <= new Date(promoDoc.endDate) &&
          !(promoDoc.maxRedemptions && promoDoc.redemptions >= promoDoc.maxRedemptions);

        const tgt = String(promoDoc.target || "all").toLowerCase();
        const okTarget =
          tgt === "all" ||
          (tgt === "new" && (customer.isNew === true || customer.orderCount === 0)) ||
          (tgt === "loyalty" && customer.isLoyalty === true) ||
          (tgt === "students" && customer.isStudent === true) ||
          (tgt === "seniors" && Number(customer.age || 0) >= 60);

        if (activeWindow && okTarget) {
          const applicable = (promoDoc.productIds && promoDoc.productIds.length)
            ? orders.filter(o => promoDoc.productIds.some(id => String(id) === String(o.itemId)))
            : orders.slice();

          if (applicable.length) {
            if (promoDoc.discountType === "percentage") {
              applicable.forEach(o => {
                discount += (o.price * o.quantity) * (Number(promoDoc.discountValue || 0) / 100);
              });
            } else if (promoDoc.discountType === "fixed") {
              const appSubtotal = applicable.reduce((s, o) => s + (o.price * o.quantity), 0);
              discount = Math.min(Number(promoDoc.discountValue || 0), appSubtotal);
            } else if (promoDoc.discountType === "bogo") {
              applicable.forEach(o => {
                const freeUnits = Math.floor(Number(o.quantity) / 2);
                discount += freeUnits * Number(o.price);
              });
            } else if (promoDoc.discountType === "free") {
              const cheapest = applicable.reduce((min, o) => (o.price < min.price ? o : min), applicable[0]);
              discount += Number(cheapest?.price || 0);
            }

            appliedCode = promoDoc.promo_code;
          }
        }
      }
    }

    discount = Math.round(discount * 100) / 100;
    finalTotal = Math.max(0, Math.round((sessionSubtotal - discount) * 100) / 100);

    const ordersToUpdate = await Order.find({ userId: req.user.userId, sessionTs: Number(sessionTs) });
    if (ordersToUpdate.length) {
      const baseSubtotal = ordersToUpdate.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const ratio = baseSubtotal > 0 ? (discount / baseSubtotal) : 0;

      for (const o of ordersToUpdate) {
        const base = Number(o.totalAmount || 0);
        const lineDiscount = Math.round(base * ratio * 100) / 100;
        const newTotal = Math.max(0, Math.round((base - lineDiscount) * 100) / 100);

        await Order.updateOne(
          { _id: o._id },
          {
            $set: {
              totalAmount: newTotal,
              promoCode: appliedCode || null,
              promoDiscount: discount,
              sessionSubtotal: sessionSubtotal,
              sessionTotal: finalTotal,
            },
          }
        );
      }
    }

    if (appliedCode && discount > 0 && promoDoc) {
      await Promotion.updateOne({ _id: promoDoc._id }, { $inc: { redemptions: 1 } });
    }

    return res.json({
      sessionTs: Number(sessionTs),
      subtotal: sessionSubtotal,
      discount,
      total: finalTotal,
      promoCode: appliedCode || null,
    });
  } catch (err) {
    console.error("Finalize error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
