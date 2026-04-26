import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { dashboardService, attendanceService, taskService } from '../services';
import type { EmployeeDashboardData, Task } from '../types';
import {
  CheckmarkCircle24Regular, Clock24Regular, Star24Filled,
  TaskListLtr24Regular, CalendarClock24Regular, ArrowRight16Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EmployeeHome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState('PRESENT');
  const [morningNote, setMorningNote] = useState('');
  const [selfRating, setSelfRating] = useState(0);
  const [endOfDayNote, setEndOfDayNote] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await dashboardService.getEmployee();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await attendanceService.checkIn(checkInStatus, morningNote || undefined);
      setMorningNote('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!data?.todayAttendance) return;
    try {
      await attendanceService.checkOut(data.todayAttendance.id, selfRating || undefined, endOfDayNote || undefined);
      setShowCheckOutModal(false);
      setSelfRating(0);
      setEndOfDayNote('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Check-out failed');
    }
  };

  const handleTaskStatusUpdate = async (task: Task, newStatus: string) => {
    try {
      await taskService.update(task.id, { status: newStatus as any });
      fetchData();
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const isCheckedIn = !!data?.todayAttendance?.checkIn;
  const isCheckedOut = !!data?.todayAttendance?.checkOut;

  // Calculate hours worked
  const hoursWorked = (() => {
    if (!data?.todayAttendance?.checkIn) return '0h 0m';
    const checkIn = new Date(data.todayAttendance.checkIn);
    const end = data.todayAttendance.checkOut ? new Date(data.todayAttendance.checkOut) : currentTime;
    const diff = Math.max(0, end.getTime() - checkIn.getTime());
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  })();

  const completedTasks = data?.todayTasks?.filter(t => t.status === 'COMPLETED').length || 0;
  const totalTasks = data?.todayTasks?.length || 0;

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton" style={{ width: 200, height: 28 }} /></div>
        <div className="grid-main-side">
          <div><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
          <div><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Day</h1>
        <p>{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Announcements Banner */}
      {(data as any)?.announcements?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {(data as any).announcements.slice(0, 2).map((a: any) => (
            <div key={a.id} style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 8,
              background: a.priority === 'URGENT' ? '#fef2f2' : '#eff6ff',
              borderLeft: `3px solid ${a.priority === 'URGENT' ? '#ef4444' : '#3b82f6'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 18 }}>{a.priority === 'URGENT' ? '🔴' : '📢'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.body}</div>
              </div>
              <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {format(new Date(a.createdAt), 'MMM d')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid-main-side">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Check-in/out Card */}
          <div className="checkin-card">
            <div className="time">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="date">{format(currentTime, 'EEEE, MMMM d')}</div>

            {!isCheckedIn && (
              <div>
                <div className="status-label">Select your work status</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, position: 'relative' }}>
                  {['PRESENT', 'WFH', 'ON_SITE_CLIENT'].map(s => (
                    <button
                      key={s}
                      onClick={() => setCheckInStatus(s)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: 'none',
                        background: checkInStatus === s ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                        color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s === 'ON_SITE_CLIENT' ? 'On-site' : s}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 12, position: 'relative' }}>
                  <input
                    placeholder="Morning note (optional, max 200 chars)"
                    value={morningNote}
                    onChange={(e) => setMorningNote(e.target.value)}
                    maxLength={200}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.06)', color: 'white',
                      fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
                <button className="checkin-btn check-in" onClick={handleCheckIn} disabled={checkingIn}>
                  {checkingIn ? 'Checking in...' : '☀️ Check In'}
                </button>
              </div>
            )}

            {isCheckedIn && !isCheckedOut && (
              <div>
                <div className="status-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite',
                  }} />
                  Working · Checked in at {format(new Date(data?.todayAttendance?.checkIn!), 'hh:mm a')}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, position: 'relative' }}>
                  {hoursWorked}
                </div>
                <button className="checkin-btn check-out" onClick={() => setShowCheckOutModal(true)}>
                  🌙 Check Out
                </button>
              </div>
            )}

            {isCheckedOut && (
              <div className="status-label" style={{ marginTop: 16 }}>
                ✅ Day complete · {data?.todayAttendance?.totalHours?.toFixed(1)} hours
                {data?.todayAttendance?.selfRating && (
                  <span> · {'⭐'.repeat(data.todayAttendance.selfRating)}</span>
                )}
              </div>
            )}
          </div>

          {/* Today's Tasks */}
          <div className="card">
            <div className="card-header">
              <h3>
                <TaskListLtr24Regular style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Today's Tasks ({completedTasks}/{totalTasks})
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
                View All <ArrowRight16Regular />
              </button>
            </div>
            <div className="card-body">
              {!data?.todayTasks?.length ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h4>No tasks for today</h4>
                  <p>You're all caught up! Add a self-assigned task if needed.</p>
                </div>
              ) : (
                <div className="task-list">
                  {data.todayTasks.map(task => {
                    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                    return (
                      <div key={task.id} className={`task-item ${isOverdue ? 'overdue' : ''}`}>
                        <div
                          className={`checkbox ${task.status === 'COMPLETED' ? 'completed' : ''}`}
                          onClick={() => {
                            const next = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
                            handleTaskStatusUpdate(task, next);
                          }}
                        >
                          {task.status === 'COMPLETED' && '✓'}
                        </div>
                        <div className="task-info">
                          <div className="task-title" style={{
                            textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                            opacity: task.status === 'COMPLETED' ? 0.6 : 1,
                          }}>
                            {task.title}
                          </div>
                          <div className="task-meta">
                            <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                            {task.isManagerAssigned && <span>From {task.assignedBy?.name}</span>}
                            {!task.isManagerAssigned && <span>Self-assigned</span>}
                            {isOverdue && <span style={{ color: 'var(--color-danger)' }}>Overdue</span>}
                          </div>
                        </div>
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusUpdate(task, e.target.value)}
                          style={{
                            fontSize: 11, padding: '3px 6px', borderRadius: 6,
                            border: '1px solid #e2e8f0', background: 'white',
                            color: '#475569', cursor: 'pointer',
                          }}
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Performance Trend */}
          {data?.performanceTrend && data.performanceTrend.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>Performance Trend (Last 30 Days)</h3>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.performanceTrend.map(d => ({
                      date: format(new Date(d.date), 'MMM d'),
                      rating: d.selfRating,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={11} tick={{ fill: '#94a3b8' }} />
                      <YAxis domain={[0, 5]} fontSize={11} tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a', border: 'none', borderRadius: 8,
                          color: 'white', fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPI Mini Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="kpi-card">
              <div className="kpi-icon info"><Clock24Regular /></div>
              <div className="kpi-data">
                <h4>{hoursWorked}</h4>
                <p>Hours Today</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon present"><CheckmarkCircle24Regular /></div>
              <div className="kpi-data">
                <h4>{completedTasks}/{totalTasks}</h4>
                <p>Tasks Done</p>
              </div>
            </div>
          </div>

          {/* Leave Balances */}
          <div className="card">
            <div className="card-header">
              <h3>
                <CalendarClock24Regular style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Leave Balance
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leave')}>
                Apply <ArrowRight16Regular />
              </button>
            </div>
            <div className="card-body">
              <div className="leave-balance-grid">
                {data?.leaveBalances?.map(bal => (
                  <div key={bal.id} className="leave-balance-card">
                    <div className="type">{bal.leaveType.replace(/_/g, ' ')}</div>
                    <div className="count">{bal.remaining}</div>
                    <div className="label">of {bal.entitled} remaining</div>
                  </div>
                ))}
                {(!data?.leaveBalances || data.leaveBalances.length === 0) && (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <p>No leave balances configured</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Notifications</h3>
              {data?.unreadCount ? (
                <span className="status-badge pending">{data.unreadCount} new</span>
              ) : null}
            </div>
            <div className="card-body" style={{ padding: 8 }}>
              {!data?.notifications?.length ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p>No notifications yet</p>
                </div>
              ) : (
                data.notifications.slice(0, 5).map(notif => (
                  <div key={notif.id} className={`notification-item ${!notif.isRead ? 'unread' : ''}`}>
                    <div className="notif-content">
                      <div className="notif-title">{notif.title}</div>
                      <div className="notif-body">{notif.body}</div>
                      <div className="notif-time">{format(new Date(notif.createdAt), 'MMM d, hh:mm a')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Check-out Modal */}
      {showCheckOutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckOutModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2>End of Day Summary</h2>
            <p style={{ marginBottom: 20, color: '#64748b', fontSize: 13 }}>
              You completed {completedTasks} of {totalTasks} tasks today.
            </p>

            <div className="form-group">
              <label>Self-Performance Rating</label>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`star ${star <= selfRating ? 'filled' : ''}`}
                    onClick={() => setSelfRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>End of Day Notes (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Summarize your day..."
                value={endOfDayNote}
                onChange={(e) => setEndOfDayNote(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowCheckOutModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCheckOut}>Check Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
