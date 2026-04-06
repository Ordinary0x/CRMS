import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Auth Pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Pending from "@/pages/auth/Pending";
import Unauthorized from "@/pages/auth/Unauthorized";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminDepartments from "@/pages/admin/AdminDepartments";
import AdminResources from "@/pages/admin/AdminResources";
import AdminBookings from "@/pages/admin/AdminBookings";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import AdminBlackouts from "@/pages/admin/AdminBlackouts";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";

// HOD
import HodDashboard from "@/pages/hod/HodDashboard";
import HodUsers from "@/pages/hod/HodUsers";
import HodApprovals from "@/pages/hod/HodApprovals";
import HodBookings from "@/pages/hod/HodBookings";
import HodAnalytics from "@/pages/hod/HodAnalytics";

// RM
import RmDashboard from "@/pages/rm/RmDashboard";
import RmResources from "@/pages/rm/RmResources";
import RmApprovals from "@/pages/rm/RmApprovals";
import RmAnalytics from "@/pages/rm/RmAnalytics";

// Staff/Student
import StaffDashboard from "@/pages/staff/StaffDashboard";
import StaffSearch from "@/pages/staff/StaffSearch";
import StaffBook from "@/pages/staff/StaffBook";
import StaffBookings from "@/pages/staff/StaffBookings";
import StaffNotifications from "@/pages/staff/StaffNotifications";
import UserProfile from "@/pages/staff/UserProfile";

const queryClient = new QueryClient();

function RootRedirect() {
  const { dbUser, token, loading } = useAuth();
  
  if (loading) return null;
  if (!token) return <Redirect to="/login" />;
  if (dbUser && !dbUser.is_active) return <Redirect to="/pending" />;
  
  if (dbUser) {
    const rolePrefix = dbUser.role === 'resource_manager' ? 'rm' : dbUser.role === 'faculty' ? 'staff' : dbUser.role;
    return <Redirect to={`/${rolePrefix}/dashboard`} />;
  }
  
  return null;
}

function RedirectNotFoundToDashboard() {
  const { dbUser, token, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      setLocation("/login");
      return;
    }
    if (!dbUser) return;
    if (location === "/" || location === "/not-found") return;

    const rolePrefix = dbUser.role === "resource_manager" ? "rm" : dbUser.role === "faculty" ? "staff" : dbUser.role;
    setLocation(`/${rolePrefix}/dashboard`);
  }, [loading, token, dbUser, location, setLocation]);

  return <NotFound />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pending" component={Pending} />
      <Route path="/unauthorized" component={Unauthorized} />
      
      {/* Admin Routes */}
      <Route path="/admin/:path*">
        <ProtectedRoute allowedRoles={['admin']}>
          <AppLayout>
            <Switch>
              <Route path="/admin/dashboard" component={AdminDashboard} />
              <Route path="/admin/users" component={AdminUsers} />
              <Route path="/admin/departments" component={AdminDepartments} />
              <Route path="/admin/resources" component={AdminResources} />
              <Route path="/admin/bookings" component={AdminBookings} />
              <Route path="/admin/audit-log" component={AdminAuditLog} />
              <Route path="/admin/blackout" component={AdminBlackouts} />
              <Route path="/admin/analytics" component={AdminAnalytics} />
              <Route path="/admin/profile" component={UserProfile} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* HOD Routes */}
      <Route path="/hod/:path*">
        <ProtectedRoute allowedRoles={['hod']}>
          <AppLayout>
            <Switch>
              <Route path="/hod/dashboard" component={HodDashboard} />
              <Route path="/hod/users" component={HodUsers} />
              <Route path="/hod/approvals" component={HodApprovals} />
              <Route path="/hod/bookings" component={HodBookings} />
              <Route path="/hod/analytics" component={HodAnalytics} />
              <Route path="/hod/profile" component={UserProfile} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* RM Routes */}
      <Route path="/rm/:path*">
        <ProtectedRoute allowedRoles={['resource_manager']}>
          <AppLayout>
            <Switch>
              <Route path="/rm/dashboard" component={RmDashboard} />
              <Route path="/rm/resources" component={RmResources} />
              <Route path="/rm/approvals" component={RmApprovals} />
              <Route path="/rm/analytics" component={RmAnalytics} />
              <Route path="/rm/profile" component={UserProfile} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Staff Routes */}
      <Route path="/staff/:path*">
        <ProtectedRoute allowedRoles={['staff', 'faculty']}>
          <AppLayout>
            <Switch>
              <Route path="/staff/dashboard" component={StaffDashboard} />
              <Route path="/staff/search" component={StaffSearch} />
              <Route path="/staff/book" component={StaffBook} />
              <Route path="/staff/bookings" component={StaffBookings} />
              <Route path="/staff/notifications" component={StaffNotifications} />
              <Route path="/staff/profile" component={UserProfile} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Student Routes */}
      <Route path="/student/:path*">
        <ProtectedRoute allowedRoles={['student']}>
          <AppLayout>
            <Switch>
              <Route path="/student/dashboard" component={StaffDashboard} />
              <Route path="/student/search" component={StaffSearch} />
              <Route path="/student/book" component={StaffBook} />
              <Route path="/student/bookings" component={StaffBookings} />
              <Route path="/student/notifications" component={StaffNotifications} />
              <Route path="/student/profile" component={UserProfile} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={RedirectNotFoundToDashboard} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster position="top-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
