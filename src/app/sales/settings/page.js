"use client";

import React, { useState } from "react";
import { useTheme } from "@/app/sales/layout";

const Settings = () => {
  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [language, setLanguage] = useState("en");

  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile form state
  const [name, setName] = useState("Nuwanaka Nadil");
  const [email, setEmail] = useState("nuwanaka.sliit@example.com");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("School of Computing");
  const [staffId, setStaffId] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [contactMethod, setContactMethod] = useState("email");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Handlers
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    alert(`Profile updated:
      Name: ${name}
      Email: ${email}
      Phone: ${phone}
      Department: ${department}
      Staff ID: ${staffId}
      Preferred Contact: ${contactMethod}`);
    setShowProfileModal(false);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New password and confirmation do not match.");
      return;
    }
    alert("Password updated successfully.");
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Notification Preferences */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={() => setEmailNotifications(!emailNotifications)}
              className="form-checkbox h-5 w-5 text-green-600"
            />
            <span className="ml-2 text-gray-700">Email Notifications</span>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={() => setSmsNotifications(!smsNotifications)}
              className="form-checkbox h-5 w-5 text-green-600"
            />
            <span className="ml-2 text-gray-700">SMS Notifications</span>
          </label>
        </div>
      </section>

      {/* Privacy Settings */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Privacy Settings</h2>
        <div>
          <label htmlFor="profileVisibility" className="block mb-2 text-gray-700 font-medium">
            Profile Visibility
          </label>
          <select
            id="profileVisibility"
            value={profileVisibility}
            onChange={(e) => setProfileVisibility(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="public">Public</option>
            <option value="campus-only">Campus Only (SLIIT)</option>
            <option value="private">Private</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">Control who can see your profile information.</p>
        </div>
      </section>

      {/* Language Preferences */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Language Preferences</h2>
        <div>
          <label htmlFor="language" className="block mb-2 text-gray-700 font-medium">
            Select Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="en">English</option>
            <option value="si">සිංහල (Sinhala)</option>
            <option value="ta">தமிழ் (Tamil)</option>
          </select>
        </div>
      </section>

      {/* Account Actions */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setShowProfileModal(true)}
          className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Update Profile Info
        </button>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
        >
          Change Password
        </button>
      </section>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Update Profile Info</h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <InputGroup label="Full Name" value={name} onChange={setName} />
              <InputGroup label="Email" value={email} onChange={setEmail} type="email" />
              <InputGroup label="Phone Number" value={phone} onChange={setPhone} placeholder="e.g., 0771234567" />
              <InputGroup label="Department / Faculty" value={department} onChange={setDepartment} />
              <InputGroup label="Staff ID" value={staffId} onChange={setStaffId} placeholder="Optional" />
              
              {/* Profile Picture */}
              <div>
                <label className="block text-gray-700 mb-1">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePicture(e.target.files[0])}
                  className="w-full"
                />
              </div>

              {/* Contact Method */}
              <div>
                <label className="block text-gray-700 mb-1">Preferred Contact Method</label>
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </form>
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <InputGroup label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
              <InputGroup label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
              <InputGroup label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Change Password
                </button>
              </div>
            </form>
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Corrected InputGroup component (uppercase!)
const InputGroup = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      required
    />
  </div>
);

export default Settings;