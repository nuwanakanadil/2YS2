'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Typography, Button, Chip, Box, Switch, FormControlLabel, Alert } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TimerIcon from '@mui/icons-material/Timer';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';

function formatTimeRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(null);
  const [deliveryPersonInfo, setDeliveryPersonInfo] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const router = useRouter();

  // Fetch delivery person info
  useEffect(() => {
    const fetchDeliveryPersonInfo = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/delivery/profile', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setDeliveryPersonInfo(data.data);
          console.log('Delivery person info:', data.data); // Debug log
        } else {
          // If not authenticated, redirect to login
          router.push('/delivery/delivery-signin');
        }
      } catch (error) {
        console.error('Error fetching delivery person info:', error);
        router.push('/delivery/delivery-signin');
      }
    };

    const fetchRevenueStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/delivery/revenue-stats', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setRevenueStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching revenue stats:', error);
      }
    };

    fetchDeliveryPersonInfo();
    fetchRevenueStats();
  }, [router]);

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/delivery/pending-orders', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.data);
      } else {
        console.error('Failed to fetch pending orders');
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    
    // Refresh orders every 10 seconds
    const interval = setInterval(fetchPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Timer for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders(prevOrders => [...prevOrders]); // Force re-render for countdown
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const handleAcceptOrder = async (orderId) => {
    setProcessingOrder(orderId);
    
    try {
      const response = await fetch(`http://localhost:5000/api/delivery/accept-order/${orderId}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('Order accepted successfully!');
        
        // Remove the accepted order from the list
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        
        // Redirect to delivery management page
        router.push(`/delivery/delivery-management/${orderId}`);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Error accepting order. Please try again.');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleDeclineOrder = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/delivery/decline-order/${orderId}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Remove the declined order from the list (optional UX improvement)
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        // Note: The order remains available for other delivery persons
      }
    } catch (error) {
      console.error('Error declining order:', error);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async () => {
    if (!deliveryPersonInfo) return;
    
    setStatusUpdateLoading(true);
    const newStatus = deliveryPersonInfo.currentStatus === 'available' ? 'offline' : 'available';
    
    try {
      const response = await fetch('http://localhost:5000/api/delivery/status', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeliveryPersonInfo(prev => ({
          ...prev,
          currentStatus: data.data.currentStatus
        }));
        setStatusMessage(`Status updated to ${data.data.currentStatus}`);
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setStatusMessage(errorData.message || 'Failed to update status');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setStatusMessage('Error updating status. Please try again.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/delivery-logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('deliveryEmail');
        localStorage.removeItem('deliveryUserId');
        
        // Redirect to login
        router.push('/delivery/delivery-signin');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even if logout fails
      router.push('/delivery/delivery-signin');
    }
  };

  // Handle PDF download
  const handleDownloadReport = async () => {
    try {
      setStatusMessage('Generating PDF report...');
      
      const response = await fetch('http://localhost:5000/api/delivery/download-report', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Get the blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Extract filename from response headers or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'MealMatrix_DeliveryReport.pdf';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/); 
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setStatusMessage('Report downloaded successfully!');
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setStatusMessage(errorData.message || 'Failed to generate report');
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      setStatusMessage('Error downloading report. Please try again.');
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6F4E37] mx-auto mb-4"></div>
          <Typography variant="h6" className="text-[#6F4E37]">
            Loading delivery dashboard...
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <PersonIcon className="text-[#6F4E37] mr-3" sx={{ fontSize: 32 }} />
              <div>
                <Typography variant="h4" className="font-bold text-[#6F4E37] mb-1">
                  Delivery Dashboard
                </Typography>
                {deliveryPersonInfo && (
                  <Typography variant="h6" className="text-gray-600">
                    Welcome back, {deliveryPersonInfo.firstName} {deliveryPersonInfo.lastName}
                  </Typography>
                )}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Status Display and Toggle */}
              <div className="flex items-center gap-3">
                <Chip 
                  label={deliveryPersonInfo?.currentStatus || 'offline'} 
                  color={deliveryPersonInfo?.currentStatus === 'available' ? 'success' : 
                         deliveryPersonInfo?.currentStatus === 'busy' ? 'warning' : 'default'}
                  className="font-semibold"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={deliveryPersonInfo?.currentStatus === 'available'}
                      onChange={handleStatusToggle}
                      disabled={statusUpdateLoading || deliveryPersonInfo?.currentStatus === 'busy'}
                      color="success"
                    />
                  }
                  label={deliveryPersonInfo?.currentStatus === 'available' ? 'Online' : 'Offline'}
                  className="text-gray-700"
                />
              </div>
              
              {/* Rating and Logout */}
              <div className="flex items-center gap-2">
                <Chip 
                  label={`Rating: ${deliveryPersonInfo?.rating || 0}/5`} 
                  variant="outlined"
                  className="border-[#6F4E37] text-[#6F4E37]"
                />
                <Button
                  variant="outlined"
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                  className="border-[#FF4081] text-[#FF4081] hover:bg-[#FF4081] hover:text-white"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
          
          {/* Status Message */}
          {statusMessage && (
            <Alert 
              severity={statusMessage.includes('Error') || statusMessage.includes('Failed') ? 'error' : 'success'}
              className="mt-4"
              onClose={() => setStatusMessage('')}
            >
              {statusMessage}
            </Alert>
          )}
          
          {/* Status Warning */}
          {deliveryPersonInfo?.currentStatus !== 'available' && (
            <Alert severity="warning" className="mt-4">
              You are currently {deliveryPersonInfo?.currentStatus}. 
              {deliveryPersonInfo?.currentStatus === 'offline' && ' Turn on your status to start accepting orders.'}
              {deliveryPersonInfo?.currentStatus === 'busy' && ' Complete your current delivery to accept new orders.'}
            </Alert>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-[#6F4E37] to-[#8B5A42] text-white">
            <CardContent className="text-center">
              <Typography variant="h4" className="font-bold">
                {orders.length}
              </Typography>
              <Typography variant="body1">
                Available Orders
              </Typography>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-[#FF4081] to-[#FF6B9D] text-white">
            <CardContent className="text-center">
              <Typography variant="h4" className="font-bold">
                {deliveryPersonInfo?.totalDeliveries || 0}
              </Typography>
              <Typography variant="body1">
                Total Deliveries
              </Typography>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] text-white">
            <CardContent className="text-center">
              <Typography variant="h4" className="font-bold">
                {deliveryPersonInfo?.rating || 0}/5
              </Typography>
              <Typography variant="body1">
                Your Rating
              </Typography>
            </CardContent>
          </Card>
        </div>

        {/* Reports Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <AssessmentIcon className="text-[#6F4E37] mr-2" sx={{ fontSize: 24 }} />
                <Typography variant="h5" className="font-bold text-[#6F4E37]">
                  Performance Reports
                </Typography>
              </div>
              <Typography variant="body2" className="text-gray-600">
                Download your delivery performance report including completed orders and revenue summary.
              </Typography>
            </div>
            
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
              className="bg-[#6F4E37] hover:bg-[#8B5A42] text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg"
              size="large"
            >
              Download PDF Report
            </Button>
          </div>
          
          {/* Report Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] text-white p-4 rounded-lg">
              <Typography variant="h6" className="font-bold">
                Completed Orders
              </Typography>
              <Typography variant="h4" className="font-bold">
                {revenueStats?.totalOrders || deliveryPersonInfo?.totalDeliveries || 0}
              </Typography>
              <Typography variant="body2" className="opacity-90">
                Total deliveries completed
              </Typography>
            </div>
            
            <div className="bg-gradient-to-r from-[#FF4081] to-[#FF6B9D] text-white p-4 rounded-lg">
              <Typography variant="h6" className="font-bold">
                Total Revenue
              </Typography>
              <Typography variant="h4" className="font-bold">
                ₹{revenueStats?.totalRevenue?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" className="opacity-90">
                5% commission earned
              </Typography>
            </div>
            
            <div className="bg-gradient-to-r from-[#2196F3] to-[#42A5F5] text-white p-4 rounded-lg">
              <Typography variant="h6" className="font-bold">
                Performance Rating
              </Typography>
              <Typography variant="h4" className="font-bold">
                {deliveryPersonInfo?.rating || 0}/5.0
              </Typography>
              <Typography variant="body2" className="opacity-90">
                Customer satisfaction
              </Typography>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <Typography variant="h5" className="font-bold text-[#6F4E37] mb-6">
            Available Delivery Orders
          </Typography>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCartIcon sx={{ fontSize: 64, color: '#6F4E37', opacity: 0.5 }} />
              <Typography variant="h6" className="text-gray-500 mt-4">
                No pending orders available
              </Typography>
              <Typography variant="body2" className="text-gray-400 mt-2">
                Check back later for new delivery opportunities
              </Typography>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.map((order) => {
                const timeRemaining = formatTimeRemaining(order.expiresAt);
                const isExpired = new Date(order.expiresAt).getTime() <= Date.now();
                
                return (
                  <Card 
                    key={order._id} 
                    className={`rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                      isExpired ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Order Image */}
                    {order.img && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={`http://localhost:5000/${order.img}`}
                          alt={order.itemName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4">
                          <Chip 
                            label={order.status}
                            color="warning"
                            size="small"
                            className="bg-white text-[#6F4E37] font-semibold"
                          />
                        </div>
                      </div>
                    )}

                    <CardContent className="p-4">
                      {/* Order Title */}
                      <Typography variant="h6" className="font-bold text-[#6F4E37] mb-2">
                        {order.itemName}
                      </Typography>

                      {/* Order Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-gray-600">
                          <ShoppingCartIcon className="mr-2" sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            Quantity: {order.quantity}
                          </Typography>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <MonetizationOnIcon className="mr-2" sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            Total: ₹{order.price * order.quantity}
                          </Typography>
                        </div>

                        <div className="flex items-start text-gray-600">
                          <LocationOnIcon className="mr-2 mt-0.5" sx={{ fontSize: 16 }} />
                          <Typography variant="body2" className="flex-1">
                            {order.address || 'Address not provided'}
                          </Typography>
                        </div>

                        <div className="flex items-center text-gray-600">
                          <TimerIcon className="mr-2" sx={{ fontSize: 16 }} />
                          <Typography 
                            variant="body2" 
                            className={isExpired ? 'text-red-500 font-semibold' : 'text-orange-500 font-semibold'}
                          >
                            {isExpired ? 'Expired' : `Expires in: ${timeRemaining}`}
                          </Typography>
                        </div>

                        <Typography variant="caption" className="text-gray-500">
                          Order placed: {new Date(order.createdAt).toLocaleString()}
                        </Typography>
                      </div>

                      {/* Action Buttons */}
                      {!isExpired && (
                        <div className="flex gap-2">
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleAcceptOrder(order._id)}
                            disabled={processingOrder === order._id || deliveryPersonInfo?.currentStatus !== 'available'}
                            className="bg-[#4CAF50] hover:bg-[#45a049] text-white font-semibold py-2 disabled:bg-gray-400"
                          >
                            {processingOrder === order._id ? 'Accepting...' : 'Accept'}
                          </Button>
                          
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => handleDeclineOrder(order._id)}
                            disabled={processingOrder === order._id}
                            className="border-[#FF4081] text-[#FF4081] hover:bg-[#FF4081] hover:text-white font-semibold py-2"
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {/* Status Warning for Individual Order */}
                      {!isExpired && deliveryPersonInfo?.currentStatus !== 'available' && (
                        <Typography variant="caption" className="text-orange-600 font-medium mt-2 block text-center">
                          You must be online to accept orders
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}