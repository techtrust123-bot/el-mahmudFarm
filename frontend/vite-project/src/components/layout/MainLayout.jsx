import Sidebar from '../common/Sidebar';
import Navbar from '../common/Navbar';
import useSidebarLayout from '../../hooks/useSidebarLayout';

/**
 * MainLayout - Wrapper for authenticated pages
 */
const MainLayout = ({ children }) => {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, closeSidebar, toggleSidebarCollapsed } = useSidebarLayout();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} isCollapsed={sidebarCollapsed} onClose={closeSidebar} />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={closeSidebar} />}

      {/* Main Content */}
      <div className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Navbar */}
        <Navbar toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} sidebarCollapsed={sidebarCollapsed} toggleSidebarCollapsed={toggleSidebarCollapsed} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto pt-16 min-w-0">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
