import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'My Tasks',
  '/assign-tasks': 'Assign Tasks',
  '/leave': 'Leave Management',
  '/leave-approvals': 'Leave Approvals',
  '/profile': 'My Profile',
  '/team-performance': 'Performance',
  '/reports': 'Reports',
  '/employees': 'Employee Management',
  '/settings': 'System Settings',
  '/notifications': 'Notifications',
  '/holidays': 'Holiday Calendar',
  '/announcements': 'Announcements',
};

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar
          onToggleSidebar={() => {
            if (window.innerWidth <= 768) {
              setMobileOpen(!mobileOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          sidebarCollapsed={sidebarCollapsed}
          pageTitle={pageTitle}
        />
        <main className="app-content animate-fade-in" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
