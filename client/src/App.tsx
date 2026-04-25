import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lightTheme } from './theme';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import EmployeeHome from './pages/EmployeeHome';
import ManagerHome from './pages/ManagerHome';
import HRDashboard from './pages/HRDashboard';
import MyTasks from './pages/MyTasks';
import TaskAssignment from './pages/TaskAssignment';
import LeaveRequestPage from './pages/LeaveRequestPage';
import LeaveApprovals from './pages/LeaveApprovals';
import MyProfile from './pages/MyProfile';
import TeamPerformance from './pages/TeamPerformance';
import Reports from './pages/Reports';
import EmployeeManagement from './pages/EmployeeManagement';
import SystemSettings from './pages/SystemSettings';
import NotificationCentre from './pages/NotificationCentre';
import HolidayManagement from './pages/HolidayManagement';
import AnnouncementManagement from './pages/AnnouncementManagement';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardRouter() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'MANAGER':
      return <ManagerHome />;
    case 'HR_ADMIN':
    case 'SUPER_ADMIN':
      return <HRDashboard />;
    default:
      return <EmployeeHome />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FluentProvider theme={lightTheme}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute><AppLayout /></ProtectedRoute>
            }>
              <Route index element={<DashboardRouter />} />
              <Route path="tasks" element={<MyTasks />} />
              <Route path="assign-tasks" element={<TaskAssignment />} />
              <Route path="leave" element={<LeaveRequestPage />} />
              <Route path="leave-approvals" element={<LeaveApprovals />} />
              <Route path="profile" element={<MyProfile />} />
              <Route path="team-performance" element={<TeamPerformance />} />
              <Route path="reports" element={<Reports />} />
              <Route path="employees" element={<EmployeeManagement />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="notifications" element={<NotificationCentre />} />
              <Route path="holidays" element={<HolidayManagement />} />
              <Route path="announcements" element={<AnnouncementManagement />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FluentProvider>
    </QueryClientProvider>
  );
}

export default App;
