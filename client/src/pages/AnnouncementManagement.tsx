import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { announcementService } from '../services';
import { useAuthStore } from '../stores/authStore';
import {
  Megaphone24Regular, Add24Regular, Delete24Regular,
} from '@fluentui/react-icons';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { name: string };
}

export default function AnnouncementManagement() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'NORMAL', expiresAt: '' });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAll(isAdmin);
      setItems(res.data as any);
    } catch { } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.title || !form.body) return;
    setSubmitting(true);
    try {
      await announcementService.create({
        title: form.title,
        body: form.body,
        priority: form.priority,
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      });
      setForm({ title: '', body: '', priority: 'NORMAL', expiresAt: '' });
      setShowAdd(false);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementService.delete(id);
      fetchAnnouncements();
    } catch { }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return { bg: '#fef2f2', border: '#ef4444', badge: 'blocked' };
      case 'NORMAL': return { bg: '#eff6ff', border: '#3b82f6', badge: 'present' };
      default: return { bg: 'var(--color-surface-alt)', border: '#94a3b8', badge: 'info' };
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Announcements</h1>
          <p>System-wide announcements and notices</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Add24Regular /> New Announcement
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Create Announcement</h3>
              <button className="btn-icon" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Title *</label>
                <input className="form-input" placeholder="Announcement title"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Body *</label>
                <textarea className="form-input" rows={4} placeholder="Announcement details..."
                  value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-input" value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Expires At (optional)</label>
                  <input className="form-input" type="datetime-local"
                    value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting || !form.title || !form.body}>
                {submitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 12 }} />)}</div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state" style={{ padding: 48, textAlign: 'center' }}>
            <Megaphone24Regular style={{ fontSize: 48, color: '#94a3b8' }} />
            <h3 style={{ marginTop: 12, color: '#64748b' }}>No announcements</h3>
            <p style={{ color: '#94a3b8', marginTop: 4 }}>
              {isAdmin ? 'Create an announcement to broadcast to all employees' : 'No active announcements at this time'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(a => {
            const pc = priorityColor(a.priority);
            return (
              <div key={a.id} className="card" style={{ borderLeft: `4px solid ${pc.border}`, overflow: 'hidden' }}>
                <div className="card-body" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className={`status-badge ${pc.badge}`}>{a.priority}</span>
                        <h3 style={{ margin: 0, fontSize: 15 }}>
                          {a.priority === 'URGENT' && '🔴 '}{a.title}
                        </h3>
                        {!a.isActive && <span className="status-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Inactive</span>}
                      </div>
                      <p style={{ fontSize: 13, color: '#475569', margin: '8px 0', lineHeight: 1.5 }}>{a.body}</p>
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
                        <span>By {a.createdBy.name}</span>
                        <span>{format(new Date(a.createdAt), 'MMM d, yyyy HH:mm')}</span>
                        {a.expiresAt && <span>Expires: {format(new Date(a.expiresAt), 'MMM d, yyyy')}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <button className="btn-icon" onClick={() => handleDelete(a.id)} title="Delete">
                        <Delete24Regular style={{ color: '#ef4444' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
