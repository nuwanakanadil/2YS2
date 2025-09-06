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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function DeliveryProfile() {
  const [deliveryPerson, setDeliveryPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    vehicleType: '',
    vehicleNumber: '',
    deliveryArea: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
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
        setDeliveryPerson(data.data);
        setFormData({
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          phone: data.data.phone || '',
          vehicleType: data.data.vehicleType || '',
          vehicleNumber: data.data.vehicleNumber || '',
          deliveryArea: data.data.deliveryArea || '',
          emergencyContact: {
            name: data.data.emergencyContact?.name || '',
            phone: data.data.emergencyContact?.phone || '',
            relationship: data.data.emergencyContact?.relationship || ''
          }
        });
      } else {
        router.push('/delivery-signin');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/delivery-signin');
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
        setDeliveryPerson(data.data);
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
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6F4E37] mx-auto mb-4"></div>
          <Typography variant="h6" className="text-[#6F4E37]">
            Loading profile...
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            className="text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white mr-4"
          >
            Back
          </Button>
          <div className="flex items-center">
            <PersonIcon className="text-[#6F4E37] mr-3" sx={{ fontSize: 32 }} />
            <Typography variant="h4" className="font-bold text-[#6F4E37]">
              My Delivery Profile
            </Typography>
          </div>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <Typography variant="h6" className="font-semibold text-[#6F4E37]">
                  Delivery Status
                </Typography>
                <Typography variant="body2" className="text-gray-600 mt-1">
                  Current account information
                </Typography>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                <Chip 
                  label={deliveryPerson?.currentStatus || 'offline'} 
                  color={deliveryPerson?.currentStatus === 'available' ? 'success' : 
                         deliveryPerson?.currentStatus === 'busy' ? 'warning' : 'default'}
                />
                <Chip 
                  label={deliveryPerson?.isVerified ? 'Verified' : 'Pending Verification'} 
                  color={deliveryPerson?.isVerified ? 'success' : 'warning'}
                  variant="outlined"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
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
                {/* Basic Information */}
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
                    value={deliveryPerson?.email || ''}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>

                {/* Vehicle Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" className="font-semibold text-[#6F4E37] mb-2">
                    Vehicle Information
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Vehicle Type</InputLabel>
                    <Select
                      value={formData.vehicleType}
                      onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                      label="Vehicle Type"
                    >
                      <MenuItem value="bicycle">Bicycle</MenuItem>
                      <MenuItem value="motorcycle">Motorcycle</MenuItem>
                      <MenuItem value="scooter">Scooter</MenuItem>
                      <MenuItem value="car">Car</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Vehicle Number"
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Delivery Area"
                    value={formData.deliveryArea}
                    onChange={(e) => handleInputChange('deliveryArea', e.target.value)}
                    helperText="Areas you prefer to deliver to"
                  />
                </Grid>

                {/* Emergency Contact */}
                <Grid item xs={12}>
                  <Typography variant="h6" className="font-semibold text-[#6F4E37] mb-2">
                    Emergency Contact
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Contact Name"
                    value={formData.emergencyContact.name}
                    onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                    placeholder="e.g., Parent, Spouse, Friend"
                  />
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Box className="flex justify-end mt-4">
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