import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  Home24Regular, TaskListLtr24Regular, CalendarClock24Regular,
  Person24Regular, People24Regular, PeopleTeam24Regular,
  ChartMultiple24Regular, DocumentTable24Regular, Settings24Regular,
  CheckmarkCircle24Regular,
  SignOut24Regular, CalendarLtr24Regular,
  Megaphone24Regular,
} from '@fluentui/react-icons';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = {
  EMPLOYEE: [
    { section: 'Main', items: [
      { to: '/', icon: <Home24Regular />, label: 'My Day' },
      { to: '/tasks', icon: <TaskListLtr24Regular />, label: 'My Tasks' },
      { to: '/leave', icon: <CalendarClock24Regular />, label: 'Leave' },
      { to: '/holidays', icon: <CalendarLtr24Regular />, label: 'Holidays' },
      { to: '/announcements', icon: <Megaphone24Regular />, label: 'Announcements' },
      { to: '/profile', icon: <Person24Regular />, label: 'My Profile' },
    ]},
  ],
  MANAGER: [
    { section: 'Main', items: [
      { to: '/', icon: <Home24Regular />, label: 'Team Overview' },
      { to: '/tasks', icon: <TaskListLtr24Regular />, label: 'My Tasks' },
      { to: '/assign-tasks', icon: <PeopleTeam24Regular />, label: 'Assign Tasks' },
      { to: '/leave-approvals', icon: <CheckmarkCircle24Regular />, label: 'Leave Approvals' },
      { to: '/leave', icon: <CalendarClock24Regular />, label: 'My Leave' },
    ]},
    { section: 'Analytics', items: [
      { to: '/team-performance', icon: <ChartMultiple24Regular />, label: 'Team Performance' },
      { to: '/reports', icon: <DocumentTable24Regular />, label: 'Reports' },
    ]},
    { section: 'Account', items: [
      { to: '/holidays', icon: <CalendarLtr24Regular />, label: 'Holidays' },
      { to: '/announcements', icon: <Megaphone24Regular />, label: 'Announcements' },
      { to: '/profile', icon: <Person24Regular />, label: 'My Profile' },
    ]},
  ],
  HR_ADMIN: [
    { section: 'Main', items: [
      { to: '/', icon: <Home24Regular />, label: 'HR Dashboard' },
      { to: '/employees', icon: <People24Regular />, label: 'Employees' },
      { to: '/leave-approvals', icon: <CheckmarkCircle24Regular />, label: 'Leave Approvals' },
      { to: '/announcements', icon: <Megaphone24Regular />, label: 'Announcements' },
      { to: '/holidays', icon: <CalendarLtr24Regular />, label: 'Holidays' },
    ]},
    { section: 'Analytics', items: [
      { to: '/team-performance', icon: <ChartMultiple24Regular />, label: 'Performance' },
      { to: '/reports', icon: <DocumentTable24Regular />, label: 'Reports' },
    ]},
    { section: 'System', items: [
      { to: '/settings', icon: <Settings24Regular />, label: 'Settings' },
      { to: '/profile', icon: <Person24Regular />, label: 'My Profile' },
    ]},
  ],
  SUPER_ADMIN: [
    { section: 'Main', items: [
      { to: '/', icon: <Home24Regular />, label: 'HR Dashboard' },
      { to: '/employees', icon: <People24Regular />, label: 'Employees' },
      { to: '/leave-approvals', icon: <CheckmarkCircle24Regular />, label: 'Leave Approvals' },
      { to: '/assign-tasks', icon: <PeopleTeam24Regular />, label: 'Assign Tasks' },
      { to: '/announcements', icon: <Megaphone24Regular />, label: 'Announcements' },
      { to: '/holidays', icon: <CalendarLtr24Regular />, label: 'Holidays' },
    ]},
    { section: 'Analytics', items: [
      { to: '/team-performance', icon: <ChartMultiple24Regular />, label: 'Performance' },
      { to: '/reports', icon: <DocumentTable24Regular />, label: 'Reports' },
    ]},
    { section: 'System', items: [
      { to: '/settings', icon: <Settings24Regular />, label: 'Settings' },
      { to: '/profile', icon: <Person24Regular />, label: 'My Profile' },
    ]},
  ],
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore();

  const sections = useMemo(() => {
    if (!user) return [];
    return navItems[user.role] || navItems.EMPLOYEE;
  }, [user]);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const roleLabel = user?.role?.replace('_', ' ') || '';

  return (
    <>
      {mobileOpen && <div className="sidebar-mobile-backdrop" onClick={onMobileClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199,
        backdropFilter: 'blur(2px)',
      }} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">C</div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <h2>Credovation</h2>
              <p>Employee Management</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {sections.map((section: any) => (
            <div key={section.section}>
              {!collapsed && <div className="sidebar-section-label">{section.section}</div>}
              {section.items.map((item: any) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onMobileClose}
                >
                  <span className="icon">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info" style={{ flex: 1 }}>
              <div className="name">{user?.name}</div>
              <div className="role">{roleLabel}</div>
            </div>
          )}
          {!collapsed && (
            <button className="topbar-btn" onClick={logout} title="Sign out" style={{ color: '#94a3b8' }}>
              <SignOut24Regular />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
