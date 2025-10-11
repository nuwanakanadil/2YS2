"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/sales/layout/Sidebar";
import Topbar from "@/components/sales/layout/Topbar";
import "../(dashboard)/styles.css"

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Apply dark mode class to html
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} darkMode={darkMode} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar toggleSidebar={toggleSidebar} darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
