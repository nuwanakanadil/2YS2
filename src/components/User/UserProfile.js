'use client';

import { useState } from 'react';
import { Card, CardContent, Badge, Typography, Avatar, Button, Divider, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';

const dummyChats = [
  {
    username: 'alice123',
    lastMessage: 'Hey, are you available tomorrow?',
    unreadCount: 3,
    isUnread: true,
  },
  {
    username: 'bob456',
    lastMessage: 'Thanks for the update!',
    unreadCount: 0,
    isUnread: false,
  },
  {
    username: 'charlie789',
    lastMessage: 'Can you send me the files?',
    unreadCount: 1,
    isUnread: true,
  },
];

export default function ProfileComponent() {
  const router = useRouter();
  const [chats] = useState(dummyChats);
  const [user, setUser] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    username: 'johnny123',
    universityId: 'UO123456',
    phone: '+94 71 234 5678',
    profileImage: '/profile.jpg',
  });

  const handleChatClick = (username) => {
    router.push(`/chat/${username}`);
  };

  const handleUpdate = () => {
    console.log('Update profile:', user);
  };

  const handleDelete = () => {
    console.log('Delete account');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col lg:flex-row gap-6">
      {/* Account Details Section */}
      <Card
        className="w-full lg:w-1/2 shadow-lg"
        sx={{ backgroundColor: '#6F4E37', color: 'white' }}
      >
        <CardContent className="p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                alt={`${user.firstName} ${user.lastName}`}
                src={user.profileImage}
                sx={{ width: 80, height: 80 }}
              />
              <div>
                <Typography variant="h5" className="font-semibold text-white">
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="body2" className="text-white text-opacity-70">
                  @{user.username}
                </Typography>
              </div>
            </div>
            <Button
              variant="outlined"
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: '#FF4081',
                  color: '#FF4081',
                },
              }}
              onClick={handleDelete}
            >
              Delete Account
            </Button>
          </div>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 4 }} />

          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <TextField
              label="First Name"
              fullWidth
              value={user.firstName}
              onChange={(e) => setUser({ ...user, firstName: e.target.value })}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#FF4081' },
                },
              }}
            />
            <TextField
              label="Last Name"
              fullWidth
              value={user.lastName}
              onChange={(e) => setUser({ ...user, lastName: e.target.value })}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#FF4081' },
                },
              }}
            />
            <TextField
              label="Username"
              fullWidth
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#FF4081' },
                },
              }}
            />
            <TextField
              label="Email"
              fullWidth
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#FF4081' },
                },
              }}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={user.phone}
              onChange={(e) => setUser({ ...user, phone: e.target.value })}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#FF4081' },
                },
              }}
            />
            <TextField
              label="University ID"
              fullWidth
              value={user.universityId}
              onChange={(e) => setUser({ ...user, universityId: e.target.value })}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: '#FF4081' },
                },
              }}
            />
          </form>

          <div className="flex justify-end mt-6">
            <Button
              variant="contained"
              onClick={handleUpdate}
              sx={{
                backgroundColor: '#FF4081',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#e91e63',
                },
              }}
            >
              Update Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Section */}
      <div className="w-full lg:w-1/2 p-4">
        <Card className="shadow-lg ">
          <CardContent className="p-6 bg-[#6F4E37]">
            <Typography variant="h6" className="font-semibold text-white-800 mb-4">
              Chat
            </Typography>
            <div className="space-y-4">
              {chats.map((chat, index) => (
                <div
                  key={index}
                  onClick={() => handleChatClick(chat.username)}
                  className={`cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                    chat.isUnread ? 'bg-gray-100' : 'bg-white'
                  } hover:bg-gray-200`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <Typography variant="subtitle1" className="font-medium text-gray-900">
                        {chat.username}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600 truncate max-w-xs">
                        {chat.lastMessage}
                      </Typography>
                    </div>
                    {chat.unreadCount > 0 && (
                      <Badge
                        badgeContent={chat.unreadCount}
                        color="secondary"
                        sx={{ '& .MuiBadge-badge': { backgroundColor: '#FF4081' } }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
