import { useState } from 'react';
import { format } from 'date-fns';
import { reportService } from '../services';
import { DocumentTable24Regular, ArrowDownload24Regular } from '@fluentui/react-icons';

export default function Reports() {
  const [reportType, setReportType] = useState('attendance');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const reports = [
    { value: 'attendance', label: 'Monthly Attendance Report', icon: '📋' },
    { value: 'tasks', label: 'Task Completion Report', icon: '✅' },
    { value: 'performance', label: 'Performance Summary', icon: '⭐' },
    { value: 'leave', label: 'Leave Report', icon: '🏖️' },
    { value: 'late-arrivals', label: 'Late Arrival Report', icon: '⏰' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await reportService.generate(reportType, { startDate, endDate });
      setData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.data?.length) return;
    const items = data.data;
    const headers = Object.keys(items[0]).filter(k => typeof items[0][k] !== 'object');
    const csv = [
      headers.join(','),
      ...items.map((item: any) => headers.map(h => JSON.stringify(item[h] ?? '')).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const res = await reportService.exportExcel(reportType, startDate, endDate);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${startDate}_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export Excel. Make sure data exists for the selected range.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const res = await reportService.exportPdf(reportType, startDate, endDate);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${startDate}_${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export PDF. Make sure data exists for the selected range.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Generate, preview, and export workforce reports in CSV, Excel, or PDF</p>
      </div>

      {/* Report Type Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {reports.map(r => (
          <button
            key={r.value}
            onClick={() => setReportType(r.value)}
            style={{
              padding: '16px 18px', borderRadius: 'var(--radius-md)',
              border: reportType === r.value ? '2px solid var(--brand-primary)' : '1.5px solid var(--gray-200)',
              background: reportType === r.value ? 'var(--brand-primary-bg)' : 'white',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s', fontFamily: 'var(--font-primary)',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>{r.icon}</div>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: reportType === r.value ? 'var(--brand-primary)' : 'var(--gray-700)',
            }}>{r.label}</div>
          </button>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
              <label>Start Date</label>
              <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
              <label>End Date</label>
              <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              <DocumentTable24Regular />
              {loading ? 'Generating...' : 'Generate Preview'}
            </button>

            {/* Export buttons */}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {data?.data?.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
                  <ArrowDownload24Regular /> CSV
                </button>
              )}
              <button className="btn btn-sm" onClick={handleExportExcel} disabled={exporting === 'excel'}
                style={{ background: '#059669', color: 'white', border: 'none' }}>
                <ArrowDownload24Regular /> {exporting === 'excel' ? 'Exporting...' : 'Excel'}
              </button>
              <button className="btn btn-sm" onClick={handleExportPdf} disabled={exporting === 'pdf'}
                style={{ background: '#dc2626', color: 'white', border: 'none' }}>
                <ArrowDownload24Regular /> {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {data && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h3>{reports.find(r => r.value === data.type)?.label}</h3>
            <span style={{
              fontSize: 12, color: 'var(--gray-500)', background: 'var(--gray-100)',
              padding: '4px 12px', borderRadius: 20, fontWeight: 600,
            }}>{data.count} records</span>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {data.data?.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h4>No data found</h4>
                <p>Try adjusting the date range</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    {reportType === 'attendance' && <>
                      <th>Employee</th><th>Department</th><th>Date</th><th>Status</th>
                      <th>Check In</th><th>Check Out</th><th>Hours</th><th>Late</th><th>Rating</th>
                    </>}
                    {reportType === 'tasks' && <>
                      <th>Task</th><th>Employee</th><th>Priority</th><th>Status</th>
                      <th>Due Date</th><th>Assigned By</th>
                    </>}
                    {reportType === 'performance' && <>
                      <th>Employee</th><th>Department</th><th>Avg Rating</th>
                      <th>Days Rated</th><th>Min</th><th>Max</th>
                    </>}
                    {reportType === 'leave' && <>
                      <th>Employee</th><th>Type</th><th>From</th><th>To</th>
                      <th>Status</th><th>Approver</th>
                    </>}
                    {reportType === 'late-arrivals' && <>
                      <th>Employee</th><th>Department</th><th>Date</th><th>Check In</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row: any, i: number) => (
                    <tr key={i}>
                      {reportType === 'attendance' && <>
                        <td style={{ fontWeight: 600 }}>{row.user?.name}</td><td>{row.user?.department}</td>
                        <td>{format(new Date(row.date), 'MMM d')}</td>
                        <td><span className={`status-badge ${row.status.toLowerCase().replace('_', '-')}`}>{row.status}</span></td>
                        <td>{row.checkIn ? format(new Date(row.checkIn), 'hh:mm a') : '—'}</td>
                        <td>{row.checkOut ? format(new Date(row.checkOut), 'hh:mm a') : '—'}</td>
                        <td>{row.totalHours?.toFixed(1) || '—'}</td>
                        <td>{row.lateFlag ? <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>⚠️</span> : <span style={{ color: 'var(--color-success)' }}>✓</span>}</td>
                        <td>{row.selfRating ? '⭐'.repeat(row.selfRating) : '—'}</td>
                      </>}
                      {reportType === 'tasks' && <>
                        <td style={{ fontWeight: 600 }}>{row.title}</td><td>{row.assignedTo?.name}</td>
                        <td><span className={`priority-badge ${row.priority.toLowerCase()}`}>{row.priority}</span></td>
                        <td><span className={`status-badge ${row.status.toLowerCase().replace('_', '-')}`}>{row.status.replace('_', ' ')}</span></td>
                        <td>{format(new Date(row.dueDate), 'MMM d')}</td>
                        <td>{row.assignedBy?.name}</td>
                      </>}
                      {reportType === 'performance' && <>
                        <td style={{ fontWeight: 600 }}>{row.user?.name}</td><td>{row.user?.department}</td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>⭐ {Number(row._avg?.selfRating || 0).toFixed(1)}</td>
                        <td>{row._count?.id || 0}</td>
                        <td>{row._min?.selfRating || '—'}</td>
                        <td>{row._max?.selfRating || '—'}</td>
                      </>}
                      {reportType === 'leave' && <>
                        <td style={{ fontWeight: 600 }}>{row.user?.name}</td><td>{row.leaveType?.replace(/_/g, ' ')}</td>
                        <td>{format(new Date(row.startDate), 'MMM d')}</td>
                        <td>{format(new Date(row.endDate), 'MMM d')}</td>
                        <td><span className={`status-badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                        <td>{row.approver?.name || '—'}</td>
                      </>}
                      {reportType === 'late-arrivals' && <>
                        <td style={{ fontWeight: 600 }}>{row.user?.name}</td><td>{row.user?.department}</td>
                        <td>{format(new Date(row.date), 'MMM d')}</td>
                        <td>{row.checkIn ? format(new Date(row.checkIn), 'hh:mm a') : '—'}</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!data && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <h4>Select a report type and generate</h4>
              <p>Choose from 5 report types with date filtering, then export as CSV, Excel, or PDF</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
