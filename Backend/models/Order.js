// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId:           { type: String, required: true, index: true }, 
    canteenId:        { type: String, required: true, index: true },
    itemId:           { type: String, required: true },
    itemName:         { type: String, required: true },

    quantity:         { type: Number, required: true, min: 1 },
    price:            { type: Number, required: true },               
    
    totalAmount:      { type: Number, required: true, default: 0 },

    method:           { type: String, enum: ["delivery", "pickup"], required: true },
    address:          { type: String, default: "" },

    img:              { type: String },

    status:           { type: String, enum: ["pending", "placed"], default: "pending", index: true },
    expiresAt:        { type: Date, required: true },
    
    sessionTs:        { type: Number, index: true },
    
    Paymentmethod:    { type: String, enum: ["Cash", "Card"], required: true },

    promoCode:        { type: String, default: null },
    promoDiscount:    { type: Number, default: 0 },       
    sessionSubtotal:  { type: Number, default: 0 },
    sessionTotal:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
