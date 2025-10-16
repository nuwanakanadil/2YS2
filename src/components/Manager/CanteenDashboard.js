'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,

  // ⬇️ NEW for the page-local top bar
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useRouter } from 'next/navigation';

export default function CanteenDashboard() {
  const router = useRouter();

  // ⬇️ NEW: top bar state (only navbar change)
  const [anchorEl, setAnchorEl] = useState(null);
  const [displayName, setDisplayName] = useState('Manager');
  const menuOpen = Boolean(anchorEl);
  const handleOpenMenu = (e) => setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);
  const handleGoProfile = () => {
    handleCloseMenu();
    router.push('/manager/ManagerProfile');
  };
  const handleLogout = async () => {
    handleCloseMenu();
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    try {
      localStorage.removeItem('email');
      localStorage.removeItem('managerId');
      localStorage.removeItem('canteenId');
    } catch {}
    router.push('/manager/ManagerLogin');
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem('email');
      const emailFromStorage = raw ? JSON.parse(raw) : '';
      if (emailFromStorage) setDisplayName(emailFromStorage);
    } catch {}
  }, []);
  // ⬆️ END top bar additions

  const [loading, setLoading] = useState(true);
  const [canteenName, setCanteenName] = useState('');
  const [err, setErr] = useState('');
  const [productsPublished, setProductsPublished] = useState(0);

  const [ratingValue,setRatingValue] = useState(0);
  const [totalReviews,setTotalReviews] = useState(0);
  const [totalEarnings] = useState(142350);

  const [products, setProducts] = useState([]);

  // Orders stats
  const [ongoingOrders, setOngoingOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  // add product modal
  const [open, setOpen] = useState(false);
  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [pprice, setPprice] = useState('');
  const [pimage, setPimage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setPname('');
    setPdesc('');
    setPprice('');
    setPimage(null);
  };

  // edit product modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [ename, setEname] = useState('');
  const [edesc, setEdesc] = useState('');
  const [eprice, setEprice] = useState('');
  const [eimage, setEimage] = useState(null);
  const [eimagePreview, setEimagePreview] = useState('');
  const [eSubmitting, setESubmitting] = useState(false);

  const resetEditForm = () => {
    setEditId(null);
    setEname('');
    setEdesc('');
    setEprice('');
    setEimage(null);
    setEimagePreview('');
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    if (!submitting) {
      setOpen(false);
      resetForm();
    }
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setEname(item.name || '');
    setEdesc(item.description || '');
    setEprice(item.price != null ? String(item.price) : '');
    setEimage(null);
    setEimagePreview(item.image ? `http://localhost:5000/${item.image}` : '');
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (!eSubmitting) {
      setEditOpen(false);
      resetEditForm();
    }
  };

  const handleEditImage = (file) => {
    setEimage(file || null);
    if (file) {
      const url = URL.createObjectURL(file);
      setEimagePreview(url);
    } else {
      setEimagePreview('');
    }
  };

  const fetchProducts = async () => {
    const res = await fetch('http://localhost:5000/api/loadproducts/mine', {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load products');
    setProducts(data.products || []);
  };

  const fetchOrderStats = async () => {
    const res = await fetch('http://localhost:5000/api/canteen/order-stats', {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load order stats');
    setOngoingOrders(data.ongoing || 0);
    setCompletedOrders(data.completed || 0);
  };

  const handleCreate = async () => {
    if (!pname || pprice === '') {
      alert('Name and price are required');
      return;
    }
    const numericPrice = Number(pprice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      alert('Price must be a non-negative number');
      return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('name', pname);
      form.append('description', pdesc);
      form.append('price', numericPrice);
      if (pimage) form.append('image', pimage);

      const res = await fetch('http://localhost:5000/api/products/addproducts', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to create product');
        setSubmitting(false);
        return;
      }

      setProducts((prev) => [data.product, ...prev]);
      alert('Product created');
      setSubmitting(false);
      setOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      alert('Network error, please try again.');
    }
  };

  const handleUpdate = async () => {
    if (!ename.trim()) {
      alert('Name is required');
      return;
    }
    if (eprice === '') {
      alert('Price is required');
      return;
    }
    const numericPrice = Number(eprice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      alert('Price must be a non-negative number');
      return;
    }

    try {
      setESubmitting(true);
      const form = new FormData();
      form.append('name', ename);
      form.append('description', edesc);
      form.append('price', numericPrice);
      if (eimage) form.append('image', eimage);

      const res = await fetch(`http://localhost:5000/api/products/${editId}`, {
        method: 'PUT',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update');

      setProducts((prev) =>
        prev.map((p) => (p._id === editId ? data.product : p))
      );

      alert('Product updated');
      setESubmitting(false);
      setEditOpen(false);
      resetEditForm();
    } catch (e) {
      console.error(e);
      setESubmitting(false);
      alert(e.message || 'Network error while updating');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const resSummary = await fetch('http://localhost:5000/api/canteen/summary', {
          credentials: 'include',
        });
        const summary = await resSummary.json();
        if (!resSummary.ok) {
          setErr(summary.message || 'Failed to load canteen details');
          return;
        }
        setCanteenName(summary.name || 'Your Canteen');
        setProductsPublished(summary.productCount ?? 0);
        setTotalReviews(summary.totalReviews ?? 0);
        setRatingValue(summary.overallRating ?? 0);

        await fetchProducts();
        await fetchOrderStats();
      } catch (e) {
        console.error(e);
        setErr(e.message || 'Network error while loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-dashed rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 text-lg">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-700">{err}</p>
          <Link href="/CreateCanteen">
            <Button variant="contained" sx={{ mt: 2, backgroundColor: '#FF4081' }}>
              Create Canteen
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Box className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ⬇️ Hide global navbar on this page */}
      <style jsx global>{` nav { display: none !important; } `}</style>

      {/* ⬇️ New page-local top bar (profile icon + name + menu) */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#6F4E37', color: 'white', mb: 2 }}>
        <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handleOpenMenu} size="small" sx={{ p: 0.5, color: 'inherit' }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, cursor: 'pointer' }}
              onClick={handleOpenMenu}
              title={displayName}
            >
              {displayName}
            </Typography>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleGoProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Top row */}
      <Grid container spacing={3}>
        {/* LEFT: Canteen details + add product */}
        <Grid item xs={12} md={6}>
          <Card className="shadow-lg" sx={{ backgroundColor: '#6F4E37', color: 'white' }}>
            <CardContent>
              <Typography variant="h5" className="font-semibold">
                {canteenName}
              </Typography>
              <Typography variant="body2" className="opacity-80 mt-1">
                Manage your canteen offerings and see quick stats.
              </Typography>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)', my: 2 }} />

              <Button
                variant="contained"
                onClick={() => setOpen(true)}
                sx={{ backgroundColor: '#FF4081', textTransform: 'none' }}
              >
                + Add New Product
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT: Stats card */}
        <Grid item xs={12} md={6}>
          <Card className="shadow-lg">
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" className="mb-3">
                Quick Stats
              </Typography>

              <Grid container spacing={2}>
                {/* Rating */}
                <Grid item xs={12} sm={6}>
                  <div className="p-3 rounded-lg bg-gray-100">
                    <Typography variant="body2" color="textSecondary">Rating</Typography>
                    <div className="flex items-center gap-2 mt-1">
                      <Rating value={ratingValue} precision={0.1} readOnly size="medium" />
                      <Typography variant="body2" color="textSecondary">
                        {ratingValue.toFixed(1)}
                      </Typography>
                    </div>
                  </div>
                </Grid>

                {/* Products Published (REAL) */}
                <Grid item xs={12} sm={6}>
                  <div className="p-3 rounded-lg bg-gray-100">
                    <Typography variant="body2" color="textSecondary">Products Published</Typography>
                    <Typography variant="h6" className="font-semibold mt-1">
                      {productsPublished}
                    </Typography>
                  </div>
                </Grid>

                {/* Total Reviews */}
                <Grid item xs={12} sm={6}>
                  <div className="p-3 rounded-lg bg-gray-100">
                    <Typography variant="body2" color="textSecondary">Total Reviews</Typography>
                    <Typography variant="h6" className="font-semibold mt-1">
                      {totalReviews}
                    </Typography>
                  </div>
                </Grid>

                {/* Earnings */}
                <Grid item xs={12} sm={6}>
                  <div className="p-3 rounded-lg bg-gray-100">
                    <Typography variant="body2" color="textSecondary">Total Earnings</Typography>
                    <Typography variant="h6" className="font-semibold mt-1">
                      Rs. {Number(totalEarnings).toLocaleString('en-LK')}
                    </Typography>
                  </div>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* ✅ Orders card moved here, still inside the same Grid container */}
        <Grid item xs={12}>
          <Card className="shadow-lg">
            <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Typography variant="body2" color="textSecondary">Ongoing Orders</Typography>
                  <Typography variant="h6" className="font-semibold mt-1">
                    {ongoingOrders}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    (placed / preparing)
                  </Typography>
                </div>
                <div className="p-3 rounded-lg bg-gray-100">
                  <Typography variant="body2" color="textSecondary">Completed Orders</Typography>
                  <Typography variant="h6" className="font-semibold mt-1">
                    {completedOrders}
                  </Typography>
                </div>
              </div>

              <Button
                variant="contained"
                onClick={() => window.location.href='/manager/OrdersManagement'}
                sx={{ backgroundColor: '#FF4081', textTransform: 'none' }}
              >
                Manage your orders
              </Button>

              <Button
                variant="contained"
                onClick={() => window.location.href='/manager/StaffManagement'}
                sx={{ backgroundColor: '#FF4081', textTransform: 'none'}}
              >
                Manage staff
              </Button>

              <Button
                variant="contained"
                onClick={() => window.location.href='/manager/Reports'}
                sx={{ backgroundColor: '#FF4081', textTransform: 'none'}}
              >
                Create Reports
              </Button>

              <Button
                variant="contained"
                onClick={() => window.location.href='/manager/Promotions'}
                sx={{ backgroundColor: '#FF4081', textTransform: 'none'}}
              >
                Manage Promotions
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Products grid */}
      <div className="mt-8">
        <Typography variant="h6" className="mb-3">Products</Typography>

        {products.length === 0 ? (
          <div className="text-gray-600">No products yet. Click “Add New Product”.</div>
        ) : (
          <Grid container spacing={4}>
            {products.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={item._id} >
                <Card className="shadow-lg h-full flex flex-col">
                  <CardMedia
                    component="img"
                    image={item.image ? `http://localhost:5000/${item.image}` : '/placeholder.png'}
                    alt={item.name}
                    sx={{ height: 180, objectFit: 'cover' }}
                  />

                  <CardContent className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <Typography variant="h6">{item.name}</Typography>
                    </div>

                    <Typography variant="body2" color="textSecondary" paragraph noWrap>
                      {item.description || '—'}
                    </Typography>

                    <Typography variant="subtitle1" color="primary">
                      Rs. {item.price}
                    </Typography>
                  </CardContent>

                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => openEdit(item)}
                        sx={{ backgroundColor: '#FF4081', textTransform: 'none' }}>
                        Update Details
                      </Button>

                    </div>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent dividers>
          <div className="mt-2 space-y-3">
            <TextField
              label="Name"
              fullWidth
              value={pname}
              onChange={(e) => setPname(e.target.value)}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={pdesc}
              onChange={(e) => setPdesc(e.target.value)}
            />
            <TextField
              label="Price (Rs.)"
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              value={pprice}
              onChange={(e) => setPprice(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPimage(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting}
            sx={{ backgroundColor: '#FF4081', textTransform: 'none' }}
          >
            {submitting ? 'Saving…' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent dividers>
          <div className="mt-2 space-y-3">
            <TextField
              label="Name"
              fullWidth
              value={ename}
              onChange={(e) => setEname(e.target.value)}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={edesc}
              onChange={(e) => setEdesc(e.target.value)}
            />
            <TextField
              label="Price (Rs.)"
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              value={eprice}
              onChange={(e) => setEprice(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Image (optional)</label>
              {eimagePreview ? (
                <img
                  src={eimagePreview}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleEditImage(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={eSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={eSubmitting}
            sx={{ backgroundColor: '#FF4081', textTransform: 'none' }}
          >
            {eSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
