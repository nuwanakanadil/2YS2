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
  Divider,
  Menu,
  MenuItem,

  // ⬇️ NEW imports for the top bar
  AppBar,
  Toolbar,
  Avatar,
  IconButton
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AccountCircle from '@mui/icons-material/AccountCircle';

const TABS = [
  { key: 'placed', label: 'Placed orders' },
  { key: 'cooking', label: 'Cooking orders' },
  { key: 'ready', label: 'Ready orders' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'finished', label: 'Finished orders' },
];

// Brand colors
const PINK = '#FF4081';
const PINK_HOVER = '#ff5a95';
const PINK_OUTLINE_BG = 'rgba(255, 64, 129, 0.08)';

export default function ManageOrdersPage() {
  const router = useRouter();

  // ⬇️ NEW state for top bar menu + display name
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
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('placed');

  const [anchorElStatus, setAnchorElStatus] = useState(null);
  const [menuSessionTs, setMenuSessionTs] = useState(null);

  const fmt = (d) => new Date(d).toLocaleString();

  const fetchSessions = async (statusKey = activeTab) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/canteen/order-sessions?status=${statusKey}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load order sessions');
      setRows(data.sessions || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(activeTab);
  }, [activeTab]);

  // ----- Actions -----

  const handleAssignDeliveryForSession = async (sessionTs) => {
    try {
      const res = await fetch(`http://localhost:5000/api/canteen/order-sessions/${sessionTs}/assign-delivery`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign');
      alert(data.message);
      fetchSessions(activeTab);
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  const updateStatus = async (sessionTs, toStatus, method) => {
    try {
      const res = await fetch(`http://localhost:5000/api/canteen/order-sessions/${sessionTs}/update-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');
      alert(`${data.message}. Modified: ${data.modified ?? data.modifiedCount ?? 'N/A'}`);
      fetchSessions(activeTab);
    } catch (e) {
      alert(e.message || 'Network error');
    }
  };

  // ----- UI helpers -----

  const openDetails = (sessionObj) => {
    setSelectedSession(sessionObj);
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedSession(null);
  };

  const placedHeaderExtra = useMemo(() => (
    <Stack direction="row" spacing={1}>
      <Chip label={`Sessions: ${rows.length}`} sx={{ bgcolor: PINK, color: '#fff', fontWeight: 600 }} />
      <Button
        variant="outlined"
        size="small"
        onClick={() => fetchSessions(activeTab)}
        sx={{
          textTransform: 'none',
          borderColor: PINK,
          color: PINK,
          '&:hover': { borderColor: PINK_HOVER, color: PINK_HOVER, backgroundColor: PINK_OUTLINE_BG },
        }}
      >
        Refresh
      </Button>
    </Stack>
  ), [rows.length, activeTab]);

  return (
    <Box className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ⬇️ Hide global navbar on this page */}
      <style jsx global>{` nav { display: none !important; } `}</style>

      {/* ⬇️ New page-local top bar */}
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

      <Card className="shadow-lg">
        <CardContent>
          {/* Tabs as pink buttons */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <Button
                key={t.key}
                variant={activeTab === t.key ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveTab(t.key)}
                sx={{
                  textTransform: 'none',
                  ...(activeTab === t.key
                    ? { backgroundColor: PINK, '&:hover': { backgroundColor: PINK_HOVER } }
                    : {
                        borderColor: PINK,
                        color: PINK,
                        '&:hover': { borderColor: PINK_HOVER, color: PINK_HOVER, backgroundColor: PINK_OUTLINE_BG },
                      }),
                }}
              >
                {t.label}
              </Button>
            ))}
          </Stack>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Typography variant="h5" fontWeight={600}>
                {TABS.find(t => t.key === activeTab)?.label || 'Manage Order Sessions'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Grouped by <strong>sessionTs</strong>. Showing <strong>{activeTab}</strong>.
              </Typography>
            </div>
            {placedHeaderExtra}
          </div>

          <Box mt={3}>
            {loading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={22} />
                <Typography>Loading sessions…</Typography>
              </div>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : rows.length === 0 ? (
              <Typography color="text.secondary">No sessions in this status.</Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Session</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Total (Rs.)</TableCell>
                    <TableCell>Methods</TableCell>
                    <TableCell>Ordered Window</TableCell>
                    {activeTab === 'out_for_delivery' ? (
                      <TableCell>Delivery person(s)</TableCell>
                    ) : activeTab === 'finished' ? null : (
                      <TableCell>Delivery</TableCell>
                    )}
                    <TableCell>Details</TableCell>
                    {activeTab === 'finished' ? null : <TableCell align="center">Action</TableCell>}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((r) => {
                    const itemsPreview = r.items?.slice(0, 2) || [];
                    const extra = Math.max((r.items?.length || 0) - itemsPreview.length, 0);

                    const hasDeliveryReady = (r.items || []).some(it => it.method === 'delivery' && it.status === 'ready');
                    const hasPickupReady   = (r.items || []).some(it => it.method === 'pickup'   && it.status === 'ready');

                    return (
                      <TableRow key={r.sessionTs} hover>
                        <TableCell>
                          <Chip size="small" label={r.sessionTs} />
                        </TableCell>

                        <TableCell>{r.customerName || '—'}</TableCell>

                        <TableCell sx={{ maxWidth: 360 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {itemsPreview.map(it => (
                              <Chip key={it.orderId} size="small" label={`${it.itemName} ×${it.quantity}`} />
                            ))}
                            {extra > 0 && (
                              <Tooltip title={(r.items || []).map(it => `${it.itemName} ×${it.quantity}`).join(', ')}>
                                <Chip size="small" label={`+${extra} more`} />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell align="right">
                          {Number(r.totalAmount).toLocaleString('en-LK')}
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {(r.methods || []).map(m => (
                              <Chip key={m} size="small" label={m} />
                            ))}
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {fmt(r.createdAtMin)} → {fmt(r.createdAtMax)}
                          </Typography>
                        </TableCell>

                        {activeTab === 'out_for_delivery' ? (
                          <TableCell>
                            {(r.deliveryPersons || []).length ? (r.deliveryPersons || []).join(', ') : '—'}
                          </TableCell>
                        ) : activeTab === 'finished' ? null : (
                          <TableCell>
                            {r.assignment?.deliveryPersonName ? (
                              <Chip color="success" size="small" label={`Assigned: ${r.assignment.deliveryPersonName}`} />
                            ) : (
                              <Chip size="small" label="Not assigned" />
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => openDetails(r)}
                            sx={{
                              textTransform: 'none',
                              color: PINK,
                              '&:hover': { color: PINK_HOVER, backgroundColor: PINK_OUTLINE_BG },
                            }}
                          >
                            View details
                          </Button>
                        </TableCell>

                        {activeTab === 'finished' ? null : (
                          <TableCell align="center">
                            {activeTab === 'placed' && (
                              <>
                                <Button
                                  variant="contained"
                                  size="small"
                                  sx={{
                                    textTransform: 'none',
                                    backgroundColor: PINK,
                                    '&:hover': { backgroundColor: PINK_HOVER },
                                  }}
                                  onClick={(e) => {
                                    setAnchorElStatus(e.currentTarget);
                                    setMenuSessionTs(r.sessionTs);
                                  }}
                                >
                                  Update status
                                </Button>
                                <Menu
                                  anchorEl={anchorElStatus}
                                  open={Boolean(anchorElStatus) && menuSessionTs === r.sessionTs}
                                  onClose={() => {
                                    setAnchorElStatus(null);
                                    setMenuSessionTs(null);
                                  }}
                                >
                                  <MenuItem
                                    onClick={() => {
                                      updateStatus(r.sessionTs, 'cooking');
                                      setAnchorElStatus(null);
                                      setMenuSessionTs(null);
                                    }}
                                  >
                                    Cooking
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      updateStatus(r.sessionTs, 'ready');
                                      setAnchorElStatus(null);
                                      setMenuSessionTs(null);
                                    }}
                                  >
                                    Ready
                                  </MenuItem>
                                </Menu>
                              </>
                            )}

                            {activeTab === 'cooking' && (
                              <Button
                                variant="contained"
                                size="small"
                                sx={{
                                  textTransform: 'none',
                                  backgroundColor: PINK,
                                  '&:hover': { backgroundColor: PINK_HOVER },
                                }}
                                onClick={() => updateStatus(r.sessionTs, 'ready')}
                              >
                                Update status to Ready
                              </Button>
                            )}

                            {activeTab === 'ready' && (
                              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                                {hasDeliveryReady && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    sx={{
                                      textTransform: 'none',
                                      backgroundColor: PINK,
                                      '&:hover': { backgroundColor: PINK_HOVER },
                                    }}
                                    onClick={() => handleAssignDeliveryForSession(r.sessionTs)}
                                  >
                                    Assign delivery person
                                  </Button>
                                )}
                                {hasPickupReady && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      textTransform: 'none',
                                      borderColor: PINK,
                                      color: PINK,
                                      '&:hover': { borderColor: PINK_HOVER, color: PINK_HOVER, backgroundColor: PINK_OUTLINE_BG },
                                    }}
                                    onClick={() => updateStatus(r.sessionTs, 'picked', 'pickup')}
                                  >
                                    Update status to Picked
                                  </Button>
                                )}
                              </Stack>
                            )}

                            {activeTab === 'out_for_delivery' && (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={closeDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          Session {selectedSession?.sessionTs} — {selectedSession?.customerName || 'Customer'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedSession && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Window: {fmt(selectedSession.createdAtMin)} → {fmt(selectedSession.createdAtMax)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {(selectedSession.methods || []).map(m => (
                  <Chip key={m} size="small" label={m} />
                ))}
                {selectedSession.assignment?.deliveryPersonName && (
                  <Chip color="success" size="small" label={`Assigned to ${selectedSession.assignment.deliveryPersonName}`} />
                )}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Ordered At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedSession.items || []).map((it) => (
                    <TableRow key={it.orderId}>
                      <TableCell>{String(it.orderId).slice(0, 6)}…{String(it.orderId).slice(-4)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {it.img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`http://localhost:5000/${it.img}`}
                              alt=""
                              width={34}
                              height={34}
                              style={{ borderRadius: 6, objectFit: 'cover' }}
                            />
                          )}
                          <span>{it.itemName}</span>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell><Chip size="small" label={it.method} /></TableCell>
                      <TableCell><Chip size="small" label={it.status} /></TableCell>
                      <TableCell>{it.Paymentmethod || '—'}</TableCell>
                      <TableCell style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.address || '—'}
                      </TableCell>
                      <TableCell align="right">
                        {it.price != null ? Number(it.price).toLocaleString('en-LK') : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {Number(it.totalAmount).toLocaleString('en-LK')}
                      </TableCell>
                      <TableCell>{new Date(it.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Items: <strong>{selectedSession.itemCount}</strong></Typography>
                <Typography variant="subtitle1">
                  Session Total: <strong>Rs. {Number(selectedSession.totalAmount).toLocaleString('en-LK')}</strong>
                </Typography>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDetails}
            sx={{
              textTransform: 'none',
              color: PINK,
              '&:hover': { color: PINK_HOVER, backgroundColor: PINK_OUTLINE_BG },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
