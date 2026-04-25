import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { notificationService } from '../../services';
import {
  Navigation24Regular, Alert24Regular, WeatherSunny24Regular,
  WeatherMoon24Regular, Search24Regular,
} from '@fluentui/react-icons';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  pageTitle: string;
}

export default function TopBar({ onToggleSidebar, sidebarCollapsed, pageTitle }: TopBarProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await notificationService.getAll();
        setUnreadCount(res.data.unreadCount);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const greeting = (() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <header className={`topbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="topbar-left">
        <button className="topbar-toggle" onClick={onToggleSidebar}>
          <Navigation24Regular />
        </button>
        <div className="topbar-breadcrumb">
          {greeting}, <strong>{user?.name?.split(' ')[0]}</strong>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>·</span>
          <span>{pageTitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-btn" onClick={() => navigate('/notifications')}>
          <Alert24Regular />
          {unreadCount > 0 && <span className="topbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </div>
    </header>
  );
}
