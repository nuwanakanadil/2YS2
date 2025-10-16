'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Box, 
  Alert,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';

export default function DeliveryAdminProfile() {
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    deliveryArea: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/delivery/profile', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data.role !== 'delivery_admin') {
          router.push('/delivery/delivery-profile');
          return;
        }
        setAdminInfo(data.data);
        setFormData({
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          phone: data.data.phone || '',
          deliveryArea: data.data.deliveryArea || ''
        });
      } else {
        router.push('/delivery/delivery-signin');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/delivery/delivery-signin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/delivery/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Profile updated successfully!');
        setAdminInfo(data.data);
      } else {
        setMessage(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6F4E37] mx-auto mb-4"></div>
          <Typography variant="h6" className="text-[#6F4E37]">
            Loading admin profile...
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              className="text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white mr-4"
            >
              Back
            </Button>
            <AdminPanelSettingsIcon className="text-[#6F4E37] mr-3" sx={{ fontSize: 32 }} />
            <Typography variant="h4" className="font-bold text-[#6F4E37]">
              Admin Profile
            </Typography>
          </div>
          <Button
            variant="outlined"
            startIcon={<DashboardIcon />}
            onClick={() => router.push('/delivery/delivery-admin-dashboard')}
            className="border-[#6F4E37] text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white"
          >
            Admin Dashboard
          </Button>
        </div>

        {/* Admin Status Card */}
        <Card className="mb-6 bg-gradient-to-r from-[#6F4E37] to-[#8B5A42] text-white">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <Typography variant="h6" className="font-semibold mb-2">
                  Administrator Account
                </Typography>
                <Typography variant="body2" className="opacity-90">
                  You have full administrative privileges for the delivery system
                </Typography>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                <Chip 
                  label="Admin" 
                  sx={{ 
                    backgroundColor: '#FF4081', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
                <Chip 
                  label="Active" 
                  sx={{ 
                    backgroundColor: '#4CAF50', 
                    color: 'white'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="mb-6">
          <CardContent>
            <Typography variant="h6" className="font-semibold text-[#6F4E37] mb-4">
              Account Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" className="text-gray-600">Email</Typography>
                <Typography variant="body1" className="font-medium">{adminInfo?.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" className="text-gray-600">University ID</Typography>
                <Typography variant="body1" className="font-medium">{adminInfo?.universityId}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" className="text-gray-600">Account Created</Typography>
                <Typography variant="body1" className="font-medium">
                  {adminInfo?.createdAt ? new Date(adminInfo.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" className="text-gray-600">Last Updated</Typography>
                <Typography variant="body1" className="font-medium">
                  {adminInfo?.updatedAt ? new Date(adminInfo.updatedAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Editable Profile Form */}
        <Card>
          <CardContent>
            <Typography variant="h6" className="font-semibold text-[#6F4E37] mb-4">
              Edit Profile Information
            </Typography>

            {message && (
              <Alert 
                severity={message.includes('Error') || message.includes('Failed') ? 'error' : 'success'}
                className="mb-4"
                onClose={() => setMessage('')}
              >
                {message}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={adminInfo?.email || ''}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Coverage Area"
                    value={formData.deliveryArea}
                    onChange={(e) => handleInputChange('deliveryArea', e.target.value)}
                    helperText="Administrative coverage area"
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider className="my-4" />
                  <Box className="flex justify-end">
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                      className="bg-[#6F4E37] hover:bg-[#8B5A42] text-white px-8 py-2"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}