import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { employeeService } from '../services';
import { Add24Regular, Search24Regular, Edit24Regular, ArrowUpload24Regular } from '@fluentui/react-icons';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: 'Welcome@123', role: 'EMPLOYEE',
    department: '', designation: '', managerId: '',
  });
  const [editForm, setEditForm] = useState({
    name: '', role: '', department: '', designation: '', managerId: '',
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const res = await employeeService.getAll({ search });
      setEmployees(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeService.create(form as any);
      setShowAddModal(false);
      setForm({ name: '', email: '', password: 'Welcome@123', role: 'EMPLOYEE', department: '', designation: '', managerId: '' });
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add employee');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await employeeService.update(editingEmployee.id, {
        name: editForm.name,
        role: editForm.role as any,
        department: editForm.department,
        designation: editForm.designation,
        managerId: editForm.managerId || undefined,
      } as any);
      setShowEditModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name || '',
      role: emp.role || 'EMPLOYEE',
      department: emp.department || '',
      designation: emp.designation || '',
      managerId: emp.managerId || '',
    });
    setShowEditModal(true);
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    try {
      await employeeService.deactivate(id);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleBulkImport = async () => {
    setBulkImporting(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
      await employeeService.bulkImport(parsed);
      setShowBulkModal(false);
      setBulkJson('');
      fetchEmployees();
      alert(`Successfully imported ${parsed.length} employees!`);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to import');
    } finally { setBulkImporting(false); }
  };

  const managers = employees.filter(e => ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(e.role));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Employee Management</h1>
          <p>{employees.length} employees</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => setShowBulkModal(true)}
            style={{ background: '#16a34a', color: 'white', border: 'none' }}>
            <ArrowUpload24Regular /> Bulk Import
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Add24Regular /> Add Employee
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search24Regular style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8', fontSize: 18,
          }} />
          <input
            className="form-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* Employee Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 300 }} /></div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h4>No employees found</h4>
              <p>Add your first employee to get started</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Manager</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, color: '#475569', flexShrink: 0,
                        }}>
                          {emp.name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`status-badge ${emp.role === 'EMPLOYEE' ? 'present' : emp.role === 'MANAGER' ? 'wfh' : 'pending'}`}>{emp.role.replace('_', ' ')}</span></td>
                    <td>{emp.department || '—'}</td>
                    <td>{emp.manager?.name || '—'}</td>
                    <td>{format(new Date(emp.joinDate), 'MMM d, yyyy')}</td>
                    <td><span className={`status-badge ${emp.isActive ? 'approved' : 'rejected'}`}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(emp)} title="Edit">
                          <Edit24Regular style={{ fontSize: 16 }} />
                        </button>
                        {emp.isActive && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(emp.id, emp.name)}
                            style={{ color: '#ef4444' }}>
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Employee</h2>
            <form onSubmit={handleAdd}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="form-input" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input className="form-input" type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Password</label>
                  <input className="form-input" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-select" value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR_ADMIN">HR Admin</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Department</label>
                  <input className="form-input" value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Engineering" />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input className="form-input" value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Software Engineer" />
                </div>
              </div>
              <div className="form-group">
                <label>Manager</label>
                <select className="form-select" value={form.managerId}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">No manager</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Employee</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Editing: {editingEmployee.email}
            </p>
            <form onSubmit={handleEdit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-input" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-select" value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR_ADMIN">HR Admin</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Department</label>
                  <input className="form-input" value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input className="form-input" value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Manager</label>
                <select className="form-select" value={editForm.managerId}
                  onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}>
                  <option value="">No manager</option>
                  {managers.filter(m => m.id !== editingEmployee.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>Bulk Import Employees</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Paste a JSON array of employee objects. Each object should have: <code>name</code>, <code>email</code>, and optionally <code>role</code>, <code>department</code>, <code>designation</code>, <code>password</code>.
            </p>
            <div className="form-group">
              <label>JSON Data</label>
              <textarea
                className="form-input"
                rows={12}
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder={`[\n  {\n    "name": "John Doe",\n    "email": "john@company.com",\n    "role": "EMPLOYEE",\n    "department": "Engineering",\n    "designation": "Developer"\n  }\n]`}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#eff6ff', borderLeft: '3px solid #3b82f6', fontSize: 12, color: '#1e40af',
            }}>
              💡 Default password for all imported users: <strong>Welcome@123</strong>. They'll be prompted to change it on first login.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkImport} disabled={bulkImporting || !bulkJson.trim()}>
                {bulkImporting ? 'Importing...' : 'Import Employees'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
