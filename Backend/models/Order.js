// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId:           { type: String, required: true, index: true }, // keep as String if that's what your tokens use
    canteenId:        { type: String, required: true, index: true },
    itemId:           { type: String, required: true },
    itemName:         { type: String, required: true },

    quantity:         { type: Number, required: true, min: 1 },
    price:            { type: Number, required: true },               // unit price (from Product)

    // ⬇️ NEW: per-line total (used by UI and bill). This is updated by /finalize.
    totalAmount:      { type: Number, required: true, default: 0 },

    method:           { type: String, enum: ["delivery", "pickup"], required: true },
    address:          { type: String, default: "" },

    img:              { type: String },

    status:           { type: String, enum: ["pending", "placed"], default: "pending", index: true },
    expiresAt:        { type: Date, required: true },

    // ⬇️ NEW: session anchor so a batch of orders can be finalized together
    sessionTs:        { type: Number, index: true },

    // ⬇️ NEW: keep the payment method you save in routes
    Paymentmethod:    { type: String, enum: ["Cash", "Card"], required: true },

    // promo & session totals (set by /api/orders/finalize)
    promoCode:        { type: String, default: null },
    promoDiscount:    { type: Number, default: 0 },        // session-level snapshot on each line
    sessionSubtotal:  { type: Number, default: 0 },
    sessionTotal:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
