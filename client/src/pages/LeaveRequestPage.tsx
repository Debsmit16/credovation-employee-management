import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { leaveService } from '../services';
import type { LeaveRequest, LeaveBalance } from '../types';
import { Add24Regular, CalendarClock24Regular } from '@fluentui/react-icons';

export default function LeaveRequestPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: 'FULL_DAY', startDate: '', endDate: '', reason: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [reqRes, balRes] = await Promise.all([
        leaveService.getAll(),
        leaveService.getBalances(),
      ]);
      setRequests(reqRes.data);
      setBalances(balRes.data);
    } catch (err) {
      console.error('Failed to fetch leave data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await leaveService.create(form);
      setShowForm(false);
      setForm({ leaveType: 'FULL_DAY', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit leave request');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await leaveService.cancel(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'cancelled',
    };
    return map[status] || '';
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton" style={{ width: 200, height: 28 }} /></div>
        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Leave Management</h1>
          <p>Request, track, and manage your leave</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Add24Regular /> Apply Leave
        </button>
      </div>

      {/* Leave Balances */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3><CalendarClock24Regular style={{ verticalAlign: 'middle', marginRight: 8 }} />Leave Balance ({new Date().getFullYear()})</h3>
        </div>
        <div className="card-body">
          <div className="leave-balance-grid">
            {balances.map(bal => (
              <div key={bal.id} className="leave-balance-card">
                <div className="type">{bal.leaveType.replace(/_/g, ' ')}</div>
                <div className="count" style={{ color: bal.remaining <= 2 ? 'var(--color-danger)' : '#0f172a' }}>{bal.remaining}</div>
                <div className="label">
                  {bal.taken} taken · {bal.pending} pending · {bal.entitled} total
                </div>
              </div>
            ))}
            {balances.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                No leave balances configured. Contact HR.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave History */}
      <div className="card">
        <div className="card-header"><h3>Request History ({requests.length})</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏖️</div>
              <h4>No leave requests</h4>
              <p>Click "Apply Leave" to get started</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>{req.leaveType.replace(/_/g, ' ')}</td>
                    <td>{format(parseISO(req.startDate), 'MMM d, yyyy')}</td>
                    <td>{format(parseISO(req.endDate), 'MMM d, yyyy')}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.reason || '—'}
                    </td>
                    <td><span className={`status-badge ${statusClass(req.status)}`}>{req.status}</span></td>
                    <td>
                      {['PENDING', 'APPROVED'].includes(req.status) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(req.id)}>Cancel</button>
                      )}
                      {req.approverComment && (
                        <span title={req.approverComment} style={{ cursor: 'help', marginLeft: 4 }}>💬</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2>Apply for Leave</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Leave Type *</label>
                <select className="form-select" value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                >
                  <option value="FULL_DAY">Full Day</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="EMERGENCY_LEAVE">Emergency Leave</option>
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input className="form-input" type="date" required value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input className="form-input" type="date" required value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea className="form-textarea" value={form.reason} rows={3}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason for leave"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
