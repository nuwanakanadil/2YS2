const express = require('express');
const PDFDocument = require('pdfkit');
const DeliveryPerson = require('../models/DeliveryPerson');
const Order = require('../models/Order');
const { verifyDeliveryAuth, verifyDeliveryVerified, checkDeliveryStatus, verifyDeliveryAdmin } = require('../middleware/deliveryAuthMiddleware');

const router = express.Router();

// GET /api/delivery/profile - Get delivery person profile
router.get('/profile', verifyDeliveryAuth, async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.userId).select('-password');
    
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    res.json({
      success: true,
      data: deliveryPerson
    });
  } catch (error) {
    console.error('Get delivery profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/delivery/profile - Update delivery person profile
router.put('/profile', verifyDeliveryAuth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      vehicleType,
      vehicleNumber,
      deliveryArea,
      emergencyContact
    } = req.body;

    const updates = {};
    
    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();
    if (phone) updates.phone = phone.trim();
    if (vehicleType) updates.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) updates.vehicleNumber = vehicleNumber.trim();
    if (deliveryArea !== undefined) updates.deliveryArea = deliveryArea.trim();
    if (emergencyContact) updates.emergencyContact = emergencyContact;

    const updatedDeliveryPerson = await DeliveryPerson.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedDeliveryPerson
    });
  } catch (error) {
    console.error('Update delivery profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/delivery/status - Update delivery status
router.put('/status', verifyDeliveryAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['available', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: available, busy, or offline' });
    }

    const updatedDeliveryPerson = await DeliveryPerson.findByIdAndUpdate(
      req.userId,
      { currentStatus: status },
      { new: true }
    ).select('currentStatus firstName lastName');

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: { 
        currentStatus: updatedDeliveryPerson.currentStatus,
        name: `${updatedDeliveryPerson.firstName} ${updatedDeliveryPerson.lastName}`
      }
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/statistics - Get delivery statistics
router.get('/statistics', verifyDeliveryAuth, async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findById(req.userId).select(
      'totalDeliveries rating currentStatus isVerified'
    );

    res.json({
      success: true,
      data: {
        totalDeliveries: deliveryPerson.totalDeliveries,
        rating: deliveryPerson.rating,
        currentStatus: deliveryPerson.currentStatus,
        isVerified: deliveryPerson.isVerified
      }
    });
  } catch (error) {
    console.error('Get delivery statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/pending-orders - Get pending orders for delivery
router.get('/pending-orders', verifyDeliveryAuth, async (req, res) => {
  try {
    // Only get orders that are pending and require delivery
    const pendingOrders = await Order.find({
      method: 'delivery',
      status: 'pending',
      deliveryPersonId: null,
      expiresAt: { $gt: new Date() } // Not expired
    })
    .sort({ createdAt: -1 })
    .lean();

    res.json({
      success: true,
      data: pendingOrders
    });
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/delivery/accept-order/:orderId - Accept an order
router.post('/accept-order/:orderId', verifyDeliveryAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const deliveryPersonId = req.userId;

    // Check if delivery person is available
    const deliveryPerson = await DeliveryPerson.findById(deliveryPersonId);
    if (deliveryPerson.currentStatus !== 'available') {
      return res.status(400).json({ 
        message: 'You must be available to accept orders' 
      });
    }

    // Find the order and check if it's still available
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Order is no longer available for assignment' 
      });
    }

    if (order.deliveryPersonId) {
      return res.status(400).json({ 
        message: 'Order has already been assigned to another delivery person' 
      });
    }

    if (new Date(order.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ 
        message: 'Order has expired' 
      });
    }

    if (order.method !== 'delivery') {
      return res.status(400).json({ 
        message: 'This order does not require delivery' 
      });
    }

    // Assign the order to delivery person
    const estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    
    await Order.findByIdAndUpdate(orderId, {
      deliveryPersonId: deliveryPersonId,
      status: 'assigned',
      assignedAt: new Date(),
      estimatedDeliveryTime: estimatedDeliveryTime
    });

    // Update delivery person status to busy
    await DeliveryPerson.findByIdAndUpdate(deliveryPersonId, {
      currentStatus: 'busy'
    });

    res.json({
      success: true,
      message: 'Order accepted successfully',
      data: {
        orderId: orderId,
        estimatedDeliveryTime: estimatedDeliveryTime
      }
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/delivery/decline-order/:orderId - Decline an order (optional logging)
router.post('/decline-order/:orderId', verifyDeliveryAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Just log the decline action - order remains available for other delivery persons
    console.log(`Delivery person ${req.userId} declined order ${orderId}`);
    
    res.json({
      success: true,
      message: 'Order declined'
    });
  } catch (error) {
    console.error('Decline order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/my-orders - Get assigned orders for delivery person
router.get('/my-orders', verifyDeliveryAuth, async (req, res) => {
  try {
    const assignedOrders = await Order.find({
      deliveryPersonId: req.userId
    })
    .sort({ assignedAt: -1 })
    .lean();

    res.json({
      success: true,
      data: assignedOrders
    });
  } catch (error) {
    console.error('Get assigned orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/delivery/update-order-status/:orderId - Update order status
router.put('/update-order-status/:orderId', verifyDeliveryAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const deliveryPersonId = req.userId;

    // Validate status
    const validStatuses = ['pending', 'assigned', 'out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the order and verify it belongs to this delivery person
    const order = await Order.findOne({
      _id: orderId,
      deliveryPersonId: deliveryPersonId
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found or not assigned to you' 
      });
    }

    // Update order status
    const updateData = { status };
    
    // Add completion timestamp if delivered
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      
      // Update delivery person status back to available and increment total deliveries
      await DeliveryPerson.findByIdAndUpdate(deliveryPersonId, {
        currentStatus: 'available',
        $inc: { totalDeliveries: 1 }
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/revenue-stats - Get delivery revenue statistics
router.get('/revenue-stats', verifyDeliveryAuth, async (req, res) => {
  try {
    const deliveryPersonId = req.userId;
    
    // Get completed orders for this delivery person
    const completedOrders = await Order.find({
      deliveryPersonId: deliveryPersonId,
      status: 'delivered'
    });

    // Calculate revenue statistics
    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + (order.price * order.quantity * 0.05); // 5% commission
    }, 0);
    
    const totalOrderValue = completedOrders.reduce((sum, order) => {
      return sum + (order.price * order.quantity);
    }, 0);
    
    // Get recent orders (last 10)
    const recentOrders = completedOrders
      .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))
      .slice(0, 10)
      .map(order => ({
        itemName: order.itemName,
        deliveredAt: order.deliveredAt,
        orderValue: order.price * order.quantity,
        commission: order.price * order.quantity * 0.05
      }));

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrderValue: parseFloat(totalOrderValue.toFixed(2)),
        averageCommissionPerOrder: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get revenue statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/download-report - Generate and download PDF report
router.get('/download-report', verifyDeliveryAuth, async (req, res) => {
  try {
    const deliveryPersonId = req.userId;
    
    // Get delivery person details
    const deliveryPerson = await DeliveryPerson.findById(deliveryPersonId).select('-password');
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    // Get completed orders for this delivery person
    const completedOrders = await Order.find({
      deliveryPersonId: deliveryPersonId,
      status: 'delivered'
    }).sort({ deliveredAt: -1 });

    // Calculate total revenue (5% of each order)
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + (order.price * order.quantity * 0.05);
    }, 0);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers for PDF download
    const filename = `MealMatrix_DeliveryReport_${deliveryPerson.firstName}_${deliveryPerson.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Header Section with MealMatrix Branding
    const pageWidth = doc.page.width - 100;
    
    // Background header rectangle
    doc.rect(50, 50, pageWidth, 120)
       .fillAndStroke('#6F4E37', '#6F4E37');
    
    // MealMatrix Logo/Title
    doc.fillColor('#FFFFFF')
       .fontSize(32)
       .font('Helvetica-Bold')
       .text('MealMatrix', 70, 80);
    
    doc.fillColor('#FF4081')
       .fontSize(16)
       .font('Helvetica')
       .text('Delivery Performance Report', 70, 120);
    
    doc.fillColor('#FFFFFF')
       .fontSize(12)
       .text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, 400, 85);

    // Delivery Person Information Section
    let yPosition = 200;
    
    doc.fillColor('#6F4E37')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Delivery Person Information', 50, yPosition);
    
    yPosition += 30;
    
    const infoData = [
      ['Name:', `${deliveryPerson.firstName} ${deliveryPerson.lastName}`],
      ['Email:', deliveryPerson.email],
      ['Phone:', deliveryPerson.phone],
      ['University ID:', deliveryPerson.universityId],
      ['Vehicle Type:', deliveryPerson.vehicleType],
      ['Total Deliveries:', deliveryPerson.totalDeliveries.toString()],
      ['Current Rating:', `${deliveryPerson.rating}/5.0`],
      ['Delivery Area:', deliveryPerson.deliveryArea || 'Not specified']
    ];

    doc.fillColor('#333333')
       .fontSize(12)
       .font('Helvetica');
    
    infoData.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, 50, yPosition, { width: 150 });
      doc.font('Helvetica').text(value, 200, yPosition);
      yPosition += 20;
    });

    // Revenue Summary Section
    yPosition += 20;
    
    doc.rect(50, yPosition, pageWidth, 80)
       .fillAndStroke('#FF4081', '#FF4081');
    
    doc.fillColor('#FFFFFF')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Revenue Summary', 70, yPosition + 15);
    
    doc.fontSize(24)
       .text(`₹${totalRevenue.toFixed(2)}`, 70, yPosition + 40);
    
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total earnings from ${completedOrders.length} completed deliveries`, 70, yPosition + 65);
    
    doc.fontSize(10)
       .text('(5% commission per order)', 400, yPosition + 50);

    yPosition += 110;

    // Orders Table Section
    if (completedOrders.length > 0) {
      doc.fillColor('#6F4E37')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Completed Orders', 50, yPosition);
      
      yPosition += 30;
      
      // Table headers
      const tableTop = yPosition;
      const itemX = 50;
      const dateX = 150;
      const quantityX = 280;
      const amountX = 340;
      const commissionX = 420;
      const statusX = 500;
      
      doc.fillColor('#F5F5F5')
         .rect(50, yPosition - 5, pageWidth, 25)
         .fill();
      
      doc.fillColor('#333333')
         .fontSize(10)
         .font('Helvetica-Bold');
      
      doc.text('Item', itemX, yPosition);
      doc.text('Date', dateX, yPosition);
      doc.text('Qty', quantityX, yPosition);
      doc.text('Amount', amountX, yPosition);
      doc.text('Commission', commissionX, yPosition);
      doc.text('Status', statusX, yPosition);
      
      yPosition += 20;
      
      // Draw line under headers
      doc.strokeColor('#CCCCCC')
         .lineWidth(1)
         .moveTo(50, yPosition)
         .lineTo(50 + pageWidth, yPosition)
         .stroke();
      
      yPosition += 10;
      
      // Table rows
      doc.font('Helvetica')
         .fontSize(9);
      
      completedOrders.slice(0, 20).forEach((order, index) => { // Limit to 20 orders to fit on page
        if (yPosition > 700) { // Check if we need a new page
          doc.addPage();
          yPosition = 50;
        }
        
        const orderAmount = order.price * order.quantity;
        const commission = orderAmount * 0.05;
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
        
        doc.fillColor(bgColor)
           .rect(50, yPosition - 5, pageWidth, 20)
           .fill();
        
        doc.fillColor('#333333');
        
        doc.text(order.itemName.substring(0, 15), itemX, yPosition);
        doc.text(new Date(order.deliveredAt).toLocaleDateString(), dateX, yPosition);
        doc.text(order.quantity.toString(), quantityX, yPosition);
        doc.text(`₹${orderAmount.toFixed(2)}`, amountX, yPosition);
        doc.text(`₹${commission.toFixed(2)}`, commissionX, yPosition);
        doc.text('Delivered', statusX, yPosition);
        
        yPosition += 20;
      });
      
      if (completedOrders.length > 20) {
        yPosition += 10;
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Oblique')
           .text(`... and ${completedOrders.length - 20} more orders`, 50, yPosition);
      }
    } else {
      doc.fillColor('#666666')
         .fontSize(14)
         .font('Helvetica')
         .text('No completed orders found.', 50, yPosition);
    }

    // Footer
    const bottomMargin = doc.page.height - 100;
    
    doc.rect(50, bottomMargin, pageWidth, 50)
       .fillAndStroke('#6F4E37', '#6F4E37');
    
    doc.fillColor('#FFFFFF')
       .fontSize(10)
       .font('Helvetica')
       .text('MealMatrix - Connecting You with Delicious Meals', 70, bottomMargin + 15);
    
    doc.text('This is an automated report. For queries, contact support@mealmatrix.com', 70, bottomMargin + 30);
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Generate PDF report error:', error);
    res.status(500).json({ message: 'Error generating PDF report' });
  }
});

// =============== ADMIN ROUTES ===============

// GET /api/delivery/admin/delivery-persons - Get all delivery persons (Admin only)
router.get('/admin/delivery-persons', verifyDeliveryAuth, verifyDeliveryAdmin, async (req, res) => {
  try {
    // First, let's get ALL delivery persons to see what we have
    const allDeliveryPersons = await DeliveryPerson.find({})
      .select('-password')
      .lean();
    
    console.log('All delivery persons in database:', allDeliveryPersons.length);
    console.log('Delivery persons roles:', allDeliveryPersons.map(p => ({ name: `${p.firstName} ${p.lastName}`, role: p.role })));
    
    // Filter for delivery persons (excluding admins)
    const deliveryPersons = allDeliveryPersons.filter(person => 
      person.role === 'delivery_person' || !person.role // Include records without role field
    );
    
    console.log('Filtered delivery persons:', deliveryPersons.length);
    
    res.json({
      success: true,
      data: deliveryPersons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      total: deliveryPersons.length
    });
  } catch (error) {
    console.error('Get delivery persons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/delivery/admin/delivery-person/:id - Delete delivery person (Admin only)
router.delete('/admin/delivery-person/:id', verifyDeliveryAuth, verifyDeliveryAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the delivery person
    const deliveryPerson = await DeliveryPerson.findById(id);
    
    if (!deliveryPerson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery person not found' 
      });
    }
    
    // Don't allow deleting admin accounts
    if (deliveryPerson.role === 'delivery_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot delete admin accounts' 
      });
    }
    
    // Check if delivery person has active orders
    const activeOrders = await Order.find({
      deliveryPersonId: id,
      status: { $in: ['assigned', 'out_for_delivery'] }
    });
    
    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete delivery person with active orders. Please complete or reassign orders first.' 
      });
    }
    
    // Delete the delivery person
    await DeliveryPerson.findByIdAndDelete(id);
    
    // Update any completed orders to remove reference
    await Order.updateMany(
      { deliveryPersonId: id },
      { $unset: { deliveryPersonId: 1 } }
    );
    
    res.json({
      success: true,
      message: `Delivery person ${deliveryPerson.firstName} ${deliveryPerson.lastName} deleted successfully`
    });
  } catch (error) {
    console.error('Delete delivery person error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/admin/statistics - Get admin statistics (Admin only)
router.get('/admin/statistics', verifyDeliveryAuth, verifyDeliveryAdmin, async (req, res) => {
  try {
    const totalDeliveryPersons = await DeliveryPerson.countDocuments({ role: 'delivery_person' });
    const activeDeliveryPersons = await DeliveryPerson.countDocuments({ 
      role: 'delivery_person', 
      currentStatus: { $in: ['available', 'busy'] } 
    });
    const totalOrders = await Order.countDocuments({ method: 'delivery' });
    const completedOrders = await Order.countDocuments({ 
      method: 'delivery', 
      status: 'delivered' 
    });
    const pendingOrders = await Order.countDocuments({ 
      method: 'delivery', 
      status: 'pending' 
    });
    
    res.json({
      success: true,
      data: {
        totalDeliveryPersons,
        activeDeliveryPersons,
        totalOrders,
        completedOrders,
        pendingOrders
      }
    });
  } catch (error) {
    console.error('Get admin statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/admin/fix-roles - Fix missing role fields (Admin only)
router.post('/admin/fix-roles', verifyDeliveryAuth, verifyDeliveryAdmin, async (req, res) => {
  try {
    // Find all delivery persons without role or with undefined role
    const personsWithoutRole = await DeliveryPerson.find({
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: undefined }
      ]
    });
    
    console.log('Found persons without role:', personsWithoutRole.length);
    
    // Update them to have delivery_person role (excluding any that might be admin based on email)
    const updates = [];
    for (const person of personsWithoutRole) {
      // Don't change admin emails to delivery_person
      if (!person.email.includes('admin')) {
        const result = await DeliveryPerson.findByIdAndUpdate(
          person._id,
          { role: 'delivery_person' },
          { new: true }
        );
        updates.push(`${person.firstName} ${person.lastName}`);
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${updates.length} delivery persons with role field`,
      updated: updates
    });
  } catch (error) {
    console.error('Fix roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/delivery/admin/debug - Debug delivery persons (Admin only)
router.get('/admin/debug', verifyDeliveryAuth, verifyDeliveryAdmin, async (req, res) => {
  try {
    const allPersons = await DeliveryPerson.find({}).select('firstName lastName email role').lean();
    
    res.json({
      success: true,
      total: allPersons.length,
      persons: allPersons,
      breakdown: {
        withRole: allPersons.filter(p => p.role).length,
        withoutRole: allPersons.filter(p => !p.role).length,
        admins: allPersons.filter(p => p.role === 'delivery_admin').length,
        deliveryPersons: allPersons.filter(p => p.role === 'delivery_person').length
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;