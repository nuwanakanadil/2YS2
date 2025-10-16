// routes/auth.js or routes/customer.js
router.get("/customer/:id", auth, async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: "CUSTOMER" })
      .select("-password"); // don’t send password

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error("fetch customer error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


