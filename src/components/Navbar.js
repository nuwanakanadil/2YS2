"use client";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [deliveryPerson, setDeliveryPerson] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  const toggleDrawer = (open) => () => setDrawerOpen(open);
  const open = Boolean(anchorEl);

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setDeliveryPerson(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setUser(null);
    }
  };

  const fetchDeliveryPerson = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/delivery/profile', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveryPerson(data.data);
        setUser(null);
      } else {
        setDeliveryPerson(null);
      }
    } catch (err) {
      console.error('Error fetching delivery person:', err);
      setDeliveryPerson(null);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchDeliveryPerson();
  }, [pathname]);

  const currentUser = user || deliveryPerson;
  const isDeliveryPerson = !!deliveryPerson;
  const isDeliveryAdmin = deliveryPerson?.role === 'delivery_admin';

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      let logoutUrl = 'http://localhost:5000/api/auth/logout';
      let redirectPath = '/signin';
      
      // Use appropriate logout endpoint based on user type
      if (isDeliveryPerson) {
        logoutUrl = 'http://localhost:5000/api/auth/delivery-logout';
        redirectPath = '/delivery-signin';
      }
      
      const res = await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        setUser(null);
        setDeliveryPerson(null);
        handleMenuClose();
        
        // Clear local storage for delivery persons
        if (isDeliveryPerson) {
          localStorage.removeItem('deliveryEmail');
          localStorage.removeItem('deliveryUserId');
        }
        
        alert('Logout successful');
        router.push(redirectPath);
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
        
        {/* Left side: Hamburger + Cart */}
        <div className="flex items-center flex-1">
          {/* Hamburger for mobile */}
          <div className="md:hidden">
            <IconButton onClick={toggleDrawer(true)} className="text-white">
              <MenuIcon />
            </IconButton>
          </div>

          {/* Cart icon */}
          <div className="ml-2">
            <Tooltip title="Your Cart" arrow>
              <IconButton
                color="inherit"
                onClick={() => router.push('/Cart')}
              >
                <ShoppingCartIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Center Nav Icons */}
        <div className="hidden md:flex space-x-6">
          <Tooltip title="Home" arrow>
            <Link href="/" passHref>
              <IconButton color="inherit" component="a" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <HomeIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="About Us" arrow>
            <Link href="/about" passHref>
              <IconButton color="inherit" component="a" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <InfoIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
          <Tooltip title="Contact Us" arrow>
            <Link href="/contact" passHref>
              <IconButton color="inherit" component="a" size="large" sx={{ '&:hover': { color: '#FF4081' } }}>
                <ContactMailIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
        </div>

        {/* Right side buttons/profile */}
        <div className="hidden md:flex items-center justify-end flex-1 mr-4 mt-2 space-x-3">
          {currentUser ? (
            <>
              <IconButton onClick={handleMenuOpen}>
                <Avatar
                  alt={currentUser.firstName}
                  src={currentUser.profilePic ? `http://localhost:5000/${currentUser.profilePic}` : ''}
                  sx={{ 
                    width: 36, 
                    height: 36,
                    bgcolor: isDeliveryAdmin ? '#FF4081' : isDeliveryPerson ? '#4CAF50' : '#2196F3'
                  }}
                >
                  {!currentUser.profilePic && currentUser.firstName?.[0]}
                </Avatar>
              </IconButton>
              <div className="flex flex-col">
                <span className="text-white font-semibold cursor-pointer text-sm" onClick={handleMenuOpen}>
                  {currentUser.firstName} {currentUser.lastName}
                </span>
                {isDeliveryAdmin && (
                  <span className="text-[#FF4081] text-xs font-medium">
                    Admin
                  </span>
                )}
                {isDeliveryPerson && !isDeliveryAdmin && (
                  <span className="text-[#4CAF50] text-xs font-medium">
                    Delivery
                  </span>
                )}
              </div>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem 
                  onClick={() => { 
                    handleMenuClose(); 
                    if (isDeliveryAdmin) {
                      router.push('/delivery-admin-profile');
                    } else if (isDeliveryPerson) {
                      router.push('/delivery-profile');
                    } else {
                      router.push('/userProfile');
                    }
                  }}
                >
                  Edit Profile
                </MenuItem>
                {isDeliveryAdmin && (
                  <MenuItem 
                    onClick={() => { 
                      handleMenuClose(); 
                      router.push('/delivery-admin-dashboard');
                    }}
                  >
                    Admin Dashboard
                  </MenuItem>
                )}
                {isDeliveryPerson && !isDeliveryAdmin && (
                  <MenuItem 
                    onClick={() => { 
                      handleMenuClose(); 
                      router.push('/deliveryDashboard');
                    }}
                  >
                    Delivery Dashboard
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <div className="flex">
              {['/signin', '/signup', '/seller-login', '/delivery-signin', '/be-a-seller'].map((path, index, arr) => (
                <Button
                  key={index}
                  variant="contained"
                  sx={{
                    backgroundColor: '#FF4081',
                    '&:hover': { backgroundColor: '#ff5a95' },
                    textTransform: 'none',
                    minWidth: '100px',
                    marginRight: index !== arr.length - 1 ? '8px' : '0px',
                  }}
                  size="small"
                  component={Link}
                  href={path}
                >
                  {path === '/signin' && 'Sign In'}
                  {path === '/signup' && 'Sign Up'}
                  {path === '/seller-login' && 'Seller Login'}
                  {path === '/delivery-signin' && 'Delivery Sign in'}
                  {path === '/be-a-seller' && 'Be a Seller'}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Drawer for mobile */}
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          <div className="w-64 bg-[#6F4E37] h-full text-white p-4">
            {currentUser ? (
              <>
                <div className="flex items-center mb-4">
                  <Avatar
                    alt={currentUser.firstName}
                    src={currentUser.profilePic ? `http://localhost:5000/${currentUser.profilePic}` : ''}
                    sx={{ 
                      width: 48, 
                      height: 48,
                      bgcolor: isDeliveryAdmin ? '#FF4081' : isDeliveryPerson ? '#4CAF50' : '#2196F3'
                    }}
                  >
                    {!currentUser.profilePic && currentUser.firstName?.[0]}
                  </Avatar>
                  <div className="ml-3">
                    <div className="font-semibold">{currentUser.firstName} {currentUser.lastName}</div>
                    <div className="text-sm opacity-75">
                      {isDeliveryAdmin ? 'Admin' : isDeliveryPerson ? 'Delivery' : 'User'}
                    </div>
                  </div>
                </div>
                <Divider className="my-4 border-pink-300" />
                <List>
                  <ListItem button component={Link} href="/"><HomeIcon className="mr-2" /><ListItemText primary="Home" /></ListItem>
                  <ListItem button component={Link} href="/about"><InfoIcon className="mr-2" /><ListItemText primary="About Us" /></ListItem>
                  <ListItem button component={Link} href="/contact"><ContactMailIcon className="mr-2" /><ListItemText primary="Contact Us" /></ListItem>
                  <ListItem 
                    button 
                    onClick={() => {
                      if (isDeliveryAdmin) {
                        router.push('/delivery-admin-profile');
                      } else if (isDeliveryPerson) {
                        router.push('/delivery-profile');
                      } else {
                        router.push('/userProfile');
                      }
                      setDrawerOpen(false);
                    }}
                  >
                    <AccountCircleIcon className="mr-2" /><ListItemText primary="Edit Profile" />
                  </ListItem>
                  {isDeliveryAdmin && (
                    <ListItem 
                      button 
                      onClick={() => {
                        router.push('/delivery-admin-dashboard');
                        setDrawerOpen(false);
                      }}
                    >
                      <ListItemText primary="Admin Dashboard" />
                    </ListItem>
                  )}
                  {isDeliveryPerson && !isDeliveryAdmin && (
                    <ListItem 
                      button 
                      onClick={() => {
                        router.push('/deliveryDashboard');
                        setDrawerOpen(false);
                      }}
                    >
                      <ListItemText primary="Delivery Dashboard" />
                    </ListItem>
                  )}
                  {!isDeliveryPerson && (
                    <ListItem button component={Link} href="/cart"><ShoppingCartIcon className="mr-2" /><ListItemText primary="Cart" /></ListItem>
                  )}
                  <ListItem button onClick={handleLogout}><ListItemText primary="Logout" /></ListItem>
                </List>
              </>
            ) : (
              <>
                <h2 className="text-xl mb-4 font-semibold">Menu</h2>
                <List>
                  <ListItem button component={Link} href="/"><HomeIcon className="mr-2" /><ListItemText primary="Home" /></ListItem>
                  <ListItem button component={Link} href="/about"><InfoIcon className="mr-2" /><ListItemText primary="About Us" /></ListItem>
                  <ListItem button component={Link} href="/contact"><ContactMailIcon className="mr-2" /><ListItemText primary="Contact Us" /></ListItem>
                  <ListItem button component={Link} href="/cart"><ShoppingCartIcon className="mr-2" /><ListItemText primary="Cart" /></ListItem>
                </List>
                <Divider className="my-4 border-pink-300" />
                <List>
                  <ListItem button component={Link} href="/signin"><ListItemText primary="Sign In" /></ListItem>
                  <ListItem button component={Link} href="/signup"><ListItemText primary="Sign Up" /></ListItem>
                  <ListItem button component={Link} href="/seller-login"><ListItemText primary="Seller Login" /></ListItem>
                  <ListItem button component={Link} href="/delivery-signin"><ListItemText primary="Delivery Sign in" /></ListItem>
                  <ListItem button component={Link} href="/be-a-seller"><ListItemText primary="Be a Seller" /></ListItem>
                </List>
              </>
            )}
          </div>
        </Drawer>
      </div>
    </nav>
  );
}
