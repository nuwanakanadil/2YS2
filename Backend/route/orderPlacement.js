// routes/orders.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const auth = require("../middleware/authMiddleware");
const requireRole = require('../middleware/requireRole');

router.post("/place", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const {
      itemId,
      quantity,
      method,                   // 'delivery' | 'pickup'
      address,
      img,                      // optional (preview image)
      sessionTs,
      Paymentmethod,            // legacy casing
      paymentMethod,            // new casing
    } = req.body;

    // normalize payment field
    const payMethod = Paymentmethod || paymentMethod;

    // basic checks
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

    // must be authenticated; user comes from token/cookie
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // product lookup → canteen + trusted price
    const product = await Product
      .findById(itemId)
      .select("_id name price image canteenId")
      .lean();

    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.canteenId) {
      return res.status(400).json({ message: "Invalid product: missing canteen" });
    }

    const unitPrice = Number(product.price) || 0;
    const totalAmount = unitPrice * qty;

    // align the 5-minute window off shared sessionTs if provided
    const base = sessionTs ? new Date(Number(sessionTs)) : new Date();
    const expiresAt = new Date(base.getTime() + 5 * 60 * 1000);

    const order = await Order.create({
      userId,                                // from auth
      canteenId: product.canteenId,          // REQUIRED
      itemId: product._id,
      itemName: product.name,                // ignore client itemName for safety
      quantity: qty,
      method,
      address: method === "delivery" ? String(address || "").trim() : "",
      price: unitPrice,                      // unit price from DB
      img: img || product.image || "",
      status: "pending",
      expiresAt,
      totalAmount,
      sessionTs: sessionTs ? Number(sessionTs) : undefined,
      Paymentmethod: payMethod,              // keep legacy casing in DB
    });

    // NOTE: dev-friendly auto-advance; consider cron/worker in production
    setTimeout(async () => {
      try {
        await Order.findOneAndUpdate(
          { _id: order._id, status: "pending" },
          { status: "placed" }
        );
      } catch (e) {
        console.error("Auto-place error:", e);
      }
    }, 5 * 60 * 1000);

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/orders/user/:userId
 * List a user's orders (most recent first)
 * (Optional) you could enforce auth + req.user.userId === :userId
 */
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

/**
 * DELETE /api/orders/:id
 * Cancel only if still pending and not expired.
 * (Optional) enforce that the order belongs to req.user.userId
 */
router.delete("/:id", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // optional ownership check:
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

/**
 * GET /api/orders/session/:sessionTs
 * Current snapshot for a user's batch (during/after the 5-minute window)
 */
router.get("/session/:sessionTs", auth, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const sessionTs = Number(req.params.sessionTs);
    const userId = req.query.userId || req.user?.userId; // prefer auth

    if (!userId || Number.isNaN(sessionTs)) {
      return res.status(400).json({ message: "Bad request" });
    }

    const items = await Order.find({ userId, sessionTs }).sort({ createdAt: 1 }).lean();

    const total = items.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const windowEndsAt = items.reduce(
      (max, o) => (o.expiresAt > max ? o.expiresAt : max),
      new Date(0)
    );

    const Paymentmethod = items[0]?.Paymentmethod || null; // session-level
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

/**
 * GET /api/orders/session/:sessionTs/bill
 * Final combined PDF after the window closes.
 */
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

    const grandTotal = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const sessionPayment = orders[0]?.Paymentmethod || "-";
    const sessionMethod = orders[0]?.method || "-";
    const sessionAddress = orders[0]?.address || "";

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="order-batch-${sessionTs}.pdf"`
    );
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
      doc.text(
        `${i + 1}. ${o.itemName} x${o.quantity} @ $${(o.price ?? 0).toFixed(2)} = $${(
          o.totalAmount || 0
        ).toFixed(2)}`
      );
    });
    doc.moveDown();
    doc.fontSize(12).text(`Total: $${grandTotal.toFixed(2)}`);

    const payload = {
      type: "BATCH",
      userId,
      sessionTs,
      orderIds: orders.map((o) => o._id),
    };
    const qrPng = await QRCode.toDataURL(JSON.stringify(payload));
    doc.moveDown().image(qrPng, { fit: [120, 120], align: "center" });

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
