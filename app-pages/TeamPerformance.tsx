import { useState, useEffect } from 'react';
import { reportService } from '../services';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function TeamPerformance() {
  const [perfData, setPerfData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = period === 'week'
        ? format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
        : format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

      const res = await reportService.generate('performance', {
        startDate,
        endDate: format(new Date(), 'yyyy-MM-dd'),
      });

      setPerfData(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch performance data', err);
    } finally { setLoading(false); }
  };

  const chartData = perfData.map((d: any) => ({
    name: d.user?.name?.split(' ')[0] || 'Unknown',
    avgRating: Number((d._avg?.selfRating || 0).toFixed(1)),
    daysRated: d._count?.id || 0,
  })).sort((a: any, b: any) => b.avgRating - a.avgRating);

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
          <h1>Team Performance</h1>
          <p>Self-rating trends and rankings</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${period === 'week' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setPeriod('week')}>This Week</button>
          <button className={`btn ${period === 'month' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setPeriod('month')}>This Month</button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h4>No performance data yet</h4>
              <p>Ratings will appear once employees start checking out with self-ratings</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3>Average Self-Rating by Employee</h3></div>
            <div className="card-body">
              <div className="chart-container" style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 5]} fontSize={11} tick={{ fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" fontSize={12} tick={{ fill: '#475569' }} width={80} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }} />
                    <Bar dataKey="avgRating" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Ranking Table */}
          <div className="card">
            <div className="card-header"><h3>Performance Rankings</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Avg Rating</th>
                    <th>Days Rated</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.sort((a: any, b: any) => (b._avg?.selfRating || 0) - (a._avg?.selfRating || 0)).map((d: any, i: number) => {
                    const avg = Number((d._avg?.selfRating || 0).toFixed(1));
                    const grade = avg >= 4.5 ? 'A+' : avg >= 4 ? 'A' : avg >= 3.5 ? 'B+' : avg >= 3 ? 'B' : avg >= 2.5 ? 'C' : 'D';
                    const gradeColor = avg >= 4 ? 'var(--color-success)' : avg >= 3 ? 'var(--color-warning)' : 'var(--color-danger)';
                    return (
                      <tr key={d.userId}>
                        <td>
                          <span style={{
                            width: 24, height: 24, borderRadius: '50%', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                            background: i === 0 ? '#fbbf24' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#e2e8f0',
                            color: i < 3 ? 'white' : '#64748b',
                          }}>
                            {i + 1}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{d.user?.name}</td>
                        <td>{d.user?.department || '—'}</td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>⭐ {avg}</td>
                        <td>{d._count?.id || 0}</td>
                        <td><span style={{ fontWeight: 700, color: gradeColor }}>{grade}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
