import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { holidayService } from '../services';
import {
  CalendarLtr24Regular, Add24Regular, Delete24Regular,
} from '@fluentui/react-icons';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

export default function HolidayManagement() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', type: 'PUBLIC' });
  const [year, setYear] = useState(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchHolidays(); }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await holidayService.getAll(year);
      setHolidays(res.data as any);
    } catch { } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.name || !form.date) return;
    setSubmitting(true);
    try {
      await holidayService.create(form);
      setForm({ name: '', date: '', type: 'PUBLIC' });
      setShowAdd(false);
      fetchHolidays();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add holiday');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await holidayService.delete(id);
      fetchHolidays();
    } catch { }
  };

  // Group holidays by month
  const grouped = holidays.reduce((acc: Record<string, Holiday[]>, h) => {
    const month = format(new Date(h.date), 'MMMM');
    (acc[month] = acc[month] || []).push(h);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Holiday Calendar</h1>
          <p>Manage public and company holidays for {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', fontSize: 13,
            }}
          >
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Add24Regular /> Add Holiday
          </button>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Add Holiday</h3>
              <button className="btn-icon" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Holiday Name *</label>
                <input className="form-input" placeholder="e.g. Independence Day"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input className="form-input" type="date"
                  value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-input" value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="PUBLIC">Public Holiday</option>
                  <option value="COMPANY">Company Holiday</option>
                  <option value="OPTIONAL">Optional Holiday</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting || !form.name || !form.date}>
                {submitting ? 'Adding...' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-body">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />)}</div></div>
      ) : holidays.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state" style={{ padding: 48, textAlign: 'center' }}>
            <CalendarLtr24Regular style={{ fontSize: 48, color: '#94a3b8' }} />
            <h3 style={{ marginTop: 12, color: '#64748b' }}>No holidays configured for {year}</h3>
            <p style={{ color: '#94a3b8', marginTop: 4 }}>Add public and company holidays to track them</p>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([month, items]) => (
          <div className="card" key={month} style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>{month}</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Holiday</th>
                    <th>Type</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{format(new Date(h.date), 'MMM d')}</td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{format(new Date(h.date), 'EEEE')}</td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</td>
                      <td>
                        <span className={`status-badge ${h.type === 'PUBLIC' ? 'present' : h.type === 'COMPANY' ? 'wfh' : 'info'}`}>
                          {h.type}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => handleDelete(h.id)} title="Delete">
                          <Delete24Regular style={{ color: '#ef4444' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
