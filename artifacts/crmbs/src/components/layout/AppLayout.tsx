import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/providers/AuthProvider";
import { useListNotifications, useGetUnreadNotificationCount, useMarkNotificationRead, getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey, type Notification } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Bell, Menu, X, LayoutDashboard, Users, Building, 
  Database, CalendarDays, ScrollText, Ban, BarChart3,
  CheckSquare, CheckCircle, Search, CalendarClock, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const roleNavItems: Record<string, NavItem[]> = {
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Departments", href: "/admin/departments", icon: Building },
    { name: "Resources", href: "/admin/resources", icon: Database },
    { name: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { name: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
    { name: "Blackouts", href: "/admin/blackout", icon: Ban },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ],
  hod: [
    { name: "Dashboard", href: "/hod/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/hod/users", icon: Users },
    { name: "Approvals", href: "/hod/approvals", icon: CheckSquare },
    { name: "Bookings", href: "/hod/bookings", icon: CalendarDays },
    { name: "Analytics", href: "/hod/analytics", icon: BarChart3 },
  ],
  resource_manager: [
    { name: "Dashboard", href: "/rm/dashboard", icon: LayoutDashboard },
    { name: "Resources", href: "/rm/resources", icon: Database },
    { name: "Approvals", href: "/rm/approvals", icon: CheckCircle },
    { name: "Analytics", href: "/rm/analytics", icon: BarChart3 },
  ],
  staff: [
    { name: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { name: "Search Resources", href: "/staff/search", icon: Search },
    { name: "My Bookings", href: "/staff/bookings", icon: CalendarDays },
    { name: "Notifications", href: "/staff/notifications", icon: Bell },
  ],
  faculty: [
    { name: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { name: "Search Resources", href: "/staff/search", icon: Search },
    { name: "My Bookings", href: "/staff/bookings", icon: CalendarDays },
    { name: "Notifications", href: "/staff/notifications", icon: Bell },
  ],
  student: [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Search Resources", href: "/student/search", icon: Search },
    { name: "My Bookings", href: "/student/bookings", icon: CalendarDays },
    { name: "Notifications", href: "/student/notifications", icon: Bell },
  ],
};

function NotificationBell() {
  const { dbUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: unreadCount, refetch: refetchCount } = useGetUnreadNotificationCount({
    query: {
      enabled: !!dbUser,
      queryKey: getGetUnreadNotificationCountQueryKey()
    }
  });

  const { data: notifications } = useListNotifications({
    query: {
      enabled: !!dbUser,
      queryKey: getListNotificationsQueryKey()
    }
  });

  const markRead = useMarkNotificationRead();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount?.count ? (
            <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-5 h-5 flex items-center justify-center">
              {unreadCount.count}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <Link href={`/${dbUser?.role === 'student' ? 'student' : 'staff'}/notifications`} className="text-xs text-primary hover:underline">
            View All
          </Link>
        </div>
        <ScrollArea className="h-80">
          {notifications?.data && notifications.data.length > 0 ? (
            <div className="flex flex-col">
              {notifications.data.slice(0, 5).map((n: Notification) => (
                <div 
                  key={n.notification_id} 
                  className={`p-4 border-b text-sm ${n.status === 'unread' ? 'bg-muted/50' : ''}`}
                  onClick={() => n.status === 'unread' && handleMarkRead(n.notification_id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{n.channel}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { dbUser, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!dbUser) return <>{children}</>;

  const navItems = roleNavItems[dbUser.role] || [];
  const isSidebarLayout = ['admin', 'hod', 'resource_manager'].includes(dbUser.role);

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {dbUser.first_name[0]}{dbUser.last_name[0]}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{dbUser.first_name} {dbUser.last_name}</p>
            <p className="text-xs leading-none text-muted-foreground">{dbUser.email}</p>
            <div className="mt-2 text-xs font-medium uppercase tracking-wider text-primary">{dbUser.role.replace('_', ' ')}</div>
            {dbUser.department_name && <div className="text-xs text-muted-foreground">{dbUser.department_name}</div>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isSidebarLayout) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-2 text-sidebar-primary">
              <CalendarClock className="h-6 w-6" />
              <span className="font-bold text-lg tracking-tight">CRMBS</span>
            </div>
          </div>
          <div className="flex-1 py-6 px-3 overflow-y-auto">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-sidebar-primary' : 'text-muted-foreground'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-64 bg-sidebar flex flex-col">
              <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
                <div className="flex items-center gap-2 text-sidebar-primary">
                  <CalendarClock className="h-6 w-6" />
                  <span className="font-bold text-lg tracking-tight">CRMBS</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 py-6 px-3 overflow-y-auto">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
                        <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-sidebar-primary' : 'text-muted-foreground'}`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold capitalize hidden sm:block">
                {location.split('/').pop()?.replace('-', ' ')}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Navbar layout for staff/faculty/student
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2 mr-8">
                <CalendarClock className="h-6 w-6" />
                <span className="font-bold text-lg tracking-tight">CRMBS</span>
              </div>
              <nav className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const isActive = location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-black/20 text-white' : 'text-primary-foreground/80 hover:bg-black/10 hover:text-white'}`}>
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="ml-3">
                <UserMenu />
              </div>
              <div className="md:hidden ml-2">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-black/10" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {sidebarOpen && (
          <div className="md:hidden bg-primary border-t border-primary-foreground/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-black/20 text-white' : 'text-primary-foreground/80 hover:bg-black/10 hover:text-white'}`}>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
