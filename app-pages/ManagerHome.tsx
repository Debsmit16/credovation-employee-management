import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { dashboardService, attendanceService, taskService, leaveService } from '../services';
import type { ManagerDashboardData, Task } from '../types';
import {
  People24Regular, CheckmarkCircle24Regular, Clock24Regular,
  Warning24Regular, ArrowRight16Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';

export default function ManagerHome() {
  const navigate = useNavigate();
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await dashboardService.getManager();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load manager dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (id: string, status: string) => {
    try {
      await leaveService.approve(id, status);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton" style={{ width: 200, height: 28 }} /></div>
        <div className="kpi-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  const checkedIn = data?.teamAttendance || [];
  const absent = (data?.reports || []).filter(r => !checkedIn.find(a => a.userId === r.id));
  const tasksByStatus = {
    NOT_STARTED: data?.teamTasks?.filter(t => t.status === 'NOT_STARTED') || [],
    IN_PROGRESS: data?.teamTasks?.filter(t => t.status === 'IN_PROGRESS') || [],
    COMPLETED: data?.teamTasks?.filter(t => t.status === 'COMPLETED') || [],
    BLOCKED: data?.teamTasks?.filter(t => t.status === 'BLOCKED') || [],
  };

  return (
    <div>
      <div className="page-header">
        <h1>Team Overview</h1>
        <p>{data?.teamSize || 0} direct reports · Today's snapshot</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon present"><People24Regular /></div>
          <div className="kpi-data">
            <h4>{data?.checkedInCount || 0}</h4>
            <p>Checked In</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon absent"><People24Regular /></div>
          <div className="kpi-data">
            <h4>{absent.length}</h4>
            <p>Not Checked In</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon info"><CheckmarkCircle24Regular /></div>
          <div className="kpi-data">
            <h4>{data?.pendingLeaves?.length || 0}</h4>
            <p>Pending Leaves</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon leave"><Warning24Regular /></div>
          <div className="kpi-data">
            <h4>{data?.overdueTasks?.length || 0}</h4>
            <p>Overdue Tasks</p>
          </div>
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      {(data?.overdueTasks?.length || 0) > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 16,
          background: '#fef2f2', borderLeft: '4px solid #ef4444',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#991b1b' }}>
              {data?.overdueTasks?.length} Overdue Task{(data?.overdueTasks?.length || 0) > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
              {data?.overdueTasks?.map((t: any) => `${t.title} (${t.assignedTo?.name})`).join(', ')}
            </div>
          </div>
          <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }}
            onClick={() => navigate('/assign-tasks')}>
            Review
          </button>
        </div>
      )}

      {/* Announcements Banner */}
      {(data as any)?.announcements?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
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
        {/* Kanban Task Board */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Team Task Board</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/assign-tasks')}>
                Assign Tasks <ArrowRight16Regular />
              </button>
            </div>
            <div className="card-body">
              <div className="kanban-board">
                {Object.entries(tasksByStatus).map(([status, tasks]) => (
                  <div key={status} className={`kanban-column ${status.toLowerCase().replace('_', '-')}`}>
                    <div className="kanban-column-header">
                      {status.replace('_', ' ')}
                      <span className="count">{tasks.length}</span>
                    </div>
                    {tasks.map(task => (
                      <div key={task.id} className="kanban-card">
                        <div className="card-title">{task.title}</div>
                        <div className="card-meta">
                          <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                          <span>{task.assignedTo?.name?.split(' ')[0]}</span>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>
                        No tasks
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Team Attendance */}
          <div className="card">
            <div className="card-header"><h3>Team Status Today</h3></div>
            <div className="card-body" style={{ padding: 8 }}>
              {data?.reports?.map(member => {
                const attendance = checkedIn.find(a => a.userId === member.id);
                return (
                  <div key={member.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: attendance ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600,
                      color: attendance ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {member.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{member.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{member.designation}</div>
                    </div>
                    <span className={`status-badge ${attendance ? attendance.status.toLowerCase().replace('_', '-') : 'absent'}`}>
                      {attendance ? attendance.status.replace('_', ' ') : 'Absent'}
                    </span>
                  </div>
                );
              })}
              {!data?.reports?.length && (
                <div className="empty-state" style={{ padding: 24 }}><p>No direct reports</p></div>
              )}
            </div>
          </div>

          {/* Pending Leave Approvals */}
          <div className="card">
            <div className="card-header">
              <h3>Pending Leaves</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leave-approvals')}>View All</button>
            </div>
            <div className="card-body" style={{ padding: 8 }}>
              {data?.pendingLeaves?.slice(0, 3).map(req => (
                <div key={req.id} style={{
                  padding: '12px', borderRadius: 8, marginBottom: 8,
                  background: '#fafbfc', border: '1px solid #eef1f6',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{req.user?.name}</span>
                    <span className="status-badge pending">Pending</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {req.leaveType.replace(/_/g, ' ')} · {format(parseISO(req.startDate), 'MMM d')} → {format(parseISO(req.endDate), 'MMM d')}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleLeaveAction(req.id, 'APPROVED')}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleLeaveAction(req.id, 'REJECTED')}>Reject</button>
                  </div>
                </div>
              ))}
              {!data?.pendingLeaves?.length && (
                <div className="empty-state" style={{ padding: 24 }}><p>No pending approvals</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
