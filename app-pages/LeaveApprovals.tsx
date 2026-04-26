import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { leaveService } from '../services';
import type { LeaveRequest } from '../types';

export default function LeaveApprovals() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        leaveService.getPending(),
        leaveService.getAll(),
      ]);
      setRequests(pendingRes.data);
      setAllRequests(allRes.data);
    } catch (err) {
      console.error('Failed to fetch leave data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: string) => {
    try {
      await leaveService.approve(id, status, commentMap[id] || undefined);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const displayed = tab === 'pending' ? requests : allRequests;

  const statusClassMap: Record<string, string> = {
    PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected',
    CANCELLED: 'cancelled', MODIFICATION_REQUESTED: 'pending',
  };

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
      <div className="page-header">
        <h1>Leave Approvals</h1>
        <p>{requests.length} pending request{requests.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === 'pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('pending')}>
          Pending ({requests.length})
        </button>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('all')}>
          All Requests
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h4>{tab === 'pending' ? 'No pending requests' : 'No leave requests'}</h4>
              <p>{tab === 'pending' ? 'All caught up!' : 'No requests found'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(req => (
            <div key={req.id} className="card animate-fade-in">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, color: '#475569',
                    }}>
                      {req.user?.name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{req.user?.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{req.user?.department}</div>
                    </div>
                  </div>
                  <span className={`status-badge ${statusClassMap[req.status]}`}>{req.status.replace('_', ' ')}</span>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                  padding: '12px', background: '#f8fafc', borderRadius: 8, fontSize: 12, marginBottom: 12,
                }}>
                  <div><span style={{ color: '#94a3b8' }}>Type</span><br /><strong>{req.leaveType.replace(/_/g, ' ')}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>From</span><br /><strong>{format(parseISO(req.startDate), 'MMM d, yyyy')}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>To</span><br /><strong>{format(parseISO(req.endDate), 'MMM d, yyyy')}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>Requested</span><br /><strong>{format(new Date(req.createdAt), 'MMM d')}</strong></div>
                </div>

                {req.reason && (
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                    <strong>Reason:</strong> {req.reason}
                  </div>
                )}

                {req.status === 'PENDING' && (
                  <div>
                    <input
                      className="form-input"
                      placeholder="Add a comment (optional)"
                      value={commentMap[req.id] || ''}
                      onChange={(e) => setCommentMap({ ...commentMap, [req.id]: e.target.value })}
                      style={{ marginBottom: 10, fontSize: 12 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success btn-sm" onClick={() => handleAction(req.id, 'APPROVED')}>
                        ✓ Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleAction(req.id, 'REJECTED')}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                )}

                {req.approverComment && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 6,
                    background: '#f0f7ff', fontSize: 12, color: '#1e40af',
                  }}>
                    <strong>Response:</strong> {req.approverComment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
