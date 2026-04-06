import { useAdminDashboard, getAdminDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Database, CalendarDays, CheckSquare, Activity } from "lucide-react";
import { format } from "date-fns";
import { CardGridSkeleton } from "@/components/shared/StateUI";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard({ query: { queryKey: getAdminDashboardQueryKey() } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_users}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active: {(data as any).active_users ?? data.total_users} · Inactive: {(data as any).inactive_users ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_resources}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active: {(data as any).active_resources ?? data.total_resources} · Inactive: {(data as any).inactive_resources ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.bookings_today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pending_approvals}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Busiest Resources</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.busiest_resources}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="resource_name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <RechartsTooltip />
                  <Bar dataKey="total_bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {data.recent_audit_log.map((log) => (
                <div key={log.audit_id} className="flex items-center">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2" />
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {log.changed_by_name || 'System'} {log.operation.toLowerCase()}d {log.table_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.changed_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              {data.recent_audit_log.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings Log</CardTitle>
        </CardHeader>
        <CardContent>
          {!(data as any).recent_bookings || (data as any).recent_bookings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No recent bookings</div>
          ) : (
            <div className="space-y-3">
              {(data as any).recent_bookings.map((b: any) => (
                <div key={b.booking_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">#{b.booking_id} · {b.resource_name}</p>
                    <p className="text-xs text-muted-foreground">{b.requested_by} · {format(new Date(b.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <Badge variant="outline">{b.status_name}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
