import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services';
import type { User } from '../types';
import { Person24Regular, Save24Regular } from '@fluentui/react-icons';

export default function MyProfile() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ phone: '', emergencyContact: '', workLocation: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authService.getMe();
        setProfile(res.data);
        setForm({
          phone: res.data.phone || '',
          emergencyContact: res.data.emergencyContact || '',
          workLocation: res.data.workLocation || '',
        });
      } catch {} finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const api = (await import('../services/api')).default;
      const res = await api.put(`/users/${user!.id}`, form);
      setProfile(res.data);
      updateUser(form);
      setEditMode(false);
    } catch (err) {
      alert('Failed to save');
    } finally { setSaving(false); }
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

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
        <h1>My Profile</h1>
        <p>View and update your information</p>
      </div>

      <div className="grid-main-side">
        {/* Profile Card */}
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28, fontWeight: 700, color: 'white',
            }}>
              {initials}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{profile?.name}</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>{profile?.designation || 'No designation'}</p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>{profile?.department || 'No department'}</p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <span className={`status-badge ${profile?.role === 'EMPLOYEE' ? 'present' : profile?.role === 'MANAGER' ? 'wfh' : 'pending'}`}>
                {profile?.role?.replace('_', ' ')}
              </span>
              <span className="status-badge approved">
                Joined {profile?.joinDate ? format(new Date(profile.joinDate), 'MMM yyyy') : ''}
              </span>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#0f172a' }}>Account Details</h3>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>Email</span>
                  <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 500 }}>{profile?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>Manager</span>
                  <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 500 }}>{profile?.manager?.name || 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Contact Information</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => editMode ? handleSave() : setEditMode(true)} disabled={saving}>
                {editMode ? (saving ? 'Saving...' : '💾 Save') : '✏️ Edit'}
              </button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Phone Number</label>
                <input className="form-input" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={!editMode} placeholder="Not set"
                />
              </div>
              <div className="form-group">
                <label>Emergency Contact</label>
                <input className="form-input" value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                  disabled={!editMode} placeholder="Not set"
                />
              </div>
              <div className="form-group">
                <label>Work Location</label>
                <input className="form-input" value={form.workLocation}
                  onChange={(e) => setForm({ ...form, workLocation: e.target.value })}
                  disabled={!editMode} placeholder="Not set"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
