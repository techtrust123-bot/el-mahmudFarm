import React, { useState } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import SessionWarningBanner from '../components/common/SessionWarningBanner';
import CalculatorModal from '../components/calculator/CalculatorModal';
import useSidebarLayout from '../hooks/useSidebarLayout';

/**
 * Main Layout Component - Wraps all route pages
 */
const MainLayout = ({ children }) => {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, closeSidebar, toggleSidebarCollapsed } = useSidebarLayout();
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Session Warning Banner */}
      <SessionWarningBanner />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} isCollapsed={sidebarCollapsed} onClose={closeSidebar} />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content */}
      <div className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Navbar */}
        <Navbar
          toggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebarCollapsed={toggleSidebarCollapsed}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
        />

        <CalculatorModal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />

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
