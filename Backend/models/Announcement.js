// models/Announcement.js
const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },

    // Which canteen this announcement belongs to
    canteen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Canteen",
      required: true,
      index: true,
    },

    // Audience in your canteen system
    targetAudience: {
      type: String,
      enum: ["ALL", "CUSTOMERS", "DELIVERIES", "MANAGERS"],
      default: "ALL",
      index: true,
    },

    // Manager/Admin who posted (change to "User" if your admins are Users)
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
      index: true,
    },

    // Effective date shown in UI (not createdAt)
    date: { type: Date, required: true, index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", AnnouncementSchema);
