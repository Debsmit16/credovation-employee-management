import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { notificationService } from '../services';
import type { Notification } from '../types';
import {
  TaskListLtr24Regular, CalendarClock24Regular, CheckmarkCircle24Regular,
  Clock24Regular, Warning24Regular, Comment24Regular, Alert24Regular,
} from '@fluentui/react-icons';

const typeIcons: Record<string, { icon: JSX.Element; bg: string; color: string }> = {
  TASK_ASSIGNED: { icon: <TaskListLtr24Regular />, bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  TASK_OVERDUE: { icon: <Warning24Regular />, bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
  LEAVE_APPROVED: { icon: <CheckmarkCircle24Regular />, bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  LEAVE_REJECTED: { icon: <Warning24Regular />, bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
  LEAVE_REQUEST: { icon: <CalendarClock24Regular />, bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  CHECK_IN_REMINDER: { icon: <Clock24Regular />, bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  MANAGER_COMMENT: { icon: <Comment24Regular />, bg: 'var(--color-wfh-bg)', color: 'var(--color-wfh)' },
  SYSTEM_ALERT: { icon: <Alert24Regular />, bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

export default function NotificationCentre() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {} finally { setLoading(false); }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      fetchNotifications();
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch {}
  };

  const filtered = filter === 'all' ? notifications :
    filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications.filter(n => n.type === filter);

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton" style={{ width: 200, height: 28 }} /></div>
        <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount} unread · {notifications.length} total</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'All' },
          { value: 'unread', label: `Unread (${unreadCount})` },
          { value: 'TASK_ASSIGNED', label: 'Tasks' },
          { value: 'LEAVE_REQUEST', label: 'Leave' },
          { value: 'LEAVE_APPROVED', label: 'Approved' },
        ].map(f => (
          <button key={f.value} className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h4>No notifications</h4>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {filtered.map(notif => {
                const typeInfo = typeIcons[notif.type] || typeIcons.SYSTEM_ALERT;
                return (
                  <div
                    key={notif.id}
                    className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    style={{ borderBottom: '1px solid #f1f5f9', borderRadius: 0, padding: '16px 20px' }}
                  >
                    <div className="notif-icon" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                      {typeInfo.icon}
                    </div>
                    <div className="notif-content" style={{ flex: 1 }}>
                      <div className="notif-title">{notif.title}</div>
                      <div className="notif-body">{notif.body}</div>
                      <div className="notif-time">{format(new Date(notif.createdAt), 'MMM d, yyyy · hh:mm a')}</div>
                    </div>
                    {!notif.isRead && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#3b82f6', flexShrink: 0,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
