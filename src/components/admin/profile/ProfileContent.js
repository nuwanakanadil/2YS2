"use client";

import React, { useState, useEffect } from "react";
import { ProfileCard } from "./ProfileCard";
import { ProfileForm } from "./ProfileForm";
import { EmailSection } from "./Email";

export function ProfileContent() {
  const [user, setUser] = useState(null);

  // fetch user details on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/auth/profile", {
          credentials: "include", // include cookies (token)
        });
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-gray-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Gradient header */}
      <div className="w-full h-32 bg-gradient-to-r from-orange-500 via-lime-400 to-green-300"></div>

      <div className="max-w-5xl mx-auto px-6 -mt-16">
        <ProfileCard user={user} setUser={setUser} />
        <ProfileForm user={user} />
        <EmailSection />
      </div>
    </div>
  );
}
