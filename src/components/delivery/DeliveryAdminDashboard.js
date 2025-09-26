'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  Box, 
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export default function DeliveryAdminDashboard() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [allDeliveryPersons, setAllDeliveryPersons] = useState([]);
  const [filteredDeliveryPersons, setFilteredDeliveryPersons] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, person: null });
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const router = useRouter();

  // Fetch admin info
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/delivery/profile', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data.role !== 'delivery_admin') {
            // Not an admin, redirect to regular dashboard
            router.push('/deliveryDashboard');
            return;
          }
          setAdminInfo(data.data);
        } else {
          // If not authenticated, redirect to login
          router.push('/delivery-signin');
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
        router.push('/delivery-signin');
      }
    };

    fetchAdminInfo();
  }, [router]);

  // Fetch delivery persons and statistics
  const fetchData = async (search = '') => {
    try {
      setSearching(!!search);
      setIsSearchMode(!!search);
      
      // If there's a search term, only fetch search results
      // If no search term, fetch all delivery persons
      const queryParams = new URLSearchParams();
      if (search && search.trim()) {
        queryParams.append('search', search.trim());
      }
      
      const queryString = queryParams.toString();
      const deliveryUrl = `http://localhost:5000/api/delivery/admin/delivery-persons${queryString ? '?' + queryString : ''}`;
      
      // Fetch delivery persons with or without search
      const deliveryResponse = await fetch(deliveryUrl, {
        credentials: 'include',
      });
      
      // Only fetch statistics when not searching (or fetch them separately always)
      const statsResponse = await fetch('http://localhost:5000/api/delivery/admin/statistics', {
        credentials: 'include',
      });
      
      if (deliveryResponse.ok && statsResponse.ok) {
        const deliveryData = await deliveryResponse.json();
        const statsData = await statsResponse.json();
        
        // Update the displayed delivery persons with current results
        const currentData = deliveryData.data || [];
        setDeliveryPersons(currentData);
        
        // Store filtered results for search mode
        if (search) {
          setFilteredDeliveryPersons(currentData);
        } else {
          // Store all delivery persons when not searching
          setAllDeliveryPersons(currentData);
          setFilteredDeliveryPersons([]); // Clear filtered results
        }
        
        // Always update statistics regardless of search
        setStatistics(statsData.data || {});
      } else {
        const deliveryError = await deliveryResponse.text();
        const statsError = await statsResponse.text();
        console.error('Delivery response error:', deliveryError);
        console.error('Stats response error:', statsError);
        setMessage(`Failed to fetch data. Delivery: ${deliveryResponse.status}, Stats: ${statsResponse.status}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    if (adminInfo) {
      fetchData();
    }
  }, [adminInfo]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
    };
  }, []);

  // Handle search
  const handleSearch = async (searchValue) => {
    setSearchTerm(searchValue);
    await fetchData(searchValue);
  };

  // Handle clear search
  const handleClearSearch = async () => {
    setSearchTerm('');
    setIsSearchMode(false);
    setFilteredDeliveryPersons([]);
    await fetchData('');
  };

  // Handle search input change with debouncing
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    
    // Debounce search - wait 500ms after user stops typing
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch(value);
    }, 500);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event) => {
    // Ctrl+F or Cmd+F to focus search (but let default behavior happen too)
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      // Let the default browser search happen, but this is for reference
    }
    // Escape to clear search
    if (event.key === 'Escape' && searchTerm) {
      handleClearSearch();
    }
  };

  // Handle delete delivery person
  const handleDeletePerson = async (personId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/delivery/admin/delivery-person/${personId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        
        // Refresh the current view (with or without search)
        await fetchData(searchTerm);
        
        // Update statistics
        setStatistics(prev => ({
          ...prev,
          totalDeliveryPersons: prev.totalDeliveryPersons - 1
        }));
      } else {
        setMessage(data.message || 'Failed to delete delivery person');
      }
    } catch (error) {
      console.error('Error deleting delivery person:', error);
      setMessage('Error deleting delivery person. Please try again.');
    } finally {
      setDeleteDialog({ open: false, person: null });
      setTimeout(() => setMessage(''), 5000);
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
        localStorage.removeItem('deliveryEmail');
        localStorage.removeItem('deliveryUserId');
        router.push('/delivery-signin');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      router.push('/delivery-signin');
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      available: { color: 'success', label: 'Available' },
      busy: { color: 'warning', label: 'Busy' },
      offline: { color: 'default', label: 'Offline' }
    };
    
    const config = statusConfig[status] || { color: 'default', label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // Helper function to highlight search terms
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.toString().split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-yellow-800 font-semibold">
          {part}
        </span>
      ) : part
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6F4E37] mx-auto mb-4"></div>
          <Typography variant="h6" className="text-[#6F4E37]">
            Loading admin dashboard...
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
                  Delivery Admin Dashboard
                </Typography>
                {adminInfo && (
                  <Typography variant="h6" className="text-gray-600">
                    Welcome, {adminInfo.firstName} {adminInfo.lastName}
                  </Typography>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Chip 
                label="Admin" 
                color="error"
                className="font-semibold"
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
          
          {/* Message Alert */}
          {message && (
            <Alert 
              severity={message.includes('Error') || message.includes('Failed') ? 'error' : 'success'}
              className="mt-4"
              onClose={() => setMessage('')}
            >
              {message}
            </Alert>
          )}
        </div>

        {/* Statistics Cards */}
        <Grid container spacing={3} className="mb-6">
          <Grid item xs={12} sm={6} md={3}>
            <Card className="bg-gradient-to-r from-[#6F4E37] to-[#8B5A42] text-white">
              <CardContent className="text-center">
                <PeopleIcon sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h4" className="font-bold">
                  {statistics.totalDeliveryPersons || 0}
                </Typography>
                <Typography variant="body1">
                  Total Delivery Persons
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card className="bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] text-white">
              <CardContent className="text-center">
                <LocalShippingIcon sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h4" className="font-bold">
                  {statistics.activeDeliveryPersons || 0}
                </Typography>
                <Typography variant="body1">
                  Active Delivery Persons
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card className="bg-gradient-to-r from-[#FF4081] to-[#FF6B9D] text-white">
              <CardContent className="text-center">
                <AssignmentIcon sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h4" className="font-bold">
                  {statistics.totalOrders || 0}
                </Typography>
                <Typography variant="body1">
                  Total Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card className="bg-gradient-to-r from-[#2196F3] to-[#42A5F5] text-white">
              <CardContent className="text-center">
                <AssignmentIcon sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h4" className="font-bold">
                  {statistics.completedOrders || 0}
                </Typography>
                <Typography variant="body1">
                  Completed Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Delivery Persons Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <Typography variant="h5" className="font-bold text-[#6F4E37] mb-2">
                {searchTerm ? 'Search Results' : 'Delivery Persons Management'}
              </Typography>
              {searchTerm && (
                <Typography variant="body2" className="text-gray-600">
                  🔍 Search Results for: "{searchTerm}" ({deliveryPersons.length} found)
                </Typography>
              )}
              {!searchTerm && (
                <Typography variant="body2" className="text-gray-600">
                  📋 All Delivery Persons ({deliveryPersons.length} total)
                </Typography>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <TextField
                placeholder={searchTerm ? "Showing search results only..." : "🔍 Search delivery persons... (Press Esc to clear)"}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                variant="outlined"
                size="small"
                className="min-w-[300px]"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: searchTerm ? '#FF4081' : '#6F4E37',
                    },
                    '&:hover fieldset': {
                      borderColor: searchTerm ? '#FF6B9D' : '#8B5A42',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: searchTerm ? '#FF4081' : '#6F4E37',
                    },
                    backgroundColor: searchTerm ? '#FFF8F8' : 'white',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className={searchTerm ? "text-pink-500" : "text-gray-400"} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClearSearch}
                        size="small"
                        className="text-pink-500 hover:text-pink-700"
                        title="Clear search and show all delivery persons"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {searching && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FF4081]" title="Searching..."></div>
              )}
              {searchTerm && !searching && (
                <Chip 
                  label="Search Mode" 
                  size="small" 
                  color="secondary" 
                  className="bg-pink-100 text-pink-800"
                />
              )}
            </div>
          </div>
          
          {/* Search Results Info */}
          {searchTerm && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body1" className="text-blue-800 font-semibold">
                    {deliveryPersons.length === 0 
                      ? `No delivery persons found matching "${searchTerm}"`
                      : `${deliveryPersons.length} delivery person${deliveryPersons.length !== 1 ? 's' : ''} found`
                    }
                  </Typography>
                  <Typography variant="body2" className="text-blue-600 mt-1">
                    {deliveryPersons.length > 0 
                      ? 'Only search results are displayed below. Clear search to see all delivery persons.'
                      : 'Try a different search term or clear search to see all delivery persons.'
                    }
                  </Typography>
                </div>
                <Button
                  size="small"
                  onClick={handleClearSearch}
                  className="text-blue-600 hover:text-blue-800 min-w-0 p-1"
                  title="Clear search and show all delivery persons"
                >
                  <ClearIcon fontSize="small" />
                </Button>
              </div>
            </div>
          )}

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold">Name</TableCell>
                  <TableCell className="font-semibold">Email</TableCell>
                  <TableCell className="font-semibold">Phone</TableCell>
                  <TableCell className="font-semibold">Vehicle</TableCell>
                  <TableCell className="font-semibold">Status</TableCell>
                  <TableCell className="font-semibold">Deliveries</TableCell>
                  <TableCell className="font-semibold">Rating</TableCell>
                  <TableCell className="font-semibold">Joined</TableCell>
                  <TableCell className="font-semibold text-center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveryPersons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {searchTerm ? (
                        <div>
                          <Typography variant="h6" className="text-gray-500 mb-2">
                            No search results found
                          </Typography>
                          <Typography variant="body2" className="text-gray-400 mb-4">
                            No delivery persons match your search for "{searchTerm}"
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={handleClearSearch}
                            size="small"
                            className="text-[#6F4E37] border-[#6F4E37] hover:bg-[#6F4E37] hover:text-white"
                          >
                            Show All Delivery Persons
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Typography variant="h6" className="text-gray-500 mb-2">
                            No delivery persons found
                          </Typography>
                          <Typography variant="body2" className="text-gray-400">
                            There are currently no delivery persons in the system
                          </Typography>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryPersons.map((person) => (
                    <TableRow key={person._id} hover>
                      <TableCell>
                        <div>
                          <Typography variant="body2" className="font-medium">
                            {highlightSearchTerm(`${person.firstName} ${person.lastName}`, searchTerm)}
                          </Typography>
                          <Typography variant="caption" className="text-gray-500">
                            ID: {highlightSearchTerm(person.universityId, searchTerm)}
                          </Typography>
                        </div>
                      </TableCell>
                      <TableCell>{highlightSearchTerm(person.email, searchTerm)}</TableCell>
                      <TableCell>{highlightSearchTerm(person.phone, searchTerm)}</TableCell>
                      <TableCell>
                        <div>
                          <Typography variant="body2" className="capitalize">
                            {person.vehicleType}
                          </Typography>
                          {person.vehicleNumber && (
                            <Typography variant="caption" className="text-gray-500">
                              {highlightSearchTerm(person.vehicleNumber, searchTerm)}
                            </Typography>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusChip(person.currentStatus)}</TableCell>
                      <TableCell>{person.totalDeliveries}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${person.rating}/5`} 
                          variant="outlined" 
                          size="small"
                          color={person.rating >= 4 ? 'success' : person.rating >= 3 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(person.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => setDeleteDialog({ open: true, person })}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, person: null })}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete delivery person{' '}
              <strong>
                {deleteDialog.person?.firstName} {deleteDialog.person?.lastName}
              </strong>
              ? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, person: null })}
              color="primary"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleDeletePerson(deleteDialog.person?._id)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}