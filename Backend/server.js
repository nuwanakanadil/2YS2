const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');

// ROUTES
const authRoutes = require('./route/auth');
const uploadRoutes = require('./route/userProfileImg');
const updateprfileRoutes = require('./route/updateUser');
const reviewRoutes = require('./route/reviews');
const productsRoutes = require('./route/getProductDetails');
const distance = require('./route/calculate_distance');
const cartRoutes = require('./route/cart');
const orderplacement = require('./route/orderPlacement');
const profileRoutes = require('./route/getUserDetailsRoute');
const managerprofile = require('./route/getManagerDetails');
const canteenRoutes = require('./route/canteen');
const inventoryRoutes = require('./route/inventory');
const analyticsRoutes = require('./route/analytics');
const addproduct = require('./route/addProduct');
const loadproducts = require('./route/loadProducts');
const updateproducts = require('./route/updateProducts');
const chatRoutes = require('./route/chat');
const promotionsRoutes = require('./route/promotions');
const salesReportRoutes = require('./route/salesReport');
const orderRatingsRouter = require('./route/orderRatings');
const canteenOrdersRouter = require('./route/canteenOrders');
const forgot = require('./route/userPasswordReset');
const staffRoutes = require('./route/staff');
const reportsRouter = require('./route/reports');
const managerPromotions = require('./route/manager_promotions');
const promoCode = require('./route/promo_code');
const deliveryRoute = require('./route/deliveryRoutes');

const { Server } = require('socket.io');

// MODELS (register with Mongoose; do NOT app.use models)
require('./models/User');
require('./models/Manager');   
require('./models/Canteen');
require('./models/StockUsage');

const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

(async () => {
  try {
    await connectDB();

    // --- DEBUGGING: make mongoose noisy in dev ---
    const mongoose = require('mongoose');

    async function fixUniversityIdIndex() {
      const mongoose = require('mongoose');
      const col = mongoose.connection.collection('users');

      // 1) remove explicit nulls
      await col.updateMany({ universityId: null }, { $unset: { universityId: "" } });

      // 2) drop legacy conflicting index (non-partial or wrong spec)
      const idxs = await col.indexes();
      const uniIdx = idxs.find(i => i.name === 'universityId_1');

      // If it exists but doesn't match our desired spec, drop it
      const isDesired =
        uniIdx &&
        uniIdx.unique === true &&
        uniIdx.key && uniIdx.key.universityId === 1 &&
        uniIdx.partialFilterExpression &&
        uniIdx.partialFilterExpression.universityId &&
        uniIdx.partialFilterExpression.universityId.$type === 'string';

      if (uniIdx && !isDesired) {
        console.log('Dropping legacy universityId_1 index…');
        await col.dropIndex('universityId_1').catch(() => {});
      }

      // 3) Let Mongoose recreate per schema (dev only)
      if (process.env.NODE_ENV !== 'production') {
        await mongoose.model('User').syncIndexes();
      }

      console.log('✅ universityId index OK');
    }


  await fixUniversityIdIndex();


    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', true); // logs queries, populate, etc.
      console.log('🔎 Mongoose debug ON');
    }

    // --- Ensure ADMIN exists (optional) ---
    await ensureAdmin();
    await ensurePromoOfficer();

    const app = express();

    // --- Simple request logger (no deps) ---
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms`);
      });
      next();
    });

    // Core middleware
    app.use(cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }));
    app.use(express.json());
    app.use(cookieParser());

    // Static
    app.use("/profile-images", express.static('profile-images'));
    app.use('/product-images', express.static('product-images'));
    app.use('/inventory-images', express.static('inventory-images'));
    app.use('/reports', express.static('reports'));

    // --- Create HTTP server FIRST ---
const server = http.createServer(app);

// --- Socket.IO ---
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', credentials: true }
});

// make io available to routes via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  // client should emit: socket.emit('join', { conversationId })
  socket.on('join', ({ conversationId }) => {
    if (conversationId) socket.join(String(conversationId));
  });

  // if you later want to send events:
  // socket.to(roomId).emit('newMessage', payload);
});


    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/auth', profileRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', updateprfileRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api', productsRoutes);
    app.use('/api', distance);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderplacement);
    app.use('/api/canteen', canteenRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/admin', require('./route/adminStats'));
    app.use('/api/products', addproduct);       // Add product
    app.use('/api/loadproducts', loadproducts); // Load products
    app.use('/api/products', updateproducts);
    app.use('/api', chatRoutes); 
    app.use('/api/auth', managerprofile);
    app.use('/api/promotions', promotionsRoutes);
    app.use('/api/sales', require('./route/sales'));
    app.use('/api/sales/reports', salesReportRoutes);
    app.use('/api/messaging', require('./route/messaging'));
    app.use('/api/customers-engagement', require('./route/customersEngagement'));
    app.use('/api', orderRatingsRouter);
    app.use('/api/canteen', canteenOrdersRouter);
    app.use('/api/auth/forgot', forgot); 
    app.use('/api/staff', staffRoutes);
    app.use('/api/reports', reportsRouter);
    app.use('/api/manager/promotions', managerPromotions);
    app.use('/api/promocode', promoCode);
    app.use('/api/delivery', deliveryRoute);
    
    // Start scheduled expiry sweep (optional)
    try {
      const { scheduleDailySweep } = require('./services/expirySweep');
      scheduleDailySweep();
      console.log('Scheduled expiry sweep started');
    } catch (err) {
      console.error('Could not start scheduled expiry sweep', err);
    }

    // Health
    app.get('/health', (req, res) => res.json({ ok: true }));

    // 404 (after all routes)
    app.use((req, res) => {
      res.status(404).json({ message: 'Not Found', path: req.originalUrl });
    });

    // Global error handler (return stack in dev)
    // To use: throw err or next(err) anywhere
    // If a route returns res.status(500).json(...), that will bypass this (that’s fine too).
    app.use((err, req, res, next) => {
      console.error('💥 Global error:', err);
      const payload = { message: 'Internal Server Error' };
      if (process.env.NODE_ENV !== 'production') {
        payload.details = err.message;
        payload.stack = err.stack;
      }
      res.status(500).json(payload);
    });

    // Catch unhandled errors
    process.on('unhandledRejection', (reason) => {
      console.error('🧨 Unhandled Rejection:', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('🧨 Uncaught Exception:', err);
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (e) {
    console.error('🚫 Server bootstrap failed:', e);
    process.exit(1);
  }
})();

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const pass  = process.env.ADMIN_PASSWORD;

  if (!email || !pass) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin seed');
    return;
  }

  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      firstName: process.env.ADMIN_FIRST || 'Nuwanaka',
      lastName:  process.env.ADMIN_LAST  || 'Nadil',
      email,
      password: pass,              // ⬅️ PLAIN: pre-save hook will hash once
      role: 'ADMIN',
      status: 'ACTIVE',
      country: 'Sri Lanka',
      language: 'English',
      timezone: 'GMT+5:30',
    });
    console.log('✅ Admin created:', admin.email);
  } else if (admin.role !== 'ADMIN') {
    admin.role = 'ADMIN';
    await admin.save();
    console.log('✅ Admin role enforced for:', admin.email);
  } else {
    console.log('✅ Admin exists:', admin.email);
  }
}

async function ensurePromoOfficer() {
  const email = (process.env.PROMO_EMAIL || '').toLowerCase().trim();
  const pass  = process.env.PROMO_PASSWORD;

  if (!email || !pass) {
    console.warn('⚠️  PROMO_EMAIL / PROMO_PASSWORD not set; skipping promo officer seed');
    return;
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName: process.env.PROMO_FIRST || 'Promo',
      lastName:  process.env.PROMO_LAST  || 'Officer',
      email,
      password: pass,              // ⬅️ PLAIN: pre-save hook will hash once
      role: 'PROMO_OFFICER',
      status: 'ACTIVE',
      // phone optional for PROMO_OFFICER in your schema
    });
    console.log('✅ Promo officer created:', user.email);
  } else {
    let changed = false;
    if (user.role !== 'PROMO_OFFICER') { user.role = 'PROMO_OFFICER'; changed = true; }
    if (user.status !== 'ACTIVE')      { user.status = 'ACTIVE';      changed = true; }
    if (changed) { await user.save(); console.log('✅ Promo officer enforced:', user.email); }
    else         { console.log('✅ Promo officer exists:', user.email); }
  }
}

