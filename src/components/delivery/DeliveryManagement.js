'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, Typography, Button, Chip, Box } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RestaurantIcon from '@mui/icons-material/Restaurant';

export default function DeliveryManagement() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId;

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/delivery/my-orders`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          const currentOrder = data.data.find(order => order._id === orderId);
          
          if (currentOrder) {
            setOrder(currentOrder);
          } else {
            router.push('/delivery/deliveryDashboard');
          }
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        router.push('/delivery/deliveryDashboard');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, router]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    
    try {
      const response = await fetch(`http://localhost:5000/api/delivery/update-order-status/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(prev => ({ ...prev, status: newStatus }));
        
        // Show success message
        let message = '';
        switch (newStatus) {
          case 'pending':
            message = 'Order status set to Pending';
            break;
          case 'out_for_delivery':
            message = 'Order is now Out for Delivery';
            break;
          case 'delivered':
            message = 'Order marked as Delivered!';
            break;
        }
        alert(message);
        
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'assigned':
        return 'info';
      case 'out_for_delivery':
        return 'primary';
      case 'delivered':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <RestaurantIcon />;
      case 'assigned':
        return <RestaurantIcon />;
      case 'out_for_delivery':
        return <LocalShippingIcon />;
      case 'delivered':
        return <CheckCircleIcon />;
      default:
        return <RestaurantIcon />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6F4E37] mx-auto mb-4"></div>
          <Typography variant="h6" className="text-[#6F4E37]">
            Loading order details...
          </Typography>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] flex items-center justify-center">
        <Typography variant="h6" className="text-[#6F4E37]">
          Order not found
        </Typography>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h4" className="font-bold text-[#6F4E37] mb-2">
                Order Management
              </Typography>
              <Typography variant="h6" className="text-gray-600">
                Order ID: {order._id.slice(-8)}
              </Typography>
            </div>
            <Button 
              variant="outlined" 
              onClick={() => router.push('deliveryDashboard')}
              className="border-[#6F4E37] text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Order Details Card */}
        <Card className="bg-white rounded-xl shadow-lg">
          <CardContent className="p-6">
            <Typography variant="h5" className="font-bold text-[#6F4E37] mb-6">
              Order Details
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Image and Info */}
              <div>
                {order.img && (
                  <img
                    src={`http://localhost:5000/${order.img}`}
                    alt={order.itemName}
                    className="w-full h-48 object-cover rounded-lg mb-4 shadow-md"
                  />
                )}
                
                <div className="space-y-3">
                  <div>
                    <Typography variant="h6" className="font-semibold text-[#6F4E37]">
                      {order.itemName}
                    </Typography>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Typography variant="body2" className="text-gray-600">
                        Quantity:
                      </Typography>
                      <Typography variant="body1" className="font-semibold">
                        {order.quantity}
                      </Typography>
                    </div>
                    
                    <div>
                      <Typography variant="body2" className="text-gray-600">
                        Total Amount:
                      </Typography>
                      <Typography variant="body1" className="font-semibold text-[#4CAF50]">
                        ₹{order.price * order.quantity}
                      </Typography>
                    </div>
                  </div>
                  
                  <div>
                    <Typography variant="body2" className="text-gray-600 mb-2">
                      Current Status:
                    </Typography>
                    <Chip 
                      icon={getStatusIcon(order.status)}
                      label={order.status.replace('_', ' ').toUpperCase()} 
                      color={getStatusColor(order.status)}
                      className="font-semibold"
                    />
                  </div>
                </div>
              </div>
              
              {/* Order Timestamps */}
              <div className="space-y-4">
                <div>
                  <Typography variant="body2" className="text-gray-600">
                    Order Placed:
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {new Date(order.createdAt).toLocaleString()}
                  </Typography>
                </div>
                
                <div>
                  <Typography variant="body2" className="text-gray-600">
                    Assigned At:
                  </Typography>
                  <Typography variant="body1" className="font-semibold">
                    {new Date(order.assignedAt).toLocaleString()}
                  </Typography>
                </div>
                
                {order.estimatedDeliveryTime && (
                  <div>
                    <Typography variant="body2" className="text-gray-600">
                      Estimated Delivery:
                    </Typography>
                    <Typography variant="body1" className="font-semibold">
                      {new Date(order.estimatedDeliveryTime).toLocaleString()}
                    </Typography>
                  </div>
                )}
                
                {order.deliveredAt && (
                  <div>
                    <Typography variant="body2" className="text-gray-600">
                      Delivered At:
                    </Typography>
                    <Typography variant="body1" className="font-semibold text-[#4CAF50]">
                      {new Date(order.deliveredAt).toLocaleString()}
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card className="bg-white rounded-xl shadow-lg">
          <CardContent className="p-6">
            <Typography variant="h5" className="font-bold text-[#6F4E37] mb-4">
              Delivery Location
            </Typography>
            
            <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <LocationOnIcon className="text-[#FF4081] mt-1" sx={{ fontSize: 28 }} />
              <div>
                <Typography variant="subtitle1" className="font-semibold text-[#6F4E37]">
                  Delivery Address
                </Typography>
                <Typography variant="body1" className="text-gray-700 mt-1">
                  {order.address || 'Address not provided'}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Update Buttons */}
        <Card className="bg-white rounded-xl shadow-lg">
          <CardContent className="p-6">
            <Typography variant="h5" className="font-bold text-[#6F4E37] mb-6">
              Update Order Status
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pending Button */}
              <Button
                variant={order.status === 'pending' ? 'contained' : 'outlined'}
                onClick={() => handleStatusUpdate('pending')}
                disabled={updatingStatus || order.status === 'delivered'}
                className={`py-3 px-6 font-semibold ${
                  order.status === 'pending'
                    ? 'bg-[#FF9800] hover:bg-[#F57C00] text-white'
                    : 'border-[#FF9800] text-[#FF9800] hover:bg-[#FF9800] hover:text-white'
                }`}
                startIcon={<RestaurantIcon />}
              >
                {updatingStatus && order.status !== 'pending' ? 'Updating...' : 'Pending'}
              </Button>

              {/* Out for Delivery Button */}
              <Button
                variant={order.status === 'out_for_delivery' ? 'contained' : 'outlined'}
                onClick={() => handleStatusUpdate('out_for_delivery')}
                disabled={updatingStatus || order.status === 'delivered'}
                className={`py-3 px-6 font-semibold ${
                  order.status === 'out_for_delivery'
                    ? 'bg-[#2196F3] hover:bg-[#1976D2] text-white'
                    : 'border-[#2196F3] text-[#2196F3] hover:bg-[#2196F3] hover:text-white'
                }`}
                startIcon={<LocalShippingIcon />}
              >
                {updatingStatus && order.status !== 'out_for_delivery' ? 'Updating...' : 'Out for Delivery'}
              </Button>

              {/* Delivered Button */}
              <Button
                variant={order.status === 'delivered' ? 'contained' : 'outlined'}
                onClick={() => handleStatusUpdate('delivered')}
                disabled={updatingStatus}
                className={`py-3 px-6 font-semibold ${
                  order.status === 'delivered'
                    ? 'bg-[#4CAF50] hover:bg-[#388E3C] text-white'
                    : 'border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white'
                }`}
                startIcon={<CheckCircleIcon />}
              >
                {updatingStatus && order.status !== 'delivered' ? 'Updating...' : 'Delivered'}
              </Button>
            </div>
            
            {order.status === 'delivered' && (
              <div className="text-center mt-6 p-4 bg-green-50 rounded-lg">
                <CheckCircleIcon sx={{ fontSize: 48, color: '#4CAF50' }} />
                <Typography variant="h6" className="text-[#4CAF50] mt-2 font-semibold">
                  Order Successfully Delivered!
                </Typography>
                <Typography variant="body2" className="text-gray-600 mt-1">
                  Thank you for completing this delivery.
                </Typography>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}