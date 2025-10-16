// route/products.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Product = require('../models/Product');
const Canteen = require('../models/Canteen');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'product-images'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safe);
  },
});
const fileFilter = (req, file, cb) => {
  const ok = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(ok.includes(ext) ? null : new Error('Only image files are allowed'), ok.includes(ext));
};
const upload = multer({ storage, fileFilter });

/**
 * GET /api/products/:id
 * Returns one product owned by the logged-in manager (403 if not yours).
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('_id');
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    const product = await Product.findOne({ _id: req.params.id, canteenId: canteen._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    return res.json({ product });
  } catch (err) {
    console.error('GET /products/:id error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/products/:id
 * body (multipart/form-data): name?, description?, price?, image?
 * Updates only provided fields. Image optional.
 */
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('_id');
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    // Ensure the product belongs to this canteen
    const product = await Product.findOne({ _id: req.params.id, canteenId: canteen._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { name, description, price } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ message: 'name cannot be empty' });
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: 'price must be a non-negative number' });
      }
      product.price = numericPrice;
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;

    // Handle optional image replacement
    if (req.file) {
      const newPath = `product-images/${req.file.filename}`;
      // delete old image if exists and is within product-images
      if (product.image && product.image.startsWith('product-images/')) {
        fs.unlink(product.image, (e) => {
          if (e) console.warn('Could not remove old product image:', e.message);
        });
      }
      product.image = newPath;
    }

    await product.save();
    return res.json({ message: 'Product updated', product });
  } catch (err) {
    console.error('PUT /products/:id error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
