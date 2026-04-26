import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { dashboardService } from '../services';
import type { HRDashboardData } from '../types';
import {
  People24Regular, Home24Regular, Airplane24Regular,
  Warning24Regular, Star24Filled, Clock24Regular,
} from '@fluentui/react-icons';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#22c55e', '#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8'];

export default function HRDashboard() {
  const [data, setData] = useState<HRDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await dashboardService.getHR();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load HR dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton" style={{ width: 200, height: 28 }} /></div>
        <div className="kpi-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  // Attendance pie data
  const pieData = [
    { name: 'Present', value: kpis?.presentToday || 0, color: '#22c55e' },
    { name: 'WFH', value: kpis?.wfhToday || 0, color: '#8b5cf6' },
    { name: 'On-site', value: kpis?.onSiteToday || 0, color: '#3b82f6' },
    { name: 'On Leave', value: kpis?.onLeaveToday || 0, color: '#f59e0b' },
    { name: 'Absent', value: kpis?.absent || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Performance trend data
  const perfData = (() => {
    if (!data?.performanceData?.length) return [];
    const weekMap = new Map<string, { sum: number; count: number }>();
    data.performanceData.forEach(d => {
      const weekLabel = format(new Date(d.date), "'W'w");
      const existing = weekMap.get(weekLabel) || { sum: 0, count: 0 };
      weekMap.set(weekLabel, { sum: existing.sum + d.selfRating, count: existing.count + 1 });
    });
    return Array.from(weekMap.entries()).map(([week, { sum, count }]) => ({
      week,
      avgRating: Number((sum / count).toFixed(1)),
    }));
  })();

  // Heatmap data processing
  const employees = data?.employees || [];
  const dates = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));

  return (
    <div>
      <div className="page-header">
        <h1>HR Dashboard</h1>
        <p>{format(new Date(), 'EEEE, MMMM d, yyyy')} · {kpis?.totalEmployees} employees</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon present"><People24Regular /></div>
          <div className="kpi-data"><h4>{kpis?.presentToday}</h4><p>Present Today</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon wfh"><Home24Regular /></div>
          <div className="kpi-data"><h4>{kpis?.wfhToday}</h4><p>Work from Home</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon leave"><Airplane24Regular /></div>
          <div className="kpi-data"><h4>{kpis?.onLeaveToday}</h4><p>On Leave</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon absent"><Warning24Regular /></div>
          <div className="kpi-data"><h4>{kpis?.absent}</h4><p>Absent</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon rating"><Star24Filled /></div>
          <div className="kpi-data"><h4>{kpis?.avgRating}</h4><p>Avg Rating</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon info"><Clock24Regular /></div>
          <div className="kpi-data"><h4>{kpis?.totalEmployees}</h4><p>Total Active</p></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Attendance Distribution */}
        <div className="card">
          <div className="card-header"><h3>Today's Attendance</h3></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="card">
          <div className="card-header"><h3>Performance Trend (Weekly Avg)</h3></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 240 }}>
              {perfData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={perfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" fontSize={11} tick={{ fill: '#94a3b8' }} />
                    <YAxis domain={[0, 5]} fontSize={11} tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }} />
                    <Line type="monotone" dataKey="avgRating" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>No performance data yet</p></div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Late Arrivals */}
        <div className="card">
          <div className="card-header"><h3>Late Arrivals This Month (3+)</h3></div>
          <div className="card-body" style={{ padding: 8 }}>
            {!data?.lateUsers?.length ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No frequent late arrivals 🎉</p></div>
            ) : (
              data.lateUsers.map((u: any) => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                  }}>{u.name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.department}</div>
                  </div>
                  <span className="status-badge blocked">{u.lateCount}×</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="card">
          <div className="card-header"><h3>Top Performers</h3></div>
          <div className="card-body" style={{ padding: 8 }}>
            {!data?.topPerformers?.length ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No ratings data yet</p></div>
            ) : (
              data.topPerformers.map((p: any, i: number) => (
                <div key={p.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.department}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                    ⭐ {p.avgRating}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Completion + Announcements Row */}
      <div className="grid-2" style={{ marginTop: 20 }}>
        {/* Task Completion Bar Chart */}
        <div className="card">
          <div className="card-header"><h3>Task Completion Rates (This Month)</h3></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 260 }}>
              {(data as any)?.taskCompletionChart?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data as any).taskCompletionChart} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} tick={{ fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} width={80} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                      formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="completionRate" name="Completion Rate" radius={[0, 6, 6, 0]}>
                      {(data as any).taskCompletionChart.map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : i === 2 ? '#8b5cf6' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>No task data this month</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="card-header"><h3>📢 Announcements</h3></div>
          <div className="card-body" style={{ padding: 8 }}>
            {!(data as any)?.announcements?.length ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No active announcements</p></div>
            ) : (
              (data as any).announcements.map((a: any) => (
                <div key={a.id} style={{
                  padding: '12px 14px', borderRadius: 8, marginBottom: 6,
                  background: a.priority === 'URGENT' ? 'var(--color-danger-bg)' : 'var(--color-surface-alt)',
                  borderLeft: `3px solid ${a.priority === 'URGENT' ? '#ef4444' : a.priority === 'NORMAL' ? '#3b82f6' : '#94a3b8'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {a.priority === 'URGENT' && '🔴 '}{a.title}
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{format(new Date(a.createdAt), 'MMM d')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{a.body}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>— {a.createdBy.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Attendance Heatmap */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>Attendance Heatmap (Last 30 Days)</h3></div>
        <div className="card-body">
          <div className="heatmap">
            <div style={{ display: 'flex', gap: 3, marginBottom: 6, paddingLeft: 120 }}>
              {dates.filter((_, i) => i % 5 === 0).map((d, i) => (
                <div key={i} style={{ fontSize: 10, color: '#94a3b8', minWidth: 18, textAlign: 'center' }}>
                  {format(d, 'd')}
                </div>
              ))}
            </div>
            {employees.slice(0, 20).map((emp: any) => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                <div style={{
                  width: 120, fontSize: 11, color: '#64748b', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {emp.name}
                </div>
                {dates.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const log = data?.heatmapData?.find(h =>
                    h.userId === emp.id && format(new Date(h.date), 'yyyy-MM-dd') === dateStr
                  );
                  let cellClass = 'empty';
                  if (log) {
                    if (log.lateFlag) cellClass = 'late';
                    else if (log.status === 'PRESENT') cellClass = 'present';
                    else if (log.status === 'WFH') cellClass = 'wfh';
                    else cellClass = 'present';
                  }
                  return (
                    <div
                      key={dateStr}
                      className={`heatmap-cell ${cellClass}`}
                      title={`${emp.name} - ${format(date, 'MMM d')}: ${log?.status || 'No record'}`}
                    />
                  );
                })}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingLeft: 120 }}>
              {[
                { label: 'Present', cls: 'present' },
                { label: 'WFH', cls: 'wfh' },
                { label: 'Late', cls: 'late' },
                { label: 'No Record', cls: 'empty' },
              ].map(l => (
                <div key={l.cls} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                  <div className={`heatmap-cell ${l.cls}`} style={{ width: 12, height: 12 }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
