// ─── User Types ──────────────────────────────────────────────────────

export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string | null;
  designation: string | null;
  phone: string | null;
  emergencyContact: string | null;
  workLocation: string | null;
  profilePhoto: string | null;
  managerId: string | null;
  manager?: { id: string; name: string; email: string } | null;
  joinDate: string;
  isActive: boolean;
}

// ─── Attendance Types ─────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'WFH' | 'ON_SITE_CLIENT';

export interface AttendanceLog {
  id: string;
  userId: string;
  user?: Partial<User>;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  totalHours: number | null;
  lateFlag: boolean;
  morningNote: string | null;
  endOfDayNote: string | null;
  selfRating: number | null;
  isComplete: boolean;
}

// ─── Task Types ──────────────────────────────────────────────────

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string;
  assignedTo?: Partial<User>;
  assignedById: string;
  assignedBy?: Partial<User>;
  dueDate: string;
  dueTime: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completionNote: string | null;
  isManagerAssigned: boolean;
  createdAt: string;
}

// ─── Leave Types ─────────────────────────────────────────────────

export type LeaveType = 'FULL_DAY' | 'HALF_DAY' | 'SICK_LEAVE' | 'EMERGENCY_LEAVE';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'MODIFICATION_REQUESTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: Partial<User>;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveRequestStatus;
  approverId: string | null;
  approver?: Partial<User> | null;
  approverComment: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveType: LeaveType;
  entitled: number;
  taken: number;
  pending: number;
  remaining: number;
  year: number;
}

// ─── Notification Types ──────────────────────────────────────────

export type NotificationType =
  | 'CHECK_IN_REMINDER'
  | 'TASK_ASSIGNED'
  | 'TASK_OVERDUE'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_REQUEST'
  | 'MANAGER_COMMENT'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

// ─── Dashboard Types ─────────────────────────────────────────────

export interface HRDashboardData {
  kpis: {
    totalEmployees: number;
    presentToday: number;
    wfhToday: number;
    onSiteToday: number;
    onLeaveToday: number;
    absent: number;
    avgRating: number;
  };
  todayAttendance: AttendanceLog[];
  lateUsers: (Partial<User> & { lateCount: number })[];
  weekTasks: { assignedToId: string; status: TaskStatus }[];
  heatmapData: { userId: string; date: string; status: AttendanceStatus; lateFlag: boolean }[];
  performanceData: { date: string; selfRating: number }[];
  topPerformers: (Partial<User> & { avgRating: number; logCount: number })[];
  employees: Partial<User>[];
}

export interface ManagerDashboardData {
  reports: Partial<User>[];
  teamAttendance: AttendanceLog[];
  pendingLeaves: LeaveRequest[];
  teamTasks: Task[];
  overdueTasks: Task[];
  teamSize: number;
  checkedInCount: number;
}

export interface EmployeeDashboardData {
  todayAttendance: AttendanceLog | null;
  todayTasks: Task[];
  leaveBalances: LeaveBalance[];
  performanceTrend: { date: string; selfRating: number }[];
  notifications: Notification[];
  unreadCount: number;
}
