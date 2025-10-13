'use client';

import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, FormControlLabel, Switch,

  // ⬇️ NEW: imports for the page-local top bar
  AppBar, Toolbar, Avatar, IconButton, Menu, MenuItem as MUIMenuItem,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useRouter } from 'next/navigation';

const PINK = '#FF4081';
const TABS = ['TRENDING', 'INCOME', 'SALES_SUMMARY', 'PEAK_HOURS', 'CHANNEL_MIX', 'LOW_PERFORMING'];

export default function ReportsPage() {
  const router = useRouter();

  // ⬇️ NEW: top bar state (only navbar change)
  const [anchorElTop, setAnchorElTop] = useState(null);
  const [displayName, setDisplayName] = useState('Manager');
  const topMenuOpen = Boolean(anchorElTop);

  const handleOpenTopMenu = (e) => setAnchorElTop(e.currentTarget);
  const handleCloseTopMenu = () => setAnchorElTop(null);
  const handleGoProfile = () => {
    handleCloseTopMenu();
    router.push('/manager/ManagerProfile');
  };
  const handleLogout = async () => {
    handleCloseTopMenu();
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

  const [active, setActive] = useState('TRENDING');

  // date range defaults: first day of month -> today
  const todayISO = new Date().toISOString().slice(0,10);
  const monthStartISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);

  // extra filters
  const [limit, setLimit] = useState(10);             // TRENDING: Top N
  const [groupBy, setGroupBy] = useState('day');      // SALES_SUMMARY: day|week|month
  const [lpMetric, setLpMetric] = useState('qty');    // LOW_PERFORMING: qty|revenue
  const [lpLimit, setLpLimit] = useState(10);         // LOW_PERFORMING: Bottom N
  const [onePage, setOnePage] = useState(true);       // export: fit to one page

  // data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  // styles
  const pinkBtn = {
    textTransform: 'none',
    backgroundColor: PINK,
    '&:hover': { backgroundColor: PINK },
  };
  const pinkOutlined = {
    textTransform: 'none',
    borderColor: PINK,
    color: PINK,
    '&:hover': { borderColor: PINK, backgroundColor: 'rgba(255,64,129,0.06)' },
  };

  const preview = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '';

      if (active === 'TRENDING') {
        url = `http://localhost:5000/api/reports/trending?from=${from}&to=${to}&limit=${limit}`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        setRows(d.rows || []); setSummary(null);

      } else if (active === 'INCOME') {
        url = `http://localhost:5000/api/reports/income?from=${from}&to=${to}`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        setRows(d.daily || []); setSummary({ totalRevenue: d.totalRevenue || 0 });

      } else if (active === 'SALES_SUMMARY') {
        url = `http://localhost:5000/api/reports/sales-summary?from=${from}&to=${to}&groupBy=${groupBy}`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        setRows(d.rows || []); setSummary(null);

      } else if (active === 'PEAK_HOURS') {
        url = `http://localhost:5000/api/reports/peak-hours?from=${from}&to=${to}`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        setRows(d.rows || []); setSummary(null);

      } else if (active === 'CHANNEL_MIX') {
        url = `http://localhost:5000/api/reports/channel-mix?from=${from}&to=${to}`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        setRows(d.rows || []); setSummary(d.totals || null);

      } else if (active === 'LOW_PERFORMING') {
        url = `http://localhost:5000/api/reports/low-performing?from=${from}&to=${to}&limit=${lpLimit}&metric=${lpMetric}`;
        const r = await fetch(url, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'Failed to load');
        setRows(d.rows || []); setSummary(null);
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    try {
      setLoading(true);
      setError('');
      const body = { type: active, from, to, onePage };
      if (active === 'TRENDING') body.limit = Number(limit);
      if (active === 'SALES_SUMMARY') body.groupBy = groupBy;
      if (active === 'LOW_PERFORMING') { body.limit = Number(lpLimit); body.metric = lpMetric; }

      const r = await fetch('http://localhost:5000/api/reports/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to generate PDF');
      window.open(d.url, '_blank');
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // simple CSV export for whatever is in "rows"
  const exportCsv = () => {
    const { headers, data } = csvShape(active, rows, summary);
    const csv = [headers.join(','), ...data.map(row => row.map(csvEscape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${active.toLowerCase()}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvShape = (tab, rowsArr, totals) => {
    switch (tab) {
      case 'TRENDING':
        return { headers: ['Item', 'Qty', 'Revenue'],
          data: rowsArr.map(r => [r.name, r.totalQty, r.totalRevenue ?? 0]) };
      case 'INCOME':
        return { headers: ['Day', 'Lines', 'Items', 'Revenue'],
          data: rowsArr.map(r => [r.day, r.lines, r.items, r.total ?? 0]) };
      case 'SALES_SUMMARY':
        return { headers: ['Period', 'Lines', 'Items', 'Revenue', 'AvgLine', 'AvgItem'],
          data: rowsArr.map(r => [r.period, r.lines, r.items, r.revenue ?? 0, r.avgLineValue ?? 0, r.avgItemPrice ?? 0]) };
      case 'PEAK_HOURS':
        return { headers: ['Hour', 'Lines', 'Items', 'Revenue'],
          data: rowsArr.map(r => [r.hour, r.lines, r.items, r.revenue ?? 0]) };
      case 'CHANNEL_MIX': {
        const base = rowsArr.map(r => [r.method, r.lines, r.items, r.revenue ?? 0, r.shareRevenue ?? 0, r.shareItems ?? 0]);
        if (totals) base.push(['TOTAL', totals.lines || 0, totals.items || 0, totals.revenue || 0, 1, 1]);
        return { headers: ['Method', 'Lines', 'Items', 'Revenue', 'ShareRevenue', 'ShareItems'], data: base };
      }
      case 'LOW_PERFORMING':
        return { headers: ['Item', 'Qty', 'Revenue'],
          data: rowsArr.map(r => [r.name, r.totalQty, r.totalRevenue ?? 0]) };
      default:
        return { headers: [], data: [] };
    }
  };

  const csvEscape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  useEffect(() => {
    preview(); // auto-load whenever tab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <Box className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ⬇️ Hide the global navbar on this page */}
      <style jsx global>{` nav { display: none !important; } `}</style>

      {/* ⬇️ Page-local top bar (profile icon + name + menu) */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#6F4E37', color: 'white', mb: 2 }}>
        <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={handleOpenTopMenu} size="small" sx={{ p: 0.5, color: 'inherit' }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, cursor: 'pointer' }}
              onClick={handleOpenTopMenu}
              title={displayName}
            >
              {displayName}
            </Typography>
          </Stack>

          <Menu
            anchorEl={anchorElTop}
            open={topMenuOpen}
            onClose={handleCloseTopMenu}
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
          {/* Tabs */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <Button
                key={t}
                variant={active === t ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActive(t)}
                sx={{
                  textTransform: 'none',
                  backgroundColor: active === t ? PINK : 'transparent',
                  borderColor: PINK,
                  color: active === t ? 'white' : PINK,
                  '&:hover': { backgroundColor: active === t ? PINK : 'rgba(255,64,129,0.06)', borderColor: PINK }
                }}
              >
                {labelForTab(t)}
              </Button>
            ))}
          </Stack>

          {/* Header + controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Typography variant="h5" fontWeight={600}>Manager Reports</Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a report and date range, then preview or export.
              </Typography>
            </div>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TextField
                size="small" label="From" type="date" value={from}
                onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small" label="To" type="date" value={to}
                onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }}
              />

              {active === 'TRENDING' && (
                <TextField
                  size="small" label="Top N" type="number" value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))} sx={{ width: 110 }}
                  inputProps={{ min: 1, max: 100 }}
                />
              )}

              {active === 'SALES_SUMMARY' && (
                <TextField
                  select size="small" label="Group by" value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)} sx={{ width: 150 }}
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </TextField>
              )}

              {active === 'LOW_PERFORMING' && (
                <>
                  <TextField
                    select size="small" label="Metric" value={lpMetric}
                    onChange={(e) => setLpMetric(e.target.value)} sx={{ width: 160 }}
                  >
                    <MenuItem value="qty">Lowest by Qty</MenuItem>
                    <MenuItem value="revenue">Lowest by Revenue</MenuItem>
                  </TextField>
                  <TextField
                    size="small" label="Bottom N" type="number" value={lpLimit}
                    onChange={(e) => setLpLimit(Number(e.target.value))} sx={{ width: 130 }}
                    inputProps={{ min: 1, max: 100 }}
                  />
                </>
              )}

              <FormControlLabel
                control={<Switch checked={onePage} onChange={(e) => setOnePage(e.target.checked)} />}
                label="Fit to one page"
              />

              <Button variant="outlined" size="small" onClick={preview} sx={pinkOutlined}>
                Preview
              </Button>
              <Button variant="contained" size="small" onClick={exportPdf} sx={pinkBtn}>
                Export PDF
              </Button>
              <Button variant="outlined" size="small" onClick={exportCsv} sx={pinkOutlined}>
                Export CSV
              </Button>
            </Stack>
          </div>

          {/* Summary */}
          {summary && (
            <Box mt={2}>
              {active === 'INCOME' && (
                <Typography>
                  Total Revenue: <b>Rs. {Number(summary.totalRevenue).toLocaleString('en-LK')}</b>
                </Typography>
              )}
              {active === 'CHANNEL_MIX' && (
                <Typography>
                  Total Revenue: <b>Rs. {Number(summary.revenue || 0).toLocaleString('en-LK')}</b> ·{' '}
                  Lines: <b>{summary.lines || 0}</b> · Items: <b>{summary.items || 0}</b>
                </Typography>
              )}
            </Box>
          )}

          {/* Table */}
          <Box mt={3}>
            {loading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={22} />
                <Typography>Loading…</Typography>
              </div>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              <ReportTable active={active} rows={rows} />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function labelForTab(t) {
  switch (t) {
    case 'TRENDING': return 'Trending Foods';
    case 'INCOME': return 'Income';
    case 'SALES_SUMMARY': return 'Sales Summary';
    case 'PEAK_HOURS': return 'Peak Hours';
    case 'CHANNEL_MIX': return 'Channel Mix';
    case 'LOW_PERFORMING': return 'Low Performing';
    default: return t;
  }
}

function ReportTable({ active, rows }) {
  if (active === 'TRENDING' || active === 'LOW_PERFORMING') {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Revenue (Rs.)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(rows || []).map((r, i) => (
            <TableRow key={i} hover>
              <TableCell>{r.name}</TableCell>
              <TableCell align="right">{r.totalQty}</TableCell>
              <TableCell align="right">{Number(r.totalRevenue || 0).toLocaleString('en-LK')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (active === 'INCOME') {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Day</TableCell>
            <TableCell align="right">Lines</TableCell>
            <TableCell align="right">Items</TableCell>
            <TableCell align="right">Revenue (Rs.)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(rows || []).map((r, i) => (
            <TableRow key={i} hover>
              <TableCell>{r.day}</TableCell>
              <TableCell align="right">{r.lines}</TableCell>
              <TableCell align="right">{r.items}</TableCell>
              <TableCell align="right">{Number(r.total || 0).toLocaleString('en-LK')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (active === 'SALES_SUMMARY') {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Period</TableCell>
            <TableCell align="right">Lines</TableCell>
            <TableCell align="right">Items</TableCell>
            <TableCell align="right">Revenue (Rs.)</TableCell>
            <TableCell align="right">Avg Line</TableCell>
            <TableCell align="right">Avg Item</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(rows || []).map((r, i) => (
            <TableRow key={i} hover>
              <TableCell>{r.period}</TableCell>
              <TableCell align="right">{r.lines}</TableCell>
              <TableCell align="right">{r.items}</TableCell>
              <TableCell align="right">{Number(r.revenue || 0).toLocaleString('en-LK')}</TableCell>
              <TableCell align="right">{Number(r.avgLineValue || 0).toLocaleString('en-LK')}</TableCell>
              <TableCell align="right">{Number(r.avgItemPrice || 0).toLocaleString('en-LK')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (active === 'PEAK_HOURS') {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Hour</TableCell>
            <TableCell align="right">Lines</TableCell>
            <TableCell align="right">Items</TableCell>
            <TableCell align="right">Revenue (Rs.)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(rows || []).map((r, i) => (
            <TableRow key={i} hover>
              <TableCell>{r.hour}:00</TableCell>
              <TableCell align="right">{r.lines}</TableCell>
              <TableCell align="right">{r.items}</TableCell>
              <TableCell align="right">{Number(r.revenue || 0).toLocaleString('en-LK')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // CHANNEL_MIX
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Method</TableCell>
          <TableCell align="right">Lines</TableCell>
          <TableCell align="right">Items</TableCell>
          <TableCell align="right">Revenue (Rs.)</TableCell>
          <TableCell align="right">Share (Revenue)</TableCell>
          <TableCell align="right">Share (Items)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(rows || []).map((r, i) => (
          <TableRow key={i} hover>
            <TableCell>{r.method}</TableCell>
            <TableCell align="right">{r.lines}</TableCell>
            <TableCell align="right">{r.items}</TableCell>
            <TableCell align="right">{Number(r.revenue || 0).toLocaleString('en-LK')}</TableCell>
            <TableCell align="right">{(Number(r.shareRevenue || 0) * 100).toFixed(1)}%</TableCell>
            <TableCell align="right">{(Number(r.shareItems || 0) * 100).toFixed(1)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
