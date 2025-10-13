// route/announcements.js
const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const Announcement = require("../models/Announcement");
const Canteen = require("../models/Canteen");

// List
router.get("/", auth, async (req, res) => {
  try {
    const { canteenId, audience, search, active } = req.query;
    const filter = {};

    if (canteenId) filter.canteen = canteenId;
    if (audience) filter.targetAudience = audience;
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    if (search?.trim()) {
      filter.$or = [
        { title:   { $regex: search.trim(), $options: "i" } },
        { message: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const list = await Announcement.find(filter)
      .populate("canteen", "name")
      // Adjust these fields to match your Manager schema
      .populate("postedBy", "firstName lastName email role")
      .sort({ date: -1, createdAt: -1 });

    res.json(list);
  } catch (e) {
    console.error("GET /api/announcements error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Create
router.post("/", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const { title, message, canteen, targetAudience, date, isActive } = req.body;

    if (!title || !canteen || !date) {
      return res.status(400).json({ message: "title, canteen, and date are required" });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "date must be a valid ISO date (YYYY-MM-DD)" });
    }

    const doc = await Announcement.create({
      title,
      message,
      canteen,
      targetAudience: targetAudience || "ALL",
      date: parsedDate,
      isActive: isActive !== undefined ? !!isActive : true,
      postedBy: req.user.id, // now guaranteed to exist
    });

    res.status(201).json(doc);
  } catch (e) {
    if (e.name === "ValidationError") {
      return res.status(400).json({ message: "Validation failed", errors: e.errors });
    }
    console.error("POST /api/announcements error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Update
router.put("/:id", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.date) {
      const d = new Date(updates.date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: "date must be a valid ISO date (YYYY-MM-DD)" });
      }
      updates.date = d;
    }
    // Prevent changing postedBy via update
    delete updates.postedBy;

    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true } // ensure enum/required checks run
    );

    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    if (e.name === "ValidationError") {
      return res.status(400).json({ message: "Validation failed", errors: e.errors });
    }
    console.error("PUT /api/announcements/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete
router.delete("/:id", auth, requireRole(["ADMIN", "MANAGER"]), async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Announcement deleted" });
  } catch (e) {
    console.error("DELETE /api/announcements/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper for form select: list canteens
router.get("/canteens", auth, async (_req, res) => {
  try {
    const items = await Canteen.find({}, "name").sort({ name: 1 });
    res.json(items);
  } catch (e) {
    console.error("GET /api/announcements/canteens error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
