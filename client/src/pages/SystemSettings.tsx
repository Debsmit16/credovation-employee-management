import { useState, useEffect } from 'react';
import { settingsService } from '../services';
import { Save24Regular } from '@fluentui/react-icons';

export default function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await settingsService.getAll();
        setSettings(res.data);
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.update(settings);
      alert('Settings saved successfully!');
    } catch {
      alert('Failed to save settings');
    } finally { setSaving(false); }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>System Settings</h1>
          <p>Configure work hours, leave policies, and system behavior</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save24Regular /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid-2">
        {/* Work Hours */}
        <div className="card">
          <div className="card-header"><h3>Work Hours</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label>Work Start Time</label>
              <input className="form-input" type="time" value={settings.work_start_time || '09:00'}
                onChange={(e) => updateSetting('work_start_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Work End Time</label>
              <input className="form-input" type="time" value={settings.work_end_time || '18:00'}
                onChange={(e) => updateSetting('work_end_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Late Threshold Time</label>
              <input className="form-input" type="time" value={settings.late_threshold || '09:30'}
                onChange={(e) => updateSetting('late_threshold', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Minimum Hours Per Day</label>
              <input className="form-input" type="number" min="1" max="12" value={settings.min_hours || '4'}
                onChange={(e) => updateSetting('min_hours', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Leave Policy */}
        <div className="card">
          <div className="card-header"><h3>Leave Policy</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label>Full Day Leave (Annual Entitlement)</label>
              <input className="form-input" type="number" value={settings.leave_full_day || '18'}
                onChange={(e) => updateSetting('leave_full_day', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Half Day Leave (Annual Entitlement)</label>
              <input className="form-input" type="number" value={settings.leave_half_day || '12'}
                onChange={(e) => updateSetting('leave_half_day', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Sick Leave (Annual Entitlement)</label>
              <input className="form-input" type="number" value={settings.leave_sick || '12'}
                onChange={(e) => updateSetting('leave_sick', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Emergency Leave (Annual Entitlement)</label>
              <input className="form-input" type="number" value={settings.leave_emergency || '6'}
                onChange={(e) => updateSetting('leave_emergency', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card">
          <div className="card-header"><h3>Notifications</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label>Check-in Reminder Time (IST)</label>
              <input className="form-input" type="time" value={settings.checkin_reminder_time || '10:00'}
                onChange={(e) => updateSetting('checkin_reminder_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Leave Year Reset Month</label>
              <select className="form-select" value={settings.leave_reset_month || '4'}
                onChange={(e) => updateSetting('leave_reset_month', e.target.value)}>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Rating Labels */}
        <div className="card">
          <div className="card-header"><h3>Performance Rating Labels</h3></div>
          <div className="card-body">
            {[1,2,3,4,5].map(star => (
              <div key={star} className="form-group">
                <label>{'⭐'.repeat(star)} - Rating {star}</label>
                <input className="form-input"
                  value={settings[`rating_label_${star}`] || ['Needs Improvement','Below Average','Meets Expectations','Exceeds Expectations','Outstanding'][star-1]}
                  onChange={(e) => updateSetting(`rating_label_${star}`, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
