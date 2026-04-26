import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { taskService, employeeService } from '../services';
import type { User } from '../types';
import { Send24Regular } from '@fluentui/react-icons';

export default function TaskAssignment() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Partial<User>[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    dueDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '17:00',
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeService.getAll({ isActive: 'true' });
        setEmployees(res.data.filter((e: any) => e.id !== user?.id));
      } catch {
        // If not admin, try to get team members from a different endpoint
        try {
          const api = (await import('../services/api')).default;
          const res = await api.get('/settings/departments');
          // Fallback: we can't list employees; the manager can type IDs
        } catch {}
      } finally { setLoading(false); }
    };
    fetchEmployees();
  }, [user]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      alert('Select at least one employee');
      return;
    }
    setSubmitting(true);
    try {
      if (selectedEmployees.length === 1) {
        await taskService.create({
          title: form.title,
          description: form.description || undefined,
          assignedToId: selectedEmployees[0],
          dueDate: form.dueDate,
          dueTime: form.dueTime,
          priority: form.priority as any,
        } as any);
      } else {
        await taskService.broadcast({
          title: form.title,
          description: form.description || undefined,
          assignedToIds: selectedEmployees,
          dueDate: form.dueDate,
          priority: form.priority,
        });
      }
      alert('Tasks assigned successfully!');
      setForm({ title: '', description: '', priority: 'MEDIUM', dueDate: format(new Date(), 'yyyy-MM-dd'), dueTime: '17:00' });
      setSelectedEmployees([]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Assign Tasks</h1>
        <p>Create and assign tasks to your team members</p>
      </div>

      <div className="grid-main-side">
        {/* Task Form */}
        <div className="card">
          <div className="card-header"><h3>New Task</h3></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input className="form-input" required value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the task in detail"
                  rows={4}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-select" value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input className="form-input" type="date" value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting || selectedEmployees.length === 0}
                style={{ marginTop: 8 }}
              >
                <Send24Regular />
                {submitting ? 'Assigning...' : `Assign to ${selectedEmployees.length} employee${selectedEmployees.length !== 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        </div>

        {/* Employee Selection */}
        <div className="card">
          <div className="card-header">
            <h3>Select Employees ({selectedEmployees.length})</h3>
            {employees.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (selectedEmployees.length === employees.length) {
                  setSelectedEmployees([]);
                } else {
                  setSelectedEmployees(employees.map(e => e.id!));
                }
              }}>
                {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: 8, maxHeight: 500, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 200 }} /></div>
            ) : employees.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No employees available</p>
              </div>
            ) : (
              employees.map(emp => {
                const isSelected = selectedEmployees.includes(emp.id!);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id!)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent',
                      border: isSelected ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                      transition: 'all 0.15s', marginBottom: 4,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: isSelected ? 'none' : '2px solid #cbd5e1',
                      background: isSelected ? '#3b82f6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 12, fontWeight: 700,
                    }}>
                      {isSelected && '✓'}
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600, color: '#475569',
                    }}>
                      {emp.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{emp.department} · {emp.designation}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
