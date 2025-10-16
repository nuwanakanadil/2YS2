'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Button,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export default function Navbar() {
  const [role, setRole] = useState(null);          // JS: no generics
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);          // JS: no generics
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const pathname = usePathname();
  const router = useRouter();

  const toggleDrawer = (open) => () => setDrawerOpen(open);

  const actions = [
    { label: 'Sign In', href: '/user/signin' },
    { label: 'Sign Up', href: '/user/signup' },
    { label: 'Seller Login', href: '/manager/ManagerLogin' },
    { label: 'Be a Seller', href: '/manager/ManagerSignup' },
  ];

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/user/profile', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleMenuOpen = (event) => {              // JS: no type annotation
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/user/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setUser(null);
        handleMenuClose();
        alert('Logout successful');
        router.push('/user/signin');
      } else {
        alert('Logout failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Logout failed');
    }
  };

  return (
    <nav className="bg-[#6F4E37] text-white py-3 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className="md:hidden">
            <IconButton onClick={toggleDrawer(true)} className="text-white">
              <MenuIcon />
            </IconButton>
          </div>
          <div className="ml-2">
            <Tooltip title="Your Cart" arrow>
              <IconButton color="inherit" onClick={() => router.push('/user/Cart')}>
                <ShoppingCartIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="hidden md:flex space-x-6">
          <Tooltip title="Home" arrow>
            <Link href="/user">
              <IconButton color="inherit" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <HomeIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="About Us" arrow>
            <Link href="/aboutus">
              <IconButton color="inherit" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <InfoIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="Contact Us" arrow>
            <Link href="/contactus">
              <IconButton color="inherit" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <ContactMailIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
        </div>

        <div className="hidden md:flex items-center justify-end flex-1 mr-4 mt-2 space-x-3">
          {user ? (
            <>
              <IconButton onClick={handleMenuOpen}>
                <Avatar
                  alt={user?.firstName || 'User'}
                  src={user?.profilePic ? `http://localhost:5000/${user.profilePic}` : ''}
                  sx={{ width: 36, height: 36 }}
                />
              </IconButton>
              <span className="text-white font-semibold cursor-pointer" onClick={handleMenuOpen}>
                {user?.firstName || 'Profile'}
              </span>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={() => { handleMenuClose(); router.push('/user/userProfile'); }}>
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <div className="flex">
              {actions.map(({ label, href }, i) => (
                <Button
                  key={href}
                  variant="contained"
                  sx={{
                    backgroundColor: '#FF4081',
                    '&:hover': { backgroundColor: '#ff5a95' },
                    textTransform: 'none',
                    minWidth: '130px',
                    marginRight: i !== actions.length - 1 ? '8px' : '0px',
                  }}
                  size="small"
                  component={Link}
                  href={href}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          <div className="w-64 bg-[#6F4E37] h-full text-white p-4">
            <h2 className="text-xl mb-4 font-semibold">Menu</h2>
            <List>
              <ListItem button component={Link} href="/user">
                <HomeIcon className="mr-2" />
                <ListItemText primary="Home" />
              </ListItem>
              <ListItem button component={Link} href="/about">
                <InfoIcon className="mr-2" />
                <ListItemText primary="About Us" />
              </ListItem>
              <ListItem button component={Link} href="/contact">
                <ContactMailIcon className="mr-2" />
                <ListItemText primary="Contact Us" />
              </ListItem>
              <ListItem button component={Link} href="/user/userProfile">
                <AccountCircleIcon className="mr-2" />
                <ListItemText primary="Profile" />
              </ListItem>
              <ListItem button component={Link} href="/user/cart">
                <ShoppingCartIcon className="mr-2" />
                <ListItemText primary="Cart" />
              </ListItem>
            </List>

            <Divider className="my-4 border-pink-300" />

            <List>
              {role === 'manager' ? (
                <>
                  <ListItem button component={Link} href="/manager/ManagerLogin">
                    <ListItemText primary="Manager Login" />
                  </ListItem>
                  <ListItem button component={Link} href="/manager/ManagerSignup">
                    <ListItemText primary="Register as a Manager" />
                  </ListItem>
                </>
              ) : (
                <>
                  <ListItem button component={Link} href="/user/signin">
                    <ListItemText primary="Sign In" />
                  </ListItem>
                  <ListItem button component={Link} href="/user/signup">
                    <ListItemText primary="Sign Up" />
                  </ListItem>
                </>
              )}
            </List>
          </div>
        </Drawer>
      </div>
    </nav>
  );
}
