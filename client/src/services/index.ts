import api from './api';
import type {
  User, AttendanceLog, Task, LeaveRequest, LeaveBalance,
  Notification, HRDashboardData, ManagerDashboardData, EmployeeDashboardData
} from '../types';

// ─── Auth ────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', data),
  getMe: () => api.get<User>('/auth/me'),
};

// ─── Attendance ──────────────────────────────────────────────────────
export const attendanceService = {
  checkIn: (status: string, morningNote?: string) =>
    api.post<AttendanceLog>('/attendance/checkin', { status, morningNote }),
  checkOut: (id: string, selfRating?: number, endOfDayNote?: string) =>
    api.put<AttendanceLog>(`/attendance/checkout/${id}`, { selfRating, endOfDayNote }),
  getToday: () => api.get<AttendanceLog | null>('/attendance/today'),
  getAll: (params?: Record<string, string>) =>
    api.get<AttendanceLog[]>('/attendance', { params }),
  managerRate: (id: string, managerRating: number, managerComment?: string) =>
    api.put(`/attendance/${id}/manager-rating`, { managerRating, managerComment }),
  getLeaveCalendar: (month: number, year: number) =>
    api.get('/attendance/leave-calendar', { params: { month: String(month), year: String(year) } }),
};

// ─── Tasks ───────────────────────────────────────────────────────────
export const taskService = {
  getToday: () => api.get<Task[]>('/tasks/today'),
  getAll: (params?: Record<string, string>) =>
    api.get<Task[]>('/tasks', { params }),
  create: (data: Partial<Task>) =>
    api.post<Task>('/tasks', data),
  broadcast: (data: { title: string; description?: string; assignedToIds: string[]; dueDate: string; priority?: string }) =>
    api.post<Task[]>('/tasks/broadcast', data),
  update: (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// ─── Leave ───────────────────────────────────────────────────────────
export const leaveService = {
  getAll: (params?: Record<string, string>) =>
    api.get<LeaveRequest[]>('/leave', { params }),
  getPending: () => api.get<LeaveRequest[]>('/leave/pending'),
  getBalances: (userId?: string) =>
    api.get<LeaveBalance[]>('/leave/balances', { params: userId ? { userId } : {} }),
  create: (data: { leaveType: string; startDate: string; endDate: string; reason?: string }) =>
    api.post<LeaveRequest>('/leave', data),
  approve: (id: string, status: string, comment?: string) =>
    api.put<LeaveRequest>(`/leave/${id}/approve`, { status, comment }),
  cancel: (id: string) => api.put<LeaveRequest>(`/leave/${id}/cancel`),
};

// ─── Dashboard ───────────────────────────────────────────────────────
export const dashboardService = {
  getHR: () => api.get<HRDashboardData>('/dashboard/hr'),
  getManager: () => api.get<ManagerDashboardData>('/dashboard/manager'),
  getEmployee: () => api.get<EmployeeDashboardData>('/dashboard/employee'),
};

// ─── Employees ───────────────────────────────────────────────────────
export const employeeService = {
  getAll: (params?: Record<string, string>) =>
    api.get<any[]>('/employees', { params }),
  create: (data: Partial<User> & { password?: string }) =>
    api.post('/employees', data),
  update: (id: string, data: Partial<User>) =>
    api.put(`/employees/${id}`, data),
  deactivate: (id: string) => api.delete(`/employees/${id}`),
  getHistory: (id: string) => api.get(`/employees/${id}/history`),
  bulkImport: (employees: any[]) => api.post('/employees/bulk', { employees }),
  getDepartments: () => api.get('/employees/meta/departments'),
  addDepartment: (name: string) => api.post('/employees/meta/departments', { name }),
  getDesignations: () => api.get('/employees/meta/designations'),
  addDesignation: (name: string) => api.post('/employees/meta/designations', { name }),
};

// ─── Notifications ───────────────────────────────────────────────────
export const notificationService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// ─── Reports ─────────────────────────────────────────────────────────
export const reportService = {
  generate: (type: string, params?: Record<string, string>) =>
    api.get(`/reports/${type}`, { params }),
  exportExcel: (type: string, startDate: string, endDate: string) =>
    api.post(`/exports/${type}`, { startDate, endDate }, { responseType: 'blob' }),
  exportPdf: (type: string, startDate: string, endDate: string) =>
    api.post(`/exports/${type}/pdf`, { startDate, endDate }, { responseType: 'blob' }),
};

// ─── Settings ────────────────────────────────────────────────────────
export const settingsService = {
  getAll: () => api.get<Record<string, string>>('/settings'),
  update: (settings: Record<string, string>) => api.put('/settings', settings),
  getDepartments: () => api.get<string[]>('/settings/departments'),
};

// ─── Holidays ────────────────────────────────────────────────────────
export const holidayService = {
  getAll: (year?: number) => api.get('/holidays', { params: year ? { year: String(year) } : {} }),
  create: (data: { name: string; date: string; type?: string }) => api.post('/holidays', data),
  bulkCreate: (holidays: { name: string; date: string; type?: string }[]) => api.post('/holidays/bulk', { holidays }),
  delete: (id: string) => api.delete(`/holidays/${id}`),
};

// ─── Announcements ──────────────────────────────────────────────────
export const announcementService = {
  getAll: (all?: boolean) => api.get('/announcements', { params: all ? { all: 'true' } : {} }),
  create: (data: { title: string; body: string; priority?: string; expiresAt?: string }) => api.post('/announcements', data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};
