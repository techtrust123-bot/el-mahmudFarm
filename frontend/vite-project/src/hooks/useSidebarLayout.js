import { useCallback, useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'cloudfarm-sidebar-collapsed';

const readCollapsedPreference = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

const useSidebarLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsedPreference);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // Keep the current-session preference if browser storage is unavailable.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const closeMobileDrawer = (event) => {
      if (event.matches) setSidebarOpen(false);
    };

    desktopQuery.addEventListener('change', closeMobileDrawer);
    return () => desktopQuery.removeEventListener('change', closeMobileDrawer);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed((collapsed) => !collapsed), []);

  return {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    closeSidebar,
    toggleSidebarCollapsed,
  };
};

export default useSidebarLayout;