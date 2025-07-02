// components/Navbar.js
"use client";
import Link from 'next/link';
import { use, useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => () => setDrawerOpen(open);

  return (
    <nav className="bg-[#6F4E37] text-white py-3 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">

        {/* Logo or left blank */}
        <div className="flex-1">
          <div className="md:hidden">
            <IconButton
              onClick={toggleDrawer(true)}
              className="text-white"
              aria-label="menu"
            >
              <MenuIcon />
            </IconButton>
          </div>
        </div>

        {/* Center Nav Icons - visible only on md+ */}
        <div className="hidden md:flex space-x-6">
          <Tooltip title="Home" arrow>
            <Link href="/" passHref>
              <IconButton
                color="inherit"
                component="a"
                size="large"
                sx={{ '&:hover': { color: '#FF4081' } }}
              >
                <HomeIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>

          <Tooltip title="About Us" arrow>
            <Link href="/about" passHref>
              <IconButton
                color="inherit"
                component="a"
                size="large"
                sx={{ '&:hover': { color: '#FF4081' } }}
              >
                <InfoIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>

          <Tooltip title="Contact Us" arrow>
            <Link href="/contact" passHref>
              <IconButton
                color="inherit"
                component="a"
                size="large"
                sx={{ '&:hover': { color: '#FF4081' } }}
              >
                <ContactMailIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>

          <Tooltip title="Profile" arrow>
            <Link href="/profile" passHref>
              <IconButton
                color="inherit"
                component="a"
                size="large"
                sx={{ '&:hover': { color: '#FF4081' } }}
              >
                <AccountCircleIcon fontSize="inherit" />
              </IconButton>
            </Link>
          </Tooltip>
        </div>

        {/* Right Buttons - visible only on md+ */}
        <div className="hidden md:flex space-x-3 flex-1 justify-end mr-4 mt-2">
          {['/signin', '/signup', '/seller-login', '/be-a-seller'].map((path, index) => (
            <Button
              key={index}
              variant="contained"
              sx={{
                backgroundColor: '#FF4081',
                '&:hover': { backgroundColor: '#ff5a95' },
                textTransform: 'none',
                mr: index !== 3 ? 1.5 : 0, // Add margin to all but last
              }}
              size="small"
            >
              <Link href={path}>
                {path === '/signin' && 'Sign In'}
                {path === '/signup' && 'Sign Up'}
                {path === '/seller-login' && 'Seller Login'}
                {path === '/be-a-seller' && 'Be a Seller'}
              </Link>
            </Button>
          ))}
        </div>

        {/* Drawer for mobile */}
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          <div className="w-64 bg-[#6F4E37] h-full text-white p-4">
            <h2 className="text-xl mb-4 font-semibold">Menu</h2>
            <List>
              <ListItem button component={Link} href="/">
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
              <ListItem button component={Link} href="/profile">
                <AccountCircleIcon className="mr-2" />
                <ListItemText primary="Profile" />
              </ListItem>
            </List>
            <Divider className="my-4 border-pink-300" />
            <List>
              <ListItem button component={Link} href="/signin">
                <ListItemText primary="Sign In" />
              </ListItem>
              <ListItem button component={Link} href="/signup">
                <ListItemText primary="Sign Up" />
              </ListItem>
              <ListItem button component={Link} href="/seller-login">
                <ListItemText primary="Seller Login" />
              </ListItem>
              <ListItem button component={Link} href="/be-a-seller">
                <ListItemText primary="Be a Seller" />
              </ListItem>
            </List>
          </div>
        </Drawer>
      </div>
    </nav>
  );
}
