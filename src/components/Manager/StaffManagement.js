'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip,
  Button,
  CircularProgress,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Divider,

  // ⬇️ NEW for the page-local top bar
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem as MUIMenuItem,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useRouter } from 'next/navigation';

const ROLES = ['CASHIER', 'COOK', 'SERVER', 'ASSISTANT_MANAGER', 'OTHER'];
const PINK = '#FF4081';

export default function StaffManagementPage() {
  const router = useRouter();

  // ⬇️ NEW: top bar state (only navbar change)
  const [anchorElTop, setAnchorElTop] = useState(null);
  const [displayName, setDisplayName] = useState('Manager');
  const menuOpen = Boolean(anchorElTop);
  const handleOpenMenu = (e) => setAnchorElTop(e.currentTarget);
  const handleCloseMenu = () => setAnchorElTop(null);
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
  const [rows, setRows] = useState([]); // all staff from API
  const [error, setError] = useState('');

  // search/filter
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // dialog state (add/edit)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('OTHER');
  const [status, setStatus] = useState('ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('OTHER');
    setStatus('ACTIVE');
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/staff', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load staff');
      setRows(data.staff || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // ----- derived (search + filters) -----
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (rows || []).filter(s => {
      const matchesText =
        !text ||
        [s.fullName, s.email, s.phone, s.role, s.status]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(text));

      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchesText && matchesRole && matchesStatus;
    });
  }, [rows, q, roleFilter, statusFilter]);

  // ----- dialog open/close -----
  const openAdd = () => { resetForm(); setOpen(true); };
  const openEdit = (s) => {
    setEditingId(s._id);
    setFullName(s.fullName || '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setRole(s.role || 'OTHER');
    setStatus(s.status || 'ACTIVE');
    setOpen(true);
  };
  const close = () => { if (!submitting) { setOpen(false); resetForm(); } };

  // ----- actions -----
  const handleSave = async () => {
    if (!fullName.trim()) { alert('Full name is required'); return; }

    try {
      setSubmitting(true);
      const payload = { fullName, email, phone, role };

      if (editingId) {
        // Update base fields
        let res = await fetch(`http://localhost:5000/api/staff/${editingId}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        let data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Update failed');

        // If status changed, patch it too
        if (status && status !== data.staff.status) {
          res = await fetch(`http://localhost:5000/api/staff/${editingId}/status`, {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          });
          data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Status update failed');
        }

        setRows(prev => prev.map(s => (s._id === editingId ? data.staff : s)));
      } else {
        const res = await fetch('http://localhost:5000/api/staff', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Create failed');
        setRows(prev => [data.staff, ...prev]);
      }

      setSubmitting(false);
      setOpen(false);
      resetForm();
    } catch (e) {
      setSubmitting(false);
      alert(e.message || 'Network error');
    }
  };

  const toggleStatus = async (s) => {
    const to = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`http://localhost:5000/api/staff/${s._id}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');
      setRows(prev => prev.map(x => (x._id === s._id ? data.staff : x)));
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  const removeStaff = async (s) => {
    if (!confirm(`Delete ${s.fullName}?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/staff/${s._id}`, {
        method: 'DELETE', credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setRows(prev => prev.filter(x => x._id !== s._id));
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  // ----- header extra -----
  const headerExtra = (
    <Stack direction="row" spacing={1}>
      <Button
        variant="contained"
        size="small"
        disableElevation
        sx={{ textTransform: 'none', backgroundColor: PINK, '&:hover': { backgroundColor: PINK } }}
      >
        Staff: {filtered.length}
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={fetchStaff}
        sx={{
          textTransform: 'none',
          borderColor: PINK,
          color: PINK,
          '&:hover': { borderColor: PINK, backgroundColor: 'rgba(255,64,129,0.06)' }
        }}
      >
        Refresh
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={openAdd}
        sx={{ textTransform: 'none', backgroundColor: PINK, '&:hover': { backgroundColor: PINK } }}
      >
        + Add staff
      </Button>
    </Stack>
  );

  return (
    <Box className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ⬇️ Hide global navbar on this page */}
      <style jsx global>{` nav { display: none !important; } `}</style>

      {/* ⬇️ New page-local top bar (profile icon + name + menu) */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#6F4E37', color: 'white', mb: 2 }}>
        <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1} alignItems="center">
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
          </Stack>

          <Menu
            anchorEl={anchorElTop}
            open={menuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MUIMenuItem onClick={handleGoProfile}>Profile</MUIMenuItem>
            <MUIMenuItem onClick={handleLogout}>Logout</MUIMenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Card className="shadow-lg">
        <CardContent>
          {/* Top controls: search + filters */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search the employees"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: 320 }}
            />

            <TextField
              select
              size="small"
              label="Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All roles</MenuItem>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>

            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All statuses</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="INACTIVE">INACTIVE</MenuItem>
            </TextField>
          </Stack>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Typography variant="h5" fontWeight={600}>
                Manage Staff
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Staff assigned to your canteen. Use search and filters to find members quickly.
              </Typography>
            </div>
            {headerExtra}
          </div>

          <Box mt={3}>
            {loading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={22} />
                <Typography>Loading staff…</Typography>
              </div>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary">No matching staff.</Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s._id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {s.fullName || '—'}
                        </Stack>
                      </TableCell>
                      <TableCell>{s.email || '—'}</TableCell>
                      <TableCell>{s.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={s.role} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.status}
                          color={s.status === 'ACTIVE' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => toggleStatus(s)}
                            sx={{ textTransform: 'none', backgroundColor: PINK, '&:hover': { backgroundColor: PINK } }}
                          >
                            {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openEdit(s)}
                            sx={{
                              textTransform: 'none',
                              borderColor: PINK,
                              color: PINK,
                              '&:hover': { borderColor: PINK, backgroundColor: 'rgba(255,64,129,0.06)' }
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => removeStaff(s)}
                            sx={{
                              textTransform: 'none',
                              borderColor: PINK,
                              color: PINK,
                              '&:hover': { borderColor: PINK, backgroundColor: 'rgba(255,64,129,0.06)' }
                            }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
        <DialogContent dividers>
          <div className="mt-2 space-y-3">
            <TextField
              label="Full name"
              fullWidth
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Phone"
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <TextField
              select
              label="Role"
              fullWidth
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>

            {editingId && (
              <TextField
                select
                label="Status"
                fullWidth
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
              </TextField>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={submitting}
            sx={{ backgroundColor: PINK, textTransform: 'none', '&:hover': { backgroundColor: PINK } }}
          >
            {submitting ? 'Saving…' : (editingId ? 'Save Changes' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
