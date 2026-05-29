import React, { useState } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import SessionWarningBanner from '../components/common/SessionWarningBanner';

/**
 * Main Layout Component - Wraps all route pages
 */
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Session Warning Banner */}
      <SessionWarningBanner />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Navbar */}
        <Navbar toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

        {/* Page content */}
        <main className="flex-1 overflow-auto pt-16">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
